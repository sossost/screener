// app/api/screener/golden-cross/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const justTurned = searchParams.get("justTurned") === "true";
    const minMcap = Number(searchParams.get("minMcap") ?? 0);
    const minPrice = Number(searchParams.get("minPrice") ?? 0);
    const minAvgVol = Number(searchParams.get("minAvgVol") ?? 0);
    const allowOTC = searchParams.get("allowOTC") === "true";

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
      prev AS (
        SELECT symbol, ma20, ma50, ma100, ma200
        FROM prev_ma
        WHERE rn = 2  -- 전일(이전 영업일)
      )
      SELECT
        cand.symbol,
        cand.d            AS trade_date,
        cand.close        AS last_close,
        cand.ma20, cand.ma50, cand.ma100, cand.ma200
      FROM candidates cand
      LEFT JOIN prev pv ON pv.symbol = cand.symbol
      -- justTurned: 전일은 정배열이 아니어야 함
      ${
        justTurned
          ? sql`WHERE COALESCE( (pv.ma20 > pv.ma50 AND pv.ma50 > pv.ma100 AND pv.ma100 > pv.ma200), FALSE ) = FALSE`
          : sql``
      }
      ORDER BY cand.symbol ASC;
    `);

    const data = (rows.rows as any[]).map((r) => ({
      symbol: r.symbol,
      date: r.trade_date,
      last_close: r.last_close,
      ma20: r.ma20,
      ma50: r.ma50,
      ma100: r.ma100,
      ma200: r.ma200,
      ordered: true,
      just_turned: justTurned,
    }));

    return NextResponse.json({ count: data.length, data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
