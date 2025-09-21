import "dotenv/config";
import pLimit from "p-limit";
import { db } from "@/db/client";
import { quarterlyFinancials } from "@/db/schema";
import { sql } from "drizzle-orm";
import { asQuarter, fetchJson, sleep, toStrNum, ensureSymbol } from "../utils";

const API = process.env.DATA_URL! + "/stable";
const KEY = process.env.FMP_API_KEY!;
const CONCURRENCY = 4;
const PAUSE_MS = 150;
const LIMIT_Q = 12;

async function upsertQuarter(sym: string, row: any) {
  const date = row.date as string;
  const asQ = asQuarter(date);

  await db
    .insert(quarterlyFinancials)
    .values({
      symbol: sym,
      periodEndDate: date,
      asOfQ: asQ,

      revenue: toStrNum(row.revenue),
      netIncome: toStrNum(row.netIncome),
      operatingIncome: toStrNum(row.operatingIncome),
      ebitda: toStrNum(row.ebitda),
      grossProfit: toStrNum(row.grossProfit),

      operatingCashFlow: toStrNum(row.operatingCashFlow),
      freeCashFlow: toStrNum(row.freeCashFlow),

      epsDiluted: toStrNum(row.eps),
      epsBasic: null,
    })
    .onConflictDoUpdate({
      target: [quarterlyFinancials.symbol, quarterlyFinancials.periodEndDate],
      set: {
        asOfQ: asQ,
        revenue: toStrNum(row.revenue),
        netIncome: toStrNum(row.netIncome),
        operatingIncome: toStrNum(row.operatingIncome),
        ebitda: toStrNum(row.ebitda),
        grossProfit: toStrNum(row.grossProfit),
        operatingCashFlow: toStrNum(row.operatingCashFlow),
        freeCashFlow: toStrNum(row.freeCashFlow),
        epsDiluted: toStrNum(row.eps),
        epsBasic: null,
      },
    });
}

async function loadOne(symbol: string) {
  // 손익
  const isRows: any[] = await fetchJson(
    `${API}/income-statement?symbol=${symbol}&period=quarter&limit=${LIMIT_Q}&apikey=${KEY}`
  ).catch(() => []);
  isRows.sort((a, b) => (a.date < b.date ? 1 : -1)); // 최신→과거

  // 현금흐름
  await sleep(PAUSE_MS);
  const cfRows: any[] = await fetchJson(
    `${API}/cash-flow-statement?symbol=${symbol}&period=quarter&limit=${LIMIT_Q}&apikey=${KEY}`
  ).catch(() => []);
  cfRows.sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!isRows.length) throw new Error(`no income rows: ${symbol}`);

  // date 기준으로 병합 맵
  const map = new Map<string, any>();
  for (const r of isRows) map.set(r.date, { ...r });
  for (const r of cfRows) {
    const cur = map.get(r.date) ?? { date: r.date };
    map.set(r.date, { ...cur, ...r }); // operatingCashFlow/freeCashFlow 등 합치기
  }

  await ensureSymbol(symbol);

  // 최신부터 LIMIT_Q개 업서트
  for (const [, row] of map) {
    await upsertQuarter(symbol, row);
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

  console.log("quarterly load done", { done, skip });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
