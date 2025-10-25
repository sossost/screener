import React from "react";
import { TurnAroundClient } from "./TurnAroundClient";
import { Navigation } from "@/components/navigation";

const TurnAroundPage = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation title="🔄 Turn-Around 스크리너" />
      <div className="container mx-auto px-4 py-8">
        <TurnAroundClient data={[]} />
      </div>
    </div>
  );
};

export default TurnAroundPage;
