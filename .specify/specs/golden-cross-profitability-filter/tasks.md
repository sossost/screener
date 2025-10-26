# Implementation Tasks: Golden Cross 스크리너 수익성 필터

## Overview

이 문서는 Golden Cross 스크리너에 수익성 필터(흑자/적자)와 재무 데이터 필드를 추가하는 작업을 구체적인 체크리스트로 제공합니다.

**주요 변경사항**:

- ✅ 최근 2개 분기 합산 순이익 기준 필터
- ✅ 테이블 간소화 (MA 컬럼 제거, 10개 → 6개 컬럼)
- ✅ 수익성 상태 뱃지 및 재무 데이터 표시

---

## Phase 1: 백엔드 API 수정 (Day 1)

### Task 1.1: Database Schema 검증

**목표**: `quarterly_financials` 테이블 구조 확인

```bash
# Drizzle schema 확인
cat src/db/schema.ts | grep -A 20 "quarterly_financials"
```

**체크리스트**:

- [ ] `net_income` 컬럼 존재 확인
- [ ] `eps` 컬럼 존재 확인
- [ ] `date` 컬럼 존재 확인
- [ ] `symbol` 인덱스 확인

**Expected Schema**:

```typescript
export const quarterlyFinancials = pgTable("quarterly_financials", {
  symbol: varchar("symbol", { length: 10 }).notNull(),
  date: date("date").notNull(),
  net_income: decimal("net_income"),
  eps: decimal("eps"),
  // ... other fields
});
```

---

### Task 1.2: API Route 쿼리 수정

**목표**: `/api/screener/golden-cross/route.ts`에 재무 데이터 JOIN 추가

**파일**: `src/app/api/screener/golden-cross/route.ts`

**변경사항**:

#### Step 1: 쿼리 수정 - 재무 데이터 추가

**Before**:

```typescript
const companies = await db.execute<GoldenCrossCompany>(sql`
  WITH latest_trade_date AS (
    SELECT MAX(date) as max_date
    FROM daily_ma
  )
  SELECT 
    s.symbol,
    dm.last_close,
    dm.ma20,
    dm.ma50,
    dm.ma100,
    dm.ma200,
    s.market_cap,
    CASE
      WHEN dm.ma20 > dm.ma50 
        AND dm.ma50 > dm.ma100 
        AND dm.ma100 > dm.ma200 THEN true
      ELSE false
    END as ordered,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM daily_ma dm_prev
        WHERE dm_prev.symbol = s.symbol
          AND dm_prev.date = dm.date - INTERVAL '${lookbackDays} days'
          AND NOT (
            dm_prev.ma20 > dm_prev.ma50 
            AND dm_prev.ma50 > dm_prev.ma100 
            AND dm_prev.ma100 > dm_prev.ma200
          )
      ) THEN true
      ELSE false
    END as just_turned
  FROM symbols s
  INNER JOIN daily_ma dm ON s.symbol = dm.symbol
  CROSS JOIN latest_trade_date ltd
  WHERE dm.date = ltd.max_date
    AND s.is_active = true
    AND dm.ma20 > dm.ma50
    AND dm.ma50 > dm.ma100
    AND dm.ma100 > dm.ma200
    ${justTurned ? sql`AND just_turned = true` : sql``}
  ORDER BY s.market_cap DESC NULLS LAST
`);
```

**After**:

```typescript
const companies = await db.execute<GoldenCrossCompany>(sql`
  WITH latest_trade_date AS (
    SELECT MAX(date) as max_date
    FROM daily_ma
  )
  SELECT 
    s.symbol,
    s.market_cap,
    dm.last_close,
    -- 재무 데이터 (최근 2개 분기)
    qf.net_income_2q,
    qf.eps_2q_avg,
    qf.latest_date as financial_date,
    -- 정배열 여부
    CASE
      WHEN dm.ma20 > dm.ma50 
        AND dm.ma50 > dm.ma100 
        AND dm.ma100 > dm.ma200 THEN true
      ELSE false
    END as ordered,
    -- 최근 전환 여부
    CASE
      WHEN EXISTS (
        SELECT 1 FROM daily_ma dm_prev
        WHERE dm_prev.symbol = s.symbol
          AND dm_prev.date = dm.date - INTERVAL '${lookbackDays} days'
          AND NOT (
            dm_prev.ma20 > dm_prev.ma50 
            AND dm_prev.ma50 > dm_prev.ma100 
            AND dm_prev.ma100 > dm_prev.ma200
          )
      ) THEN true
      ELSE false
    END as just_turned
  FROM symbols s
  INNER JOIN daily_ma dm ON s.symbol = dm.symbol
  -- 최근 2개 분기 재무 데이터 JOIN
  LEFT JOIN LATERAL (
    SELECT
      SUM(net_income) as net_income_2q,
      AVG(eps) as eps_2q_avg,
      MAX(date) as latest_date
    FROM quarterly_financials
    WHERE symbol = s.symbol
    ORDER BY date DESC
    LIMIT 2
  ) qf ON true
  CROSS JOIN latest_trade_date ltd
  WHERE dm.date = ltd.max_date
    AND s.is_active = true
    AND dm.ma20 > dm.ma50
    AND dm.ma50 > dm.ma100
    AND dm.ma100 > dm.ma200
    ${justTurned ? sql`AND just_turned = true` : sql``}
  ORDER BY s.market_cap DESC NULLS LAST
`);
```

**체크리스트**:

- [ ] `LEFT JOIN LATERAL` 추가로 최근 2개 분기 재무 데이터 가져오기
- [ ] `SUM(net_income)` as `net_income_2q` 계산
- [ ] `AVG(eps)` as `eps_2q_avg` 계산
- [ ] `MAX(date)` as `latest_date` 저장
- [ ] MA 컬럼(ma20, ma50, ma100, ma200) 제거

---

#### Step 2: 수익성 필터 파라미터 추가

**변경사항**:

```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const justTurned = searchParams.get("justTurned") === "true";
  const lookbackDays = searchParams.get("lookbackDays") || "10";
  const profitability = searchParams.get("profitability") || "all"; // 추가

  // ... 쿼리 실행
}
```

**체크리스트**:

- [ ] `profitability` 파라미터 추출 (기본값: `"all"`)
- [ ] 유효성 검증 (`"all"`, `"profitable"`, `"unprofitable"`)

---

#### Step 3: 수익성 필터 조건 추가

**WHERE 절에 추가**:

```typescript
WHERE dm.date = ltd.max_date
  AND s.is_active = true
  AND dm.ma20 > dm.ma50
  AND dm.ma50 > dm.ma100
  AND dm.ma100 > dm.ma200
  ${justTurned ? sql`AND just_turned = true` : sql``}
  -- 수익성 필터 추가
  ${
    profitability === "profitable"
      ? sql`AND qf.net_income_2q > 0`
      : profitability === "unprofitable"
      ? sql`AND qf.net_income_2q < 0`
      : sql``
  }
```

**체크리스트**:

- [ ] `profitability === "profitable"` → `net_income_2q > 0` 조건
- [ ] `profitability === "unprofitable"` → `net_income_2q < 0` 조건
- [ ] `profitability === "all"` → 조건 없음 (모든 종목 표시)

---

#### Step 4: 응답 데이터 가공

**변경사항**:

```typescript
const formattedCompanies = companies.rows.map((c: any) => ({
  symbol: c.symbol,
  market_cap: c.market_cap,
  last_close: c.last_close,
  net_income_2q: c.net_income_2q,
  eps_2q_avg: c.eps_2q_avg,
  financial_date: c.financial_date,
  profitability_status:
    c.net_income_2q > 0
      ? "profitable"
      : c.net_income_2q < 0
      ? "unprofitable"
      : "unknown",
  ordered: c.ordered,
  just_turned: c.just_turned,
}));

return NextResponse.json({
  data: formattedCompanies,
  trade_date: tradeDate.rows[0]?.max_date || null,
});
```

**체크리스트**:

- [ ] `profitability_status` 계산 로직 추가
- [ ] MA 컬럼 제거 (응답에서)
- [ ] 재무 데이터 필드 포함

---

#### Step 5: 캐시 태그 업데이트

**변경사항**:

```typescript
// src/app/screener/golden-cross/DataWrapper.tsx에서 나중에 수정
const cacheTag = `golden-cross-${justTurned}-${lookbackDays}-${profitability}`;
```

**체크리스트**:

- [ ] CACHE_TAGS에 profitability 포함한 동적 태그 생성
- [ ] 필터별로 독립적인 캐시 관리

---

### Task 1.3: API 테스트

**테스트 시나리오**:

```bash
# 1. 전체 종목
curl "http://localhost:3000/api/screener/golden-cross?justTurned=false&lookbackDays=10&profitability=all"

# 2. 흑자 종목만
curl "http://localhost:3000/api/screener/golden-cross?justTurned=false&lookbackDays=10&profitability=profitable"

# 3. 적자 종목만
curl "http://localhost:3000/api/screener/golden-cross?justTurned=false&lookbackDays=10&profitability=unprofitable"

# 4. 최근 전환 + 흑자
curl "http://localhost:3000/api/screener/golden-cross?justTurned=true&lookbackDays=5&profitability=profitable"
```

**체크리스트**:

- [ ] 모든 필터 조합 테스트
- [ ] 응답에 `net_income_2q`, `eps_2q_avg` 포함 확인
- [ ] `profitability_status` 값 정확성 검증
- [ ] MA 컬럼이 응답에 없는지 확인

**Expected Response**:

```json
{
  "data": [
    {
      "symbol": "AAPL",
      "market_cap": "2800000000000",
      "last_close": "180.50",
      "net_income_2q": "48500000000",
      "eps_2q_avg": "1.48",
      "financial_date": "2024-09-30",
      "profitability_status": "profitable",
      "ordered": true,
      "just_turned": false
    }
  ],
  "trade_date": "2024-10-25"
}
```

---

## Phase 2: 타입 정의 및 유틸리티 (Day 1)

### Task 2.1: TypeScript 타입 업데이트

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx` (타입 정의 부분)

**변경사항**:

**Before**:

```typescript
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
```

**After**:

```typescript
type GoldenCrossCompany = {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  net_income_2q: string | null;
  eps_2q_avg: string | null;
  financial_date: string | null;
  profitability_status: "profitable" | "unprofitable" | "unknown";
  ordered: boolean;
  just_turned: boolean;
};
```

**체크리스트**:

- [ ] MA 필드 제거
- [ ] 재무 데이터 필드 추가
- [ ] `profitability_status` enum 타입 정의

---

### Task 2.2: 포맷팅 유틸리티 확장

**파일**: `src/utils/format.ts`

**추가 함수**:

```typescript
/**
 * 통화 포맷팅 (백만/십억 단위)
 * @param value - 달러 단위 숫자
 * @returns 포맷된 문자열 ($48.5B, $120.3M 등)
 */
export function formatCurrency(value: string | number | null): string {
  if (value === null || value === undefined) return "N/A";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "N/A";

  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (absNum >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  } else {
    return `$${num.toFixed(2)}`;
  }
}

/**
 * 수익성 뱃지 스타일 반환
 * @param status - profitability_status
 * @returns Tailwind CSS 클래스 문자열
 */
export function getProfitabilityBadgeClass(
  status: "profitable" | "unprofitable" | "unknown"
): string {
  switch (status) {
    case "profitable":
      return "bg-green-100 text-green-800";
    case "unprofitable":
      return "bg-red-100 text-red-800";
    case "unknown":
      return "bg-gray-100 text-gray-600";
  }
}

/**
 * 수익성 뱃지 텍스트 반환
 * @param status - profitability_status
 * @returns 표시할 텍스트
 */
export function getProfitabilityLabel(
  status: "profitable" | "unprofitable" | "unknown"
): string {
  switch (status) {
    case "profitable":
      return "흑자";
    case "unprofitable":
      return "적자";
    case "unknown":
      return "N/A";
  }
}
```

**체크리스트**:

- [ ] `formatCurrency` 함수 추가
- [ ] `getProfitabilityBadgeClass` 함수 추가
- [ ] `getProfitabilityLabel` 함수 추가
- [ ] 단위 테스트 작성 (optional)

---

## Phase 3: 프론트엔드 - 필터 UI 추가 (Day 2)

### Task 3.1: URL 상태 관리 추가

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

**변경사항**:

```typescript
import {
  useQueryState,
  parseAsBoolean,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";

// 컴포넌트 내부
const [profitability, setProfitability] = useQueryState(
  "profitability",
  parseAsStringLiteral([
    "all",
    "profitable",
    "unprofitable",
  ] as const).withDefault("all")
);
```

**체크리스트**:

- [ ] `nuqs` import 추가
- [ ] `profitability` 상태 추가
- [ ] 기본값 `"all"` 설정
- [ ] URL과 자동 동기화

---

### Task 3.2: 필터 UI 추가

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

**CardHeader 내 필터 섹션 수정**:

**Before**:

```tsx
<div className="flex items-center gap-6 mt-4 flex-wrap min-h-[32px]">
  <div className="flex items-center space-x-2">
    <input
      type="radio"
      id="all"
      name="filter"
      checked={!justTurned}
      onChange={() => handleFilterChange(false, lookbackDays)}
      disabled={isPending}
    />
    <label htmlFor="all">전체 정배열</label>
  </div>
  <div className="flex items-center space-x-2">
    <input
      type="radio"
      id="recent"
      name="filter"
      checked={justTurned}
      onChange={() => handleFilterChange(true, lookbackDays)}
      disabled={isPending}
    />
    <label htmlFor="recent">최근 전환</label>
  </div>
  {/* ... lookbackDays input ... */}
</div>
```

**After**:

```tsx
<div className="space-y-4 mt-4">
  {/* 기존 정배열 필터 */}
  <div className="flex items-center gap-6 flex-wrap min-h-[32px]">
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        id="all"
        name="alignment-filter"
        checked={!justTurned}
        onChange={() => handleFilterChange(false, lookbackDays, profitability)}
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
        onChange={() => handleFilterChange(true, lookbackDays, profitability)}
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
        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
      />
      <span className="text-sm text-gray-600">일</span>
    </div>
  </div>

  {/* 새로운 수익성 필터 */}
  <div className="flex items-center gap-6 flex-wrap min-h-[32px]">
    <span className="text-sm font-medium text-gray-700">수익성:</span>
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        id="profitability-all"
        name="profitability-filter"
        checked={profitability === "all"}
        onChange={() => handleFilterChange(justTurned, lookbackDays, "all")}
        disabled={isPending}
        className="w-4 h-4 text-blue-600 disabled:opacity-50"
      />
      <label htmlFor="profitability-all" className="text-sm font-medium">
        전체
      </label>
    </div>
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        id="profitability-profitable"
        name="profitability-filter"
        checked={profitability === "profitable"}
        onChange={() =>
          handleFilterChange(justTurned, lookbackDays, "profitable")
        }
        disabled={isPending}
        className="w-4 h-4 text-blue-600 disabled:opacity-50"
      />
      <label htmlFor="profitability-profitable" className="text-sm font-medium">
        <span className="text-green-600">흑자</span>만
      </label>
    </div>
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        id="profitability-unprofitable"
        name="profitability-filter"
        checked={profitability === "unprofitable"}
        onChange={() =>
          handleFilterChange(justTurned, lookbackDays, "unprofitable")
        }
        disabled={isPending}
        className="w-4 h-4 text-blue-600 disabled:opacity-50"
      />
      <label
        htmlFor="profitability-unprofitable"
        className="text-sm font-medium"
      >
        <span className="text-red-600">적자</span>만
      </label>
    </div>
  </div>
</div>
```

**체크리스트**:

- [ ] 기존 필터와 수익성 필터를 별도 행으로 분리 (`space-y-4`)
- [ ] 라디오 버튼 3개 추가 (전체/흑자/적자)
- [ ] `isPending` 상태에 따른 `disabled` 처리
- [ ] 색상 코딩 (흑자-초록, 적자-빨강)
- [ ] 레이아웃 시프트 방지 (`min-h-[32px]`)

---

### Task 3.3: 필터 변경 핸들러 수정

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

**변경사항**:

```typescript
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
  await setProfitability(newProfitability); // 추가

  // 서버 컴포넌트 리패치
  startTransition(() => {
    router.refresh();
  });
};
```

**체크리스트**:

- [ ] `handleFilterChange` 시그니처에 `newProfitability` 파라미터 추가
- [ ] 캐시 태그에 `profitability` 포함
- [ ] `setProfitability` 호출 추가
- [ ] 기존 로직 유지 (`useTransition`, `router.refresh()`)

---

## Phase 4: 프론트엔드 - 테이블 UI 재구성 (Day 2)

### Task 4.1: 테이블 헤더 수정

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

**변경사항**:

**Before**:

```tsx
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
```

**After**:

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Symbol</TableHead>
    <TableHead className="text-right">Market Cap</TableHead>
    <TableHead className="text-right">Last Close</TableHead>
    <TableHead>수익성</TableHead>
    <TableHead className="text-right">순이익 (2Q)</TableHead>
    <TableHead className="text-right">EPS (2Q)</TableHead>
  </TableRow>
</TableHeader>
```

**체크리스트**:

- [ ] MA20, MA50, MA100, MA200 컬럼 제거
- [ ] "수익성", "순이익 (2Q)", "EPS (2Q)" 컬럼 추가
- [ ] 컬럼 순서: Symbol → Market Cap → Last Close → 수익성 → 순이익 → EPS

---

### Task 4.2: 테이블 바디 수정

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

**변경사항**:

**Before**:

```tsx
<TableBody>
  {data.map((c, idx) => (
    <TableRow key={`${c.symbol}-${idx}`}>
      <TableCell className="font-semibold">
        <a href={`https://seekingalpha.com/symbol/${c.symbol}`}>{c.symbol}</a>
      </TableCell>
      <TableCell className="text-right">
        {c.market_cap ? formatNumber(c.market_cap) : "-"}
      </TableCell>
      <TableCell className="text-right">{formatNumber(c.last_close)}</TableCell>
      <TableCell className="text-right">{formatNumber(c.ma20)}</TableCell>
      <TableCell className="text-right">{formatNumber(c.ma50)}</TableCell>
      <TableCell className="text-right">{formatNumber(c.ma100)}</TableCell>
      <TableCell className="text-right">{formatNumber(c.ma200)}</TableCell>
    </TableRow>
  ))}
</TableBody>
```

**After**:

```tsx
<TableBody>
  {data.map((c, idx) => (
    <TableRow key={`${c.symbol}-${idx}`}>
      {/* Symbol */}
      <TableCell className="font-semibold">
        <a
          href={`https://seekingalpha.com/symbol/${c.symbol}`}
          target="_blank"
          className="text-blue-600 hover:underline"
        >
          {c.symbol}
        </a>
      </TableCell>

      {/* Market Cap */}
      <TableCell className="text-right">
        {c.market_cap ? formatNumber(c.market_cap) : "-"}
      </TableCell>

      {/* Last Close */}
      <TableCell className="text-right">{formatNumber(c.last_close)}</TableCell>

      {/* 수익성 뱃지 */}
      <TableCell>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getProfitabilityBadgeClass(
            c.profitability_status
          )}`}
        >
          {getProfitabilityLabel(c.profitability_status)}
        </span>
      </TableCell>

      {/* 순이익 (2Q) */}
      <TableCell
        className={`text-right font-semibold ${
          c.net_income_2q && parseFloat(c.net_income_2q) >= 0
            ? "text-green-600"
            : "text-red-600"
        }`}
      >
        {c.net_income_2q ? formatCurrency(c.net_income_2q) : "N/A"}
      </TableCell>

      {/* EPS (2Q) */}
      <TableCell className="text-right">
        {c.eps_2q_avg ? formatNumber(c.eps_2q_avg) : "N/A"}
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

**체크리스트**:

- [ ] MA 컬럼 제거
- [ ] 수익성 뱃지 렌더링 (`getProfitabilityBadgeClass`, `getProfitabilityLabel` 사용)
- [ ] 순이익 색상 코딩 (흑자-초록, 적자-빨강)
- [ ] EPS 표시
- [ ] `formatCurrency` 함수 사용
- [ ] NULL 처리 ("N/A" 표시)

---

### Task 4.3: 스켈레톤 UI 업데이트

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx` (내부 스켈레톤)

**변경사항**:

**Before (10개 컬럼)**:

```tsx
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
      <TableCell><div className="h-4 w-16 bg-gray-200 animate-pulse rounded" /></TableCell>
      <TableCell className="text-right"><div className="h-4 w-20 bg-gray-200 animate-pulse rounded ml-auto" /></TableCell>
      <TableCell className="text-right"><div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" /></TableCell>
      <TableCell className="text-right"><div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" /></TableCell>
      <TableCell className="text-right"><div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" /></TableCell>
      <TableCell className="text-right"><div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" /></TableCell>
      <TableCell className="text-right"><div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" /></TableCell>
    </TableRow>
  ))}
</TableBody>
```

**After (6개 컬럼)**:

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Symbol</TableHead>
    <TableHead className="text-right">Market Cap</TableHead>
    <TableHead className="text-right">Last Close</TableHead>
    <TableHead>수익성</TableHead>
    <TableHead className="text-right">순이익 (2Q)</TableHead>
    <TableHead className="text-right">EPS (2Q)</TableHead>
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
      <TableCell>
        <div className="h-6 w-12 bg-gray-200 animate-pulse rounded-full" />
      </TableCell>
      <TableCell className="text-right">
        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded ml-auto" />
      </TableCell>
      <TableCell className="text-right">
        <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

**체크리스트**:

- [ ] 헤더 6개 컬럼으로 수정
- [ ] 스켈레톤 셀 6개로 수정
- [ ] 수익성 뱃지 스켈레톤 (`rounded-full`)
- [ ] 순이익 스켈레톤 너비 조정 (`w-24`)

---

### Task 4.4: TableCaption 수정

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

**변경사항**:

```tsx
<TableCaption>
  {justTurned
    ? `최근 ${lookbackDays}일 이내에 MA20 > MA50 > MA100 > MA200 정배열로 전환한 종목`
    : "MA20 > MA50 > MA100 > MA200 정배열 조건을 만족하는 종목"}
  {profitability !== "all" && (
    <span className="ml-2">
      • {profitability === "profitable" ? "흑자 종목만" : "적자 종목만"}
    </span>
  )}
</TableCaption>
```

**체크리스트**:

- [ ] 기존 캡션 유지
- [ ] 수익성 필터 적용 시 추가 텍스트 표시
- [ ] 조건부 렌더링 (`profitability !== "all"`)

---

## Phase 5: 서버 컴포넌트 캐시 처리 (Day 2)

### Task 5.1: DataWrapper 수정

**파일**: `src/app/screener/golden-cross/DataWrapper.tsx`

**변경사항**:

**Before**:

```typescript
type SearchParams = {
  justTurned?: string;
  lookbackDays?: string;
};

async function fetchGoldenCrossData(searchParams: SearchParams) {
  const justTurned = searchParams.justTurned === "true";
  const lookbackDays = searchParams.lookbackDays || "10";

  const params = new URLSearchParams({
    justTurned: justTurned.toString(),
    lookbackDays: lookbackDays,
  });

  const cacheTag = `golden-cross-${justTurned}-${lookbackDays}`;

  // ...
}
```

**After**:

```typescript
type SearchParams = {
  justTurned?: string;
  lookbackDays?: string;
  profitability?: string; // 추가
};

async function fetchGoldenCrossData(searchParams: SearchParams) {
  const justTurned = searchParams.justTurned === "true";
  const lookbackDays = searchParams.lookbackDays || "10";
  const profitability = searchParams.profitability || "all"; // 추가

  const params = new URLSearchParams({
    justTurned: justTurned.toString(),
    lookbackDays: lookbackDays,
    profitability: profitability, // 추가
  });

  // 캐시 태그에 profitability 포함
  const cacheTag = `golden-cross-${justTurned}-${lookbackDays}-${profitability}`;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const response = await fetch(
    `${baseUrl}/api/screener/golden-cross?${params.toString()}`,
    {
      next: {
        revalidate: 60 * 60 * 24, // 24시간
        tags: [CACHE_TAGS.GOLDEN_CROSS, cacheTag],
      },
    }
  );

  // ...
}
```

**체크리스트**:

- [ ] `SearchParams` 타입에 `profitability` 추가
- [ ] `profitability` 파라미터 처리
- [ ] 캐시 태그에 `profitability` 포함
- [ ] API 호출에 `profitability` 전달

---

## Phase 6: 테스트 및 검증 (Day 3)

### Task 6.1: 기능 테스트

**시나리오**:

1. **전체 종목 필터**:

   - [ ] "전체 정배열" + "전체" 선택
   - [ ] 모든 종목 표시 (재무 데이터 있/없 모두)
   - [ ] 수익성 뱃지 정확성 확인

2. **흑자 필터**:

   - [ ] "전체 정배열" + "흑자만" 선택
   - [ ] 순이익 > 0 종목만 표시
   - [ ] 초록색 뱃지 표시
   - [ ] 순이익 색상 초록색

3. **적자 필터**:

   - [ ] "전체 정배열" + "적자만" 선택
   - [ ] 순이익 < 0 종목만 표시
   - [ ] 빨간색 뱃지 표시
   - [ ] 순이익 색상 빨간색

4. **최근 전환 + 흑자**:

   - [ ] "최근 전환" + "흑자만" 선택
   - [ ] 기간 5일 입력
   - [ ] 두 조건 동시 만족 종목만 표시

5. **필터 변경 시 로딩**:

   - [ ] 필터 변경 시 스켈레톤 UI 표시
   - [ ] 레이아웃 시프트 없음
   - [ ] 필터 컨트롤 항상 표시 (opacity 변경만)

6. **URL 동기화**:
   - [ ] URL에 `profitability` 파라미터 반영
   - [ ] URL 직접 입력 시 필터 상태 복원
   - [ ] 브라우저 뒤로가기/앞으로가기 동작

---

### Task 6.2: 캐시 동작 검증

**테스트**:

1. **캐시 생성**:

   - [ ] 첫 방문 시 API 호출 (Network 탭 확인)
   - [ ] 동일 조건 재방문 시 캐시 사용 (API 호출 없음)

2. **캐시 무효화**:

   - [ ] 필터 변경 시 캐시 무효화 API 호출
   - [ ] 새로운 데이터 fetch

3. **캐시 독립성**:
   - [ ] "흑자" 캐시와 "적자" 캐시 독립적
   - [ ] 한 필터 변경이 다른 필터 캐시에 영향 없음

---

### Task 6.3: UI/UX 검증

**체크리스트**:

- [ ] **레이아웃 시프트**: 로딩 시 레이아웃이 흔들리지 않음
- [ ] **반응형**: 모바일/태블릿에서 정상 표시
- [ ] **접근성**:
  - [ ] 라디오 버튼 label과 연결
  - [ ] 키보드 네비게이션 가능
  - [ ] 스크린 리더 호환
- [ ] **색상 대비**: WCAG AA 기준 충족 (초록/빨강 텍스트)
- [ ] **에러 처리**:
  - [ ] API 에러 시 적절한 메시지
  - [ ] 재무 데이터 없는 종목 "N/A" 표시

---

### Task 6.4: 성능 테스트

**메트릭**:

1. **API 응답 시간**:

   - [ ] 기존 쿼리 대비 성능 (LATERAL JOIN 추가)
   - [ ] 목표: < 500ms (대부분의 경우)

2. **클라이언트 렌더링**:

   - [ ] 1000개 종목 렌더링 시 버벅임 없음
   - [ ] 스켈레톤 UI 부드러운 애니메이션

3. **번들 사이즈**:
   - [ ] 포맷팅 함수 추가로 인한 번들 증가 확인
   - [ ] 목표: < 5KB 증가

---

## Phase 7: 문서화 및 정리 (Day 3)

### Task 7.1: 코드 정리

**체크리스트**:

- [ ] 사용하지 않는 import 제거
- [ ] 주석 추가 (복잡한 로직)
- [ ] 일관된 코드 스타일 (Prettier 실행)
- [ ] 린터 에러 수정

---

### Task 7.2: 스펙 문서 업데이트

**파일**: `.specify/specs/golden-cross-profitability-filter/spec.md`

**체크리스트**:

- [ ] ✅ Phase 1 완료 표시
- [ ] 스크린샷 추가 (optional)
- [ ] Known Issues 섹션 업데이트
- [ ] Open Questions → Resolved Questions 이동

---

### Task 7.3: CHANGELOG 작성

**파일**: `CHANGELOG.md` 또는 커밋 메시지

**내용**:

```markdown
## [Date] - Golden Cross 수익성 필터 추가

### Added

- 수익성 필터 (전체/흑자/적자) 추가
- 재무 데이터 컬럼 추가:
  - 순이익 (최근 2개 분기 합산)
  - EPS (최근 2개 분기 평균)
  - 수익성 상태 뱃지
- 포맷팅 유틸리티 함수 (`formatCurrency` 등)

### Changed

- 테이블 구조 간소화 (10개 → 6개 컬럼)
- MA 컬럼(MA20, MA50, MA100, MA200) 제거
- 캐시 태그에 profitability 파라미터 포함

### Fixed

- N/A

### Performance

- 최근 2개 분기 데이터만 JOIN하여 쿼리 최적화
```

---

### Task 7.4: Git Commit

**커밋 메시지 예시**:

```bash
git add .
git commit -m "feat: Add profitability filter to Golden Cross screener

- Add profitability filter (all/profitable/unprofitable)
- Add financial data columns (net_income_2q, eps_2q_avg)
- Simplify table by removing MA columns (10 → 6 columns)
- Implement latest 2 quarters sum/avg logic
- Add formatCurrency and badge utilities
- Update cache tags to include profitability parameter

Closes #XXX"
```

**체크리스트**:

- [ ] 변경사항 스테이징
- [ ] 의미있는 커밋 메시지 작성
- [ ] 이슈 번호 포함 (있다면)
- [ ] Push to remote

---

## Summary

### 총 작업 시간 예상

- **Day 1**: 백엔드 API + 타입 정의 (4-5시간)
- **Day 2**: 프론트엔드 UI + 캐시 처리 (5-6시간)
- **Day 3**: 테스트 + 문서화 (2-3시간)
- **Total**: ~12-14시간

### 주요 파일 변경

1. **백엔드**:
   - `src/app/api/screener/golden-cross/route.ts` - 쿼리 수정
2. **프론트엔드**:
   - `src/app/screener/golden-cross/GoldenCrossClient.tsx` - UI 및 필터
   - `src/app/screener/golden-cross/DataWrapper.tsx` - 캐시 처리
3. **유틸리티**:

   - `src/utils/format.ts` - 포맷팅 함수

4. **문서**:
   - `.specify/specs/golden-cross-profitability-filter/spec.md`
   - `.specify/specs/golden-cross-profitability-filter/plan.md`
   - `.specify/specs/golden-cross-profitability-filter/tasks.md` (this file)

### 핵심 의사결정

✅ **최근 2개 분기 합산** - 단일 분기 대비 안정적인 데이터  
✅ **MA 컬럼 제거** - 정배열 전제 조건이므로 불필요  
✅ **순이익 우선** - EPS는 보조 지표로 사용  
✅ **라디오 버튼 UI** - 명확하고 직관적인 선택  
✅ **필터 시 데이터 제외** - "N/A" 종목은 흑자/적자 선택 시 제외

---

**Next Steps**: Phase 1부터 순차적으로 구현 시작! 🚀
