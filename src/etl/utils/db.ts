import { db } from "@/db/client";
import { symbols } from "@/db/schema";

export async function ensureSymbol(sym: string) {
  try {
    await db.insert(symbols).values({ symbol: sym }).onConflictDoNothing();
  } catch {}
}
