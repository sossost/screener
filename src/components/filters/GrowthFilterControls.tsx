"use client";

import React, { memo, useCallback } from "react";

interface GrowthFilterControlsProps {
  revenueGrowth: boolean;
  setRevenueGrowth: (value: boolean) => void;
  revenueGrowthQuarters: number;
  setRevenueGrowthQuarters: (value: number) => void;
  incomeGrowth: boolean;
  setIncomeGrowth: (value: boolean) => void;
  incomeGrowthQuarters: number;
  setIncomeGrowthQuarters: (value: number) => void;
}

export const GrowthFilterControls = memo(function GrowthFilterControls({
  revenueGrowth,
  setRevenueGrowth,
  revenueGrowthQuarters,
  setRevenueGrowthQuarters,
  incomeGrowth,
  setIncomeGrowth,
  incomeGrowthQuarters,
  setIncomeGrowthQuarters,
}: GrowthFilterControlsProps) {
  // 로컬 상태로 입력값 관리 (입력 중에는 API 호출 안함)
  const [revenueInputValue, setRevenueInputValue] = React.useState(
    revenueGrowthQuarters.toString()
  );
  const [incomeInputValue, setIncomeInputValue] = React.useState(
    incomeGrowthQuarters.toString()
  );

  // props가 변경되면 로컬 상태도 업데이트
  React.useEffect(() => {
    setRevenueInputValue(revenueGrowthQuarters.toString());
  }, [revenueGrowthQuarters]);

  React.useEffect(() => {
    setIncomeInputValue(incomeGrowthQuarters.toString());
  }, [incomeGrowthQuarters]);

  const handleRevenueQuartersChange = useCallback((value: string) => {
    setRevenueInputValue(value);
  }, []);

  const handleRevenueQuartersConfirm = useCallback(() => {
    const num = Number(revenueInputValue);
    if (num >= 2 && num <= 8 && num !== revenueGrowthQuarters) {
      setRevenueGrowthQuarters(num);
    } else {
      // 유효하지 않은 값이면 원래 값으로 복원
      setRevenueInputValue(revenueGrowthQuarters.toString());
    }
  }, [revenueInputValue, revenueGrowthQuarters, setRevenueGrowthQuarters]);

  const handleRevenueQuartersKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleRevenueQuartersConfirm();
      }
    },
    [handleRevenueQuartersConfirm]
  );

  const handleIncomeQuartersChange = useCallback((value: string) => {
    setIncomeInputValue(value);
  }, []);

  const handleIncomeQuartersConfirm = useCallback(() => {
    const num = Number(incomeInputValue);
    if (num >= 2 && num <= 8 && num !== incomeGrowthQuarters) {
      setIncomeGrowthQuarters(num);
    } else {
      // 유효하지 않은 값이면 원래 값으로 복원
      setIncomeInputValue(incomeGrowthQuarters.toString());
    }
  }, [incomeInputValue, incomeGrowthQuarters, setIncomeGrowthQuarters]);

  const handleIncomeQuartersKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleIncomeQuartersConfirm();
      }
    },
    [handleIncomeQuartersConfirm]
  );

  return (
    <div className="flex items-center space-x-4">
      {/* 매출 성장 필터 */}
      <div className="flex items-center space-x-3 bg-card rounded-md px-3 py-2 border shadow-sm hover:bg-accent/50 transition-colors">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="revenueGrowth"
            checked={revenueGrowth}
            onChange={(e) => setRevenueGrowth(e.target.checked)}
            className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <label
            htmlFor="revenueGrowth"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            매출 성장
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="2"
            max="8"
            value={revenueInputValue}
            onChange={(e) => handleRevenueQuartersChange(e.target.value)}
            onBlur={handleRevenueQuartersConfirm}
            onKeyDown={handleRevenueQuartersKeyDown}
            disabled={!revenueGrowth}
            className="flex h-8 w-12 rounded-md border border-input bg-background px-2 py-1 text-sm text-center ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="3"
          />
          <span className="text-xs text-muted-foreground font-medium">
            분기 연속
          </span>
        </div>
      </div>

      {/* 구분선 */}
      <div className="w-px h-6 bg-border"></div>

      {/* 수익 성장 필터 */}
      <div className="flex items-center space-x-3 bg-card rounded-md px-3 py-2 border shadow-sm hover:bg-accent/50 transition-colors">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="incomeGrowth"
            checked={incomeGrowth}
            onChange={(e) => setIncomeGrowth(e.target.checked)}
            className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <label
            htmlFor="incomeGrowth"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            수익 성장
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="2"
            max="8"
            value={incomeInputValue}
            onChange={(e) => handleIncomeQuartersChange(e.target.value)}
            onBlur={handleIncomeQuartersConfirm}
            onKeyDown={handleIncomeQuartersKeyDown}
            disabled={!incomeGrowth}
            className="flex h-8 w-12 rounded-md border border-input bg-background px-2 py-1 text-sm text-center ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="3"
          />
          <span className="text-xs text-muted-foreground font-medium">
            분기 연속
          </span>
        </div>
      </div>
    </div>
  );
});
