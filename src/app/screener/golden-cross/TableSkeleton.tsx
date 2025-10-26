import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          📈 Golden Cross 스크리너
        </CardTitle>
        <div className="flex items-center gap-6 mt-4 flex-wrap">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
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
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
