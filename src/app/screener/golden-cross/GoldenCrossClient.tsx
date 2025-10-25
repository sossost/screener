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
  date: string;
  last_close: string;
  ma20: string;
  ma50: string;
  ma100: string;
  ma200: string;
  ordered: boolean;
  just_turned: boolean;
};

export const GoldenCrossClient = ({ data }: { data: GoldenCrossCompany[] }) => {
  const [justTurned, setJustTurned] = useState(false);
  const [companies, setCompanies] = useState<GoldenCrossCompany[]>(data);
  const [loading, setLoading] = useState(false);

  const fetchData = async (justTurnedParam: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/screener/golden-cross?justTurned=${justTurnedParam}`
      );
      const result = await response.json();
      setCompanies(result.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(justTurned);
  }, [justTurned]);

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          📈 Golden Cross 스크리너
        </CardTitle>
        <div className="flex items-center space-x-4 mt-4">
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
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">데이터를 불러오는 중...</div>
          </div>
        )}
        <Table>
          <TableCaption>
            {justTurned
              ? "최근에 MA20 > MA50 > MA100 > MA200 정배열로 전환한 종목"
              : "MA20 > MA50 > MA100 > MA200 정배열 조건을 만족하는 종목"}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Last Close</TableHead>
              <TableHead className="text-right">MA20</TableHead>
              <TableHead className="text-right">MA50</TableHead>
              <TableHead className="text-right">MA100</TableHead>
              <TableHead className="text-right">MA200</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              companies.map((c) => (
                <TableRow key={`${c.symbol}-${c.date}`}>
                  <TableCell className="font-semibold">
                    <a
                      href={`https://seekingalpha.com/symbol/${c.symbol}`}
                      target="_blank"
                    >
                      {c.symbol}
                    </a>
                  </TableCell>
                  <TableCell>{c.date}</TableCell>
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
