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
  const companies = data;

  console.log(companies);

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          📈 Golden Cross 스크리너
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            MA20 &gt; MA50 &gt; MA100 &gt; MA200 정배열 조건을 만족하는 종목
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
            {companies.map((c) => (
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
