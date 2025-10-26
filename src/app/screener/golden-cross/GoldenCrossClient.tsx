"use client";

import { useState, useEffect } from "react";
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

export const GoldenCrossClient = ({ data }: { data: GoldenCrossCompany[] }) => {
  const [justTurned, setJustTurned] = useState(false);
  const [lookbackDays, setLookbackDays] = useState(10);
  const [companies, setCompanies] = useState<GoldenCrossCompany[]>(data);
  const [tradeDate, setTradeDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (
    justTurnedParam: boolean,
    lookbackDaysParam: number
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        justTurned: justTurnedParam.toString(),
        lookbackDays: lookbackDaysParam.toString(),
      });
      const response = await fetch(
        `/api/screener/golden-cross?${params.toString()}`
      );
      const result = await response.json();
      setCompanies(result.data || []);
      setTradeDate(result.trade_date || null);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(justTurned, lookbackDays);
  }, [justTurned, lookbackDays]);

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          📈 Golden Cross 스크리너
        </CardTitle>
        <div className="flex items-center gap-6 mt-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="all"
              name="filter"
              checked={!justTurned}
              onChange={() => setJustTurned(false)}
              className="w-4 h-4 text-blue-600"
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
              onChange={() => setJustTurned(true)}
              className="w-4 h-4 text-blue-600"
            />
            <label htmlFor="recent" className="text-sm font-medium">
              최근 전환
            </label>
          </div>
          {justTurned && (
            <div className="flex items-center space-x-2">
              <label htmlFor="lookback" className="text-sm font-medium">
                기간:
              </label>
              <input
                type="number"
                id="lookback"
                min="1"
                max="60"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">일</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">데이터를 불러오는 중...</div>
          </div>
        )}
        {!loading && companies.length > 0 && (
          <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              총{" "}
              <span className="font-semibold text-blue-600">
                {companies.length}
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
            {!loading &&
              companies.map((c, idx) => (
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
      </CardContent>
    </Card>
  );
};
