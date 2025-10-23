CREATE TABLE "daily_prices" (
	"symbol" text NOT NULL,
	"date" text NOT NULL,
	"open" numeric,
	"high" numeric,
	"low" numeric,
	"close" numeric,
	"adj_close" numeric,
	"volume" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_daily_prices_symbol_date" UNIQUE("symbol","date")
);
--> statement-breakpoint
ALTER TABLE "daily_prices" ADD CONSTRAINT "daily_prices_symbol_symbols_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."symbols"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_daily_prices_symbol_date" ON "daily_prices" USING btree ("symbol","date");