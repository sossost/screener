import React from "react";
import { GoldenCrossClient } from "./GoldenCrossClient";
import { CACHE_TAGS } from "@/lib/cache-config";

type SearchParams = {
  justTurned?: string;
  lookbackDays?: string;
};

async function fetchGoldenCrossData(searchParams: SearchParams) {
  const justTurned = searchParams.justTurned === "true";
  const lookbackDays = searchParams.lookbackDays || "10";

  const params = new URLSearchParams({
    justTurned: justTurned.toString(),
    lookbackDays: lookbackDays,
  });

  // 캐시 태그 생성 (필터별로 다른 태그)
  const cacheTag = `golden-cross-${justTurned}-${lookbackDays}`;

  // 서버 사이드에서 내부 API 호출 (localhost 사용)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const response = await fetch(
    `${baseUrl}/api/screener/golden-cross?${params.toString()}`,
    {
      next: {
        revalidate: 60 * 60 * 24, // 24시간 캐싱
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
