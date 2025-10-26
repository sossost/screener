"use client";

import { useState, useEffect } from "react";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  job: string;
  metadata?: Record<string, any>;
}

interface LogsResponse {
  success: boolean;
  data: {
    logs: LogEntry[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
    filters: {
      job: string;
      level: string;
    };
  };
}

async function getETLLogs(
  job: string = "all",
  level: string = "all",
  limit: number = 50
): Promise<LogsResponse | null> {
  try {
    const params = new URLSearchParams({
      job,
      level,
      limit: limit.toString(),
    });

    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/api/etl/logs?${params}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch ETL logs");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching ETL logs:", error);
    return null;
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case "error":
      return "text-red-600 bg-red-50 border-red-200";
    case "warn":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "info":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

function getLevelIcon(level: string) {
  switch (level) {
    case "error":
      return "❌";
    case "warn":
      return "⚠️";
    case "info":
      return "ℹ️";
    default:
      return "📝";
  }
}

function getJobColor(job: string) {
  switch (job) {
    case "symbols":
      return "bg-blue-100 text-blue-800";
    case "daily-prices":
      return "bg-green-100 text-green-800";
    case "daily-ma":
      return "bg-purple-100 text-purple-800";
    case "ratios":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function ETLLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const response = await getETLLogs(selectedJob, selectedLevel, limit);
      if (response?.success) {
        setLogs(response.data.logs);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [selectedJob, selectedLevel, limit]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">로그를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            작업 타입
          </label>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">전체</option>
            <option value="symbols">심볼</option>
            <option value="daily-prices">일일 주가</option>
            <option value="daily-ma">이동평균</option>
            <option value="ratios">재무 비율</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            로그 레벨
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">전체</option>
            <option value="info">정보</option>
            <option value="warn">경고</option>
            <option value="error">에러</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            표시 개수
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value={25}>25개</option>
            <option value={50}>50개</option>
            <option value={100}>100개</option>
          </select>
        </div>
      </div>

      {/* 로그 목록 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">로그가 없습니다.</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 ${getLevelColor(log.level)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{getLevelIcon(log.level)}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getJobColor(
                        log.job
                      )}`}
                    >
                      {log.job}
                    </span>
                    <span className="text-xs opacity-75">
                      {new Date(log.timestamp).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{log.message}</p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 text-xs opacity-75">
                      <details>
                        <summary className="cursor-pointer">메타데이터</summary>
                        <pre className="mt-1 p-2 bg-black bg-opacity-10 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 새로고침 버튼 */}
      <div className="text-center">
        <button
          onClick={() => {
            setLoading(true);
            getETLLogs(selectedJob, selectedLevel, limit).then((response) => {
              if (response?.success) {
                setLogs(response.data.logs);
              }
              setLoading(false);
            });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  );
}
