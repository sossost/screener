import React from "react";
import { TurnAroundClient } from "./TurnAroundClient";
import { Navigation } from "@/components/navigation";

async function fetchTurnAroundData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/screener/turned-profitable`, {
      next: { revalidate: 60 * 60 * 24 }, // 24시간 캐싱
    });

    if (!response.ok) {
      return { companies: [] };
    }

    return response.json();
  } catch (error) {
    // 빌드 시 또는 API 호출 실패 시 빈 데이터 반환
    console.warn("Failed to fetch turn-around data:", error);
    return { companies: [] };
  }
}

const TurnAroundPage = async () => {
  const initialData = await fetchTurnAroundData();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation title="🔄 Turn-Around 스크리너" />
      <div className="container mx-auto px-4 py-8">
        <TurnAroundClient data={initialData.companies || []} />
      </div>
    </div>
  );
};

export default TurnAroundPage;
