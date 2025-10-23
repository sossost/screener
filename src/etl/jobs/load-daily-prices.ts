// src/etl/jobs/load-daily-prices.ts
import "dotenv/config";
import pLimit from "p-limit";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { fetchJson, sleep, toStrNum } from "../utils";
import { dailyPrices } from "@/db/schema";

const API = process.env.DATA_API!;
const KEY = process.env.FMP_API_KEY!;
const CONCURRENCY = 3;
const PAUSE_MS = 300;

async function loadOne(sym: string, N = 20) {
  // full=5000개, slice도 가능. 여기선 최근 n일만.
  const url = `${API}/api/v3/historical-price-full/${sym}?timeseries=${N}&apikey=${KEY}`;
  const j = await fetchJson(url).catch((e) => {
    console.error(e);
    return [];
  });
  console.log(j);
  const rows: any[] = j?.historical ?? [];
  if (!rows.length) throw new Error(`no prices: ${sym}`);

  // 오래→최근 정렬로 들어오면 그대로 사용
  for (const r of rows) {
    await db
      .insert(dailyPrices)
      .values({
        symbol: sym,
        date: r.date, // 'YYYY-MM-DD'
        open: toStrNum(r.open),
        high: toStrNum(r.high),
        low: toStrNum(r.low),
        close: toStrNum(r.close),
        adjClose: toStrNum(r.adjClose ?? r.close),
        volume: toStrNum(r.volume),
      })
      .onConflictDoUpdate({
        target: [dailyPrices.symbol, dailyPrices.date],
        set: {
          open: toStrNum(r.open),
          high: toStrNum(r.high),
          low: toStrNum(r.low),
          close: toStrNum(r.close),
          adjClose: toStrNum(r.adjClose ?? r.close),
          volume: toStrNum(r.volume),
        },
      });
  }
}

async function main() {
  const rs = await db.execute(sql`SELECT symbol FROM symbols`);
  const syms: string[] = ((rs as any).rows ?? rs).map((r: any) => r.symbol);

  const limit = pLimit(CONCURRENCY);
  let ok = 0,
    skip = 0;

  await Promise.all(
    syms.map((s) =>
      limit(async () => {
        try {
          await loadOne(s);
          ok++;
          if (ok % 50 === 0) console.log("loaded", ok, s);
        } catch (e: any) {
          skip++;
          console.warn("skip", s, e?.message);
        } finally {
          await sleep(PAUSE_MS);
        }
      })
    )
  );
  console.log("prices done", { ok, skip });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
