// src/etl/jobs/load-nasdaq-symbols.ts
import "dotenv/config";
import { db } from "@/db/client";
import { symbols } from "@/db/schema";
import {
  validateEnvironmentVariables,
  validateSymbolData,
  validateBatchData,
} from "../utils/validation";
import { retryApiCall, DEFAULT_RETRY_OPTIONS } from "../utils/retry";
import { fetchJson } from "../utils";

const API = process.env.DATA_API! + "/stable";
const KEY = process.env.FMP_API_KEY!;

type SymbolRow = {
  symbol: string;
  companyName?: string;
  marketCap?: number;
  sector?: string;
  industry?: string;
  beta?: number;
  price?: number;
  lastAnnualDividend?: number;
  volume?: number;
  exchange?: string;
  exchangeShortName?: string;
  country?: string;
  isEtf?: boolean;
  isFund?: boolean;
  isActivelyTrading?: boolean;
};

async function main() {
  console.log("🚀 Starting NASDAQ symbols ETL...");

  // 환경 변수 검증
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed:", envValidation.errors);
    process.exit(1);
  }

  if (envValidation.warnings.length > 0) {
    console.warn("⚠️ Environment warnings:", envValidation.warnings);
  }

  // API 호출 (재시도 로직 적용)
  const list = await retryApiCall(
    () =>
      fetchJson<SymbolRow[]>(
        `${API}/company-screener?exchange=NASDAQ&limit=3000&apikey=${KEY}`
      ),
    DEFAULT_RETRY_OPTIONS
  );

  console.log(`📊 Fetched ${list.length} symbols from API`);

  const nasdaq = list
    .filter((r) => r.exchange === "NASDAQ" || r.exchangeShortName === "NASDAQ")
    .filter((r) => {
      // 정상적인 주식만 필터링 (워런트, 우선주, ETF 등 제외)
      const symbol = r.symbol;
      return (
        symbol &&
        /^[A-Z]{1,5}$/.test(symbol) && // 1-5글자 대문자만
        !symbol.endsWith("W") && // 워런트 제외
        !symbol.endsWith("X") && // 워런트 제외
        !symbol.includes(".") && // 점 포함 제외
        !symbol.endsWith("U") && // 유닛 제외
        !symbol.endsWith("WS") && // 워런트 제외
        !r.isEtf && // ETF 제외
        !r.isFund
      ); // 펀드 제외
    });

  console.log(`📈 Filtered to ${nasdaq.length} valid NASDAQ symbols`);

  // 데이터 검증
  const validationResult = validateBatchData(nasdaq, validateSymbolData);
  if (!validationResult.isValid) {
    console.error("❌ Data validation failed:", validationResult.errors);
    process.exit(1);
  }

  if (validationResult.warnings.length > 0) {
    console.warn("⚠️ Data validation warnings:", validationResult.warnings);
  }

  // 배치 처리로 성능 개선
  const batchSize = 100;
  let processedCount = 0;

  for (let i = 0; i < nasdaq.length; i += batchSize) {
    const batch = nasdaq.slice(i, i + batchSize);
    console.log(
      `📊 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        nasdaq.length / batchSize
      )} (${batch.length} symbols)`
    );

    for (const r of batch) {
      const row = {
        symbol: r.symbol,
        companyName: r.companyName || null,
        marketCap: r.marketCap?.toString() || null,
        sector: r.sector || null,
        industry: r.industry || null,
        beta: r.beta?.toString() || null,
        price: r.price?.toString() || null,
        lastAnnualDividend: r.lastAnnualDividend?.toString() || null,
        volume: r.volume?.toString() || null,
        exchange: r.exchange || null,
        exchangeShortName: r.exchangeShortName || null,
        country: r.country || null,
        isEtf: r.isEtf || false,
        isFund: r.isFund || false,
        isActivelyTrading: r.isActivelyTrading ?? true,
        createdAt: new Date(),
      };

      await db
        .insert(symbols)
        .values(row)
        .onConflictDoUpdate({
          target: symbols.symbol,
          set: {
            ...row,
            createdAt: new Date(),
          },
        });

      processedCount++;
    }
  }

  console.log(`✅ Successfully processed ${processedCount} NASDAQ symbols`);
}

// 스크립트가 직접 실행될 때만 함수 호출
if (require.main === module) {
  main()
    .then(() => {
      console.log("✅ NASDAQ symbols ETL completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ NASDAQ symbols ETL failed:", error);
      process.exit(1);
    });
}

export { main as loadNasdaqSymbols };
