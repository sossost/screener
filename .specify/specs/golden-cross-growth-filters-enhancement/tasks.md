# Task List: Golden Cross 스크리너 성장성 필터 기능 강화

**Feature Branch**: `feature/golden-cross-growth-filters-enhancement`  
**Created**: 2025-01-27  
**Status**: Draft  
**Total Tasks**: 25

## Phase 1: Backend API 확장 (Day 1)

### Task 1.1: API 파라미터 확장

**Priority**: P1  
**Estimated Time**: 2 hours  
**Dependencies**: None

**Description**: Golden Cross API 라우트에 성장성 필터 파라미터 추가

**Acceptance Criteria**:

- `revenueGrowth` 파라미터 추가 (boolean)
- `incomeGrowth` 파라미터 추가 (boolean)
- `revenueGrowthQuarters` 파라미터 추가 (2~8, 기본값 3)
- `incomeGrowthQuarters` 파라미터 추가 (2~8, 기본값 3)

**Implementation**:

```typescript
// src/app/api/screener/golden-cross/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 기존 파라미터들...
  const profitability = searchParams.get("profitability") ?? "all";

  // 새로운 성장성 필터 파라미터
  const revenueGrowth = searchParams.get("revenueGrowth") === "true";
  const incomeGrowth = searchParams.get("incomeGrowth") === "true";
  const revenueGrowthQuarters = Number(
    searchParams.get("revenueGrowthQuarters") ?? 3
  );
  const incomeGrowthQuarters = Number(
    searchParams.get("incomeGrowthQuarters") ?? 3
  );

  // 유효성 검사
  if (revenueGrowthQuarters < 2 || revenueGrowthQuarters > 8) {
    return NextResponse.json(
      { error: "revenueGrowthQuarters must be between 2 and 8" },
      { status: 400 }
    );
  }
  if (incomeGrowthQuarters < 2 || incomeGrowthQuarters > 8) {
    return NextResponse.json(
      { error: "incomeGrowthQuarters must be between 2 and 8" },
      { status: 400 }
    );
  }
}
```

**Testing**:

- [ ] 유효한 파라미터로 API 호출 테스트
- [ ] 잘못된 파라미터로 에러 응답 테스트
- [ ] 기본값 설정 테스트

---

### Task 1.2: SQL 쿼리 수정 (8분기 데이터)

**Priority**: P1  
**Estimated Time**: 3 hours  
**Dependencies**: Task 1.1

**Description**: 4분기에서 8분기 데이터 조회로 변경

**Acceptance Criteria**:

- 8개 분기 데이터 조회
- 성장성 계산 로직 추가
- 성장성 필터링 조건 추가

**Implementation**:

```sql
-- 기존 쿼리 수정
LEFT JOIN LATERAL (
  SELECT
    json_agg(
      json_build_object(
        'period_end_date', period_end_date,
        'revenue', revenue::numeric,
        'eps_diluted', eps_diluted::numeric
      ) ORDER BY period_end_date DESC
    ) as quarterly_data,
    -- 연속 매출 성장 분기 수 계산
    (
      WITH revenue_data AS (
        SELECT revenue::numeric as rev, period_end_date
        FROM quarterly_financials
        WHERE symbol = cand.symbol
          AND revenue IS NOT NULL
        ORDER BY period_end_date DESC
        LIMIT 8
      )
      SELECT COUNT(*) - 1
      FROM (
        SELECT rev, LAG(rev) OVER (ORDER BY period_end_date DESC) as prev_rev
        FROM revenue_data
      ) growth_check
      WHERE rev > prev_rev AND prev_rev IS NOT NULL
    ) as revenue_growth_quarters,
    -- 연속 수익 성장 분기 수 계산
    (
      WITH income_data AS (
        SELECT eps_diluted::numeric as eps, period_end_date
        FROM quarterly_financials
        WHERE symbol = cand.symbol
          AND eps_diluted IS NOT NULL
        ORDER BY period_end_date DESC
        LIMIT 8
      )
      SELECT COUNT(*) - 1
      FROM (
        SELECT eps, LAG(eps) OVER (ORDER BY period_end_date DESC) as prev_eps
        FROM income_data
      ) growth_check
      WHERE eps > prev_eps AND prev_eps IS NOT NULL
    ) as income_growth_quarters
  FROM (
    SELECT period_end_date, revenue, eps_diluted
    FROM quarterly_financials
    WHERE symbol = cand.symbol
    ORDER BY period_end_date DESC
    LIMIT 8  -- 4분기 → 8분기로 변경
  ) recent_quarters
) qf ON true
WHERE 1=1
  -- 매출 성장 필터
  AND (
    CASE
      WHEN :revenueGrowth = 'true' THEN qf.revenue_growth_quarters >= :revenueGrowthQuarters
      ELSE true
    END
  )
  -- 수익 성장 필터
  AND (
    CASE
      WHEN :incomeGrowth = 'true' THEN qf.income_growth_quarters >= :incomeGrowthQuarters
      ELSE true
    END
  )
```

**Testing**:

- [ ] 8분기 데이터 반환 확인
- [ ] 성장성 계산 정확성 테스트
- [ ] 필터링 조건 테스트

---

### Task 1.3: 응답 데이터 구조 확장

**Priority**: P1  
**Estimated Time**: 1 hour  
**Dependencies**: Task 1.2

**Description**: API 응답에 성장성 정보 추가

**Acceptance Criteria**:

- `revenue_growth_quarters` 필드 추가
- `income_growth_quarters` 필드 추가
- 8분기 데이터 반환

**Implementation**:

```typescript
// 응답 데이터 타입 정의
type QueryResult = {
  symbol: string;
  trade_date: string;
  last_close: number;
  market_cap: number | null;
  quarterly_financials: any[] | null; // 8개 분기
  revenue_growth_quarters: number | null;
  income_growth_quarters: number | null;
  latest_eps: number | null;
};

// 응답 데이터 매핑
const data = results.map((r) => ({
  symbol: r.symbol,
  market_cap: r.market_cap,
  last_close: r.last_close,
  quarterly_financials: r.quarterly_financials || [],
  revenue_growth_quarters: r.revenue_growth_quarters || 0,
  income_growth_quarters: r.income_growth_quarters || 0,
  profitability_status:
    r.latest_eps !== null && r.latest_eps > 0
      ? "profitable"
      : r.latest_eps !== null && r.latest_eps < 0
      ? "unprofitable"
      : "unknown",
  ordered: true,
  just_turned: justTurned,
}));
```

**Testing**:

- [ ] 응답 데이터 구조 확인
- [ ] 성장성 정보 정확성 테스트
- [ ] 8분기 데이터 개수 확인

---

## Phase 2: Frontend UI 컴포넌트 (Day 2)

### Task 2.1: GrowthFilterControls 컴포넌트 생성

**Priority**: P1  
**Estimated Time**: 3 hours  
**Dependencies**: None

**Description**: 성장성 필터 UI 컴포넌트 생성

**Acceptance Criteria**:

- 매출 성장 체크박스 + 연속 분기 수 입력
- 수익 성장 체크박스 + 연속 분기 수 입력
- 입력 유효성 검사 (2~8 범위)

**Implementation**:

```typescript
// src/components/filters/GrowthFilterControls.tsx
"use client";

import { useState } from "react";

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

export function GrowthFilterControls({
  revenueGrowth,
  setRevenueGrowth,
  revenueGrowthQuarters,
  setRevenueGrowthQuarters,
  incomeGrowth,
  setIncomeGrowth,
  incomeGrowthQuarters,
  setIncomeGrowthQuarters,
}: GrowthFilterControlsProps) {
  const handleRevenueQuartersChange = (value: string) => {
    const num = Number(value);
    if (num >= 2 && num <= 8) {
      setRevenueGrowthQuarters(num);
    }
  };

  const handleIncomeQuartersChange = (value: string) => {
    const num = Number(value);
    if (num >= 2 && num <= 8) {
      setIncomeGrowthQuarters(num);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {/* 매출 성장 필터 */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="revenueGrowth"
          checked={revenueGrowth}
          onChange={(e) => setRevenueGrowth(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="revenueGrowth" className="text-sm font-medium">
          매출 성장
        </label>
        {revenueGrowth && (
          <input
            type="number"
            min="2"
            max="8"
            value={revenueGrowthQuarters}
            onChange={(e) => handleRevenueQuartersChange(e.target.value)}
            className="w-16 px-2 py-1 text-sm border rounded"
            placeholder="3"
          />
        )}
      </div>

      {/* 수익 성장 필터 */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="incomeGrowth"
          checked={incomeGrowth}
          onChange={(e) => setIncomeGrowth(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="incomeGrowth" className="text-sm font-medium">
          수익 성장
        </label>
        {incomeGrowth && (
          <input
            type="number"
            min="2"
            max="8"
            value={incomeGrowthQuarters}
            onChange={(e) => handleIncomeQuartersChange(e.target.value)}
            className="w-16 px-2 py-1 text-sm border rounded"
            placeholder="3"
          />
        )}
      </div>
    </div>
  );
}
```

**Testing**:

- [ ] 체크박스 토글 테스트
- [ ] 숫자 입력 유효성 검사 테스트
- [ ] UI 렌더링 테스트

---

### Task 2.2: 기존 필터 UI 통합

**Priority**: P1  
**Estimated Time**: 2 hours  
**Dependencies**: Task 2.1

**Description**: 성장성 필터를 기존 필터 UI에 통합

**Acceptance Criteria**:

- 수익성 필터와 성장성 필터를 같은 라인에 배치
- 반응형 레이아웃 고려
- 일관된 UI 스타일

**Implementation**:

```typescript
// src/app/screener/golden-cross/GoldenCrossClient.tsx
import { GrowthFilterControls } from "@/components/filters/GrowthFilterControls";

export default function GoldenCrossClient({
  data,
  tradeDate,
}: GoldenCrossClientProps) {
  // 기존 상태들...
  const [revenueGrowth, setRevenueGrowth] = useState(false);
  const [revenueGrowthQuarters, setRevenueGrowthQuarters] = useState(3);
  const [incomeGrowth, setIncomeGrowth] = useState(false);
  const [incomeGrowthQuarters, setIncomeGrowthQuarters] = useState(3);

  return (
    <div className="space-y-4">
      {/* 필터 컨트롤 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기존 필터들... */}

          {/* 수익성 필터 */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">수익성:</label>
            <Select
              value={profitability}
              onValueChange={(value: string) => setProfitability(value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="profitable">흑자</SelectItem>
                <SelectItem value="unprofitable">적자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 성장성 필터 */}
          <GrowthFilterControls
            revenueGrowth={revenueGrowth}
            setRevenueGrowth={setRevenueGrowth}
            revenueGrowthQuarters={revenueGrowthQuarters}
            setRevenueGrowthQuarters={setRevenueGrowthQuarters}
            incomeGrowth={incomeGrowth}
            setIncomeGrowth={setIncomeGrowth}
            incomeGrowthQuarters={incomeGrowthQuarters}
            setIncomeGrowthQuarters={setIncomeGrowthQuarters}
          />
        </div>
      </div>

      {/* 테이블... */}
    </div>
  );
}
```

**Testing**:

- [ ] 필터 UI 통합 확인
- [ ] 반응형 레이아웃 테스트
- [ ] 스타일 일관성 확인

---

### Task 2.3: 상태 관리 및 URL 동기화

**Priority**: P1  
**Estimated Time**: 2 hours  
**Dependencies**: Task 2.2

**Description**: nuqs를 사용한 URL 파라미터 동기화

**Acceptance Criteria**:

- 성장성 필터 상태가 URL에 반영
- 페이지 새로고침 시 필터 상태 유지
- 필터 변경 시 URL 업데이트

**Implementation**:

```typescript
// src/app/screener/golden-cross/GoldenCrossClient.tsx
import { useQueryState } from "nuqs";

export default function GoldenCrossClient({
  data,
  tradeDate,
}: GoldenCrossClientProps) {
  // 기존 URL 상태들...
  const [profitability, setProfitability] = useQueryState("profitability", {
    defaultValue: "all",
  });

  // 새로운 성장성 필터 URL 상태
  const [revenueGrowth, setRevenueGrowth] = useQueryState("revenueGrowth", {
    defaultValue: "false",
    parse: (value) => value === "true",
    serialize: (value) => value.toString(),
  });

  const [revenueGrowthQuarters, setRevenueGrowthQuarters] = useQueryState(
    "revenueGrowthQuarters",
    {
      defaultValue: "3",
      parse: (value) => Number(value),
      serialize: (value) => value.toString(),
    }
  );

  const [incomeGrowth, setIncomeGrowth] = useQueryState("incomeGrowth", {
    defaultValue: "false",
    parse: (value) => value === "true",
    serialize: (value) => value.toString(),
  });

  const [incomeGrowthQuarters, setIncomeGrowthQuarters] = useQueryState(
    "incomeGrowthQuarters",
    {
      defaultValue: "3",
      parse: (value) => Number(value),
      serialize: (value) => value.toString(),
    }
  );

  // 필터 변경 핸들러
  const handleFilterChange = async () => {
    // 캐시 무효화
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: "golden-cross" }),
    });

    // 페이지 새로고침
    router.refresh();
  };

  return <div className="space-y-4">{/* 필터 UI... */}</div>;
}
```

**Testing**:

- [ ] URL 파라미터 동기화 테스트
- [ ] 페이지 새로고침 시 상태 유지 테스트
- [ ] 필터 변경 시 URL 업데이트 테스트

---

## Phase 3: 차트 컴포넌트 확장 (Day 2-3)

### Task 3.1: QuarterlyBarChart 8분기 확장

**Priority**: P1  
**Estimated Time**: 2 hours  
**Dependencies**: None

**Description**: QuarterlyBarChart를 8분기 데이터로 확장

**Acceptance Criteria**:

- 8개 분기 데이터 처리
- 차트 크기 160px × 28px로 조정
- 막대 너비 및 간격 유지

**Implementation**:

```typescript
// src/components/charts/QuarterlyBarChart.tsx
const CHART_CONFIG = {
  DEFAULT_HEIGHT: 28,
  DEFAULT_WIDTH: 160, // 80px → 160px (8분기 × 20px)
  BAR_WIDTH: "w-3",
  BAR_GAP: "gap-0.5",
  HEIGHT_MULTIPLIER: 0.8,
  MIN_BAR_HEIGHT: 3,
  ZERO_BAR_HEIGHT: 2,
  TOOLTIP_WIDTH: 100,
  TOOLTIP_MARGIN: 10,
} as const;

export const QuarterlyBarChart = React.memo(function QuarterlyBarChart({
  data,
  type,
  height = CHART_CONFIG.DEFAULT_HEIGHT,
  width = CHART_CONFIG.DEFAULT_WIDTH, // 160px
}: QuarterlyBarChartProps) {
  // 기존 로직 유지, 8개 분기 데이터 처리
  const reversedData = [...data].reverse(); // 최신 분기가 오른쪽

  return (
    <div
      className={`relative inline-flex items-end ${CHART_CONFIG.BAR_GAP} justify-end`}
      style={{ height, width }}
    >
      {reversedData.map((item, index) => {
        // 기존 막대 렌더링 로직...
      })}
    </div>
  );
});
```

**Testing**:

- [ ] 8분기 데이터 렌더링 테스트
- [ ] 차트 크기 확인
- [ ] 막대 간격 확인

---

### Task 3.2: 데이터 처리 로직 수정

**Priority**: P1  
**Estimated Time**: 1 hour  
**Dependencies**: Task 3.1

**Description**: prepareChartData 함수를 8분기 데이터로 수정

**Acceptance Criteria**:

- 8개 분기 데이터 처리
- 데이터 부족 시 "-" 표시
- 분기 정보 정확성

**Implementation**:

```typescript
// src/app/screener/golden-cross/GoldenCrossClient.tsx
/**
 * 재무 데이터를 차트 데이터 형식으로 변환 (8분기)
 * @param financials - 분기별 재무 데이터 배열 (8개)
 * @param type - "revenue" 또는 "eps"
 * @returns 차트에 사용할 데이터 배열
 */
function prepareChartData(
  financials: QuarterlyFinancial[],
  type: "revenue" | "eps"
) {
  if (!financials || financials.length === 0) return [];

  // 8개 분기 데이터 처리
  return financials.map((f) => ({
    quarter: formatQuarter(f.period_end_date),
    value: type === "revenue" ? f.revenue : f.eps_diluted,
    date: f.period_end_date,
  }));
}

// 테이블에서 사용
<TableCell>
  <div className="flex justify-end">
    <QuarterlyBarChart
      data={prepareChartData(c.quarterly_financials, "revenue")}
      type="revenue"
      height={28}
      width={160} // 8분기로 확장
    />
  </div>
</TableCell>;
```

**Testing**:

- [ ] 8분기 데이터 변환 테스트
- [ ] 데이터 부족 시 처리 테스트
- [ ] 분기 정보 정확성 테스트

---

### Task 3.3: 테이블 컬럼 업데이트

**Priority**: P1  
**Estimated Time**: 1 hour  
**Dependencies**: Task 3.2

**Description**: 테이블 헤더와 컬럼을 8분기로 업데이트

**Acceptance Criteria**:

- "매출 (4Q)" → "매출 (8Q)"
- "EPS (4Q)" → "EPS (8Q)"
- 컬럼 너비 조정 (100px → 160px)

**Implementation**:

```typescript
// src/app/screener/golden-cross/GoldenCrossClient.tsx
<TableHeader>
  <TableRow>
    <TableHead>Symbol</TableHead>
    <TableHead className="text-right w-[200px]">Market Cap</TableHead>
    <TableHead className="text-right w-[140px]">Last Close</TableHead>
    <TableHead className="w-[160px] text-right">매출 (8Q)</TableHead> {/* 4Q → 8Q, 100px → 160px */}
    <TableHead className="w-[160px] text-right">EPS (8Q)</TableHead> {/* 4Q → 8Q, 100px → 160px */}
  </TableRow>
</TableHeader>

// 스켈레톤 로더도 업데이트
<TableCell>
  <div className="flex justify-end">
    <div className="w-[160px] h-7 bg-gray-200 rounded animate-pulse" />
  </div>
</TableCell>
```

**Testing**:

- [ ] 테이블 헤더 업데이트 확인
- [ ] 컬럼 너비 조정 확인
- [ ] 스켈레톤 로더 업데이트 확인

---

## Phase 4: 성장성 계산 로직 (Day 3)

### Task 4.1: 성장성 계산 함수 구현

**Priority**: P1  
**Estimated Time**: 3 hours  
**Dependencies**: Task 1.2

**Description**: 연속 성장 분기 수 계산 로직 구현

**Acceptance Criteria**:

- 연속 매출 성장 분기 수 계산
- 연속 수익 성장 분기 수 계산
- SQL 윈도우 함수 활용

**Implementation**:

```sql
-- 연속 매출 성장 분기 수 계산
WITH revenue_data AS (
  SELECT
    revenue::numeric as rev,
    period_end_date,
    ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
  FROM quarterly_financials
  WHERE symbol = :symbol
    AND revenue IS NOT NULL
  ORDER BY period_end_date DESC
  LIMIT 8
),
revenue_growth_check AS (
  SELECT
    rev,
    LAG(rev) OVER (ORDER BY period_end_date DESC) as prev_rev,
    rn
  FROM revenue_data
)
SELECT COUNT(*) - 1 as growth_quarters
FROM revenue_growth_check
WHERE rev > prev_rev
  AND prev_rev IS NOT NULL
  AND rn > 1;

-- 연속 수익 성장 분기 수 계산
WITH income_data AS (
  SELECT
    eps_diluted::numeric as eps,
    period_end_date,
    ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
  FROM quarterly_financials
  WHERE symbol = :symbol
    AND eps_diluted IS NOT NULL
  ORDER BY period_end_date DESC
  LIMIT 8
),
income_growth_check AS (
  SELECT
    eps,
    LAG(eps) OVER (ORDER BY period_end_date DESC) as prev_eps,
    rn
  FROM income_data
)
SELECT COUNT(*) - 1 as growth_quarters
FROM income_growth_check
WHERE eps > prev_eps
  AND prev_eps IS NOT NULL
  AND rn > 1;
```

**Testing**:

- [ ] 연속 성장 계산 정확성 테스트
- [ ] 데이터 부족 시 처리 테스트
- [ ] 경계값 테스트 (1분기, 8분기)

---

### Task 4.2: 필터링 로직 구현

**Priority**: P1  
**Estimated Time**: 2 hours  
**Dependencies**: Task 4.1

**Description**: 성장성 필터링 조건 구현

**Acceptance Criteria**:

- 요청된 연속 분기 수 이상 성장 여부 판단
- 데이터 부족 시 필터에서 제외
- 필터 조합 지원

**Implementation**:

```typescript
// src/app/api/screener/golden-cross/route.ts
const rows = await db.execute(sql`
  WITH last_d AS (/* 기존 로직... */),
  cur AS (/* 기존 로직... */),
  candidates AS (/* 기존 로직... */),
  prev_ma AS (/* 기존 로직... */),
  prev_status AS (/* 기존 로직... */)
  SELECT
    cand.symbol,
    cand.d AS trade_date,
    cand.close AS last_close,
    s.market_cap,
    qf.quarterly_data,
    qf.revenue_growth_quarters,
    qf.income_growth_quarters,
    qf.eps_q1 AS latest_eps
  FROM candidates cand
  LEFT JOIN prev_status ps ON ps.symbol = cand.symbol
  LEFT JOIN symbols s ON s.symbol = cand.symbol
  LEFT JOIN LATERAL (/* 8분기 데이터 + 성장성 계산... */) qf ON true
  WHERE 1=1
    -- 기존 필터들...
    ${justTurned ? sql`AND COALESCE(ps.non_ordered_days_count, 0) > 0` : sql``}
    ${
      profitability === "profitable"
        ? sql`AND qf.eps_q1 IS NOT NULL AND qf.eps_q1 > 0`
        : profitability === "unprofitable"
        ? sql`AND qf.eps_q1 IS NOT NULL AND qf.eps_q1 < 0`
        : sql``
    }
    -- 매출 성장 필터
    ${
      revenueGrowth
        ? sql`AND qf.revenue_growth_quarters >= ${revenueGrowthQuarters}`
        : sql``
    }
    -- 수익 성장 필터
    ${
      incomeGrowth
        ? sql`AND qf.income_growth_quarters >= ${incomeGrowthQuarters}`
        : sql``
    }
  ORDER BY s.market_cap DESC NULLS LAST, cand.symbol ASC;
`);
```

**Testing**:

- [ ] 매출 성장 필터 테스트
- [ ] 수익 성장 필터 테스트
- [ ] 필터 조합 테스트
- [ ] 데이터 부족 시 제외 테스트

---

### Task 4.3: 캐시 태그 업데이트

**Priority**: P2  
**Estimated Time**: 1 hour  
**Dependencies**: Task 4.2

**Description**: 성장성 필터를 캐시 태그에 포함

**Acceptance Criteria**:

- 성장성 필터 파라미터를 캐시 태그에 포함
- 필터 변경 시 캐시 무효화
- 캐시 효율성 유지

**Implementation**:

```typescript
// src/app/screener/golden-cross/DataWrapper.tsx
export async function DataWrapper({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // 캐시 태그에 성장성 필터 포함
  const cacheTag = `golden-cross-${params.justTurned}-${params.lookbackDays}-${params.profitability}-${params.revenueGrowth}-${params.revenueGrowthQuarters}-${params.incomeGrowth}-${params.incomeGrowthQuarters}`;

  const data = await fetchGoldenCrossData({
    ...params,
    cacheTag,
  });

  return <GoldenCrossClient data={data.data} tradeDate={data.tradeDate} />;
}

// src/app/screener/golden-cross/GoldenCrossClient.tsx
const handleFilterChange = async () => {
  // 캐시 무효화
  await fetch("/api/cache/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag: "golden-cross" }),
  });

  // 페이지 새로고침
  router.refresh();
};
```

**Testing**:

- [ ] 캐시 태그 생성 테스트
- [ ] 필터 변경 시 캐시 무효화 테스트
- [ ] 캐시 히트율 확인

---

## Phase 5: 테스트 및 최적화 (Day 4)

### Task 5.1: 기능 테스트

**Priority**: P1  
**Estimated Time**: 2 hours  
**Dependencies**: All previous tasks

**Description**: 성장성 필터 기능 전체 테스트

**Acceptance Criteria**:

- 성장성 필터 동작 확인
- 8분기 차트 렌더링 확인
- 필터 조합 테스트

**Test Cases**:

1. **매출 성장 필터 테스트**

   - [ ] 3분기 연속 매출 증가 종목만 표시
   - [ ] 5분기 연속 매출 증가 종목만 표시
   - [ ] 필터 해제 시 모든 종목 표시

2. **수익 성장 필터 테스트**

   - [ ] 3분기 연속 EPS 증가 종목만 표시
   - [ ] 4분기 연속 EPS 증가 종목만 표시
   - [ ] 필터 해제 시 모든 종목 표시

3. **필터 조합 테스트**

   - [ ] 매출 성장 + 수익 성장 동시 적용
   - [ ] 수익성 + 성장성 필터 조합
   - [ ] 모든 필터 해제

4. **8분기 차트 테스트**
   - [ ] 8개 분기 데이터 표시
   - [ ] 차트 크기 160px × 28px 확인
   - [ ] 호버 툴팁 정확성

**Implementation**:

```typescript
// 테스트 스크립트
describe("Golden Cross Growth Filters", () => {
  test("revenue growth filter", async () => {
    const response = await fetch(
      "/api/screener/golden-cross?revenueGrowth=true&revenueGrowthQuarters=3"
    );
    const data = await response.json();

    // 모든 종목이 3분기 이상 연속 매출 증가했는지 확인
    data.data.forEach((company) => {
      expect(company.revenue_growth_quarters).toBeGreaterThanOrEqual(3);
    });
  });

  test("income growth filter", async () => {
    const response = await fetch(
      "/api/screener/golden-cross?incomeGrowth=true&incomeGrowthQuarters=4"
    );
    const data = await response.json();

    // 모든 종목이 4분기 이상 연속 수익 증가했는지 확인
    data.data.forEach((company) => {
      expect(company.income_growth_quarters).toBeGreaterThanOrEqual(4);
    });
  });

  test("8 quarter chart data", async () => {
    const response = await fetch("/api/screener/golden-cross");
    const data = await response.json();

    // 8분기 데이터 확인
    data.data.forEach((company) => {
      expect(company.quarterly_financials).toHaveLength(8);
    });
  });
});
```

---

### Task 5.2: 성능 최적화

**Priority**: P2  
**Estimated Time**: 2 hours  
**Dependencies**: Task 5.1

**Description**: 8분기 데이터로 인한 성능 영향 최적화

**Acceptance Criteria**:

- API 응답 시간 < 500ms
- 차트 렌더링 시간 < 100ms (종목당)
- 메모리 사용량 최적화

**Optimization Areas**:

1. **SQL 쿼리 최적화**

   - 인덱스 추가
   - 쿼리 실행 계획 분석
   - 불필요한 JOIN 제거

2. **차트 렌더링 최적화**

   - React.memo 적용
   - 불필요한 리렌더링 방지
   - 가상화 고려

3. **캐싱 전략**
   - 적절한 캐시 TTL 설정
   - 캐시 히트율 최적화

**Implementation**:

```typescript
// 차트 컴포넌트 최적화
export const QuarterlyBarChart = React.memo(
  function QuarterlyBarChart({
    data,
    type,
    height = 28,
    width = 160,
  }: QuarterlyBarChartProps) {
    // 메모이제이션으로 불필요한 리렌더링 방지
    const chartData = useMemo(() => {
      if (!data || data.length === 0) return [];
      return [...data].reverse();
    }, [data]);

    const maxValue = useMemo(() => {
      return Math.max(...chartData.map((d) => Math.abs(d.value || 0)));
    }, [chartData]);

    // 기존 렌더링 로직...
  },
  (prevProps, nextProps) => {
    // props 비교로 리렌더링 최적화
    return (
      prevProps.data === nextProps.data &&
      prevProps.type === nextProps.type &&
      prevProps.height === nextProps.height &&
      prevProps.width === nextProps.width
    );
  }
);
```

---

### Task 5.3: UI/UX 개선

**Priority**: P2  
**Estimated Time**: 2 hours  
**Dependencies**: Task 5.2

**Description**: 사용자 경험 개선

**Acceptance Criteria**:

- 필터 입력 유효성 검사
- 로딩 상태 처리
- 에러 처리
- 도움말 텍스트

**Improvements**:

1. **입력 유효성 검사**

   - 실시간 유효성 검사
   - 에러 메시지 표시
   - 입력 범위 제한

2. **로딩 상태**

   - 필터 변경 시 로딩 표시
   - 스켈레톤 로더
   - 진행률 표시

3. **에러 처리**
   - API 에러 처리
   - 사용자 친화적 에러 메시지
   - 재시도 기능

**Implementation**:

```typescript
// 입력 유효성 검사
const validateQuarters = (value: number): string | null => {
  if (value < 2) return "최소 2분기 이상 입력해주세요";
  if (value > 8) return "최대 8분기까지 입력 가능합니다";
  if (!Number.isInteger(value)) return "정수만 입력 가능합니다";
  return null;
};

// 로딩 상태 처리
const [isLoading, setIsLoading] = useState(false);

const handleFilterChange = async () => {
  setIsLoading(true);
  try {
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: "golden-cross" }),
    });
    router.refresh();
  } catch (error) {
    console.error("Filter change failed:", error);
    // 에러 처리
  } finally {
    setIsLoading(false);
  }
};

// 도움말 텍스트
<div className="text-xs text-gray-500 mt-1">
  연속 성장 분기 수를 입력하세요 (2-8분기)
</div>;
```

---

## Summary

**Total Tasks**: 25  
**Estimated Duration**: 3-4 days  
**Priority Distribution**: P1 (20 tasks), P2 (5 tasks)

**Key Deliverables**:

- 8분기 차트 데이터 지원
- 매출/수익 성장성 필터
- 연속 분기 수 설정 (2-8분기)
- 성능 최적화된 UI/UX

**Success Criteria**:

- API 응답 시간 < 500ms
- 차트 렌더링 시간 < 100ms
- 필터링 정확도 100%
- 사용자 만족도 > 4.0/5.0
