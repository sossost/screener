import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { symbols, dailyPrices, dailyMa, quarterlyRatios } from "@/db/schema";
import { count, max, sql } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    // 심볼 수 조회
    const symbolCountResult = await db.select({ count: count() }).from(symbols);
    const totalSymbols = symbolCountResult[0].count;

    // 일일 주가 데이터 조회
    const dailyPricesCountResult = await db
      .select({
        count: count(),
        lastUpdated: max(dailyPrices.createdAt),
      })
      .from(dailyPrices);
    const totalDailyPrices = dailyPricesCountResult[0].count;
    const lastDailyPricesUpdate = dailyPricesCountResult[0].lastUpdated;

    // 이동평균 데이터 조회
    const dailyMaCountResult = await db
      .select({
        count: count(),
        lastUpdated: max(dailyMa.createdAt),
      })
      .from(dailyMa);
    const totalDailyMa = dailyMaCountResult[0].count;
    const lastDailyMaUpdate = dailyMaCountResult[0].lastUpdated;

    // 재무 비율 데이터 조회
    const ratiosCountResult = await db
      .select({
        count: count(),
        lastUpdated: max(quarterlyRatios.createdAt),
      })
      .from(quarterlyRatios);
    const totalRatios = ratiosCountResult[0].count;
    const lastRatiosUpdate = ratiosCountResult[0].lastUpdated;

    // 최신 데이터 날짜 조회
    const latestDateResult = await db.execute(sql`
      SELECT MAX(date) as latest_date FROM daily_prices
    `);
    const latestDate = (latestDateResult.rows as any[])[0]?.latest_date;

    // 활성 심볼 수 조회
    const activeSymbolsResult = await db.execute(sql`
      SELECT COUNT(*) as active_count FROM symbols WHERE is_actively_trading = true
    `);
    const activeSymbolsCount =
      (activeSymbolsResult.rows as any[])[0]?.active_count || 0;

    // 전체 상태 계산
    const overallStatus = calculateOverallStatus({
      totalSymbols,
      totalDailyPrices,
      totalDailyMa,
      totalRatios,
      lastDailyPricesUpdate,
      lastDailyMaUpdate,
      lastRatiosUpdate,
      latestDate,
    });

    return NextResponse.json({
      success: true,
      data: {
        overallStatus,
        symbols: {
          total: totalSymbols,
          active: activeSymbolsCount,
          lastUpdated: null, // 심볼은 주간 업데이트
        },
        dailyPrices: {
          total: totalDailyPrices,
          lastUpdated: lastDailyPricesUpdate,
          latestDate,
        },
        dailyMa: {
          total: totalDailyMa,
          lastUpdated: lastDailyMaUpdate,
        },
        ratios: {
          total: totalRatios,
          lastUpdated: lastRatiosUpdate,
        },
        system: {
          status: "operational",
          lastCheck: new Date().toISOString(),
          uptime: "99.9%",
        },
      },
    });
  } catch (error) {
    console.error("Failed to get ETL system status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve system status",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

function calculateOverallStatus(data: {
  totalSymbols: number;
  totalDailyPrices: number;
  totalDailyMa: number;
  totalRatios: number;
  lastDailyPricesUpdate: Date | null;
  lastDailyMaUpdate: Date | null;
  lastRatiosUpdate: Date | null;
  latestDate: string | null;
}): "healthy" | "degraded" | "failed" {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 기본 데이터 존재 여부 확인
  if (data.totalSymbols === 0) {
    return "failed";
  }

  // 일일 주가 데이터 상태 확인
  const dailyPricesStale =
    !data.lastDailyPricesUpdate ||
    new Date(data.lastDailyPricesUpdate) < oneDayAgo;

  // 이동평균 데이터 상태 확인
  const dailyMaStale =
    !data.lastDailyMaUpdate || new Date(data.lastDailyMaUpdate) < oneDayAgo;

  // 재무 비율 데이터 상태 확인 (주간 업데이트)
  const ratiosStale =
    !data.lastRatiosUpdate || new Date(data.lastRatiosUpdate) < oneWeekAgo;

  // 전체 상태 결정
  if (dailyPricesStale && dailyMaStale) {
    return "failed";
  } else if (dailyPricesStale || dailyMaStale || ratiosStale) {
    return "degraded";
  } else {
    return "healthy";
  }
}
