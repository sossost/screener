"use client";

import { useState, useEffect } from "react";

export function ETLStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/etl/status", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setStatus(result);
        setError(null);
      } catch (error) {
        console.error("Error fetching ETL status:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">상태를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>ETL 상태를 불러오지 못했습니다.</p>
        <p className="text-sm mt-2">에러: {error}</p>
      </div>
    );
  }

  if (!status?.success) {
    return (
      <div className="text-center py-8 text-red-500">
        ETL 상태를 불러오지 못했습니다.
        <p className="text-sm mt-2">Status: {JSON.stringify(status)}</p>
      </div>
    );
  }

  const { data } = status;

  return (
    <div className="space-y-6">
      {/* 전체 시스템 상태 */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <h3 className="font-semibold text-slate-900">전체 시스템 상태</h3>
          <p className="text-sm text-slate-600">ETL 파이프라인 전체 상태</p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            data.overallStatus === "operational"
              ? "text-green-600 bg-green-50"
              : data.overallStatus === "degraded"
              ? "text-yellow-600 bg-yellow-50"
              : "text-red-600 bg-red-50"
          }`}
        >
          {data.overallStatus === "operational"
            ? "정상"
            : data.overallStatus === "degraded"
            ? "부분 장애"
            : "장애"}
        </div>
      </div>

      {/* 데이터 소스별 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NASDAQ 심볼 */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-slate-900">NASDAQ 심볼</h4>
            <span className="text-sm text-slate-600">
              {data.symbols.total}개 (활성 {data.symbols.active}개)
            </span>
          </div>
          <p className="text-sm text-slate-600">
            마지막 업데이트:{" "}
            {data.symbols.lastUpdated
              ? new Date(data.symbols.lastUpdated).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })
              : "없음"}
          </p>
        </div>

        {/* 일일 주가 */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-slate-900">일일 주가</h4>
            <span className="text-sm text-slate-600">
              {data.dailyPrices.total}개
            </span>
          </div>
          <p className="text-sm text-slate-600">
            최신 데이터:{" "}
            {data.dailyPrices.latestDate
              ? new Date(data.dailyPrices.latestDate).toLocaleDateString(
                  "ko-KR",
                  { timeZone: "Asia/Seoul" }
                )
              : "없음"}
          </p>
        </div>

        {/* 이동평균 */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-slate-900">이동평균</h4>
            <span className="text-sm text-slate-600">
              {data.dailyMa.total}개
            </span>
          </div>
          <p className="text-sm text-slate-600">
            마지막 업데이트:{" "}
            {data.dailyMa.lastUpdated
              ? new Date(data.dailyMa.lastUpdated).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })
              : "없음"}
          </p>
        </div>

        {/* 재무 비율 */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-slate-900">재무 비율</h4>
            <span className="text-sm text-slate-600">
              {data.ratios.total}개
            </span>
          </div>
          <p className="text-sm text-slate-600">
            마지막 업데이트:{" "}
            {data.ratios.lastUpdated
              ? new Date(data.ratios.lastUpdated).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })
              : "없음"}
          </p>
        </div>
      </div>

      {/* 시스템 정보 */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <h4 className="font-medium text-slate-900 mb-2">시스템 정보</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-600">상태:</span>
            <span
              className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                data.system.status === "operational"
                  ? "text-green-600 bg-green-50"
                  : "text-red-600 bg-red-50"
              }`}
            >
              {data.system.status === "operational" ? "정상" : "장애"}
            </span>
          </div>
          <div>
            <span className="text-slate-600">가동률:</span>
            <span className="ml-2 font-medium">{data.system.uptime}</span>
          </div>
          <div>
            <span className="text-slate-600">마지막 확인:</span>
            <span className="ml-2">
              {new Date(data.system.lastCheck).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
