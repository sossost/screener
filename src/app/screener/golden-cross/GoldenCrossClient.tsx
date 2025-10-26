"use client";

import {
  useQueryState,
  parseAsBoolean,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/utils/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuarterlyBarChart } from "@/components/charts/QuarterlyBarChart";

type QuarterlyFinancial = {
  period_end_date: string;
  revenue: number | null;
  eps_diluted: number | null;
};

type GoldenCrossCompany = {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  quarterly_financials: QuarterlyFinancial[];
  profitability_status: "profitable" | "unprofitable" | "unknown";
  ordered: boolean;
  just_turned: boolean;
};

type GoldenCrossClientProps = {
  data: GoldenCrossCompany[];
  tradeDate: string | null;
};

/**
 * 날짜 문자열을 "Q1 2024" 형식의 분기 문자열로 변환
 * @param dateString - "2024-03-31" 형식의 날짜 문자열
 * @returns "Q1 2024" 형식의 분기 문자열
 */
function formatQuarter(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

/**
 * 재무 데이터를 차트 데이터 형식으로 변환
 * @param financials - 분기별 재무 데이터 배열
 * @param type - "revenue" 또는 "eps"
 * @returns 차트에 사용할 데이터 배열
 */
function prepareChartData(
  financials: QuarterlyFinancial[],
  type: "revenue" | "eps"
) {
  if (!financials || financials.length === 0) return [];

  return financials.map((f) => ({
    quarter: formatQuarter(f.period_end_date),
    value: type === "revenue" ? f.revenue : f.eps_diluted,
    date: f.period_end_date,
  }));
}

export default function GoldenCrossClient({
  data,
  tradeDate,
}: GoldenCrossClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // URL 쿼리 파라미터를 직접 상태로 사용
  const [justTurned, setJustTurned] = useQueryState(
    "justTurned",
    parseAsBoolean.withDefault(false)
  );
  const [lookbackDays, setLookbackDays] = useQueryState(
    "lookbackDays",
    parseAsInteger.withDefault(10)
  );
  const [profitability, setProfitability] = useQueryState(
    "profitability",
    parseAsStringLiteral([
      "all",
      "profitable",
      "unprofitable",
    ] as const).withDefault("all")
  );

  // 로컬 input 상태 (입력 중에는 리패치 안함)
  const [inputValue, setInputValue] = useState(lookbackDays.toString());

  // 필터 변경 시 캐시 무효화 후 리패치
  const handleFilterChange = async (
    newJustTurned: boolean,
    newLookbackDays: number,
    newProfitability: "all" | "profitable" | "unprofitable"
  ) => {
    // 이전 캐시 무효화 (모든 필터 포함)
    const oldTag = `golden-cross-${justTurned}-${lookbackDays}-${profitability}`;
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: oldTag }),
    });

    // URL 업데이트
    await setJustTurned(newJustTurned);
    await setLookbackDays(newLookbackDays);
    await setProfitability(newProfitability);

    // 서버 컴포넌트 리패치 (transition으로 감싸서 로딩 표시)
    startTransition(() => {
      router.refresh();
    });
  };

  // 기간 입력 확정 (blur 또는 Enter)
  const handleLookbackConfirm = () => {
    const newValue = Number(inputValue);
    if (newValue >= 1 && newValue <= 60 && newValue !== lookbackDays) {
      handleFilterChange(justTurned, newValue, profitability);
    }
  };

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          📈 Golden Cross 스크리너
        </CardTitle>
        <div className="flex items-center gap-6 mt-4 flex-wrap min-h-[32px]">
          {/* 정배열 필터 */}
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="all"
              name="alignment-filter"
              checked={!justTurned}
              onChange={() =>
                handleFilterChange(false, lookbackDays, profitability)
              }
              disabled={isPending}
              className="w-4 h-4 text-blue-600 disabled:opacity-50"
            />
            <label htmlFor="all" className="text-sm font-medium">
              전체 정배열
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="recent"
              name="alignment-filter"
              checked={justTurned}
              onChange={() =>
                handleFilterChange(true, lookbackDays, profitability)
              }
              disabled={isPending}
              className="w-4 h-4 text-blue-600 disabled:opacity-50"
            />
            <label htmlFor="recent" className="text-sm font-medium">
              최근 전환
            </label>
          </div>
          <div
            className={`flex items-center space-x-2 transition-opacity duration-200 ${
              justTurned ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <label htmlFor="lookback" className="text-sm font-medium">
              기간:
            </label>
            <input
              type="number"
              id="lookback"
              min="1"
              max="60"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleLookbackConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLookbackConfirm();
                  e.currentTarget.blur();
                }
              }}
              disabled={isPending}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="text-sm text-gray-600">일</span>
          </div>

          {/* 수익성 드롭다운 - 오른쪽 끝 */}
          <div className="flex items-center space-x-2 ml-auto">
            <label className="text-sm font-medium text-gray-700">수익성:</label>
            <Select
              value={profitability}
              onValueChange={(value: string) =>
                handleFilterChange(
                  justTurned,
                  lookbackDays,
                  value as "all" | "profitable" | "unprofitable"
                )
              }
              disabled={isPending}
            >
              <SelectTrigger className="w-[90px] h-8 hover:bg-gray-50 transition-colors cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[90px]">
                <SelectItem value="all" className="cursor-pointer">
                  전체
                </SelectItem>
                <SelectItem value="profitable" className="cursor-pointer">
                  흑자
                </SelectItem>
                <SelectItem value="unprofitable" className="cursor-pointer">
                  적자
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          // 로딩 중일 때 테이블 스켈레톤만 표시
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right w-[200px]">
                    Market Cap
                  </TableHead>
                  <TableHead className="text-right w-[140px]">
                    Last Close
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    매출 (4Q)
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    EPS (4Q)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {/* Symbol */}
                    <TableCell>
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                    </TableCell>
                    {/* Market Cap */}
                    <TableCell className="text-right">
                      <div className="h-4 w-20 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    {/* Last Close */}
                    <TableCell className="text-right">
                      <div className="h-4 w-20 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    {/* 매출 차트 */}
                    <TableCell>
                      <div className="h-7 w-20 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    {/* EPS 차트 */}
                    <TableCell>
                      <div className="h-7 w-20 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          // 실제 데이터 표시
          <>
            {data.length > 0 && (
              <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                <div>
                  총{" "}
                  <span className="font-semibold text-blue-600">
                    {data.length}
                  </span>
                  개 종목
                </div>
                {tradeDate && (
                  <div className="text-gray-500">
                    기준일: <span className="font-semibold">{tradeDate}</span>
                  </div>
                )}
              </div>
            )}
            <Table>
              <TableCaption>
                {justTurned
                  ? `최근 ${lookbackDays}일 이내에 MA20 > MA50 > MA100 > MA200 정배열로 전환한 종목`
                  : "MA20 > MA50 > MA100 > MA200 정배열 조건을 만족하는 종목"}
                {profitability !== "all" && (
                  <span className="ml-2">
                    •{" "}
                    {profitability === "profitable"
                      ? "흑자 종목만"
                      : "적자 종목만"}
                  </span>
                )}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right w-[200px]">
                    Market Cap
                  </TableHead>
                  <TableHead className="text-right w-[140px]">
                    Last Close
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    매출 (4Q)
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    EPS (4Q)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c, idx) => (
                  <TableRow key={`${c.symbol}-${idx}`}>
                    {/* Symbol */}
                    <TableCell className="font-semibold">
                      <a
                        href={`https://seekingalpha.com/symbol/${c.symbol}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {c.symbol}
                      </a>
                    </TableCell>

                    {/* Market Cap */}
                    <TableCell className="text-right font-medium">
                      {c.market_cap ? formatNumber(c.market_cap) : "-"}
                    </TableCell>

                    {/* Last Close */}
                    <TableCell className="text-right">
                      ${formatNumber(c.last_close)}
                    </TableCell>

                    {/* 매출 차트 */}
                    <TableCell>
                      <QuarterlyBarChart
                        data={prepareChartData(
                          c.quarterly_financials,
                          "revenue"
                        )}
                        type="revenue"
                        height={28}
                        width={80}
                      />
                    </TableCell>

                    {/* EPS 차트 */}
                    <TableCell>
                      <QuarterlyBarChart
                        data={prepareChartData(c.quarterly_financials, "eps")}
                        type="eps"
                        height={28}
                        width={80}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
