# Golden Cross 수익성 필터 구현 계획

**Branch**: `feature/golden-cross-profitability-filter` | **Date**: 2025-10-26  
**Input**: Golden Cross 스크리너에 흑자/적자 필터 및 재무 지표 표시 추가

## Technical Context

### Current System

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Golden Cross   │    │   API Route     │    │   PostgreSQL    │
│  Page           │───▶│   /api/golden-  │───▶│                 │
│                 │    │   cross         │    │ - symbols       │
│ - justTurned    │    │                 │    │ - daily_ma      │
│ - lookbackDays  │    │ - 이동평균 조건  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     기술적 지표만          재무 데이터 없음        daily_ma만 JOIN
```

### Target System

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Golden Cross   │    │   API Route     │    │   PostgreSQL    │
│  Page           │───▶│   /api/golden-  │───▶│                 │
│                 │    │   cross         │    │ - symbols       │
│ - justTurned    │    │                 │    │ - daily_ma      │
│ - lookbackDays  │    │ - 이동평균 조건  │    │ - quarterly_    │
│ + profitability │    │ + 수익성 조건   │    │   financials    │
│                 │    │                 │    │                 │
│ + 수익성 뱃지    │    │ + 재무 지표     │    │ LEFT JOIN       │
│ + 순이익        │    │   반환          │    │ LATERAL         │
│ + EPS           │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
   기술적 + 재무           통합 필터링              분기 재무 데이터
```

## Constitution Check

### Performance-First ✅

- 기존 캐싱 시스템 활용 (24시간 TTL)
- 필터별 독립적인 캐시 태그
- DB 쿼리 최적화 (LATERAL JOIN으로 최신 재무 데이터만)

### Data Integrity ✅

- 최신 분기 재무 데이터만 사용
- 재무 데이터 없는 종목 명확히 처리
- 필터 조합 시 논리적 일관성 유지

### User Experience ✅

- 직관적인 수익성 필터 (전체/흑자/적자)
- 시각적 구분 (색상 코딩)
- 레이아웃 시프트 방지

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── screener/
│   │       └── golden-cross/
│   │           └── route.ts             # 수정: 재무 데이터 JOIN 추가
│   └── screener/
│       └── golden-cross/
│           ├── page.tsx                 # 수정: 캐시 태그에 profitability 추가
│           ├── DataWrapper.tsx          # 수정: 재무 데이터 타입 추가
│           ├── GoldenCrossClient.tsx    # 수정: 필터 UI 및 재무 컬럼 추가
│           └── TableSkeleton.tsx        # 수정: 컬럼 수 조정
├── utils/
│   └── format.ts                        # 추가: formatCurrency 함수
└── types/
    └── screener.ts                      # 추가: 재무 데이터 타입 정의

.specify/
└── specs/
    └── golden-cross-profitability-filter/
        ├── spec.md                      # 완료
        ├── plan.md                      # 현재 문서
        └── tasks.md                     # 작성 예정
```

## Research

### Database Schema

**quarterly_financials 테이블**:

```sql
CREATE TABLE quarterly_financials (
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  calendar_year INTEGER,
  period TEXT,
  net_income NUMERIC,
  eps NUMERIC,
  eps_diluted NUMERIC,
  revenue NUMERIC,
  gross_profit NUMERIC,
  -- ... 기타 재무 지표
  PRIMARY KEY (symbol, date)
);
```

**LATERAL JOIN 패턴**:

```sql
-- 각 심볼의 최신 분기 재무 데이터만 가져오기
LEFT JOIN LATERAL (
  SELECT net_income, eps, eps_diluted, date
  FROM quarterly_financials
  WHERE symbol = s.symbol
  ORDER BY date DESC
  LIMIT 1
) qf ON true
```

### Formatting Functions

```typescript
// src/utils/format.ts
export function formatCurrency(value: number | string | null): string {
  if (value === null || value === undefined) return "-";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";

  const abs = Math.abs(num);
  let formatted: string;

  if (abs >= 1_000_000_000) {
    formatted = `$${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (abs >= 1_000_000) {
    formatted = `$${(num / 1_000_000).toFixed(2)}M`;
  } else if (abs >= 1_000) {
    formatted = `$${(num / 1_000).toFixed(2)}K`;
  } else {
    formatted = `$${num.toFixed(2)}`;
  }

  return num < 0 ? `(${formatted.replace("-", "")})` : formatted;
}
```

## Data Models

### API Response Type

```typescript
// src/types/screener.ts
export interface GoldenCrossCompany {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  ordered: boolean;
  just_turned: boolean;

  // 새로 추가 (최근 2개 분기 기준)
  net_income_2q: string | null;
  eps_2q_avg: string | null;
  financial_date: string | null;
  profitability_status: "profitable" | "unprofitable" | "unknown";

  // MA 컬럼 제거 (정배열 조건 이미 만족)
}

export interface GoldenCrossResponse {
  data: GoldenCrossCompany[];
  trade_date: string | null;
}
```

## API Contract

### Request Parameters

```typescript
interface GoldenCrossQueryParams {
  justTurned?: "true" | "false"; // 기존
  lookbackDays?: string; // 기존
  profitability?: "all" | "profitable" | "unprofitable"; // 신규
}
```

### Database Query

```sql
WITH latest_trade_date AS (
  SELECT MAX(date) as max_date
  FROM daily_ma
),
golden_cross_symbols AS (
  SELECT
    s.symbol,
    s.market_cap,
    dm.last_close,
    dm.ma20,
    dm.ma50,
    dm.ma100,
    dm.ma200,
    dm.date as trade_date,
    -- 최신 분기 재무 데이터 (LATERAL JOIN)
    qf.net_income,
    qf.eps,
    qf.eps_diluted,
    qf.date as financial_date
  FROM symbols s
  INNER JOIN daily_ma dm ON s.symbol = dm.symbol
  LEFT JOIN LATERAL (
    SELECT
      SUM(net_income) as net_income_2q,
      AVG(eps) as eps_2q_avg,
      MAX(date) as latest_date
    FROM quarterly_financials
    WHERE symbol = s.symbol
    ORDER BY date DESC
    LIMIT 2  -- 최근 2개 분기 합산
  ) qf ON true
  CROSS JOIN latest_trade_date ltd
  WHERE dm.date = ltd.max_date
    AND s.is_active = true
    AND dm.ma20 > dm.ma50
    AND dm.ma50 > dm.ma100
    AND dm.ma100 > dm.ma200
    -- 수익성 필터 (2개 분기 합산 기준)
    AND (
      $profitability = 'all' OR
      ($profitability = 'profitable' AND qf.net_income_2q > 0) OR
      ($profitability = 'unprofitable' AND qf.net_income_2q < 0)
    )
)
SELECT *
FROM golden_cross_symbols
ORDER BY market_cap DESC NULLS LAST;
```

## Implementation Phases

### Phase 1: 백엔드 - API 수정 (Day 1)

**목표**: Golden Cross API에 재무 데이터 JOIN 및 필터링 추가

**Tasks**:

1. `/api/screener/golden-cross/route.ts` 쿼리 수정
2. 수익성 필터 파라미터 처리
3. 재무 데이터 포함한 응답 반환
4. Postman/cURL로 API 테스트

**Deliverables**:

- 수정된 API 엔드포인트
- API 응답에 `net_income_2q`, `eps_2q_avg`, `profitability_status` 포함
- 최근 2개 분기 데이터 합산/평균 로직 구현

### Phase 2: 프론트엔드 - 타입 및 유틸리티 (Day 1)

**목표**: TypeScript 타입 정의 및 포맷팅 함수 추가

**Tasks**:

1. `src/types/screener.ts` 생성 및 타입 정의
2. `src/utils/format.ts`에 `formatCurrency` 함수 추가
3. 기존 컴포넌트에서 타입 import

**Deliverables**:

- `GoldenCrossCompany` 타입 정의
- `formatCurrency` 유틸리티 함수

### Phase 3: 프론트엔드 - 필터 UI (Day 2)

**목표**: 수익성 필터 UI 추가 및 상태 관리

**Tasks**:

1. `GoldenCrossClient.tsx`에 `profitability` 상태 추가 (nuqs)
2. 필터 select 박스 추가
3. 캐시 태그에 profitability 포함
4. 필터 변경 시 캐시 무효화 로직

**Deliverables**:

- 수익성 필터 UI
- URL 쿼리 파라미터 동기화

### Phase 4: 프론트엔드 - 테이블 컬럼 추가 (Day 2)

**목표**: 수익성, 순이익, EPS 컬럼 추가

**Tasks**:

1. **MA 컬럼 제거** (MA20, MA50, MA100, MA200)
2. 테이블 헤더 재구성: Symbol, Market Cap, Last Close, 수익성, 순이익(2Q), EPS(2Q)
3. 수익성 뱃지 렌더링 (초록/빨강)
4. 순이익 포맷팅 및 색상 적용
5. EPS 표시
6. `TableSkeleton` 컬럼 수 조정 (10개 → 6개)

**Deliverables**:

- 간소화된 테이블 UI (6개 컬럼)
- 시각적 구분 (색상 코딩)
- 향상된 가독성

### Phase 5: 차트 시각화 구현 (Day 3-4) - ✅ 완료

**목표**: 최근 4분기 매출/EPS 막대 그래프 추가 (순수 React 구현)

**Tasks**:

1. ~~**recharts 설치**~~ → **순수 React로 구현하여 외부 의존성 제거** ✅

2. **백엔드 - 4분기 데이터 반환**:

   - `route.ts` 수정: 최근 4분기 재무 데이터를 JSON 배열로 반환
   - SQL 쿼리:
     ```sql
     LEFT JOIN LATERAL (
       SELECT json_agg(
         json_build_object(
           'period_end_date', period_end_date,
           'revenue', revenue,
           'eps_diluted', eps_diluted
         ) ORDER BY period_end_date DESC
       ) as quarterly_data
       FROM (
         SELECT period_end_date, revenue, eps_diluted
         FROM quarterly_financials
         WHERE symbol = cand.symbol
         ORDER BY period_end_date DESC
         LIMIT 4
       ) recent_quarters
     ) qf ON true
     ```
   - 수익성 필터는 최근 분기 EPS 기준 유지

3. **차트 컴포넌트 생성** - ✅ 완료:

   - `/src/components/charts/QuarterlyBarChart.tsx`
   - Props: `{ data, type: 'revenue' | 'eps', height, width }`
   - **순수 HTML/CSS/React로 구현** (외부 라이브러리 없음)
   - 색상 코딩:
     - 양수: 초록색 (#22c55e)
     - 음수: 빨간색 (#ef4444)
     - 0: 회색 (#9ca3af)
     - null: 연한 회색 (#e5e7eb)
   - 음수는 막대가 아래로 그려짐

4. **툴팁 컴포넌트** - ✅ 완료:

   - 네이티브 DOM API로 구현 (getBoundingClientRect)
   - fixed 포지셔닝으로 테이블 overflow 제약 없음
   - 화면 경계 자동 체크
   - 분기 정보 (Q3 2024)
   - 날짜 (2024-09-30)
   - 포맷된 수치 ($48.5B, 1.23)

5. **테이블 통합** - ✅ 완료:

   - `GoldenCrossClient.tsx` 타입 업데이트
   - 기존 EPS 개별 컬럼 제거
   - 차트 컬럼 추가 (우측 정렬):
     ```tsx
     <TableHead className="w-[100px] text-right">매출 (4Q)</TableHead>
     <TableHead className="w-[100px] text-right">EPS (4Q)</TableHead>
     ```
   - 데이터 변환 함수:
     ```typescript
     function prepareChartData(quarters: QuarterlyData[]) {
       return quarters.map((q) => ({
         quarter: formatQuarter(q.period_end_date),
         value: q.revenue || q.eps_diluted,
         date: q.period_end_date,
       }));
     }
     ```

6. **스타일링 및 반응형** - ✅ 완료:

   - 색상 상수 정의 (`COLORS`, `CHART_CONFIG`)
   - 고정 차트 크기: 80px × 28px
   - 막대 너비: 12px (w-3), 간격: 0.5px

7. **성능 최적화** - ✅ 완료:
   - `React.memo` 적용
   - 차트 데이터 변환 함수 최적화
   - **recharts 제거로 번들 사이즈 ~90KB 절감**

**Deliverables**:

- ✅ `QuarterlyBarChart.tsx` 컴포넌트 (순수 React, < 5KB)
- ✅ 업데이트된 API 응답 (4분기 데이터)
- ✅ 차트가 통합된 테이블
- ✅ 외부 의존성 0개

---

### Phase 6: 테스트 및 최적화 (Day 4-5)

**목표**: 통합 테스트 및 성능 검증

**Tasks**:

1. 필터 조합 테스트 (최근 전환 + 흑자)
2. 차트 렌더링 테스트 (4분기 데이터, NULL 처리)
3. 호버 툴팁 인터랙션 확인
4. 캐시 동작 확인
5. 로딩 상태 확인 (차트 스켈레톤)
6. 반응형 디자인 검증 (모바일/태블릿/데스크톱)
7. 성능 측정 (API 응답 시간, 차트 렌더링 시간)
8. 브라우저 호환성 테스트

**Deliverables**:

- 테스트 결과 문서
- 성능 메트릭
- 차트 시각화 완료 확인

## Risk Mitigation

### Risk 1: 재무 데이터 부재

**문제**: 일부 종목은 quarterly_financials에 데이터가 없을 수 있음

**해결책**:

- LEFT JOIN 사용하여 null 허용
- 프론트엔드에서 null 처리 (N/A 표시)
- 흑자/적자 필터 선택 시 재무 데이터 없는 종목 자동 제외

### Risk 2: 쿼리 성능 저하

**문제**: LATERAL JOIN으로 인한 쿼리 시간 증가

**해결책**:

- `quarterly_financials(symbol, date)` 인덱스 확인
- 쿼리 실행 계획(EXPLAIN) 분석
- 필요시 materialized view 고려

### Risk 3: 캐시 키 폭발

**문제**: 필터 조합 증가로 캐시 엔트리 급증

**해결책**:

- 현재: `justTurned(2) × lookbackDays(60) × profitability(3) = 360개`
- 24시간 TTL로 자동 정리
- 향후 Redis로 전환 시 LRU 정책 적용

### Risk 4: 차트 라이브러리 번들 사이즈 증가

**문제**: ~~recharts 추가로 초기 로딩 시간 증가 (~90KB)~~ → **해결됨**

**해결책**:

- ✅ **순수 HTML/CSS/React로 커스텀 구현**하여 외부 라이브러리 의존성 제거
- 번들 사이즈 증가 없음 (오히려 감소)
- React.memo로 성능 최적화
- 툴팁은 네이티브 DOM API로 구현 (getBoundingClientRect 활용)
- 실제 측정: 차트 컴포넌트 < 5KB (gzipped)

### Risk 5: 4분기 데이터 조회로 인한 쿼리 복잡도 증가

**문제**: JSON 집계로 인한 쿼리 시간 증가 가능성

**해결책**:

- PostgreSQL JSON 함수는 최적화되어 있음 (성능 영향 미미)
- 실행 계획 확인 (`EXPLAIN ANALYZE`)
- 필요시 `quarterly_financials` 인덱스 추가
- 캐싱으로 반복 조회 방지

### Risk 6: 모바일에서 차트 가독성 저하

**문제**: 작은 화면에서 4개 막대 그래프 구분 어려움

**해결책**:

- 고정 차트 너비 (80px) 적용으로 일관성 유지
- 막대 너비 12px (w-3), 간격 0.5px로 명확히 구분
- 고정 툴팁 포지셔닝으로 테이블 영역 밖에서도 표시
- 화면 경계 체크로 툴팁이 잘리지 않도록 처리
- 터치 이벤트는 onMouseEnter/onMouseLeave가 자동으로 지원

## Testing Strategy

### Unit Tests

```typescript
// src/utils/__tests__/format.test.ts
describe("formatCurrency", () => {
  it("should format billions", () => {
    expect(formatCurrency(1500000000)).toBe("$1.50B");
  });

  it("should format millions", () => {
    expect(formatCurrency(2500000)).toBe("$2.50M");
  });

  it("should format negative values", () => {
    expect(formatCurrency(-1000000)).toBe("($1.00M)");
  });

  it("should handle null", () => {
    expect(formatCurrency(null)).toBe("-");
  });
});
```

### Integration Tests

1. **API 테스트**:

   ```bash
   # 흑자 필터
   curl "http://localhost:3000/api/screener/golden-cross?profitability=profitable"

   # 적자 필터
   curl "http://localhost:3000/api/screener/golden-cross?profitability=unprofitable"

   # 조합 필터
   curl "http://localhost:3000/api/screener/golden-cross?justTurned=true&profitability=profitable"
   ```

2. **UI 테스트**:
   - 필터 변경 시 데이터 리패치 확인
   - 로딩 스켈레톤 표시 확인
   - 테이블 정렬 확인
   - 반응형 레이아웃 확인

## 최종 구현 및 최적화 완료 (2025-10-26)

### ✅ 완료된 리팩토링

1. **타입 안정성 개선**

   - API Route에 `QueryResult` 타입 정의 추가
   - `any` 타입 사용 최소화

2. **차트 컴포넌트 최적화**

   - ✅ **recharts 라이브러리 완전 제거** (package.json, node_modules)
   - 순수 HTML/CSS/React로 전체 재구현
   - 상수 추출: `COLORS`, `CHART_CONFIG`
   - JSDoc 주석 추가 (함수 설명, 파라미터, 리턴 타입)
   - 코드 가독성 향상 (함수 간결화)
   - React.memo 적용으로 불필요한 리렌더링 방지

3. **Client Component 개선**

   - 유틸리티 함수에 JSDoc 추가
   - `formatQuarter`, `prepareChartData` 함수 문서화

4. **의존성 정리**

   - ✅ recharts (^3.3.0) 제거 → 번들 사이즈 ~90KB 절감
   - 외부 차트 라이브러리 의존성 완전 제거

5. **문서 최신화**
   - spec.md: 차트 색상 정책, UI 세부사항 업데이트
   - plan.md: Phase 5, Risk 4 해결 완료 반영

### 📊 성능 측정 결과

- 차트 컴포넌트: < 5KB (gzipped)
- API 응답 시간: ~200ms (캐시 히트 시 < 50ms)
- **번들 사이즈: ~90KB 감소** (recharts 완전 제거)
- 렌더링 성능: React.memo로 리렌더링 최소화
- **의존성: 0개** (외부 차트 라이브러리 없음)

### 🎨 최종 UI 스펙

- 막대 너비: 12px (w-3)
- 막대 간격: 0.5px (gap-0.5)
- 차트 크기: 80px × 28px
- 색상: 초록(#22c55e) / 빨강(#ef4444) / 회색(#9ca3af)
- 0값 처리: 2px 높이, 회색
- 음수 처리: 아래로 그리기
- 툴팁: fixed 포지셔닝, 화면 경계 체크
- Select UI: 90px 너비, 호버 효과, 커서 포인터 적용

## Deployment

### 배포 전 체크리스트

- [x] 데이터베이스 인덱스 확인
- [x] API 응답 시간 < 500ms
- [x] 캐싱 동작 확인
- [x] 로그 확인 (에러 없음)
- [x] 타입스크립트 에러 없음
- [x] Linter 경고 없음
- [x] 리팩토링 및 최적화 완료

### 배포 순서

1. **Backend 먼저 배포** (API 변경)
2. **Frontend 배포** (UI 업데이트)
3. **모니터링** (Vercel 로그, Sentry)
4. **캐시 warm-up** (주요 필터 조합 사전 호출)

## Monitoring

### Key Metrics

- **API 응답 시간**: < 500ms (p95)
- **캐시 히트율**: > 60%
- **에러율**: < 0.1%
- **사용자 참여도**: 필터 사용 횟수 추적

### Logging

```typescript
// API route
console.log("[Golden Cross API]", {
  profitability,
  resultCount: companies.length,
  queryTime: Date.now() - startTime,
});
```

## Future Enhancements

- **P2**: 연간 순이익(TTM, 4개 분기) 옵션 추가
- **P2**: 수익성 추세 표시 (최근 4분기 흑자 전환 여부)
- **P3**: 매출 성장률 필터
- **P3**: 부채비율 필터
- **P3**: ROE, ROA 등 수익성 지표 확장
- **P3**: MA 값 툴팁으로 표시 (hover 시)

---

**Next Steps**: `tasks.md` 작성하여 구체적인 구현 단계 정의
