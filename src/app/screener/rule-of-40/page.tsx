import React from "react";
import { Rule40Client } from "./RuleOf40Client";
import { Navigation } from "@/components/navigation";
import { API_BASE_URL, CACHE_DURATION } from "@/lib/constants";

async function fetchRule40Data() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/screener/rule-of-40`, {
      next: { revalidate: CACHE_DURATION.ONE_DAY }, // 24시간 캐싱
    });

    if (!response.ok) {
      return { companies: [] };
    }

    return response.json();
  } catch (error) {
    // 빌드 시 또는 API 호출 실패 시 빈 데이터 반환
    console.warn("Failed to fetch rule-of-40 data:", error);
    return { companies: [] };
  }
}

const RuleOf40Page = async () => {
  const initialData = await fetchRule40Data();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation title="🎯 Rule of 40 스크리너" />
      <div className="container mx-auto px-4 py-8">
        <Rule40Client data={initialData.companies || []} />
      </div>
    </div>
  );
};

export default RuleOf40Page;
