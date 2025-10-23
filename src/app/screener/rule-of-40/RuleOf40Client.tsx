"use client";

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
import { formatNumber, formatPercent } from "@/utils/format";

type Rule40Company = {
  symbol: string;
  as_of_q: string;
  period_end_date: string;
  market_cap: string | null;
  yoy_ttm_rev_growth_pct: string | null;
  ttm_op_margin_pct: string | null;
  rule40_score: string | null;
};

export const Rule40Client = ({ data }: { data: Rule40Company[] }) => {
  const companies = data;

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          🚀 Rule of 40 스크리너
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            최근 TTM 매출성장률 + 영업이익률 합산 점수가 40 이상인 기업
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Quarter</TableHead>
              <TableHead>Market Cap</TableHead>
              <TableHead className="text-right">YoY TTM Rev Growth</TableHead>
              <TableHead className="text-right">TTM Op Margin</TableHead>
              <TableHead className="text-right">Rule of 40 Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={`${c.symbol}-${c.as_of_q}`}>
                <TableCell className="font-semibold">
                  <a
                    href={`https://seekingalpha.com/symbol/${c.symbol}`}
                    target="_blank"
                  >
                    {c.symbol}
                  </a>
                </TableCell>
                <TableCell>{c.as_of_q}</TableCell>
                <TableCell>{formatNumber(c.market_cap)}</TableCell>
                <TableCell
                  className={
                    Number(c.yoy_ttm_rev_growth_pct) > 0
                      ? "text-green-600 text-right"
                      : "text-red-600 text-right"
                  }
                >
                  {formatPercent(c.yoy_ttm_rev_growth_pct)}
                </TableCell>
                <TableCell
                  className={
                    Number(c.ttm_op_margin_pct) > 0
                      ? "text-green-600 text-right"
                      : "text-red-600 text-right"
                  }
                >
                  {formatPercent(c.ttm_op_margin_pct)}
                </TableCell>
                <TableCell
                  className={
                    Number(c.rule40_score) >= 40
                      ? "text-green-700 font-bold text-right"
                      : "text-gray-600 text-right"
                  }
                >
                  {formatPercent(c.rule40_score)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
