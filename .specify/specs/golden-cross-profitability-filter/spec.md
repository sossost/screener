# Feature Specification: Golden Cross 스크리너 수익성 필터 추가

**Feature Branch**: `feature/golden-cross-profitability-filter`  
**Created**: 2025-10-26  
**Status**: Draft  
**Input**: Golden Cross 스크리너에 회사의 흑자/적자 여부 필터 및 수익성 관련 필드 추가

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 수익성 필터로 종목 선별 (Priority: P1)

투자자가 Golden Cross 정배열 조건을 만족하는 종목 중에서 **흑자 기업만** 또는 **적자에서 흑자로 전환된 기업**을 선별하여 투자 결정의 질을 높일 수 있어야 합니다.

**Why this priority**:

- 기술적 지표(이동평균)와 재무 건전성(수익성)을 결합한 분석
- 적자 기업을 필터링하여 리스크 감소
- 흑자 전환 기업은 강한 모멘텀 신호

**Independent Test**:

- 흑자 필터 선택 시 직전 분기 `eps_diluted > 0`인 종목만 표시
- 적자 필터 선택 시 직전 분기 `eps_diluted < 0`인 종목만 표시
- 전체 선택 시 모든 종목 표시 (재무 데이터 없는 종목 포함)
- 데이터베이스 쿼리 결과와 화면 표시 일치 확인
- 데이터 없는 경우 "-"로 표시 확인

**Acceptance Scenarios**:

1. **Given** Golden Cross 페이지 접속, **When** "흑자" 필터 선택, **Then** 직전 분기 EPS가 양수인 기업만 표시
2. **Given** 흑자 필터 선택된 상태, **When** "적자" 필터로 변경, **Then** 직전 분기 EPS가 음수인 기업만 표시
3. **Given** 필터 선택된 상태, **When** "전체" 선택, **Then** 수익성 무관하게 모든 Golden Cross 종목 표시
4. **Given** 수익성 데이터 없는 종목, **When** 흑자 필터 선택, **Then** 해당 종목은 표시되지 않음
5. **Given** 재무 데이터 없는 셀, **Then** "-"로 표시

---

### User Story 2 - 수익성 지표 차트 시각화 (Priority: P1)

투자자가 각 종목의 **최근 4분기 매출 및 EPS 트렌드**를 막대 그래프로 한눈에 파악하고, 호버 시 정확한 수치를 확인하여 빠른 의사결정을 할 수 있어야 합니다.

**Why this priority**:

- 숫자 나열보다 시각화로 트렌드 파악 속도 3배 향상
- 여러 종목의 성장 패턴을 빠르게 비교 가능
- 호버 툴팁으로 정확한 수치와 시각화를 동시에 제공
- 정량적 데이터와 정성적 인사이트를 결합한 분석

**Independent Test**:

- 테이블에 "매출 (4Q)", "EPS (4Q)" 컬럼 추가 확인 (우측 정렬)
- 각 셀에 4개의 막대 그래프가 최소 간격(0.5px)으로 붙어서 표시
- 막대 너비: 12px (w-3), 높이: 28px, 전체 차트 너비: 80px
- 막대에 마우스 호버 시 툴팁에 분기 정보(Q3 2024), 날짜(2024-09-30), 수치($48.5B) 표시
- **색상 정책**:
  - 양수: 초록색 (#22c55e, green-500) - 단일 색상
  - 음수: 빨간색 (#ef4444, red-500) - 단일 색상
  - 0: 회색 (#9ca3af, gray-400) - 높이 2px로 아주 낮게 표시
  - null: 연한 회색 (#e5e7eb, gray-200)
- 매출과 EPS 모두 동일한 색상 정책 적용 (파란색 사용 안 함)
- 음수 값은 막대가 아래로 그려짐
- 툴팁은 화면 밖으로 나가지 않도록 경계 체크
- 최신 분기가 오른쪽에 배치

**Acceptance Scenarios**:

1. **Given** Golden Cross 종목 리스트, **When** 테이블 확인, **Then** 각 종목의 매출/EPS 차트가 테이블 셀 오른쪽에 정렬되어 표시됨
2. **Given** 차트가 표시된 상태, **When** 특정 막대에 마우스 호버, **Then** 툴팁에 "Q3 2024", "2024-09-30", "$48.5B" 등 정보 표시 (fixed 포지셔닝으로 테이블 영역 밖에서도 보임)
3. **Given** 흑자 전환 기업, **When** EPS 차트 확인, **Then** 이전 분기는 빨간색 (음수), 최근 분기는 초록색 (양수)으로 시각적 전환 표현
4. **Given** 4분기 미만 데이터, **When** 차트 확인, **Then** 있는 데이터만 표시 (1~3개 막대)
5. **Given** EPS가 0인 분기, **When** 차트 확인, **Then** 회색으로 높이 2px의 매우 낮은 막대로 표시
6. **Given** 차트 로딩 중, **When** 필터 변경, **Then** 스켈레톤 로더 표시 (레이아웃 시프트 방지)

---

### User Story 3 - 최근 전환과 수익성 필터 결합 (Priority: P2)

투자자가 **최근 정배열 전환** + **흑자 기업**처럼 여러 조건을 조합하여 더 정교한 종목 선별을 할 수 있어야 합니다.

**Why this priority**:

- 다중 필터 조합으로 정밀한 스크리닝
- 기술적 + 재무적 조건 동시 만족 종목 발굴
- 사용자 경험 향상

**Independent Test**:

- "최근 전환" + "흑자만" 필터 동시 적용 시 두 조건 모두 만족하는 종목만 표시
- URL에 쿼리 파라미터 추가 확인 (`?justTurned=true&profitability=profitable`)
- 필터 변경 시 캐시 무효화 및 리패치 확인

**Acceptance Scenarios**:

1. **Given** "최근 전환" 필터 적용, **When** "흑자만" 추가 선택, **Then** 최근 정배열 전환 + 흑자 기업만 표시
2. **Given** 두 필터 적용된 상태, **When** 새로고침, **Then** URL 파라미터 유지되고 동일한 결과 표시
3. **Given** 조합 필터 적용, **When** 하나의 필터 해제, **Then** 해당 조건만 제거되고 나머지 유지

---

### Edge Cases

- **재무 데이터 없는 종목**: 흑자/적자 필터 시 제외, 전체 선택 시 포함하며 "-"로 표시
- **데이터 갱신 주기**: 분기 재무 데이터는 ETL 주간 작업으로 업데이트되므로 캐시 무효화 시점 고려
- **수익성 판단 기준**: 직전 분기 (가장 최근) EPS만 사용
- **EPS 계산 방법**: Diluted EPS (`eps_diluted`) 사용
- **차트 라이브러리**: 초기 recharts 검토 → 번들 사이즈 이슈로 순수 React 구현 결정

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 시스템은 Golden Cross API에 수익성 필터 파라미터(`profitability`)를 추가해야 함
  - 가능한 값: `all` (전체), `profitable` (흑자), `unprofitable` (적자)
- **FR-002**: API는 **직전 분기 (가장 최근) EPS**를 기준으로 수익성을 판단하고 필터링해야 함
  - 판단 기준: `eps_diluted > 0` (흑자), `eps_diluted < 0` (적자)
  - EPS 데이터가 없는 경우: 흑자/적자 필터 시 제외, 전체 선택 시 포함
- **FR-003**: 테이블 컬럼 구성:
  - Symbol: 종목 심볼
  - Market Cap: 시가총액
  - Last Close: 최종 종가
  - 매출 (4Q): 최근 4분기 매출 막대 그래프 (우측 정렬)
  - EPS (4Q): 최근 4분기 EPS 막대 그래프 (우측 정렬)
- **FR-003-1**: 기존 MA 컬럼(MA20, MA50, MA100, MA200)은 제거 (정배열 조건 이미 만족)
- **FR-003-2**: 수익성 배지 컬럼 제거 (차트로 시각적 판단 가능)
- **FR-004**: API는 최근 4분기 재무 데이터(`revenue`, `eps_diluted`, `period_end_date`)를 JSON 배열로 반환해야 함
- **FR-005**: 차트 시각화:
  - 막대 그래프 형태, 4개 막대가 최소 간격(0.5px)으로 배치
  - 색상 정책 (매출/EPS 동일):
    - 양수: 초록색 (#22c55e)
    - 음수: 빨간색 (#ef4444)
    - 0: 회색 (#9ca3af), 매우 낮은 높이(2px)
    - null (데이터 없음): 연한 회색 (#e5e7eb), 최소 높이(3px)
  - 최신 분기가 오른쪽, 과거 분기가 왼쪽
  - 고정 크기: 80px × 28px
- **FR-006**: 호버 툴팁:
  - 분기 정보 (예: "Q3 2024")
  - 날짜 (예: "2024-09-30")
  - 포맷된 수치 (예: "$48.5B", "1.23")
  - 부드러운 애니메이션 (0.2초 이내)
- **FR-007**: 수익성 필터 변경 시 이전 캐시 무효화 및 새 데이터 fetch
- **FR-008**: URL에 `profitability` 쿼리 파라미터로 필터 상태 유지
- **FR-009**: 재무 데이터 없는 종목은 수익성 필터 적용 시 제외
- **FR-010**: 차트는 테이블 행 높이에 맞게 렌더링 (40-60px)
- **FR-011**: 반응형 디자인: 모바일(100-120px), 태블릿(130-150px), 데스크톱(150-200px)

### Non-Functional Requirements

- **NFR-001**: 필터 추가로 인한 API 응답 시간 증가 < 100ms
- **NFR-002**: 순수 React 구현으로 외부 차트 라이브러리 의존성 없음
- **NFR-003**: 차트 렌더링 시간 < 50ms (종목당)
- **NFR-004**: 기존 캐싱 시스템과 통합되어 동일한 TTL 및 무효화 로직 적용
- **NFR-005**: 테이블 레이아웃 시프트 방지 (차트 로딩 중에도 안정적인 UI)
- **NFR-006**: 고정 차트 크기 (80px × 28px)로 일관성 유지
- **NFR-007**: React.memo로 차트 컴포넌트 최적화 (불필요한 리렌더링 방지)

### Key Entities

- **Profitability Status** (직전 분기 EPS 기준)

  - `profitable`: `eps_diluted > 0`
  - `unprofitable`: `eps_diluted < 0`
  - `unknown`: `eps_diluted IS NULL` (데이터 없음)

- **Financial Metrics** (from `quarterly_financials` table)
  - `eps_diluted`: Diluted EPS (직전 분기 기준으로 수익성 판단)
  - `revenue`: 매출 (차트 표시용, 최근 4분기)
  - `period_end_date`: 재무 데이터 기준일

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 수익성 필터 적용 시 API 응답 시간 < 500ms (기존 캐싱 유지)
- **SC-002**: 테이블 렌더링 시간 증가 < 50ms (3개 컬럼 추가 후)
- **SC-003**: 흑자/적자 필터링 정확도 100% (DB 쿼리 결과와 일치)
- **SC-004**: URL 파라미터 동기화 100% (필터 변경 시 즉시 반영)
- **SC-005**: 로딩 UI 일관성 유지 (Suspense + Skeleton)

## Technical Considerations _(optional)_

### Database Query

```sql
-- 기존 쿼리에 JOIN 추가 (최근 4분기 차트 데이터 + 직전 분기 EPS로 필터링)
SELECT
  cand.symbol,
  cand.close as last_close,
  s.market_cap,
  qf.quarterly_data,  -- 최근 4분기 재무 데이터 (차트용)
  qf.eps_q1 as latest_eps  -- 직전 분기 EPS (필터링용)
FROM candidates cand
LEFT JOIN symbols s ON s.symbol = cand.symbol
LEFT JOIN LATERAL (
  SELECT
    json_agg(
      json_build_object(
        'period_end_date', period_end_date,
        'revenue', revenue::numeric,
        'eps_diluted', eps_diluted::numeric
      ) ORDER BY period_end_date DESC
    ) as quarterly_data,
    -- 직전 분기 EPS (수익성 판단용)
    (
      SELECT eps_diluted::numeric
      FROM quarterly_financials
      WHERE symbol = cand.symbol
        AND eps_diluted IS NOT NULL
      ORDER BY period_end_date DESC
      LIMIT 1
    ) as eps_q1
  FROM (
    SELECT period_end_date, revenue, eps_diluted
    FROM quarterly_financials
    WHERE symbol = cand.symbol
    ORDER BY period_end_date DESC
    LIMIT 4  -- 최근 4개 분기
  ) recent_quarters
) qf ON true
WHERE 1=1
  -- 수익성 필터 (직전 분기 EPS 기준)
  AND (
    CASE
      WHEN :profitability = 'profitable' THEN qf.eps_q1 IS NOT NULL AND qf.eps_q1 > 0
      WHEN :profitability = 'unprofitable' THEN qf.eps_q1 IS NOT NULL AND qf.eps_q1 < 0
      ELSE true  -- 'all' 선택 시 데이터 없는 종목도 포함
    END
  )
ORDER BY s.market_cap DESC NULLS LAST;
```

### API Changes

**Request**:

```
GET /api/screener/golden-cross?justTurned=false&lookbackDays=10&profitability=profitable
```

**Response (업데이트)**:

```json
{
  "data": [
    {
      "symbol": "AAPL",
      "market_cap": "2800000000000",
      "last_close": "180.50",
      "quarterly_financials": [
        {
          "period_end_date": "2024-09-30",
          "revenue": "94900000000",
          "eps_diluted": "1.53"
        },
        {
          "period_end_date": "2024-06-30",
          "revenue": "85800000000",
          "eps_diluted": "1.40"
        },
        {
          "period_end_date": "2024-03-31",
          "revenue": "90800000000",
          "eps_diluted": "1.52"
        },
        {
          "period_end_date": "2023-12-31",
          "revenue": "119600000000",
          "eps_diluted": "2.18"
        }
      ],
      "profitability_status": "profitable"
    }
  ],
  "trade_date": "2024-10-25"
}
```

### UI Components

**Filter Section**:

```tsx
<div className="flex items-center space-x-2 ml-auto">
  <label className="text-sm font-medium text-gray-700">수익성:</label>
  <Select
    value={profitability}
    onValueChange={(value: string) =>
      handleFilterChange(justTurned, lookbackDays, value)
    }
    disabled={isPending}
  >
    <SelectTrigger className="w-[120px] h-8">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">전체</SelectItem>
      <SelectItem value="profitable">흑자만</SelectItem>
      <SelectItem value="unprofitable">적자만</SelectItem>
    </SelectContent>
  </Select>
</div>
```

**Table Columns (차트 적용)**:

```tsx
{/* 헤더 */}
<TableHead>Symbol</TableHead>
<TableHead className="text-right w-[200px]">Market Cap</TableHead>
<TableHead className="text-right w-[140px]">Last Close</TableHead>
<TableHead className="w-[100px] text-right">매출 (4Q)</TableHead>
<TableHead className="w-[100px] text-right">EPS (4Q)</TableHead>

{/* 데이터 행 */}
<TableCell className="font-semibold">
  <a href={`https://seekingalpha.com/symbol/${c.symbol}`} target="_blank">
    {c.symbol}
  </a>
</TableCell>
<TableCell className="text-right font-medium">
  {c.market_cap ? formatNumber(c.market_cap) : "-"}
</TableCell>
<TableCell className="text-right">
  ${formatNumber(c.last_close)}
</TableCell>

{/* 매출 차트 */}
<TableCell>
  <QuarterlyBarChart
    data={prepareRevenueData(c.quarterly_financials)}
    type="revenue"
    height={50}
    width={160}
  />
</TableCell>

{/* EPS 차트 */}
<TableCell>
  <QuarterlyBarChart
    data={prepareEPSData(c.quarterly_financials)}
    type="eps"
    height={50}
    width={160}
  />
</TableCell>
```

**Chart Component Example**:

```tsx
// /src/components/charts/QuarterlyBarChart.tsx (순수 React 구현)
import React, { useState } from "react";

type QuarterlyBarChartProps = {
  data: Array<{
    quarter: string; // "Q3 2024"
    value: number | null;
    date: string; // "2024-09-30"
  }>;
  type: "revenue" | "eps";
  height?: number;
  width?: number;
};

export const QuarterlyBarChart = React.memo(function QuarterlyBarChart({
  data,
  type,
  height = 28,
  width = 80,
}: QuarterlyBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // 색상 결정: 양수(#22c55e), 음수(#ef4444), 0(#9ca3af), null(#e5e7eb)
  const getBarColor = (value: number | null) => {
    if (value === null) return "#e5e7eb";
    if (value === 0) return "#9ca3af";
    return value < 0 ? "#ef4444" : "#22c55e";
  };

  const reversedData = [...data].reverse(); // 최신 분기가 오른쪽
  const maxValue = Math.max(...reversedData.map((d) => Math.abs(d.value || 0)));

  return (
    <div
      className="relative inline-flex items-end gap-0.5 justify-end"
      style={{ height, width }}
    >
      {reversedData.map((item, index) => {
        const isNegative = item.value !== null && item.value < 0;
        const barHeight =
          item.value === 0
            ? 2
            : Math.max(
                (Math.abs(item.value || 0) / maxValue) * height * 0.8,
                3
              );

        return (
          <div
            key={index}
            className={`relative flex ${
              isNegative ? "items-start" : "items-end"
            }`}
            style={{ height }}
          >
            <div
              className="w-3 cursor-pointer transition-opacity hover:opacity-80"
              style={{
                height: `${barHeight}px`,
                backgroundColor: getBarColor(item.value),
              }}
              onMouseEnter={(e) => {
                setHoveredIndex(index);
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
                setTooltipPos(null);
              }}
            />
            {hoveredIndex === index && tooltipPos && (
              <div
                className="fixed bg-white px-2 py-1.5 rounded shadow-lg border z-[9999]"
                style={{
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y - 10}px`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <p className="text-xs font-semibold">{item.quarter}</p>
                <p className="text-[10px] text-gray-500">{item.date}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
```

### Cache Tag Update

```typescript
// 캐시 태그에 profitability 포함
const cacheTag = `golden-cross-${justTurned}-${lookbackDays}-${profitability}`;
```

### Benefits of Simplified Table

**Before (복잡)**:

- 10개 컬럼: Symbol, Market Cap, Close, MA20, MA50, MA100, MA200 등
- 너무 많은 숫자로 인한 정보 과부하
- 모바일 화면에서 가독성 저하

**After (간소화 + 시각화)**:

- 5개 컬럼: Symbol, Market Cap, Last Close, 매출 (4Q), EPS (4Q)
- 핵심 정보에만 집중
- Golden Cross 조건은 이미 전제 (MA 값 불필요)
- 차트로 시각화하여 트렌드를 한눈에 파악
- 더 나은 UX 및 빠른 의사결정

## Open Questions _(optional)_

1. **Q**: 수익성 판단 기준은 무엇인가?

   - **A**: ✅ **결정됨** - 직전 분기 (가장 최근) EPS 단일 값 사용 (단순하고 명확한 기준)

2. **Q**: 재무 데이터가 없는 종목을 어떻게 처리할 것인가?

   - **A**: ✅ **결정됨** - 흑자/적자 필터 선택 시 제외, "전체" 선택 시 표시 (차트 셀은 "-")

3. **Q**: 차트에 표시할 데이터는?

   - **A**: ✅ **결정됨** - 최근 4분기 매출 및 EPS (트렌드 파악용), 수익성 판단은 직전 분기 EPS만 사용

4. **Q**: MA 컬럼들을 테이블에 계속 표시해야 하는가?
   - **A**: ✅ **결정됨** - 제거. Golden Cross 조건이 이미 전제되므로 구체적인 MA 값은 불필요. 테이블 간소화로 가독성 향상 (10개 → 6개 컬럼)

## References _(optional)_

- [Financial Modeling Prep - Income Statement API](https://site.financialmodelingprep.com/developer/docs#income-statement)
- [PostgreSQL LATERAL JOIN](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-LATERAL)
- 기존 스펙: `.specify/specs/api-caching/spec.md`
- 기존 스펙: `.specify/specs/stock-screener-overview/spec.md`

---

**Note**: 이 스펙은 Draft 상태이며, 구현 과정에서 발견되는 요구사항에 따라 업데이트될 수 있습니다.
