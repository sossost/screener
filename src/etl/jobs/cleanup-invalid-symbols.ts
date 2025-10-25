// src/etl/jobs/cleanup-invalid-symbols.ts
import "dotenv/config";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function cleanupInvalidSymbols() {
  console.log("🧹 비정상적인 종목들 정리 시작...");

  // 삭제할 종목들 식별
  const invalidSymbols = await db.execute(sql`
    SELECT symbol 
    FROM symbols 
    WHERE 
      symbol !~ '^[A-Z]{1,5}$' OR  -- 1-5글자 대문자가 아닌 것들
      symbol LIKE '%W' OR          -- 워런트
      symbol LIKE '%X' OR          -- 워런트  
      symbol LIKE '%.%' OR         -- 점 포함
      symbol LIKE '%U' OR          -- 유닛
      symbol LIKE '%WS' OR         -- 워런트
      is_etf = true OR             -- ETF
      is_fund = true               -- 펀드
  `);

  const symbolsToDelete = (invalidSymbols.rows as any[]).map((r) => r.symbol);
  console.log(
    `🗑️ 삭제할 종목 ${symbolsToDelete.length}개:`,
    symbolsToDelete.slice(0, 10)
  );

  if (symbolsToDelete.length === 0) {
    console.log("✅ 삭제할 비정상 종목이 없습니다.");
    return;
  }

  // 관련 테이블에서도 함께 삭제 (CASCADE)
  for (const symbol of symbolsToDelete) {
    await db.execute(sql`DELETE FROM symbols WHERE symbol = ${symbol}`);
  }

  console.log(`✅ ${symbolsToDelete.length}개 비정상 종목 삭제 완료`);
}

async function main() {
  try {
    await cleanupInvalidSymbols();
  } catch (error) {
    console.error("❌ 정리 작업 실패:", error);
    process.exit(1);
  }
}

main();
