# 매출 4분기 연속 상승 필터 스펙

## 📋 개요

골든크로스 스크리너에 매출이 4분기 연속 상승하는 종목만 필터링하는 기능을 추가합니다.

## 🎯 요구사항

### 기능 요구사항

- [FR-001] 골든크로스 스크리너에 매출 성장 필터 옵션 추가
- [FR-002] 최근 4분기 매출이 연속으로 상승하는 종목만 표시
- [FR-003] 기존 필터들과 조합하여 사용 가능
- [FR-004] 필터 변경 시 실시간 업데이트

### 비기능 요구사항

- [NFR-001] 기존 API 응답 구조 유지
- [NFR-002] 캐시 성능 최적화 (필터별 캐시 태그)
- [NFR-003] UI 반응성 유지 (로딩 상태 표시)

## 🏗️ 아키텍처 설계

### API 스펙

#### 엔드포인트

```
GET /api/screener/golden-cross
```

#### 쿼리 파라미터

| 파라미터        | 타입   | 기본값 | 설명                                |
| --------------- | ------ | ------ | ----------------------------------- |
| `revenueGrowth` | string | "all"  | 매출 성장 필터 ("all" \| "growing") |

#### 응답 구조

```typescript
{
  count: number;
  trade_date: string | null;
  lookback_days: number | null;
  data: Array<{
    symbol: string;
    market_cap: string | null;
    last_close: string;
    quarterly_financials: Array<{
      period_end_date: string;
      revenue: number | null;
      eps_diluted: number | null;
    }>;
    profitability_status: "profitable" | "unprofitable" | "unknown";
    ordered: boolean;
    just_turned: boolean;
    revenue_growth_status: "growing" | "not_growing" | "unknown"; // 새로 추가
  }>;
}
```

### 데이터베이스 쿼리 로직

#### 매출 연속 상승 조건

```sql
-- 최근 4분기 매출이 연속 상승하는지 확인
WITH revenue_growth AS (
  SELECT
    symbol,
    -- 최근 4분기 매출 데이터 추출
    LAG(revenue::numeric, 1) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev_revenue,
    LAG(revenue::numeric, 2) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev2_revenue,
    LAG(revenue::numeric, 3) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev3_revenue,
    revenue::numeric as current_revenue
  FROM quarterly_financials
  WHERE symbol = ?
  ORDER BY period_end_date DESC
  LIMIT 1
)
SELECT
  symbol,
  CASE
    WHEN current_revenue > prev_revenue
     AND prev_revenue > prev2_revenue
     AND prev2_revenue > prev3_revenue
     AND current_revenue IS NOT NULL
     AND prev_revenue IS NOT NULL
     AND prev2_revenue IS NOT NULL
     AND prev3_revenue IS NOT NULL
    THEN 'growing'
    ELSE 'not_growing'
  END as revenue_growth_status
FROM revenue_growth
```

### UI 스펙

#### 필터 위치

- 기존 수익성 필터 옆에 "매출 성장" 필터 추가
- 동일한 Select 컴포넌트 사용

#### 필터 옵션

| 값        | 표시명         | 설명                                   |
| --------- | -------------- | -------------------------------------- |
| `all`     | 전체           | 매출 조건 없음 (기존과 동일)           |
| `growing` | 매출 연속 상승 | 최근 4분기 매출이 연속 상승하는 종목만 |

#### 캐시 태그

```
golden-cross-{justTurned}-{lookbackDays}-{profitability}-{revenueGrowth}
```

## 🔄 구현 계획

### Phase 1: 백엔드 API 수정

1. 쿼리 파라미터 추가
2. 매출 연속 상승 로직 구현
3. 응답에 `revenue_growth_status` 필드 추가
4. 캐시 태그 업데이트

### Phase 2: 프론트엔드 UI 추가

1. `revenueGrowth` 쿼리 상태 추가
2. 필터 UI 컴포넌트 추가
3. 필터 변경 핸들러 업데이트
4. 캐시 무효화 로직 수정

### Phase 3: 테스트 및 검증

1. API 엔드포인트 테스트
2. UI 필터 동작 테스트
3. 캐시 동작 검증
4. 성능 테스트

## 📝 구현 세부사항

### 파일 수정 목록

- `src/app/api/screener/golden-cross/route.ts` - API 로직 수정
- `src/app/screener/golden-cross/GoldenCrossClient.tsx` - UI 필터 추가
- `src/app/screener/golden-cross/DataWrapper.tsx` - 쿼리 파라미터 전달
- `src/lib/cache-config.ts` - 캐시 태그 업데이트 (필요시)

### 테스트 케이스

1. **매출 연속 상승 종목**: 4분기 연속 상승하는 종목이 올바르게 필터링되는지
2. **매출 하락 종목**: 하락하는 종목이 제외되는지
3. **데이터 부족 종목**: 4분기 미만 데이터가 있는 종목이 제외되는지
4. **NULL 데이터**: 매출이 NULL인 분기가 있는 종목이 제외되는지
5. **필터 조합**: 다른 필터들과 함께 사용할 때 올바르게 동작하는지
