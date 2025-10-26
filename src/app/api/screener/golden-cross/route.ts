// app/api/screener/golden-cross/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

// 동적 라우트 강제 (쿼리 파라미터 사용)
export const dynamic = 'force-dynamic';

// 캐싱 설정: 24시간 (종가 기준 데이터, 하루 1회 갱신)
// Next.js는 정적 분석을 위해 리터럴 값만 허용 (계산식/상수 참조 불가)
export const revalidate = 86400; // 1일 (60 * 60 * 24초)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const justTurned = searchParams.get("justTurned") === "true";
    const lookbackDays = Number(searchParams.get("lookbackDays") ?? 10); // 기본 10일
    const maxRn = 1 + lookbackDays; // rn 범위 계산
    const minMcap = Number(searchParams.get("minMcap") ?? 0);
    const minPrice = Number(searchParams.get("minPrice") ?? 0);
    const minAvgVol = Number(searchParams.get("minAvgVol") ?? 0);
    const allowOTC = searchParams.get("allowOTC") === "true";
    const profitability = searchParams.get("profitability") ?? "all"; // 수익성 필터

    const rows = await db.execute(sql`
      WITH last_d AS (
        -- daily_ma와 daily_prices에 공통으로 존재하는 최신일 (NULL 방지: 둘 중 하나라도 NULL이면 전체가 비니 COALESCE로 안전장치)
        SELECT COALESCE(
          LEAST(
            (SELECT MAX(date)::date FROM daily_ma),
            (SELECT MAX(date)::date FROM daily_prices)
          ),
          (SELECT MAX(date)::date FROM daily_ma),
          (SELECT MAX(date)::date FROM daily_prices)
        ) AS d
      ),
      -- 1) 최신일 정배열 후보 추출 (빠름)
      cur AS (
        SELECT
          dm.symbol,
          dm.date::date AS d,
          dm.ma20, dm.ma50, dm.ma100, dm.ma200,
          dm.vol_ma30,
          pr.adj_close::numeric AS close
        FROM daily_ma dm
        JOIN last_d ld
          ON dm.date::date = ld.d
        LEFT JOIN daily_prices pr
          ON pr.symbol = dm.symbol AND pr.date::date = ld.d
        WHERE dm.ma20 IS NOT NULL AND dm.ma50 IS NOT NULL AND dm.ma100 IS NOT NULL AND dm.ma200 IS NOT NULL
          AND dm.ma20 > dm.ma50 AND dm.ma50 > dm.ma100 AND dm.ma100 > dm.ma200
          -- 정상적인 주식만 필터링 (워런트, 우선주, ETF 등 제외)
          AND dm.symbol ~ '^[A-Z]{1,5}$'
          AND dm.symbol NOT LIKE '%W'
          AND dm.symbol NOT LIKE '%X'
          AND dm.symbol NOT LIKE '%.%'
          AND dm.symbol NOT LIKE '%U'
          AND dm.symbol NOT LIKE '%WS'
      ),
      -- 2) 필수 컷(시총/가격/거래소/거래량) 먼저 가볍게 적용해서 "후보" 축소
      candidates AS (
        SELECT c.symbol, c.d, c.ma20, c.ma50, c.ma100, c.ma200, c.vol_ma30, c.close
        FROM cur c
        JOIN symbols s ON s.symbol = c.symbol
        WHERE
          (${minAvgVol} = 0 OR c.vol_ma30 IS NULL OR c.vol_ma30 >= ${minAvgVol})
          AND (${minPrice}  = 0 OR c.close     IS NULL OR c.close     >= ${minPrice})
          AND (${minMcap}   = 0 OR s.market_cap IS NULL OR s.market_cap::numeric >= ${minMcap})
          AND (${
            allowOTC
              ? sql`TRUE`
              : sql`(s.exchange NOT ILIKE 'OTC%' AND s.exchange NOT ILIKE 'PINK%')`
          })
      ),
      -- 3) 후보들에 한해 '전일(이전 영업일)' MA를 daily_prices에서 즉석 계산
      --   : 심볼/날짜 수가 적으니 여기선 윈도우 함수 써도 빠름
      prev_ma AS (
        SELECT
          b.symbol,
          b.d,
          -- 전일 기준의 MA들을 만들기 위해, rn=1(최신=ld.d), rn=2(전일<ld.d)를 같이 계산
          AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)  AS ma20,
          AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 49 PRECEDING AND CURRENT ROW)  AS ma50,
          AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 99 PRECEDING AND CURRENT ROW)  AS ma100,
          AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) AS ma200,
          ROW_NUMBER()  OVER (PARTITION BY b.symbol ORDER BY b.d DESC) AS rn
        FROM (
          SELECT
            dp.symbol,
            dp.date::date AS d,
            dp.adj_close::numeric AS close
          FROM daily_prices dp
          JOIN last_d ld ON dp.date::date <= ld.d
          JOIN (SELECT DISTINCT symbol FROM candidates) cand ON cand.symbol = dp.symbol
          WHERE dp.date::date >= ( (SELECT d FROM last_d) - INTERVAL '220 day' )
        ) b
      ),
      -- 과거 lookbackDays일 범위에서 정배열이 아닌 날의 개수를 체크
      prev_status AS (
        SELECT 
          symbol,
          COUNT(*) FILTER (
            WHERE NOT (ma20 > ma50 AND ma50 > ma100 AND ma100 > ma200)
          ) AS non_ordered_days_count
        FROM prev_ma
        WHERE rn BETWEEN 2 AND ${maxRn}  -- 최근 N일
        GROUP BY symbol
      )
      SELECT
        cand.symbol,
        cand.d            AS trade_date,
        cand.close        AS last_close,
        s.market_cap,
        -- 재무 데이터 (최근 4개 분기)
        qf.quarterly_data,
        qf.eps_q1         AS latest_eps
      FROM candidates cand
      LEFT JOIN prev_status ps ON ps.symbol = cand.symbol
      LEFT JOIN symbols s ON s.symbol = cand.symbol
      -- 최근 4개 분기 재무 데이터 JOIN
      LEFT JOIN LATERAL (
        SELECT
          json_agg(
            json_build_object(
              'period_end_date', period_end_date,
              'revenue', revenue::numeric,
              'eps_diluted', eps_diluted::numeric
            ) ORDER BY period_end_date DESC
          ) as quarterly_data,
          (
            SELECT eps_diluted::numeric
            FROM quarterly_financials
            WHERE symbol = cand.symbol
              AND eps_diluted IS NOT NULL
            ORDER BY period_end_date DESC
            LIMIT 1
          ) as eps_q1
        FROM (
          SELECT 
            period_end_date,
            revenue,
            eps_diluted
          FROM quarterly_financials
          WHERE symbol = cand.symbol
          ORDER BY period_end_date DESC
          LIMIT 4
        ) recent_quarters
      ) qf ON true
      WHERE 1=1
        -- justTurned: 최근 lookbackDays일 이내에 정배열이 아닌 날이 하나라도 있어야 함
        ${
          justTurned
            ? sql`AND COALESCE(ps.non_ordered_days_count, 0) > 0`
            : sql``
        }
        -- 수익성 필터 (최근 분기 EPS 기준)
        ${
          profitability === "profitable"
            ? sql`AND qf.eps_q1 IS NOT NULL AND qf.eps_q1 > 0`
            : profitability === "unprofitable"
            ? sql`AND qf.eps_q1 IS NOT NULL AND qf.eps_q1 < 0`
            : sql``
        }
      ORDER BY s.market_cap DESC NULLS LAST, cand.symbol ASC;
    `);

    type QueryResult = {
      symbol: string;
      trade_date: string;
      last_close: number;
      market_cap: number | null;
      quarterly_data: any[] | null;
      latest_eps: number | null;
    };

    const results = rows.rows as QueryResult[];
    const tradeDate = results.length > 0 ? results[0].trade_date : null;

    const data = results.map((r) => ({
      symbol: r.symbol,
      market_cap: r.market_cap,
      last_close: r.last_close,
      quarterly_financials: r.quarterly_data || [],
      profitability_status:
        r.latest_eps !== null && r.latest_eps > 0
          ? "profitable"
          : r.latest_eps !== null && r.latest_eps < 0
          ? "unprofitable"
          : "unknown",
      ordered: true,
      just_turned: justTurned,
    }));

    return NextResponse.json({
      count: data.length,
      trade_date: tradeDate,
      lookback_days: justTurned ? lookbackDays : null,
      data,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
