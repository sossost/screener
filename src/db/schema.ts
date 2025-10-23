import {
  pgTable,
  text,
  numeric,
  timestamp,
  unique,
  index,
  boolean,
} from "drizzle-orm/pg-core";

export const symbols = pgTable("symbols", {
  symbol: text("symbol").primaryKey(),
  companyName: text("company_name"),
  marketCap: numeric("market_cap"),
  sector: text("sector"),
  industry: text("industry"),
  beta: numeric("beta"),
  price: numeric("price"),
  lastAnnualDividend: numeric("last_annual_dividend"),
  volume: numeric("volume"),
  exchange: text("exchange"),
  exchangeShortName: text("exchange_short_name"),
  country: text("country"),
  isEtf: boolean("is_etf").default(false),
  isFund: boolean("is_fund").default(false),
  isActivelyTrading: boolean("is_actively_trading").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const quarterlyFinancials = pgTable(
  "quarterly_financials",
  {
    // FK: 심볼
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),

    // 분기 말일(ISO, ex: 2024-12-31)
    periodEndDate: text("period_end_date").notNull(),

    // 2024Q4 같은 레이블 (정렬용으로 raw date도 같이 저장)
    asOfQ: text("as_of_q").notNull(),

    // 손익계산서
    revenue: numeric("revenue"),
    netIncome: numeric("net_income"),
    operatingIncome: numeric("operating_income"),
    ebitda: numeric("ebitda"),
    grossProfit: numeric("gross_profit"),

    // 현금흐름표
    operatingCashFlow: numeric("operating_cash_flow"),
    freeCashFlow: numeric("free_cash_flow"),

    // EPS
    epsDiluted: numeric("eps_diluted"),
    epsBasic: numeric("eps_basic"), // 소스 없으면 NULL

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // 같은 심볼/분기 중복 방지
    uq: unique("uq_quarterly_financials_symbol_period").on(
      t.symbol,
      t.periodEndDate
    ),
    // 조회 최적화
    idx_symbol_q: index("idx_quarterly_financials_symbol_q").on(
      t.symbol,
      t.asOfQ
    ),
  })
);

export const quarterlyRatios = pgTable(
  "quarterly_ratios",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    periodEndDate: text("period_end_date").notNull(),
    asOfQ: text("as_of_q").notNull(),

    // Valuation
    peRatio: numeric("pe_ratio"),
    pegRatio: numeric("peg_ratio"),
    fwdPegRatio: numeric("fwd_peg_ratio"),
    psRatio: numeric("ps_ratio"),
    pbRatio: numeric("pb_ratio"),
    evEbitda: numeric("ev_ebitda"),

    // Profitability
    grossMargin: numeric("gross_margin"),
    opMargin: numeric("op_margin"),
    netMargin: numeric("net_margin"),

    // Leverage
    debtEquity: numeric("debt_equity"),
    debtAssets: numeric("debt_assets"),
    debtMktCap: numeric("debt_mkt_cap"),
    intCoverage: numeric("int_coverage"),

    // Cash flow
    pOCFRatio: numeric("p_ocf_ratio"),
    pFCFRatio: numeric("p_fcf_ratio"),
    ocfRatio: numeric("ocf_ratio"),
    fcfPerShare: numeric("fcf_per_share"),

    // Dividend
    divYield: numeric("div_yield"),
    payoutRatio: numeric("payout_ratio"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uq: unique("uq_quarterly_ratios_symbol_period").on(
      t.symbol,
      t.periodEndDate
    ),
  })
);

export const dailyPrices = pgTable(
  "daily_prices",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    date: text("date").notNull(), // 'YYYY-MM-DD'
    open: numeric("open"),
    high: numeric("high"),
    low: numeric("low"),
    close: numeric("close"),
    adjClose: numeric("adj_close"),
    volume: numeric("volume"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uq: unique("uq_daily_prices_symbol_date").on(t.symbol, t.date),
    idx_sym_date: index("idx_daily_prices_symbol_date").on(t.symbol, t.date),
  })
);

export const dailyMa = pgTable(
  "daily_ma",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    date: text("date").notNull(),

    ma20: numeric("ma20"),
    ma50: numeric("ma50"),
    ma100: numeric("ma100"),
    ma200: numeric("ma200"),
    volMa30: numeric("vol_ma30"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uq: unique("uq_daily_ma_symbol_date").on(t.symbol, t.date),
    idx_sym_date: index("idx_daily_ma_symbol_date").on(t.symbol, t.date),
  })
);
