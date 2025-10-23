// src/etl/jobs/build-daily-ma.ts
import "dotenv/config";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { dailyMa } from "@/db/schema";
import { sleep } from "../utils";

const BATCH_SIZE = 50;
const PAUSE_MS = 100;

async function calculateMAForSymbol(symbol: string, targetDate: string) {
  // 해당 심볼의 최근 220일 데이터를 가져와서 MA 계산
  const prices = await db.execute(sql`
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
  `);

  const priceRows = (prices.rows as any[]).reverse(); // 오래된 순으로 정렬

  if (priceRows.length < 200) {
    console.log(`Insufficient data for ${symbol}: ${priceRows.length} days`);
    return null;
  }

  // MA 계산
  const ma20 = calculateMA(priceRows, 20);
  const ma50 = calculateMA(priceRows, 50);
  const ma100 = calculateMA(priceRows, 100);
  const ma200 = calculateMA(priceRows, 200);

  // Volume MA30 계산
  const volMa30 = calculateVolumeMA(priceRows, 30);

  return {
    symbol,
    date: targetDate,
    ma20: ma20?.toString() || null,
    ma50: ma50?.toString() || null,
    ma100: ma100?.toString() || null,
    ma200: ma200?.toString() || null,
    volMa30: volMa30?.toString() || null,
  };
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

  for (const symbol of symbols) {
    try {
      const maData = await calculateMAForSymbol(symbol, targetDate);
      if (maData) {
        // daily_ma 테이블에 upsert
        await db
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
          });

        results.push(symbol);
      }
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
    }

    await sleep(PAUSE_MS);
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const isBackfill = args.includes("backfill");

  let targetDate: string;

  if (isBackfill) {
    // 백필 모드: 최근 30일간의 MA 계산
    console.log("Running backfill mode - calculating MA for last 30 days");
    const result = await db.execute(sql`
      SELECT DISTINCT date 
      FROM daily_prices 
      WHERE date >= (CURRENT_DATE - INTERVAL '30 days')
      ORDER BY date DESC
    `);

    const dates = (result.rows as any[]).map((r) => r.date);
    console.log(`Found ${dates.length} dates to process`);

    for (const date of dates) {
      console.log(`Processing date: ${date}`);
      await processDate(date);
    }
  } else {
    // 일반 모드: 최신 날짜만 처리
    const result = await db.execute(sql`
      SELECT MAX(date) as latest_date FROM daily_prices
    `);

    targetDate = (result.rows as any[])[0]?.latest_date;
    if (!targetDate) {
      console.error("No price data found");
      return;
    }

    console.log(`Processing latest date: ${targetDate}`);
    await processDate(targetDate);
  }
}

async function processDate(targetDate: string) {
  // 해당 날짜에 가격 데이터가 있는 모든 심볼 가져오기
  const result = await db.execute(sql`
    SELECT DISTINCT symbol 
    FROM daily_prices 
    WHERE date = ${targetDate}
    ORDER BY symbol
  `);

  const symbols = (result.rows as any[]).map((r) => r.symbol);
  console.log(`Found ${symbols.length} symbols for date ${targetDate}`);

  // 배치 단위로 처리
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        symbols.length / BATCH_SIZE
      )}`
    );

    const processed = await processBatch(batch, targetDate);
    console.log(
      `Processed ${processed.length}/${batch.length} symbols in this batch`
    );
  }

  console.log(`Completed processing for date: ${targetDate}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
