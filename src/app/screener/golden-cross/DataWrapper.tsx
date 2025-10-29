import React from "react";
import GoldenCrossClient from "./GoldenCrossClient";
import { CACHE_TAGS } from "@/lib/constants";
import { API_BASE_URL, CACHE_DURATION } from "@/lib/constants";

type SearchParams = {
  justTurned?: string;
  lookbackDays?: string;
  profitability?: string;
  revenueGrowth?: string;
  revenueGrowthQuarters?: string;
  incomeGrowth?: string;
  incomeGrowthQuarters?: string;
};

async function fetchGoldenCrossData(searchParams: SearchParams) {
  const justTurned = searchParams.justTurned === "true";
  const lookbackDays = searchParams.lookbackDays || "10";
  const profitability = searchParams.profitability || "all";
  const revenueGrowth = searchParams.revenueGrowth === "true";
  const revenueGrowthQuarters = searchParams.revenueGrowthQuarters || "3";
  const incomeGrowth = searchParams.incomeGrowth === "true";
  const incomeGrowthQuarters = searchParams.incomeGrowthQuarters || "3";

  const params = new URLSearchParams({
    justTurned: justTurned.toString(),
    lookbackDays: lookbackDays,
    profitability: profitability,
    revenueGrowth: revenueGrowth.toString(),
    revenueGrowthQuarters: revenueGrowthQuarters,
    incomeGrowth: incomeGrowth.toString(),
    incomeGrowthQuarters: incomeGrowthQuarters,
  });

  // 캐시 태그 생성 (필터별로 다른 태그 - 모든 필터 포함)
  const cacheTag = `golden-cross-${justTurned}-${lookbackDays}-${profitability}-${revenueGrowth}-${revenueGrowthQuarters}-${incomeGrowth}-${incomeGrowthQuarters}`;

  // 서버 사이드에서 내부 API 호출
  const response = await fetch(
    `${API_BASE_URL}/api/screener/golden-cross?${params.toString()}`,
    {
      next: {
        revalidate: CACHE_DURATION.ONE_DAY, // 24시간 캐싱
        tags: [CACHE_TAGS.GOLDEN_CROSS, cacheTag],
      },
    }
  );

  if (!response.ok) {
    return { data: [], trade_date: null };
  }

  return response.json();
}

type DataWrapperProps = {
  searchParams: SearchParams;
};

export async function DataWrapper({ searchParams }: DataWrapperProps) {
  const data = await fetchGoldenCrossData(searchParams);

  return (
    <GoldenCrossClient data={data.data || []} tradeDate={data.trade_date} />
  );
}
