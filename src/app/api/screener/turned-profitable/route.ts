// app/api/screener/turned-profitable/route.ts
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

    const requireOCF = searchParams.get("ocf") !== "false"; // 기본 OCF>0
    const epsCap = Number(searchParams.get("epsCap") ?? 10); // |EPS| 상한
    const minMcap = Number(searchParams.get("minMcap") ?? 3e8); // 기본 $300M 컷
    const allowOTC = searchParams.get("allowOTC") === "true"; // OTC 허용할지
    const dedupe = searchParams.get("dedupe") !== "false"; // 중복 제거

    // 1) 심볼별 최신 분기에서 전환 판정
    const rows = await db.execute(sql`
      WITH hist AS (
        SELECT
          qf.symbol,
          qf.as_of_q,
          qf.period_end_date,
          qf.net_income::numeric          AS net_income,
          qf.eps_diluted::numeric         AS eps,
          qf.operating_cash_flow::numeric AS ocf,
          ROW_NUMBER() OVER (PARTITION BY qf.symbol ORDER BY qf.period_end_date DESC) AS rn
        FROM quarterly_financials qf
        WHERE qf.symbol ~ '^[A-Z0-9\\.]+$'
          AND LENGTH(qf.symbol) <= 5
          AND qf.symbol NOT LIKE '%.U' AND qf.symbol NOT LIKE '%U'
          AND qf.symbol NOT LIKE '%.W%' AND qf.symbol NOT LIKE '%W' AND qf.symbol NOT LIKE '%WS'
      ),
      turned AS (
        SELECT h.*
        FROM hist h
        WHERE h.rn = 1                     -- 최신 분기만
          AND h.net_income > 0             -- 이번 분기 흑자
          ${requireOCF ? sql`AND (h.ocf IS NULL OR h.ocf > 0)` : sql``}
          -- 과거에 적자는 있었어야 하고
          AND EXISTS (
            SELECT 1 FROM hist h2
            WHERE h2.symbol = h.symbol
              AND h2.period_end_date < h.period_end_date
              AND h2.net_income < 0
          )
          -- 과거에 흑자가 단 한 번도 없었던 경우만
          AND NOT EXISTS (
            SELECT 1 FROM hist h3
            WHERE h3.symbol = h.symbol
              AND h3.period_end_date < h.period_end_date
              AND h3.net_income > 0
          )
          -- EPS 조건도 함께 적용
          AND (h.eps IS NULL OR ABS(h.eps) <= ${epsCap})
      )
      SELECT
        t.symbol, t.as_of_q, t.period_end_date,
        t.net_income, t.eps, t.ocf,
        c.market_cap, c.exchange, c.is_etf, c.is_fund
      FROM turned t
      JOIN companies c ON c.symbol = t.symbol
      WHERE
        (c.market_cap IS NOT NULL AND c.market_cap::numeric >= ${minMcap})
        AND (c.is_etf IS NOT TRUE)
        AND (c.is_fund IS NOT TRUE)
        AND (${
          allowOTC
            ? sql`TRUE`
            : sql`(c.exchange NOT ILIKE 'OTC%' AND c.exchange NOT ILIKE 'PINK%')`
        })
      ORDER BY t.period_end_date DESC, t.net_income DESC NULLS LAST, t.symbol ASC;
    `);

    // 2) JS 후처리: 완전 동일 값 dedupe (옵션)
    type R = {
      symbol: string;
      as_of_q: string;
      period_end_date: string;
      net_income: string | null;
      eps: string | null;
      ocf: string | null;
      prev_net_income: string | null;
      prev_eps: string | null;
      market_cap: string | null;
      exchange: string | null;
      is_etf: boolean | null;
      is_fund: boolean | null;
    };

    let companies: R[] = (rows.rows as any[]).map((r) => ({
      symbol: r.symbol,
      as_of_q: r.as_of_q,
      period_end_date: r.period_end_date,
      net_income: r.net_income ?? null,
      eps: r.eps ?? null,
      ocf: r.ocf ?? null,
      prev_net_income: r.prev_net_income ?? null,
      prev_eps: r.prev_eps ?? null,
      market_cap: r.market_cap ?? null,
      exchange: r.exchange ?? null,
      is_etf: r.is_etf ?? null,
      is_fund: r.is_fund ?? null,
    }));

    if (dedupe) {
      const seen = new Set<string>();
      companies = companies.filter((c) => {
        const key = [
          c.period_end_date,
          c.as_of_q,
          c.net_income ?? "null",
          c.eps ?? "null",
          c.ocf ?? "null",
          c.prev_net_income ?? "null",
          c.prev_eps ?? "null",
        ].join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return NextResponse.json({ count: companies.length, companies });
  } catch (error) {
    logError(error, "Turned Profitable API");
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
