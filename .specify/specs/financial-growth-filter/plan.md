# Implementation Plan: 매출/수익 성장성 필터

**Branch**: `feature/financial-growth-filter` | **Date**: 2025-01-27 | **Spec**: [link]
**Input**: Feature specification from `/specs/financial-growth-filter/spec.md`

## Summary

골든크로스 스크리너에 매출 성장성과 수익 성장성을 각각 독립적으로 필터링하는 기능을 추가합니다. 두 개의 토글 필터로 구성되어 기존 수익성 필터와 조합하여 사용 가능하며, PostgreSQL의 LAG 윈도우 함수를 활용하여 효율적인 쿼리로 구현합니다.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 15, React 19  
**Primary Dependencies**: Drizzle ORM, PostgreSQL, nuqs (URL state management)  
**Storage**: PostgreSQL (quarterly_financials 테이블)  
**Testing**: Jest, React Testing Library  
**Target Platform**: Web (Next.js App Router)  
**Project Type**: Web application (기존 Next.js 프로젝트 확장)  
**Performance Goals**: API 응답 시간 < 500ms, 필터 변경 시 < 100ms 추가 지연  
**Constraints**: 기존 캐싱 시스템 유지, 기존 UI 패턴 준수  
**Scale/Scope**: 기존 스크리너 사용자, 1000+ 종목 처리

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Performance-First ✅

- 기존 캐싱 시스템 활용 (24시간 TTL)
- 필터별 독립적인 캐시 태그
- DB 쿼리 최적화 (LATERAL JOIN으로 최신 재무 데이터만)

### Data Integrity ✅

- 최신 4분기 매출 데이터만 사용
- NULL 값 처리 명확히 정의
- 필터 조합 시 논리적 일관성 유지

### User Experience ✅

- 직관적인 매출 성장 필터 (전체/연속 상승)
- 기존 수익성 필터와 일관된 UI 패턴
- 레이아웃 시프트 방지

## Project Structure

### Documentation (this feature)

```text
specs/revenue-growth-filter/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── screener/
│   │       └── golden-cross/
│   │           └── route.ts             # 수정: 매출 성장 필터 로직 추가
│   └── screener/
│       └── golden-cross/
│           ├── page.tsx                 # 수정: 캐시 태그에 revenueGrowth 추가
│           ├── DataWrapper.tsx          # 수정: 쿼리 파라미터 전달
│           └── GoldenCrossClient.tsx    # 수정: 매출 성장 필터 UI 추가
├── db/
│   └── schema.ts                        # 기존 quarterly_financials 스키마 활용
└── utils/
    └── format.ts                        # 기존 포맷팅 함수 활용

.specify/
└── specs/
    └── revenue-growth-filter/
        ├── spec.md                      # 완료
        ├── plan.md                      # 현재 문서
        └── tasks.md                     # 작성 예정
```

**Structure Decision**: 기존 Next.js 프로젝트 구조를 유지하며, 골든크로스 스크리너 관련 파일들만 수정하여 최소한의 변경으로 기능 추가

## Research

### Database Schema Analysis

**quarterly_financials 테이블**:

```sql
CREATE TABLE quarterly_financials (
  symbol TEXT NOT NULL,
  period_end_date TEXT NOT NULL,
  as_of_q TEXT NOT NULL,
  revenue NUMERIC,
  -- ... 기타 재무 데이터
  PRIMARY KEY (symbol, period_end_date)
);
```

**LAG 윈도우 함수 활용**:

```sql
-- 최근 4분기 매출 연속 상승 여부 확인
WITH revenue_growth AS (
  SELECT
    symbol,
    LAG(revenue::numeric, 1) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev_revenue,
    LAG(revenue::numeric, 2) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev2_revenue,
    LAG(revenue::numeric, 3) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev3_revenue,
    revenue::numeric as current_revenue
  FROM quarterly_financials
  WHERE symbol = ?
  ORDER BY period_end_date DESC
  LIMIT 1
)
```

### API Integration

**기존 API 구조**:

- 엔드포인트: `/api/screener/golden-cross`
- 기존 파라미터: `justTurned`, `lookbackDays`, `profitability`
- 새 파라미터: `revenueGrowth` (boolean: false = 전체, true = 매출 성장성)
- 새 파라미터: `incomeGrowth` (boolean: false = 전체, true = 수익 성장성)

**캐시 태그 업데이트**:

```typescript
const cacheTag = `golden-cross-${justTurned}-${lookbackDays}-${profitability}-${revenueGrowth}-${incomeGrowth}`;
```

### UI Component Integration

**기존 필터 구조**:

- 수익성 필터: Select 컴포넌트 (전체/흑자/적자)
- 새 매출 성장성 필터: 타원형 버튼 (비활성화/활성화)
- 새 수익 성장성 필터: 타원형 버튼 (비활성화/활성화)
- 필터 배치: 수익성 드롭다운 옆에 성장성 버튼들 그룹화

**URL 상태 관리**:

```typescript
const [revenueGrowth, setRevenueGrowth] = useQueryState(
  "revenueGrowth",
  parseAsBoolean.withDefault(false) // false = 전체, true = 매출 성장성
);

const [incomeGrowth, setIncomeGrowth] = useQueryState(
  "incomeGrowth",
  parseAsBoolean.withDefault(false) // false = 전체, true = 수익 성장성
);
```

## Data Models

### API Response Type

```typescript
interface GoldenCrossCompany {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  quarterly_financials: QuarterlyFinancial[];
  profitability_status: "profitable" | "unprofitable" | "unknown";
  revenue_growth_status: "growing" | "not_growing" | "unknown"; // 새로 추가
  income_growth_status: "growing" | "not_growing" | "unknown"; // 새로 추가
  ordered: boolean;
  just_turned: boolean;
}

interface QuarterlyFinancial {
  period_end_date: string;
  revenue: number | null;
  net_income: number | null;
  eps_diluted: number | null;
}
```

### Database Query Logic

```sql
-- 기존 쿼리에 매출 성장 필터 추가
LEFT JOIN LATERAL (
  SELECT
    json_agg(
      json_build_object(
        'period_end_date', period_end_date,
        'revenue', revenue::numeric,
        'eps_diluted', eps_diluted::numeric
      ) ORDER BY period_end_date DESC
    ) as quarterly_data,
    -- 재무 성장성 여부 계산 (매출과 수익 모두)
    CASE
      WHEN current_revenue > prev_revenue
       AND prev_revenue > prev2_revenue
       AND prev2_revenue > prev3_revenue
       AND current_income > prev_income
       AND prev_income > prev2_income
       AND prev2_income > prev3_income
       AND current_revenue IS NOT NULL
       AND prev_revenue IS NOT NULL
       AND prev2_revenue IS NOT NULL
       AND prev3_revenue IS NOT NULL
       AND current_income IS NOT NULL
       AND prev_income IS NOT NULL
       AND prev2_income IS NOT NULL
       AND prev3_income IS NOT NULL
      THEN 'growing'
      ELSE 'not_growing'
    END as financial_growth_status
  FROM (
    SELECT
      period_end_date,
      revenue,
      eps_diluted,
      LAG(revenue::numeric, 1) OVER (ORDER BY period_end_date DESC) as prev_revenue,
      LAG(revenue::numeric, 2) OVER (ORDER BY period_end_date DESC) as prev2_revenue,
      LAG(revenue::numeric, 3) OVER (ORDER BY period_end_date DESC) as prev3_revenue,
      revenue::numeric as current_revenue,
      LAG(net_income::numeric, 1) OVER (ORDER BY period_end_date DESC) as prev_income,
      LAG(net_income::numeric, 2) OVER (ORDER BY period_end_date DESC) as prev2_income,
      LAG(net_income::numeric, 3) OVER (ORDER BY period_end_date DESC) as prev3_income,
      net_income::numeric as current_income
    FROM quarterly_financials
    WHERE symbol = cand.symbol
    ORDER BY period_end_date DESC
    LIMIT 4
  ) recent_quarters
) qf ON true
```

## Implementation Phases

### Phase 1: 백엔드 API 수정 (Day 1)

**목표**: Golden Cross API에 매출 성장 필터 로직 추가

**Tasks**:

1. `route.ts`에 `revenueGrowth`, `incomeGrowth` 파라미터 추가
2. 매출 성장성 계산 로직 구현 (LAG 윈도우 함수)
3. 수익 성장성 계산 로직 구현 (LAG 윈도우 함수)
4. 응답에 `revenue_growth_status`, `income_growth_status` 필드 추가
5. 캐시 태그에 `revenueGrowth`, `incomeGrowth` 포함

**Deliverables**:

- 수정된 API 엔드포인트
- 매출/수익 성장성 계산 로직
- 업데이트된 응답 구조

### Phase 2: 프론트엔드 UI 추가 (Day 2)

**목표**: 매출/수익 성장성 필터 UI 및 상태 관리 추가

**Tasks**:

1. `GoldenCrossClient.tsx`에 `revenueGrowth`, `incomeGrowth` 상태 추가
2. 수익성 필터 옆에 성장성 필터 버튼들 배치
3. 타원형 버튼 스타일로 직관적인 UI 구현
4. 초록색 계열 색상으로 일관성 있는 디자인 적용
5. 테두리, 커서 포인터, 호버 효과 등 기본적인 상호작용 요소 추가
6. 필터 변경 핸들러 업데이트
7. 캐시 무효화 로직 수정

**Deliverables**:

- 수익성 필터와 그룹화된 성장성 필터 UI
- 타원형 버튼 스타일의 직관적인 인터페이스
- 초록색 계열의 일관성 있는 디자인
- URL 상태 동기화
- 다중 필터 조합 기능

### Phase 3: 테스트 및 검증 (Day 3)

**목표**: 통합 테스트 및 성능 검증

**Tasks**:

1. API 엔드포인트 테스트
2. 필터 조합 테스트
3. 캐시 동작 검증
4. 성능 측정

**Deliverables**:

- 테스트 결과 문서
- 성능 메트릭
- 기능 검증 완료

## Risk Mitigation

### Risk 1: 쿼리 성능 저하

**문제**: LAG 윈도우 함수로 인한 쿼리 시간 증가
**해결책**:

- `quarterly_financials(symbol, period_end_date)` 인덱스 확인
- 실행 계획 분석 (`EXPLAIN ANALYZE`)
- 캐싱으로 반복 조회 방지

### Risk 2: 캐시 키 폭발

**문제**: 필터 조합 증가로 캐시 엔트리 급증
**해결책**:

- 현재: `justTurned(2) × lookbackDays(60) × profitability(3) × revenueGrowth(2) = 720개`
- 24시간 TTL로 자동 정리
- 필요시 Redis로 전환

### Risk 3: 4분기 미만 데이터 처리

**문제**: 일부 종목은 4분기 미만 데이터만 있을 수 있음
**해결책**:

- LEFT JOIN 사용하여 null 허용
- 프론트엔드에서 null 처리
- 매출 연속 상승 필터 선택 시 데이터 부족 종목 자동 제외

## Testing Strategy

### Unit Tests

```typescript
// src/utils/__tests__/revenue-growth.test.ts
describe("revenueGrowthCalculation", () => {
  it("should identify growing revenue", () => {
    const quarters = [
      { revenue: 100, period_end_date: "2024-09-30" },
      { revenue: 90, period_end_date: "2024-06-30" },
      { revenue: 80, period_end_date: "2024-03-31" },
      { revenue: 70, period_end_date: "2023-12-31" },
    ];
    expect(calculateRevenueGrowth(quarters)).toBe("growing");
  });
});
```

### Integration Tests

1. **API 테스트**:

   ```bash
   curl "http://localhost:3000/api/screener/golden-cross?revenueGrowth=growing"
   ```

2. **UI 테스트**:
   - 필터 변경 시 데이터 리패치 확인
   - URL 파라미터 동기화 확인
   - 필터 조합 동작 확인

## Deployment

### 배포 전 체크리스트

- [ ] 데이터베이스 인덱스 확인
- [ ] API 응답 시간 < 500ms
- [ ] 캐시 동작 확인
- [ ] 타입스크립트 에러 없음
- [ ] Linter 경고 없음

### 배포 순서

1. **Backend 먼저 배포** (API 변경)
2. **Frontend 배포** (UI 업데이트)
3. **모니터링** (Vercel 로그)
4. **캐시 warm-up** (주요 필터 조합 사전 호출)

## Monitoring

### Key Metrics

- **API 응답 시간**: < 500ms (p95)
- **캐시 히트율**: > 60%
- **에러율**: < 0.1%
- **필터 사용률**: 매출 성장 필터 사용 횟수 추적

### Logging

```typescript
console.log("[Golden Cross API]", {
  revenueGrowth,
  profitability,
  resultCount: companies.length,
  queryTime: Date.now() - startTime,
});
```

## Future Enhancements

- **P2**: 매출 성장률 퍼센트 표시
- **P2**: 연간 매출 성장률 필터
- **P3**: 매출 성장 가속도 필터 (2차 미분)
- **P3**: 업종별 매출 성장 비교

---

**Next Steps**: `tasks.md` 작성하여 구체적인 구현 단계 정의
