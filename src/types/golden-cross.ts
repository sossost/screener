// Golden Cross API 타입 정의

export interface QuarterlyFinancial {
  period_end_date: string;
  revenue: number | null;
  net_income: number | null;
  eps_diluted: number | null;
}

export interface GoldenCrossCompany {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  quarterly_financials: QuarterlyFinancial[];
  profitability_status: "profitable" | "unprofitable" | "unknown";
  revenue_growth_status: "growing" | "not_growing" | "unknown";
  income_growth_status: "growing" | "not_growing" | "unknown";
  ordered: boolean;
  just_turned: boolean;
}

export interface GoldenCrossResponse {
  data: GoldenCrossCompany[];
  trade_date: string;
}

// API 파라미터 타입
export interface GoldenCrossParams {
  justTurned?: boolean;
  lookbackDays?: number;
  minMcap?: number;
  minPrice?: number;
  minAvgVol?: number;
  allowOTC?: boolean;
  profitability?: "all" | "profitable" | "unprofitable";
  revenueGrowth?: boolean;
  incomeGrowth?: boolean;
}

// 성장성 상태 타입
export type GrowthStatus = "growing" | "not_growing" | "unknown";

// 수익성 상태 타입
export type ProfitabilityStatus = "profitable" | "unprofitable" | "unknown";
