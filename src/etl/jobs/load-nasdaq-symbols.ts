// src/etl/load-nasdaq-symbols.ts
import "dotenv/config";
import { db } from "@/db/client";
import { symbols } from "@/db/schema";
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
  const list = await fetchJson<SymbolRow[]>(
    `${API}/company-screener?exchange=NASDAQ&limit=3000&apikey=${KEY}`
  );

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

  for (const r of nasdaq) {
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
  }

  console.log(`Inserted/kept ${nasdaq.length} NASDAQ symbols`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
