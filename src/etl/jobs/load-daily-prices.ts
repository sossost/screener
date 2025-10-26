// src/etl/jobs/load-daily-prices.ts
import "dotenv/config";
import pLimit from "p-limit";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { fetchJson, sleep, toStrNum } from "../utils";
import { dailyPrices, symbols } from "@/db/schema";
import {
  validateEnvironmentVariables,
  validatePriceData,
  validateBatchData,
} from "../utils/validation";
import {
  retryApiCall,
  retryDatabaseOperation,
  DEFAULT_RETRY_OPTIONS,
} from "../utils/retry";

const API = process.env.DATA_API!;
const KEY = process.env.FMP_API_KEY!;
const CONCURRENCY = 3;
const PAUSE_MS = 300;

// 일반 모드: 최근 5일만 (주말 + 휴일 고려)
// 백필 모드: 200일
const DEFAULT_DAYS = 5;
const BACKFILL_DAYS = 250;

async function loadOne(sym: string, N: number) {
  console.log(`📊 Loading prices for ${sym} (${N} days)`);

  // full=5000개, slice도 가능. 여기선 최근 n일만.
  const url = `${API}/api/v3/historical-price-full/${sym}?timeseries=${N}&apikey=${KEY}`;

  // API 호출 (재시도 로직 적용)
  const j = await retryApiCall(
    () => fetchJson(url),
    DEFAULT_RETRY_OPTIONS
  ).catch((e) => {
    console.error(`❌ Failed to fetch prices for ${sym}:`, e);
    return { historical: [] };
  });

  const rows: any[] = j?.historical ?? [];
  if (!rows.length) {
    throw new Error(`No price data available for ${sym}`);
  }

  console.log(`📈 Found ${rows.length} price records for ${sym}`);

  // 데이터 검증
  const priceDataArray = rows.map((r) => ({
    symbol: sym,
    date: r.date,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }));

  const validationResult = validateBatchData(priceDataArray, validatePriceData);
  if (!validationResult.isValid) {
    console.warn(
      `⚠️ Price data validation warnings for ${sym}:`,
      validationResult.errors
    );
  }

  // 배치 처리로 성능 개선
  const batchSize = 10;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    for (const r of batch) {
      await retryDatabaseOperation(
        () =>
          db
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
            }),
        DEFAULT_RETRY_OPTIONS
      );
    }
  }

  console.log(`✅ Successfully loaded ${rows.length} price records for ${sym}`);
}

async function main() {
  console.log("🚀 Starting Daily Prices ETL...");

  // 환경 변수 검증
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed:", envValidation.errors);
    process.exit(1);
  }

  if (envValidation.warnings.length > 0) {
    console.warn("⚠️ Environment warnings:", envValidation.warnings);
  }

  // 백필 모드 확인
  const args = process.argv.slice(2);
  const isBackfill = args.includes("backfill");
  const daysToLoad = isBackfill ? BACKFILL_DAYS : DEFAULT_DAYS;

  console.log(
    `📊 Mode: ${isBackfill ? "BACKFILL" : "INCREMENTAL"} (${daysToLoad} days)`
  );

  // 활성 심볼들 가져오기
  const activeSymbols = await db
    .select({ symbol: symbols.symbol })
    .from(symbols)
    .where(eq(symbols.isActivelyTrading, true));

  const syms: string[] = activeSymbols.map((s) => s.symbol);

  if (syms.length === 0) {
    throw new Error(
      "No active symbols found in database. Please run 'symbols' job first."
    );
  }

  console.log(`📊 Processing ${syms.length} active symbols`);

  const limit = pLimit(CONCURRENCY);
  let ok = 0,
    skip = 0;
  const startTime = Date.now();

  await Promise.all(
    syms.map((s) =>
      limit(async () => {
        try {
          await loadOne(s, daysToLoad);
          ok++;
          if (ok % 50 === 0) {
            console.log(
              `📊 Progress: ${ok}/${syms.length} symbols processed (${s})`
            );
          }
        } catch (e: any) {
          skip++;
          console.warn(`⚠️ Skipped ${s}: ${e?.message}`);
        } finally {
          await sleep(PAUSE_MS);
        }
      })
    )
  );

  const totalTime = Date.now() - startTime;
  const totalRecords = ok * daysToLoad;

  console.log(`✅ Daily Prices ETL completed!`);
  console.log(`📊 Mode: ${isBackfill ? "BACKFILL" : "INCREMENTAL"}`);
  console.log(`📊 Results: ${ok} successful, ${skip} skipped`);
  console.log(
    `📊 Estimated records processed: ~${totalRecords.toLocaleString()}`
  );
  console.log(`⏱️ Total time: ${Math.round(totalTime / 1000)}s`);
  console.log(
    `📈 Average time per symbol: ${Math.round(totalTime / syms.length)}ms`
  );
}

// 스크립트가 직접 실행될 때만 함수 호출
if (require.main === module) {
  main()
    .then(() => {
      console.log("✅ Daily Prices ETL completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Daily Prices ETL failed:", error);
      process.exit(1);
    });
}

export { main as loadDailyPrices };
