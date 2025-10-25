// src/etl/jobs/build-daily-ma.ts
import "dotenv/config";
import { db } from "@/db/client";
import { sql, eq } from "drizzle-orm";
import { dailyMa, symbols } from "@/db/schema";
import { sleep } from "../utils";
import {
  validateEnvironmentVariables,
  validateMovingAverageData,
} from "../utils/validation";
import { retryDatabaseOperation, DEFAULT_RETRY_OPTIONS } from "../utils/retry";

const BATCH_SIZE = 50;
const PAUSE_MS = 100;

async function calculateMAForSymbol(symbol: string, targetDate: string) {
  console.log(`📊 Calculating MA for ${symbol} on ${targetDate}`);

  // 해당 심볼의 최근 220일 데이터를 가져와서 MA 계산
  const prices = await retryDatabaseOperation(
    () =>
      db.execute(sql`
      SELECT 
        date,
        adj_close::numeric as close,
        volume::numeric as volume
      FROM daily_prices 
      WHERE symbol = ${symbol} 
        AND date <= ${targetDate}
        AND adj_close IS NOT NULL
      ORDER BY date DESC
      LIMIT 220
    `),
    DEFAULT_RETRY_OPTIONS
  );

  const priceRows = (prices.rows as any[]).reverse(); // 오래된 순으로 정렬

  if (priceRows.length < 200) {
    console.log(
      `⚠️ Insufficient data for ${symbol}: ${priceRows.length} days (need 200+)`
    );
    return null;
  }

  // MA 계산
  const ma20 = calculateMA(priceRows, 20);
  const ma50 = calculateMA(priceRows, 50);
  const ma100 = calculateMA(priceRows, 100);
  const ma200 = calculateMA(priceRows, 200);

  // Volume MA30 계산
  const volMa30 = calculateVolumeMA(priceRows, 30);

  const maData = {
    symbol,
    date: targetDate,
    ma20: ma20?.toString() || null,
    ma50: ma50?.toString() || null,
    ma100: ma100?.toString() || null,
    ma200: ma200?.toString() || null,
    volMa30: volMa30?.toString() || null,
  };

  // 데이터 검증
  const validationResult = validateMovingAverageData(maData);
  if (!validationResult.isValid) {
    console.warn(
      `⚠️ MA data validation warnings for ${symbol}:`,
      validationResult.errors
    );
  }

  console.log(
    `✅ Calculated MA for ${symbol}: MA20=${ma20?.toFixed(
      2
    )}, MA50=${ma50?.toFixed(2)}, MA200=${ma200?.toFixed(2)}`
  );

  return maData;
}

function calculateMA(prices: any[], period: number): number | null {
  if (prices.length < period) return null;

  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((acc, p) => acc + Number(p.close), 0);
  return sum / period;
}

function calculateVolumeMA(prices: any[], period: number): number | null {
  if (prices.length < period) return null;

  const recentVolumes = prices.slice(-period);
  const sum = recentVolumes.reduce((acc, p) => acc + Number(p.volume || 0), 0);
  return sum / period;
}

async function processBatch(symbols: string[], targetDate: string) {
  const results = [];
  const errors = [];

  for (const symbol of symbols) {
    try {
      const maData = await calculateMAForSymbol(symbol, targetDate);
      if (maData) {
        // daily_ma 테이블에 upsert (재시도 로직 적용)
        await retryDatabaseOperation(
          () =>
            db
              .insert(dailyMa)
              .values(maData)
              .onConflictDoUpdate({
                target: [dailyMa.symbol, dailyMa.date],
                set: {
                  ma20: maData.ma20,
                  ma50: maData.ma50,
                  ma100: maData.ma100,
                  ma200: maData.ma200,
                  volMa30: maData.volMa30,
                },
              }),
          DEFAULT_RETRY_OPTIONS
        );

        results.push(symbol);
      }
    } catch (error) {
      console.error(`❌ Error processing ${symbol}:`, error);
      errors.push({ symbol, error: error.message });
    }

    await sleep(PAUSE_MS);
  }

  if (errors.length > 0) {
    console.warn(
      `⚠️ ${errors.length} symbols failed processing:`,
      errors.map((e) => e.symbol)
    );
  }

  return results;
}

async function main() {
  console.log("🚀 Starting Daily MA ETL...");

  // 환경 변수 검증
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed:", envValidation.errors);
    process.exit(1);
  }

  if (envValidation.warnings.length > 0) {
    console.warn("⚠️ Environment warnings:", envValidation.warnings);
  }

  const args = process.argv.slice(2);
  const isBackfill = args.includes("backfill");

  let targetDate: string;

  if (isBackfill) {
    // 백필 모드: 최근 30일간의 MA 계산
    console.log("📊 Running backfill mode - calculating MA for last 30 days");
    const result = await retryDatabaseOperation(
      () =>
        db.execute(sql`
        SELECT DISTINCT date 
        FROM daily_prices 
        WHERE date >= (CURRENT_DATE - INTERVAL '30 days')
        ORDER BY date DESC
      `),
      DEFAULT_RETRY_OPTIONS
    );

    const dates = (result.rows as any[]).map((r) => r.date);
    console.log(`📅 Found ${dates.length} dates to process`);

    for (const date of dates) {
      console.log(`📊 Processing date: ${date}`);
      await processDate(date);
    }
  } else {
    // 일반 모드: 최신 날짜만 처리
    const result = await retryDatabaseOperation(
      () =>
        db.execute(sql`
        SELECT MAX(date) as latest_date FROM daily_prices
      `),
      DEFAULT_RETRY_OPTIONS
    );

    targetDate = (result.rows as any[])[0]?.latest_date;
    if (!targetDate) {
      console.error("❌ No price data found");
      return;
    }

    console.log(`📊 Processing latest date: ${targetDate}`);
    await processDate(targetDate);
  }
}

async function processDate(targetDate: string) {
  const startTime = Date.now();

  // 해당 날짜에 가격 데이터가 있는 모든 심볼 가져오기
  const result = await retryDatabaseOperation(
    () =>
      db.execute(sql`
      SELECT DISTINCT symbol 
      FROM daily_prices 
      WHERE date = ${targetDate}
      ORDER BY symbol
    `),
    DEFAULT_RETRY_OPTIONS
  );

  const symbols = (result.rows as any[]).map((r) => r.symbol);
  console.log(`📊 Found ${symbols.length} symbols for date ${targetDate}`);

  if (symbols.length === 0) {
    console.warn(`⚠️ No symbols found for date ${targetDate}`);
    return;
  }

  let totalProcessed = 0;
  let totalErrors = 0;

  // 배치 단위로 처리
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    console.log(
      `📊 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        symbols.length / BATCH_SIZE
      )} (${batch.length} symbols)`
    );

    const processed = await processBatch(batch, targetDate);
    totalProcessed += processed.length;
    totalErrors += batch.length - processed.length;

    console.log(
      `✅ Processed ${processed.length}/${batch.length} symbols in this batch`
    );
  }

  const totalTime = Date.now() - startTime;
  console.log(`✅ Completed processing for date: ${targetDate}`);
  console.log(
    `📊 Results: ${totalProcessed} successful, ${totalErrors} failed`
  );
  console.log(`⏱️ Total time: ${Math.round(totalTime / 1000)}s`);
}

// 스크립트가 직접 실행될 때만 함수 호출
if (require.main === module) {
  main()
    .then(() => {
      console.log("✅ Daily MA ETL completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Daily MA ETL failed:", error);
      process.exit(1);
    });
}

export { main as buildDailyMA };
