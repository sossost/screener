import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { handleApiError, logError } from "@/lib/errors";

// 동적 라우트 강제 (쿼리 파라미터 사용)
export const dynamic = "force-dynamic";

// 캐싱 설정: 24시간 (분기별 재무 데이터 기반)
// Next.js는 정적 분석을 위해 리터럴 값만 허용 (계산식/상수 참조 불가)
export const revalidate = 86400; // 1일 (60 * 60 * 24초)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const minRule40 = Number(searchParams.get("minRule40") ?? 40);
    const minYoY = Number(searchParams.get("minYoY") ?? 0);
    const minMcap = Number(searchParams.get("minMcap") ?? 100_000_000);
    const allowOTC = searchParams.get("allowOTC") === "true";
    const requireTTM = searchParams.get("requireTTM") !== "false";

    // 신규: 이상치 필터 파라미터
    const maxYoY = Number(searchParams.get("maxYoY") ?? 300); // YoY% <= 300%
    const minMargin = Number(searchParams.get("minMargin") ?? -60); // -60% <= OpMargin
    const maxMargin = Number(searchParams.get("maxMargin") ?? 60); // OpMargin <= 60%
    const minPrevTTMRev = Number(
      searchParams.get("minPrevTTMRev") ?? 100_000_000
    ); // 1년전 TTM 매출 최소
    const minTTMRev = Number(searchParams.get("minTTMRev") ?? 100_000_000); // 현재 TTM 매출 최소

    const rows = await db.execute(sql`
      WITH base AS (
        SELECT
          q.symbol,
          q.as_of_q,
          q.period_end_date,
          q.revenue::numeric          AS revenue,
          q.operating_income::numeric AS op_income
        FROM quarterly_financials q
        WHERE q.symbol ~ '^[A-Z]{1,5}$'
          AND q.symbol NOT LIKE '%W'
          AND q.symbol NOT LIKE '%X'
          AND q.symbol NOT LIKE '%.%'
          AND q.symbol NOT LIKE '%U'
          AND q.symbol NOT LIKE '%WS'
      ),
      ttm AS (
        SELECT
          b.symbol,
          b.as_of_q,
          b.period_end_date,
          SUM(b.revenue)   OVER (PARTITION BY b.symbol ORDER BY b.period_end_date
                                 ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) AS ttm_rev,
          SUM(b.op_income) OVER (PARTITION BY b.symbol ORDER BY b.period_end_date
                                 ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) AS ttm_op,
          ROW_NUMBER()     OVER (PARTITION BY b.symbol ORDER BY b.period_end_date DESC) AS rn_desc
        FROM base b
      ),
      ttm_yoy AS (
        SELECT
          t.*,
          LAG(ttm_rev, 4) OVER (PARTITION BY t.symbol ORDER BY t.period_end_date) AS ttm_rev_prev,
          CASE
            WHEN ttm_rev IS NOT NULL AND ttm_rev > 0
              THEN (ttm_op / ttm_rev) * 100.0
            ELSE NULL
          END AS ttm_op_margin_pct
        FROM ttm t
      ),
      scored AS (
        SELECT
          y.symbol,
          y.as_of_q,
          y.period_end_date,
          y.ttm_rev,
          y.ttm_op,
          y.ttm_rev_prev,
          y.ttm_op_margin_pct,
          CASE
            WHEN y.ttm_rev_prev IS NOT NULL AND y.ttm_rev_prev > 0
              THEN ((y.ttm_rev / y.ttm_rev_prev) - 1.0) * 100.0
            ELSE NULL
          END AS yoy_ttm_rev_growth_pct
        FROM ttm_yoy y
        WHERE y.rn_desc = 1
      )
      SELECT
        s.symbol,
        s.as_of_q,
        s.period_end_date,
        s.ttm_rev,
        s.ttm_op,
        s.ttm_rev_prev,
        s.yoy_ttm_rev_growth_pct,
        s.ttm_op_margin_pct,
        (COALESCE(s.yoy_ttm_rev_growth_pct, 0) + COALESCE(s.ttm_op_margin_pct, 0)) AS rule40_score,
        sym.market_cap,
        sym.exchange,
        sym.is_etf,
        sym.is_fund
      FROM scored s
      JOIN symbols sym ON sym.symbol = s.symbol
      WHERE
        -- 시총 컷
        (sym.market_cap IS NOT NULL AND sym.market_cap::numeric >= ${minMcap})
        AND (sym.is_etf IS NOT TRUE)
        AND (sym.is_fund IS NOT TRUE)
        AND (${
          allowOTC
            ? sql`TRUE`
            : sql`(sym.exchange NOT ILIKE 'OTC%' AND sym.exchange NOT ILIKE 'PINK%')`
        })

        -- TTM 품질컷
        ${
          requireTTM
            ? sql`
          AND s.ttm_rev IS NOT NULL AND s.ttm_rev > 0
          AND s.ttm_rev_prev IS NOT NULL AND s.ttm_rev_prev > 0
        `
            : sql``
        }

        -- 최소 규모(너무 작은 분모 배제)
        AND (s.ttm_rev IS NULL OR s.ttm_rev >= ${minTTMRev})
        AND (s.ttm_rev_prev IS NULL OR s.ttm_rev_prev >= ${minPrevTTMRev})

        -- YoY 범위 (하한 & 상한)
        AND (s.yoy_ttm_rev_growth_pct IS NOT NULL AND s.yoy_ttm_rev_growth_pct >= ${minYoY})
        AND (s.yoy_ttm_rev_growth_pct <= ${maxYoY})

        -- 마진 범위 (현실적인 구간)
        AND (s.ttm_op_margin_pct IS NOT NULL AND s.ttm_op_margin_pct BETWEEN ${minMargin} AND ${maxMargin})

        -- 최종 Rule of 40 임계치
        AND ((COALESCE(s.yoy_ttm_rev_growth_pct,0) + COALESCE(s.ttm_op_margin_pct,0)) >= ${minRule40})

      ORDER BY
        (COALESCE(s.yoy_ttm_rev_growth_pct,0) + COALESCE(s.ttm_op_margin_pct,0)) DESC,
        s.period_end_date DESC,
        s.symbol ASC;
    `);

    const companies = (rows.rows as any[]).map((r) => ({
      symbol: r.symbol,
      as_of_q: r.as_of_q,
      period_end_date: r.period_end_date,
      ttm_rev: r.ttm_rev,
      ttm_op: r.ttm_op,
      ttm_rev_prev: r.ttm_rev_prev,
      yoy_ttm_rev_growth_pct: r.yoy_ttm_rev_growth_pct,
      ttm_op_margin_pct: r.ttm_op_margin_pct,
      rule40_score: r.rule40_score,
      market_cap: r.market_cap,
      exchange: r.exchange,
      is_etf: r.is_etf,
      is_fund: r.is_fund,
    }));

    return NextResponse.json({ count: companies.length, companies });
  } catch (error) {
    logError(error, "Rule of 40 API");
    const apiError = handleApiError(error);

    return NextResponse.json(
      {
        error: apiError.message,
        details: apiError.details,
      },
      { status: apiError.statusCode }
    );
  }
}
