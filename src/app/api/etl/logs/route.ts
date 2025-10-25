import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const job = searchParams.get("job");
    const limit = parseInt(searchParams.get("limit") || "100");
    const level = searchParams.get("level");

    // GitHub Actions 로그 시뮬레이션
    const mockLogs = generateMockLogs(job, limit, level);

    return NextResponse.json({
      success: true,
      data: {
        logs: mockLogs,
        pagination: {
          total: mockLogs.length,
          page: 1,
          limit,
          hasMore: false,
        },
        filters: {
          job: job || "all",
          level: level || "all",
        },
      },
    });
  } catch (error) {
    console.error("Failed to get ETL logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve logs",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

function generateMockLogs(
  job: string | null,
  limit: number,
  level: string | null
) {
  const allLogs = [
    {
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      level: "info",
      message: "🚀 Starting NASDAQ symbols ETL...",
      job: "symbols",
      metadata: { step: "initialization" },
    },
    {
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      level: "info",
      message: "📊 Fetched 2,847 symbols from API",
      job: "symbols",
      metadata: { count: 2847, source: "FMP API" },
    },
    {
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      level: "info",
      message: "📈 Filtered to 2,156 valid NASDAQ symbols",
      job: "symbols",
      metadata: { filtered: 2156, removed: 691 },
    },
    {
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      level: "info",
      message: "✅ Successfully processed 2,156 NASDAQ symbols",
      job: "symbols",
      metadata: { processed: 2156, batches: 22 },
    },
    {
      timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      level: "info",
      message: "🚀 Starting Daily Prices ETL...",
      job: "daily-prices",
      metadata: { step: "initialization" },
    },
    {
      timestamp: new Date(Date.now() - 30 * 1000).toISOString(),
      level: "info",
      message: "📊 Processing 1,000 active symbols",
      job: "daily-prices",
      metadata: { symbols: 1000, concurrency: 3 },
    },
    {
      timestamp: new Date(Date.now() - 15 * 1000).toISOString(),
      level: "warn",
      message: "⚠️ Skipped AAPL: No price data available",
      job: "daily-prices",
      metadata: { symbol: "AAPL", reason: "no_data" },
    },
    {
      timestamp: new Date(Date.now() - 10 * 1000).toISOString(),
      level: "info",
      message: "✅ Daily Prices ETL completed!",
      job: "daily-prices",
      metadata: { successful: 998, skipped: 2, time: "45s" },
    },
    {
      timestamp: new Date(Date.now() - 5 * 1000).toISOString(),
      level: "info",
      message: "🚀 Starting Daily MA ETL...",
      job: "daily-ma",
      metadata: { step: "initialization" },
    },
    {
      timestamp: new Date(Date.now() - 2 * 1000).toISOString(),
      level: "info",
      message: "📊 Found 998 symbols for date 2025-01-27",
      job: "daily-ma",
      metadata: { symbols: 998, date: "2025-01-27" },
    },
    {
      timestamp: new Date(Date.now() - 1 * 1000).toISOString(),
      level: "error",
      message:
        "❌ Error processing TSLA: Insufficient data (150 days, need 200+)",
      job: "daily-ma",
      metadata: { symbol: "TSLA", days: 150, required: 200 },
    },
    {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "✅ Daily MA ETL completed!",
      job: "daily-ma",
      metadata: { successful: 997, failed: 1, time: "12s" },
    },
  ];

  // 필터링
  let filteredLogs = allLogs;

  if (job && job !== "all") {
    filteredLogs = filteredLogs.filter((log) => log.job === job);
  }

  if (level && level !== "all") {
    filteredLogs = filteredLogs.filter((log) => log.level === level);
  }

  // 최신 순으로 정렬
  filteredLogs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // 제한 적용
  return filteredLogs.slice(0, limit);
}
