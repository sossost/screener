# Implementation Plan: Golden Cross 스크리너 성장성 필터 기능 강화

**Feature Branch**: `feature/golden-cross-growth-filters-enhancement`  
**Created**: 2025-01-27  
**Status**: Draft

## Overview

Golden Cross 스크리너에 매출/수익 성장성 필터를 추가하고, 차트 데이터를 4분기에서 8분기로 확장하여 더 정교한 성장 분석이 가능하도록 기능을 강화합니다.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  GoldenCrossClient.tsx                                      │
│  ├── GrowthFilterControls (새로 추가)                      │
│  ├── QuarterlyBarChart (8분기로 확장)                      │
│  └── Table (8분기 차트 컬럼)                               │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
├─────────────────────────────────────────────────────────────┤
│  /api/screener/golden-cross                                 │
│  ├── 성장성 필터 파라미터 처리                              │
│  ├── 8분기 데이터 반환                                      │
│  └── 연속 성장 분기 수 계산                                 │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                           │
├─────────────────────────────────────────────────────────────┤
│  quarterly_financials                                       │
│  ├── 8분기 데이터 조회                                      │
│  ├── 연속 매출 성장 계산                                    │
│  └── 연속 수익 성장 계산                                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **사용자 입력** → 성장성 필터 설정 (매출/수익, 연속 분기 수)
2. **API 호출** → 필터 파라미터와 함께 데이터 요청
3. **데이터베이스 쿼리** → 8분기 데이터 + 성장성 계산
4. **API 응답** → 8분기 차트 데이터 + 성장성 정보
5. **UI 렌더링** → 8분기 차트 + 성장성 필터 결과

## Implementation Phases

### Phase 1: Backend API 확장 (Day 1)

**목표**: API 라우트에 성장성 필터 및 8분기 데이터 지원 추가

**Tasks**:

1. **API 파라미터 확장**

   - `revenueGrowth`: 매출 성장 필터 (boolean)
   - `incomeGrowth`: 수익 성장 필터 (boolean)
   - `revenueGrowthQuarters`: 매출 성장 연속 분기 수 (2~8)
   - `incomeGrowthQuarters`: 수익 성장 연속 분기 수 (2~8)

2. **SQL 쿼리 수정**

   - 4분기 → 8분기 데이터 조회로 변경
   - 연속 성장 분기 수 계산 로직 추가
   - 성장성 필터링 조건 추가

3. **응답 데이터 구조 확장**
   - `quarterly_financials`: 8개 분기 데이터
   - `revenue_growth_quarters`: 연속 매출 성장 분기 수
   - `income_growth_quarters`: 연속 수익 성장 분기 수

**Deliverables**:

- 수정된 API 라우트 (`/api/screener/golden-cross`)
- 8분기 데이터 반환 로직
- 성장성 계산 SQL 쿼리

### Phase 2: Frontend UI 컴포넌트 (Day 2)

**목표**: 성장성 필터 UI 컴포넌트 구현

**Tasks**:

1. **GrowthFilterControls 컴포넌트 생성**

   - 매출 성장 체크박스 + 연속 분기 수 입력
   - 수익 성장 체크박스 + 연속 분기 수 입력
   - 입력 유효성 검사 (2~8 범위)

2. **기존 필터 UI 통합**

   - 수익성 필터와 성장성 필터를 같은 라인에 배치
   - 반응형 레이아웃 고려

3. **상태 관리**
   - `nuqs`를 사용한 URL 파라미터 동기화
   - 필터 상태 유지 및 초기화

**Deliverables**:

- `GrowthFilterControls.tsx` 컴포넌트
- 필터 UI 통합
- URL 파라미터 동기화

### Phase 3: 차트 컴포넌트 확장 (Day 2-3)

**목표**: QuarterlyBarChart를 8분기 데이터로 확장

**Tasks**:

1. **차트 크기 조정**

   - 80px → 160px (8분기 × 20px)
   - 막대 너비 및 간격 유지

2. **데이터 처리 로직 수정**

   - 4분기 → 8분기 데이터 처리
   - `prepareChartData` 함수 수정

3. **테이블 컬럼 업데이트**
   - "매출 (4Q)" → "매출 (8Q)"
   - "EPS (4Q)" → "EPS (8Q)"
   - 컬럼 너비 조정 (100px → 160px)

**Deliverables**:

- 8분기 차트 렌더링
- 업데이트된 테이블 레이아웃
- 차트 성능 최적화

### Phase 4: 성장성 계산 로직 (Day 3)

**목표**: 연속 성장 분기 수 계산 및 필터링 로직 구현

**Tasks**:

1. **성장성 계산 함수**

   - 연속 매출 성장 분기 수 계산
   - 연속 수익 성장 분기 수 계산
   - SQL 윈도우 함수 활용

2. **필터링 로직**

   - 요청된 연속 분기 수 이상 성장 여부 판단
   - 데이터 부족 시 필터에서 제외

3. **캐시 태그 업데이트**
   - 성장성 필터 파라미터를 캐시 태그에 포함
   - 필터 변경 시 캐시 무효화

**Deliverables**:

- 성장성 계산 SQL 쿼리
- 필터링 로직 구현
- 캐시 무효화 로직

### Phase 5: 테스트 및 최적화 (Day 4)

**목표**: 기능 테스트 및 성능 최적화

**Tasks**:

1. **기능 테스트**

   - 성장성 필터 동작 확인
   - 8분기 차트 렌더링 확인
   - 필터 조합 테스트

2. **성능 최적화**

   - 8분기 데이터로 인한 성능 영향 측정
   - 차트 렌더링 최적화
   - API 응답 시간 최적화

3. **UI/UX 개선**
   - 필터 입력 유효성 검사
   - 로딩 상태 처리
   - 에러 처리

**Deliverables**:

- 테스트 완료된 기능
- 성능 최적화된 코드
- 개선된 사용자 경험

## Technical Details

### Database Schema

**기존 테이블 활용**:

- `quarterly_financials`: 분기별 재무 데이터
- `symbols`: 종목 정보
- `daily_ma`: 일일 이동평균 데이터

**새로운 계산 필드**:

- `revenue_growth_quarters`: 연속 매출 성장 분기 수
- `income_growth_quarters`: 연속 수익 성장 분기 수

### API Contract

**Request Parameters**:

```
GET /api/screener/golden-cross?
  justTurned=false&
  lookbackDays=10&
  profitability=all&
  revenueGrowth=true&
  revenueGrowthQuarters=3&
  incomeGrowth=false&
  incomeGrowthQuarters=3
```

**Response Structure**:

```typescript
{
  data: Array<{
    symbol: string;
    market_cap: string;
    last_close: string;
    quarterly_financials: Array<{
      period_end_date: string;
      revenue: number;
      eps_diluted: number;
    }>; // 8개 분기
    revenue_growth_quarters: number;
    income_growth_quarters: number;
    profitability_status: string;
  }>;
  trade_date: string;
}
```

### Component Architecture

**GrowthFilterControls.tsx**:

```typescript
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
```

**QuarterlyBarChart.tsx (확장)**:

```typescript
interface QuarterlyBarChartProps {
  data: QuarterlyData[]; // 8개 분기
  type: "revenue" | "eps";
  height?: number;
  width?: number; // 160px
}
```

## Risk Assessment

### Risk 1: 성능 저하

**문제**: 8분기 데이터로 인한 API 응답 시간 증가
**해결책**:

- SQL 쿼리 최적화
- 적절한 인덱스 설정
- 캐싱 전략 활용

### Risk 2: UI 복잡성 증가

**문제**: 필터 UI가 복잡해져 사용자 경험 저하
**해결책**:

- 직관적인 UI 설계
- 필터 그룹화
- 도움말 텍스트 제공

### Risk 3: 차트 렌더링 성능

**문제**: 8분기 차트로 인한 렌더링 지연
**해결책**:

- React.memo 최적화
- 가상화 고려
- 로딩 상태 표시

### Risk 4: 데이터 품질

**문제**: 8분기 데이터 부족으로 인한 필터링 오류
**해결책**:

- 데이터 유효성 검사
- 부족한 데이터 처리 로직
- 사용자에게 명확한 피드백

## Success Metrics

### Performance Metrics

- API 응답 시간: < 500ms (8분기 데이터 포함)
- 차트 렌더링 시간: < 100ms (종목당)
- 필터 적용 시간: < 200ms

### User Experience Metrics

- 필터 사용률: > 30% (기존 수익성 필터 대비)
- 사용자 만족도: > 4.0/5.0
- 에러 발생률: < 1%

### Technical Metrics

- 코드 커버리지: > 80%
- 번들 사이즈 증가: < 50KB
- 메모리 사용량 증가: < 10%

## Dependencies

### External Dependencies

- 기존: Next.js, React, Drizzle ORM, PostgreSQL
- 추가: 없음 (기존 기술 스택 활용)

### Internal Dependencies

- `QuarterlyBarChart` 컴포넌트 (기존)
- `GoldenCrossClient` 컴포넌트 (기존)
- API 라우트 `/api/screener/golden-cross` (기존)

## Testing Strategy

### Unit Tests

- 성장성 계산 로직 테스트
- 필터 UI 컴포넌트 테스트
- 차트 렌더링 테스트

### Integration Tests

- API 엔드포인트 테스트
- 필터 조합 테스트
- 캐시 무효화 테스트

### E2E Tests

- 사용자 시나리오 테스트
- 성능 테스트
- 브라우저 호환성 테스트

## Deployment Plan

### Pre-deployment

1. 코드 리뷰 완료
2. 테스트 통과 확인
3. 성능 벤치마크 완료

### Deployment

1. 스테이징 환경 배포
2. 기능 테스트 수행
3. 프로덕션 배포

### Post-deployment

1. 모니터링 설정
2. 사용자 피드백 수집
3. 성능 지표 추적

## Rollback Plan

### Rollback Triggers

- API 응답 시간 > 1초
- 에러 발생률 > 5%
- 사용자 불만 접수

### Rollback Steps

1. 이전 버전으로 즉시 롤백
2. 문제 원인 분석
3. 수정 후 재배포

## Future Enhancements

### Phase 2 Features

- 성장률 계산 (YoY, QoQ)
- 성장성 점수 시스템
- 성장성 랭킹 기능

### Phase 3 Features

- 성장성 알림 설정
- 성장성 리포트 생성
- 성장성 비교 분석

## Conclusion

이 구현 계획은 Golden Cross 스크리너에 성장성 필터 기능을 추가하고, 8분기 차트로 확장하여 더 정교한 투자 분석이 가능하도록 합니다. 기존 아키텍처를 최대한 활용하면서 점진적으로 기능을 확장하는 방식으로 진행합니다.
