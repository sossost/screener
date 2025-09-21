import "dotenv/config";
import pLimit from "p-limit";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { asQuarter, fetchJson, sleep, toStrNum } from "../utils";
import { quarterlyRatios } from "@/db/schema";

const API = process.env.DATA_API! + "/stable";
const KEY = process.env.FMP_API_KEY!;
const CONCURRENCY = 4;
const PAUSE_MS = 200;
const LIMIT_Q = 12; // 최근 12분기

async function upsertRatios(sym: string, row: any) {
  const date = row.date as string;
  const asQ = asQuarter(date);

  await db
    .insert(quarterlyRatios)
    .values({
      symbol: sym,
      periodEndDate: date,
      asOfQ: asQ,

      // Valuation
      peRatio: toStrNum(row.priceToEarningsRatio),
      pegRatio: toStrNum(row.priceToEarningsGrowthRatio),
      fwdPegRatio: toStrNum(row.forwardPriceToEarningsGrowthRatio),
      psRatio: toStrNum(row.priceToSalesRatio),
      pbRatio: toStrNum(row.priceToBookRatio),
      evEbitda: toStrNum(row.enterpriseValueMultiple),

      // Profitability
      grossMargin: toStrNum(row.grossProfitMargin),
      opMargin: toStrNum(row.operatingProfitMargin),
      netMargin: toStrNum(row.netProfitMargin),

      // Leverage
      debtEquity: toStrNum(row.debtToEquityRatio),
      debtAssets: toStrNum(row.debtToAssetsRatio),
      debtMktCap: toStrNum(row.debtToMarketCap),
      intCoverage: toStrNum(row.interestCoverageRatio),

      // Cash flow
      pOCFRatio: toStrNum(row.priceToOperatingCashFlowRatio),
      pFCFRatio: toStrNum(row.priceToFreeCashFlowRatio),
      ocfRatio: toStrNum(row.operatingCashFlowRatio),
      fcfPerShare: toStrNum(row.freeCashFlowPerShare),

      // Dividend
      divYield: toStrNum(row.dividendYield),
      payoutRatio: toStrNum(row.dividendPayoutRatio),
    })
    .onConflictDoUpdate({
      target: [quarterlyRatios.symbol, quarterlyRatios.periodEndDate],
      set: {
        peRatio: toStrNum(row.priceToEarningsRatio),
        pegRatio: toStrNum(row.priceToEarningsGrowthRatio),
        fwdPegRatio: toStrNum(row.forwardPriceToEarningsGrowthRatio),
        psRatio: toStrNum(row.priceToSalesRatio),
        pbRatio: toStrNum(row.priceToBookRatio),
        evEbitda: toStrNum(row.enterpriseValueMultiple),

        grossMargin: toStrNum(row.grossProfitMargin),
        opMargin: toStrNum(row.operatingProfitMargin),
        netMargin: toStrNum(row.netProfitMargin),

        debtEquity: toStrNum(row.debtToEquityRatio),
        debtAssets: toStrNum(row.debtToAssetsRatio),
        debtMktCap: toStrNum(row.debtToMarketCap),
        intCoverage: toStrNum(row.interestCoverageRatio),

        pOCFRatio: toStrNum(row.priceToOperatingCashFlowRatio),
        pFCFRatio: toStrNum(row.priceToFreeCashFlowRatio),
        ocfRatio: toStrNum(row.operatingCashFlowRatio),
        fcfPerShare: toStrNum(row.freeCashFlowPerShare),

        divYield: toStrNum(row.dividendYield),
        payoutRatio: toStrNum(row.dividendPayoutRatio),
      },
    });
}

async function loadOne(symbol: string) {
  const rows: any[] = await fetchJson(
    `${API}/ratios?symbol=${symbol}&period=quarter&limit=${LIMIT_Q}&apikey=${KEY}`
  ).catch((e) => {
    console.error(e);
    return [];
  });
  if (!rows.length) throw new Error(`no ratios: ${symbol}`);
  console.log(rows);

  rows.sort((a, b) => (a.date < b.date ? 1 : -1)); // 최신 → 과거

  for (const r of rows) {
    await upsertRatios(symbol, r);
  }
}

async function main() {
  const rs = await db.execute(sql`SELECT symbol FROM symbols`);
  const syms: string[] = ((rs as any).rows ?? rs).map((r: any) => r.symbol);

  const limit = pLimit(CONCURRENCY);
  let done = 0,
    skip = 0;

  await Promise.all(
    syms.map((sym) =>
      limit(async () => {
        try {
          await loadOne(sym);
          done++;
          if (done % 50 === 0) console.log("done", done, sym);
        } catch (e: any) {
          skip++;
          console.warn("skip", sym, e?.message);
        } finally {
          await sleep(PAUSE_MS);
        }
      })
    )
  );

  console.log("ratios load done", { done, skip });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
