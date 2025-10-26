"use client";

import { useQueryState, parseAsBoolean, parseAsInteger } from "nuqs";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

type GoldenCrossCompany = {
  symbol: string;
  last_close: string;
  ma20: string;
  ma50: string;
  ma100: string;
  ma200: string;
  market_cap: string | null;
  ordered: boolean;
  just_turned: boolean;
};

type GoldenCrossClientProps = {
  data: GoldenCrossCompany[];
  tradeDate: string | null;
};

export const GoldenCrossClient = ({
  data,
  tradeDate,
}: GoldenCrossClientProps) => {
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

  // 로컬 input 상태 (입력 중에는 리패치 안함)
  const [inputValue, setInputValue] = useState(lookbackDays.toString());

  // 필터 변경 시 캐시 무효화 후 리패치
  const handleFilterChange = async (
    newJustTurned: boolean,
    newLookbackDays: number
  ) => {
    // 이전 캐시 무효화
    const oldTag = `golden-cross-${justTurned}-${lookbackDays}`;
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: oldTag }),
    });

    // URL 업데이트
    await setJustTurned(newJustTurned);
    await setLookbackDays(newLookbackDays);

    // 서버 컴포넌트 리패치 (transition으로 감싸서 로딩 표시)
    startTransition(() => {
      router.refresh();
    });
  };

  // 기간 입력 확정 (blur 또는 Enter)
  const handleLookbackConfirm = () => {
    const newValue = Number(inputValue);
    if (newValue >= 1 && newValue <= 60 && newValue !== lookbackDays) {
      handleFilterChange(justTurned, newValue);
    }
  };

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          📈 Golden Cross 스크리너
        </CardTitle>
        <div className="flex items-center gap-6 mt-4 flex-wrap min-h-[32px]">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="all"
              name="filter"
              checked={!justTurned}
              onChange={() => handleFilterChange(false, lookbackDays)}
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
              name="filter"
              checked={justTurned}
              onChange={() => handleFilterChange(true, lookbackDays)}
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
                  <TableHead className="text-right">Market Cap</TableHead>
                  <TableHead className="text-right">Last Close</TableHead>
                  <TableHead className="text-right">MA20</TableHead>
                  <TableHead className="text-right">MA50</TableHead>
                  <TableHead className="text-right">MA100</TableHead>
                  <TableHead className="text-right">MA200</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-4 w-20 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
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
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Market Cap</TableHead>
                  <TableHead className="text-right">Last Close</TableHead>
                  <TableHead className="text-right">MA20</TableHead>
                  <TableHead className="text-right">MA50</TableHead>
                  <TableHead className="text-right">MA100</TableHead>
                  <TableHead className="text-right">MA200</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c, idx) => (
                  <TableRow key={`${c.symbol}-${idx}`}>
                    <TableCell className="font-semibold">
                      <a
                        href={`https://seekingalpha.com/symbol/${c.symbol}`}
                        target="_blank"
                        className="text-blue-600 hover:underline"
                      >
                        {c.symbol}
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.market_cap ? formatNumber(c.market_cap) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(c.last_close)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(c.ma20)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(c.ma50)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(c.ma100)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(c.ma200)}
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
};
