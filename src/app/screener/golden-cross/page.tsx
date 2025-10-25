import React from "react";
import { GoldenCrossClient } from "./GoldenCrossClient";
import { Navigation } from "@/components/navigation";

const GoldenCrossPage = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation title="📈 Golden Cross 스크리너" />
      <div className="container mx-auto px-4 py-8">
        <GoldenCrossClient data={[]} />
      </div>
    </div>
  );
};

export default GoldenCrossPage;
