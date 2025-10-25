import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d

    // 기간별 데이터 조회
    const metrics = await getMetricsForPeriod(period);

    return NextResponse.json({
      success: true,
      data: {
        period,
        metrics,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to get ETL metrics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve metrics",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

async function getMetricsForPeriod(period: string) {
  const days = getDaysFromPeriod(period);

  // 데이터 품질 메트릭
  const dataQuality = await getDataQualityMetrics(days);

  // 성능 메트릭
  const performance = await getPerformanceMetrics(days);

  // 시스템 메트릭
  const system = await getSystemMetrics();

  return {
    dataQuality,
    performance,
    system,
  };
}

function getDaysFromPeriod(period: string): number {
  switch (period) {
    case "1d":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return 7;
  }
}

async function getDataQualityMetrics(days: number) {
  // 최근 N일간의 데이터 품질 메트릭
  const result = await db.execute(sql`
    WITH daily_stats AS (
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as records_count,
        COUNT(DISTINCT symbol) as unique_symbols
      FROM daily_prices 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${sql.raw(
        days.toString()
      )} days'
      GROUP BY DATE(created_at)
    )
    SELECT 
      AVG(records_count) as avg_daily_records,
      AVG(unique_symbols) as avg_daily_symbols,
      MIN(records_count) as min_daily_records,
      MAX(records_count) as max_daily_records,
      COUNT(*) as days_with_data
    FROM daily_stats
  `);

  const stats = (result.rows as any[])[0];

  return {
    avgDailyRecords: Math.round(stats.avg_daily_records || 0),
    avgDailySymbols: Math.round(stats.avg_daily_symbols || 0),
    minDailyRecords: stats.min_daily_records || 0,
    maxDailyRecords: stats.max_daily_records || 0,
    daysWithData: stats.days_with_data || 0,
    dataCompleteness: Math.round((stats.days_with_data / days) * 100),
  };
}

async function getPerformanceMetrics(days: number) {
  // 시뮬레이션된 성능 메트릭
  return {
    avgExecutionTime: {
      symbols: "2.5m",
      dailyPrices: "45m",
      dailyMa: "12m",
      ratios: "35m",
    },
    successRate: {
      symbols: 99.8,
      dailyPrices: 98.5,
      dailyMa: 99.2,
      ratios: 97.8,
    },
    errorRate: {
      symbols: 0.2,
      dailyPrices: 1.5,
      dailyMa: 0.8,
      ratios: 2.2,
    },
    throughput: {
      symbolsPerMinute: 1200,
      pricesPerMinute: 25,
      maCalculationsPerMinute: 85,
      ratiosPerMinute: 30,
    },
  };
}

async function getSystemMetrics() {
  // 시스템 리소스 사용량 (시뮬레이션)
  return {
    resourceUsage: {
      cpu: 45,
      memory: 62,
      disk: 23,
      network: 12,
    },
    apiUsage: {
      fmpApiCalls: 125000,
      fmpApiLimit: 250000,
      fmpApiUsagePercent: 50,
    },
    database: {
      connectionPool: 8,
      maxConnections: 20,
      avgQueryTime: 45,
      slowQueries: 2,
    },
    githubActions: {
      monthlyMinutes: 1200,
      monthlyLimit: 2000,
      usagePercent: 60,
    },
  };
}
