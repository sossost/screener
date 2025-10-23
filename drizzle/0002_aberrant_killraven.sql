CREATE TABLE "daily_ma" (
	"symbol" text NOT NULL,
	"date" text NOT NULL,
	"ma20" numeric,
	"ma50" numeric,
	"ma100" numeric,
	"ma200" numeric,
	"vol_ma30" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_daily_ma_symbol_date" UNIQUE("symbol","date")
);
--> statement-breakpoint
ALTER TABLE "daily_ma" ADD CONSTRAINT "daily_ma_symbol_symbols_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."symbols"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_daily_ma_symbol_date" ON "daily_ma" USING btree ("symbol","date");