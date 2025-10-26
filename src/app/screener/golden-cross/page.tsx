import React, { Suspense } from "react";
import { Navigation } from "@/components/navigation";
import { DataWrapper } from "./DataWrapper";
import { TableSkeleton } from "./TableSkeleton";

type SearchParams = {
  justTurned?: string;
  lookbackDays?: string;
};

const GoldenCrossPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const resolvedParams = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation title="📈 Golden Cross 스크리너" />
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<TableSkeleton />}>
          <DataWrapper searchParams={resolvedParams} />
        </Suspense>
      </div>
    </div>
  );
};

export default GoldenCrossPage;
