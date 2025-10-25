import "dotenv/config";
import pLimit from "p-limit";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { asQuarter, fetchJson, sleep, toStrNum } from "../utils";
import { quarterlyRatios, symbols } from "@/db/schema";
import {
  validateEnvironmentVariables,
  validateRatioData,
} from "../utils/validation";
import {
  retryApiCall,
  retryDatabaseOperation,
  DEFAULT_RETRY_OPTIONS,
} from "../utils/retry";

const API = process.env.DATA_API! + "/stable";
const KEY = process.env.FMP_API_KEY!;
const CONCURRENCY = 4;
const PAUSE_MS = 200;
const LIMIT_Q = 12; // 최근 12분기

async function upsertRatios(sym: string, row: any) {
  const date = row.date as string;
  const asQ = asQuarter(date);

  const ratioData = {
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
  };

  // 데이터 검증
  const validationResult = validateRatioData(ratioData);
  if (!validationResult.isValid) {
    console.warn(
      `⚠️ Ratio data validation warnings for ${sym} (${date}):`,
      validationResult.errors
    );
  }

  await retryDatabaseOperation(
    () =>
      db
        .insert(quarterlyRatios)
        .values(ratioData)
        .onConflictDoUpdate({
          target: [quarterlyRatios.symbol, quarterlyRatios.periodEndDate],
          set: {
            peRatio: ratioData.peRatio,
            pegRatio: ratioData.pegRatio,
            fwdPegRatio: ratioData.fwdPegRatio,
            psRatio: ratioData.psRatio,
            pbRatio: ratioData.pbRatio,
            evEbitda: ratioData.evEbitda,

            grossMargin: ratioData.grossMargin,
            opMargin: ratioData.opMargin,
            netMargin: ratioData.netMargin,

            debtEquity: ratioData.debtEquity,
            debtAssets: ratioData.debtAssets,
            debtMktCap: ratioData.debtMktCap,
            intCoverage: ratioData.intCoverage,

            pOCFRatio: ratioData.pOCFRatio,
            pFCFRatio: ratioData.pFCFRatio,
            ocfRatio: ratioData.ocfRatio,
            fcfPerShare: ratioData.fcfPerShare,

            divYield: ratioData.divYield,
            payoutRatio: ratioData.payoutRatio,
          },
        }),
    DEFAULT_RETRY_OPTIONS
  );
}

async function loadOne(symbol: string) {
  console.log(`📊 Loading ratios for ${symbol}`);

  // API 호출 (재시도 로직 적용)
  const rows: any[] = await retryApiCall(
    () =>
      fetchJson(
        `${API}/ratios?symbol=${symbol}&period=quarter&limit=${LIMIT_Q}&apikey=${KEY}`
      ),
    DEFAULT_RETRY_OPTIONS
  ).catch((e) => {
    console.error(`❌ Failed to fetch ratios for ${symbol}:`, e);
    return [];
  });

  if (!rows.length) {
    throw new Error(`No ratio data available for ${symbol}`);
  }

  console.log(`📈 Found ${rows.length} ratio records for ${symbol}`);

  rows.sort((a, b) => (a.date < b.date ? 1 : -1)); // 최신 → 과거

  // 배치 처리로 성능 개선
  const batchSize = 5;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    for (const r of batch) {
      await upsertRatios(symbol, r);
    }
  }

  console.log(
    `✅ Successfully loaded ${rows.length} ratio records for ${symbol}`
  );
}

async function main() {
  console.log("🚀 Starting Financial Ratios ETL...");

  // 환경 변수 검증
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed:", envValidation.errors);
    process.exit(1);
  }

  if (envValidation.warnings.length > 0) {
    console.warn("⚠️ Environment warnings:", envValidation.warnings);
  }

  // 활성 심볼들 가져오기
  const activeSymbols = await db
    .select({ symbol: symbols.symbol })
    .from(symbols)
    .where(eq(symbols.isActivelyTrading, true))
    .limit(1000); // GitHub Actions 제한 고려

  const syms: string[] = activeSymbols.map((s) => s.symbol);

  if (syms.length === 0) {
    throw new Error(
      "No active symbols found in database. Please run 'symbols' job first."
    );
  }

  console.log(`📊 Processing ${syms.length} active symbols`);

  const limit = pLimit(CONCURRENCY);
  let done = 0,
    skip = 0;
  const startTime = Date.now();

  await Promise.all(
    syms.map((sym) =>
      limit(async () => {
        try {
          await loadOne(sym);
          done++;
          if (done % 50 === 0) {
            console.log(
              `📊 Progress: ${done}/${syms.length} symbols processed (${sym})`
            );
          }
        } catch (e: any) {
          skip++;
          console.warn(`⚠️ Skipped ${sym}: ${e?.message}`);
        } finally {
          await sleep(PAUSE_MS);
        }
      })
    )
  );

  const totalTime = Date.now() - startTime;
  console.log(`✅ Financial Ratios ETL completed!`);
  console.log(`📊 Results: ${done} successful, ${skip} skipped`);
  console.log(`⏱️ Total time: ${Math.round(totalTime / 1000)}s`);
  console.log(
    `📈 Average time per symbol: ${Math.round(totalTime / syms.length)}ms`
  );
}

// 스크립트가 직접 실행될 때만 함수 호출
if (require.main === module) {
  main()
    .then(() => {
      console.log("✅ Financial Ratios ETL completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Financial Ratios ETL failed:", error);
      process.exit(1);
    });
}

export { main as loadRatios };
