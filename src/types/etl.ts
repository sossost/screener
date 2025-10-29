// ETL 관련 타입 정의

export interface ETLStatus {
  success: boolean;
  data: {
    isRunning: boolean;
    lastRun: string | null;
    nextRun: string | null;
    currentJob: string | null;
    progress: number;
    errors: string[];
    overallStatus: "operational" | "degraded" | "down";
    symbols: {
      total: number;
      active: number;
      lastUpdated: string;
    };
    dailyPrices: {
      total: number;
      lastUpdated: string;
      latestDate: string;
    };
    dailyMa: {
      total: number;
      lastUpdated: string;
    };
    ratios: {
      total: number;
      lastUpdated: string;
    };
    system: {
      status: "operational" | "degraded" | "down";
      uptime: string;
      version: string;
      lastCheck: string;
    };
  };
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  job: string;
  metadata?: Record<string, any>;
}

export interface MetricsData {
  period: string;
  metrics: {
    dataQuality: {
      avgDailyRecords: number;
      avgDailySymbols: number;
      minDailyRecords: number;
      maxDailyRecords: number;
      daysWithData: number;
      dataCompleteness: number;
    };
    performance: {
      avgExecutionTime: {
        symbols: string;
        dailyPrices: string;
        dailyMa: string;
        ratios: string;
      };
      successRate: {
        symbols: number;
        dailyPrices: number;
        dailyMa: number;
        ratios: number;
      };
      errorRate: {
        symbols: number;
        dailyPrices: number;
        dailyMa: number;
        ratios: number;
      };
      throughput: {
        symbolsPerMinute: number;
        pricesPerMinute: number;
        maCalculationsPerMinute: number;
        ratiosPerMinute: number;
      };
    };
    system: {
      resourceUsage: {
        cpu: number;
        memory: number;
        disk: number;
        network: number;
      };
      apiUsage: {
        fmpApiCalls: number;
        fmpApiLimit: number;
        fmpApiRemaining: number;
        fmpApiResetTime: string;
        fmpApiUsagePercent: number;
      };
      database: {
        connectionPool: number;
        maxConnections: number;
        avgQueryTime: number;
        slowQueries: number;
      };
      githubActions: {
        monthlyMinutes: number;
        monthlyLimit: number;
        usagePercent: number;
      };
    };
  };
  generatedAt: string;
}
