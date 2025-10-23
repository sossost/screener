CREATE TABLE "quarterly_financials" (
	"symbol" text NOT NULL,
	"period_end_date" text NOT NULL,
	"as_of_q" text NOT NULL,
	"revenue" numeric,
	"net_income" numeric,
	"operating_income" numeric,
	"ebitda" numeric,
	"gross_profit" numeric,
	"operating_cash_flow" numeric,
	"free_cash_flow" numeric,
	"eps_diluted" numeric,
	"eps_basic" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_quarterly_financials_symbol_period" UNIQUE("symbol","period_end_date")
);
--> statement-breakpoint
CREATE TABLE "quarterly_ratios" (
	"symbol" text NOT NULL,
	"period_end_date" text NOT NULL,
	"as_of_q" text NOT NULL,
	"pe_ratio" numeric,
	"peg_ratio" numeric,
	"fwd_peg_ratio" numeric,
	"ps_ratio" numeric,
	"pb_ratio" numeric,
	"ev_ebitda" numeric,
	"gross_margin" numeric,
	"op_margin" numeric,
	"net_margin" numeric,
	"debt_equity" numeric,
	"debt_assets" numeric,
	"debt_mkt_cap" numeric,
	"int_coverage" numeric,
	"p_ocf_ratio" numeric,
	"p_fcf_ratio" numeric,
	"ocf_ratio" numeric,
	"fcf_per_share" numeric,
	"div_yield" numeric,
	"payout_ratio" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_quarterly_ratios_symbol_period" UNIQUE("symbol","period_end_date")
);
--> statement-breakpoint
CREATE TABLE "symbols" (
	"symbol" text PRIMARY KEY NOT NULL,
	"company_name" text,
	"market_cap" numeric,
	"sector" text,
	"industry" text,
	"beta" numeric,
	"price" numeric,
	"last_annual_dividend" numeric,
	"volume" numeric,
	"exchange" text,
	"exchange_short_name" text,
	"country" text,
	"is_etf" boolean DEFAULT false,
	"is_fund" boolean DEFAULT false,
	"is_actively_trading" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "quarterly_financials" ADD CONSTRAINT "quarterly_financials_symbol_symbols_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."symbols"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_ratios" ADD CONSTRAINT "quarterly_ratios_symbol_symbols_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."symbols"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_quarterly_financials_symbol_q" ON "quarterly_financials" USING btree ("symbol","as_of_q");