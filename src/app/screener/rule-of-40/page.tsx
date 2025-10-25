import React from "react";
import { Rule40Client } from "./RuleOf40Client";
import { Navigation } from "@/components/navigation";

const RuleOf40Page = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation title="🎯 Rule of 40 스크리너" />
      <div className="container mx-auto px-4 py-8">
        <Rule40Client data={[]} />
      </div>
    </div>
  );
};

export default RuleOf40Page;
