"use client";

import { useState, useEffect } from "react";

interface MetricsData {
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

async function getETLMetrics(
  period: string = "7d"
): Promise<MetricsData | null> {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/api/etl/metrics?period=${period}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch ETL metrics");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching ETL metrics:", error);
    return null;
  }
}

function getSuccessRateColor(rate: number) {
  if (rate >= 99) return "text-green-600";
  if (rate >= 95) return "text-yellow-600";
  return "text-red-600";
}

function getUsageColor(usage: number) {
  if (usage >= 90) return "text-red-600";
  if (usage >= 70) return "text-yellow-600";
  return "text-green-600";
}

export function ETLMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      const response = await getETLMetrics(selectedPeriod);
      setMetrics(response);
      setLoading(false);
    };

    fetchMetrics();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">메트릭을 불러오는 중...</p>
      </div>
    );
  }

  if (!metrics || !metrics.metrics) {
    return (
      <div className="text-center py-8 text-red-500">
        메트릭을 불러올 수 없습니다.
      </div>
    );
  }

  const { dataQuality, performance, system } = metrics.metrics;

  return (
    <div className="space-y-6">
      {/* 기간 선택 */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">기간:</label>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value="1d">1일</option>
          <option value="7d">7일</option>
          <option value="30d">30일</option>
          <option value="90d">90일</option>
        </select>
        <span className="text-xs text-gray-500">
          생성:{" "}
          {new Date(metrics.generatedAt).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
          })}
        </span>
      </div>

      {/* 데이터 품질 메트릭 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-blue-900 mb-4">
          데이터 품질
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-blue-700">평균 일일 레코드</p>
            <p className="text-xl font-bold text-blue-600">
              {dataQuality.avgDailyRecords.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">평균 일일 심볼</p>
            <p className="text-xl font-bold text-blue-600">
              {dataQuality.avgDailySymbols.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">데이터 완성도</p>
            <p className="text-xl font-bold text-blue-600">
              {dataQuality.dataCompleteness}%
            </p>
          </div>
        </div>
      </div>

      {/* 성능 메트릭 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-green-900 mb-4">
          성능 메트릭
        </h4>

        {/* 실행 시간 */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-green-800 mb-2">
            평균 실행 시간
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xs text-green-700">심볼</p>
              <p className="text-sm font-bold text-green-600">
                {performance.avgExecutionTime.symbols}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">일일 주가</p>
              <p className="text-sm font-bold text-green-600">
                {performance.avgExecutionTime.dailyPrices}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">이동평균</p>
              <p className="text-sm font-bold text-green-600">
                {performance.avgExecutionTime.dailyMa}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">재무 비율</p>
              <p className="text-sm font-bold text-green-600">
                {performance.avgExecutionTime.ratios}
              </p>
            </div>
          </div>
        </div>

        {/* 성공률 */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-green-800 mb-2">성공률</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xs text-green-700">심볼</p>
              <p
                className={`text-sm font-bold ${getSuccessRateColor(
                  performance.successRate.symbols
                )}`}
              >
                {performance.successRate.symbols}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">일일 주가</p>
              <p
                className={`text-sm font-bold ${getSuccessRateColor(
                  performance.successRate.dailyPrices
                )}`}
              >
                {performance.successRate.dailyPrices}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">이동평균</p>
              <p
                className={`text-sm font-bold ${getSuccessRateColor(
                  performance.successRate.dailyMa
                )}`}
              >
                {performance.successRate.dailyMa}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">재무 비율</p>
              <p
                className={`text-sm font-bold ${getSuccessRateColor(
                  performance.successRate.ratios
                )}`}
              >
                {performance.successRate.ratios}%
              </p>
            </div>
          </div>
        </div>

        {/* 처리량 */}
        <div>
          <h5 className="text-sm font-medium text-green-800 mb-2">
            처리량 (분당)
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xs text-green-700">심볼</p>
              <p className="text-sm font-bold text-green-600">
                {performance.throughput.symbolsPerMinute.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">주가</p>
              <p className="text-sm font-bold text-green-600">
                {performance.throughput.pricesPerMinute.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">이동평균</p>
              <p className="text-sm font-bold text-green-600">
                {performance.throughput.maCalculationsPerMinute.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">재무 비율</p>
              <p className="text-sm font-bold text-green-600">
                {performance.throughput.ratiosPerMinute.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 시스템 메트릭 */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-purple-900 mb-4">
          시스템 메트릭
        </h4>

        {/* 리소스 사용량 */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-purple-800 mb-2">
            리소스 사용량
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xs text-purple-700">CPU</p>
              <p className="text-sm font-bold text-purple-600">
                {system.resourceUsage.cpu}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-purple-700">메모리</p>
              <p className="text-sm font-bold text-purple-600">
                {system.resourceUsage.memory}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-purple-700">디스크</p>
              <p className="text-sm font-bold text-purple-600">
                {system.resourceUsage.disk}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-purple-700">네트워크</p>
              <p className="text-sm font-bold text-purple-600">
                {system.resourceUsage.network}%
              </p>
            </div>
          </div>
        </div>

        {/* API 사용량 */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-purple-800 mb-2">
            API 사용량
          </h5>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-purple-700">FMP API</span>
              <span className="text-sm font-bold text-purple-600">
                {system.apiUsage.fmpApiCalls.toLocaleString()} /{" "}
                {system.apiUsage.fmpApiLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  getUsageColor(system.apiUsage.fmpApiUsagePercent) ===
                  "text-red-600"
                    ? "bg-red-500"
                    : getUsageColor(system.apiUsage.fmpApiUsagePercent) ===
                      "text-yellow-600"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${system.apiUsage.fmpApiUsagePercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-purple-600 text-right">
              {system.apiUsage.fmpApiUsagePercent}% 사용
            </p>
          </div>
        </div>

        {/* GitHub Actions 사용량 */}
        <div>
          <h5 className="text-sm font-medium text-purple-800 mb-2">
            GitHub Actions
          </h5>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-purple-700">월간 사용량</span>
              <span className="text-sm font-bold text-purple-600">
                {system.githubActions.monthlyMinutes.toLocaleString()} /{" "}
                {system.githubActions.monthlyLimit.toLocaleString()} 분
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  getUsageColor(system.githubActions.usagePercent) ===
                  "text-red-600"
                    ? "bg-red-500"
                    : getUsageColor(system.githubActions.usagePercent) ===
                      "text-yellow-600"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${system.githubActions.usagePercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-purple-600 text-right">
              {system.githubActions.usagePercent}% 사용
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
