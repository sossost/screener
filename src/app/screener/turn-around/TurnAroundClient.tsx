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
import { formatNumber } from "@/utils/format";
import dayjs from "dayjs";

type Company = {
  symbol: string;
  as_of_q: string;
  market_cap: string;
  net_income: string;
  eps: string;
  ocf: string;
  prev_net_income: string;
  prev_eps: string;
};

export const TurnAroundClient = ({ data }: { data: Company[] }) => {
  const freshCompanies = data;

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          📈 최근 흑자 전환 기업
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>가장 최근 분기 기준 적자 → 흑자 전환</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Quarter</TableHead>
              <TableHead>Market Cap</TableHead>
              <TableHead className="text-right">Net Income</TableHead>
              <TableHead className="text-right">EPS</TableHead>
              <TableHead className="text-right">OCF</TableHead>
              <TableHead className="text-right">Prev Net</TableHead>
              <TableHead className="text-right">Prev EPS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {freshCompanies.map((c) => (
              <TableRow key={`${c.symbol}-${c.as_of_q}`}>
                <TableCell className="font-semibold">{c.symbol}</TableCell>
                <TableCell>{c.as_of_q}</TableCell>
                <TableCell>{formatNumber(c.market_cap)}</TableCell>
                <TableCell
                  className={
                    Number(c.net_income) > 0
                      ? "text-green-600 text-right"
                      : "text-red-600 text-right"
                  }
                >
                  {formatNumber(c.net_income)}
                </TableCell>
                <TableCell className="text-right">{c.eps}</TableCell>
                <TableCell className="text-right">
                  {formatNumber(c.ocf)}
                </TableCell>
                <TableCell className="text-red-600 text-right">
                  {formatNumber(c.prev_net_income)}
                </TableCell>
                <TableCell className="text-right">{c.prev_eps}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
