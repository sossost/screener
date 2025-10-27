# Feature Specification: 매출/수익 성장성 필터

**Feature Branch**: `feature/financial-growth-filter`  
**Created**: 2025-01-27  
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 매출 성장성 필터로 종목 선별 (Priority: P1)

투자자가 Golden Cross 정배열 조건을 만족하는 종목 중에서 **최근 4분기 매출이 연속으로 상승하는 종목만** 선별하여 매출 성장성이 검증된 기업에 투자할 수 있어야 합니다.

**Why this priority**:

- 기술적 지표(이동평균)와 매출 성장성을 결합한 종합적 분석
- 단순한 정배열보다 더 강력한 매출 모멘텀 신호 제공
- 4분기 연속 상승은 지속적인 매출 성장을 의미하는 중요한 지표

**Independent Test**:

- "매출 성장성" 토글 ON 시 최근 4분기 매출이 Q4 > Q3 > Q2 > Q1 순서로 증가하는 종목만 표시
- "매출 성장성" 토글 OFF 시 기존과 동일하게 모든 종목 표시 (매출 조건 없음)
- 데이터베이스 쿼리 결과와 화면 표시 일치 확인
- 4분기 미만 데이터가 있는 종목은 필터에서 제외

**Acceptance Scenarios**:

1. **Given** Golden Cross 페이지 접속, **When** "매출 성장성" 토글 ON, **Then** 최근 4분기 매출이 연속 상승하는 기업만 표시
2. **Given** 매출 성장성 토글 ON 상태, **When** 토글 OFF, **Then** 매출 조건 무관하게 모든 Golden Cross 종목 표시
3. **Given** 4분기 미만 데이터가 있는 종목, **When** 매출 성장성 토글 ON, **Then** 해당 종목은 표시되지 않음
4. **Given** 매출 데이터가 NULL인 분기가 있는 종목, **When** 매출 성장성 토글 ON, **Then** 해당 종목은 표시되지 않음

---

### User Story 2 - 수익 성장성 필터로 종목 선별 (Priority: P1)

투자자가 Golden Cross 정배열 조건을 만족하는 종목 중에서 **최근 4분기 수익이 연속으로 상승하는 종목만** 선별하여 수익 성장성이 검증된 기업에 투자할 수 있어야 합니다.

**Why this priority**:

- 기술적 지표(이동평균)와 수익 성장성을 결합한 종합적 분석
- 단순한 정배열보다 더 강력한 수익 모멘텀 신호 제공
- 4분기 연속 상승은 지속적인 수익성 개선을 의미하는 중요한 지표

**Independent Test**:

- "수익 성장성" 토글 ON 시 최근 4분기 수익이 Q4 > Q3 > Q2 > Q1 순서로 증가하는 종목만 표시
- "수익 성장성" 토글 OFF 시 기존과 동일하게 모든 종목 표시 (수익 조건 없음)
- 데이터베이스 쿼리 결과와 화면 표시 일치 확인
- 4분기 미만 데이터가 있는 종목은 필터에서 제외

**Acceptance Scenarios**:

1. **Given** Golden Cross 페이지 접속, **When** "수익 성장성" 토글 ON, **Then** 최근 4분기 수익이 연속 상승하는 기업만 표시
2. **Given** 수익 성장성 토글 ON 상태, **When** 토글 OFF, **Then** 수익 조건 무관하게 모든 Golden Cross 종목 표시
3. **Given** 4분기 미만 데이터가 있는 종목, **When** 수익 성장성 토글 ON, **Then** 해당 종목은 표시되지 않음
4. **Given** 수익 데이터가 NULL인 분기가 있는 종목, **When** 수익 성장성 토글 ON, **Then** 해당 종목은 표시되지 않음

---

### User Story 3 - 다중 성장성 필터 조합 (Priority: P1)

투자자가 **매출 성장성** + **수익 성장성** + **수익성(흑자/적자)** 필터를 독립적으로 조합하여 더욱 정교한 종목 선별을 할 수 있어야 합니다.

**Why this priority**:

- 다중 필터 조합으로 리스크를 최소화하면서 성장성을 확보
- 흑자 + 매출 성장성 + 수익 성장성 = 가장 이상적인 투자 후보
- 적자 + 매출 성장성 = 회생 가능성이 있는 턴어라운드 후보

**Independent Test**:

- "흑자만" + "매출 성장성" + "수익 성장성" 토글 동시 적용 시 세 조건 모두 만족하는 종목만 표시
- "적자만" + "매출 성장성" 토글으로 턴어라운드 후보 발굴
- URL에 모든 필터 파라미터 포함 확인 (`?profitability=profitable&revenueGrowth=true&incomeGrowth=true`)

**Acceptance Scenarios**:

1. **Given** "흑자만" + "매출 성장성" + "수익 성장성" 토글 적용, **Then** 흑자이면서 매출과 수익이 4분기 연속 상승하는 종목만 표시
2. **Given** "적자만" + "매출 성장성" 토글 적용, **Then** 적자이지만 매출이 4분기 연속 상승하는 턴어라운드 후보 표시
3. **Given** 모든 필터 적용된 상태, **When** 새로고침, **Then** URL 파라미터 유지되고 동일한 결과 표시

---

### User Story 4 - 성장성 필터 UI (Priority: P2)

투자자가 **매출/수익 성장성 필터**를 직관적인 버튼으로 조작할 수 있게 하고 싶습니다.

**Why this priority**:

- 필터링을 쉽고 빠르게 할 수 있어야 함
- 수익성 필터와 함께 그룹화하여 일관성 있는 UI 제공
- 직관적인 버튼 스타일로 사용성 향상

**Independent Test**:

- 수익성 필터 옆에 성장성 필터들이 배치됨
- 타원형 버튼 스타일로 직관적인 UI 제공
- 초록색 계열 색상으로 일관성 있는 디자인
- 테두리가 있는 버튼으로 명확한 클릭 영역 제공

**Acceptance Scenarios**:

1. **Given** 필터 영역, **Then** 수익성 드롭다운 옆에 매출/수익 성장성 버튼이 배치됨
2. **Given** 성장성 버튼 클릭, **Then** 초록색으로 활성화되고 테두리와 그림자 효과 적용
3. **Given** 비활성화된 성장성 버튼, **Then** 흰색 배경에 초록색 테두리로 표시되고 호버 시 배경색 변경
4. **Given** 매출 연속 상승 종목, **When** 상태 확인, **Then** "매출 상승" 뱃지가 초록색으로 표시됨
5. **Given** 수익 하락 종목, **When** 상태 확인, **Then** "수익 하락" 뱃지가 빨간색으로 표시됨

---

### Edge Cases

- **4분기 미만 데이터**: 재무 성장성 필터에서 제외, "전체" 선택 시 포함
- **NULL 매출 또는 수익 데이터**: 재무 성장성 필터에서 제외
- **동일한 매출 또는 수익**: 연속 상승으로 간주하지 않음 (증가해야 함)
- **0 또는 음수 매출/수익**: 정상적으로 처리하되 연속 상승 조건 확인
- **데이터 갱신 주기**: 분기 재무 데이터는 ETL 주간 작업으로 업데이트되므로 캐시 무효화 시점 고려

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 시스템은 Golden Cross API에 매출 성장성 필터 파라미터(`revenueGrowth`)를 추가해야 함
  - 가능한 값: `false` (전체), `true` (매출 성장성)
- **FR-002**: 시스템은 Golden Cross API에 수익 성장성 필터 파라미터(`incomeGrowth`)를 추가해야 함
  - 가능한 값: `false` (전체), `true` (수익 성장성)
- **FR-003**: API는 **최근 4분기 매출 데이터**를 기준으로 연속 상승 여부를 판단하고 필터링해야 함
  - 판단 기준: 매출 Q4 > Q3 > Q2 > Q1 (최신 분기부터 역순)
  - 모든 분기 데이터가 존재해야 함 (NULL 값 있으면 제외)
- **FR-004**: API는 **최근 4분기 수익 데이터**를 기준으로 연속 상승 여부를 판단하고 필터링해야 함
  - 판단 기준: 수익 Q4 > Q3 > Q2 > Q1 (최신 분기부터 역순)
  - 모든 분기 데이터가 존재해야 함 (NULL 값 있으면 제외)
- **FR-005**: 기존 수익성 필터와 조합하여 사용 가능해야 함
  - 필터 조합: `profitability` + `revenueGrowth` + `incomeGrowth`
  - URL 파라미터: `?profitability=profitable&revenueGrowth=true&incomeGrowth=true`
- **FR-006**: API는 최근 4분기 매출과 수익 데이터를 JSON 배열로 반환해야 함
  - 기존 `quarterly_financials` 구조 활용
  - 성장성 여부 계산을 위한 데이터 제공
- **FR-007**: 캐시 시스템에 새로운 필터 파라미터 포함
  - 캐시 태그: `golden-cross-{justTurned}-{lookbackDays}-{profitability}-{revenueGrowth}-{incomeGrowth}`
  - 필터 변경 시 해당 캐시만 무효화
- **FR-008**: UI에 매출 성장성 필터 토글 추가
  - 기존 수익성 필터 옆에 토글 컴포넌트로 추가
  - 토글 상태: OFF (전체), ON (매출 성장성)
- **FR-009**: UI에 수익 성장성 필터 토글 추가
  - 매출 성장성 토글 옆에 토글 컴포넌트로 추가
  - 토글 상태: OFF (전체), ON (수익 성장성)
- **FR-010**: 기존 필터와 일관된 스타일 및 동작 방식

### Non-Functional Requirements

- **NFR-001**: 필터 추가로 인한 API 응답 시간 증가 < 100ms
- **NFR-002**: 기존 캐싱 시스템과 통합되어 동일한 TTL 및 무효화 로직 적용
- **NFR-003**: UI 반응성 유지 (로딩 상태 표시, 레이아웃 시프트 방지)
- **NFR-004**: 데이터베이스 쿼리 최적화 (LATERAL JOIN 활용)

### Key Entities

- **Financial Growth Status** (최근 4분기 매출과 수익 기준)

  - `growing`: 매출과 수익 모두 Q4 > Q3 > Q2 > Q1 (연속 상승)
  - `not_growing`: 연속 상승하지 않음
  - `unknown`: 4분기 미만 데이터 또는 NULL 값 존재

- **Quarterly Financial Data** (from `quarterly_financials` table)
  - `revenue`: 분기별 매출 (최근 4분기)
  - `net_income`: 분기별 순이익 (최근 4분기)
  - `period_end_date`: 재무 데이터 기준일
  - `symbol`: 종목 심볼

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 재무 성장성 필터 적용 시 API 응답 시간 < 500ms (기존 캐싱 유지)
- **SC-002**: 필터 조합 정확도 100% (DB 쿼리 결과와 일치)
- **SC-003**: URL 파라미터 동기화 100% (필터 변경 시 즉시 반영)
- **SC-004**: 4분기 미만 데이터 종목 필터링 정확도 100%
- **SC-005**: 기존 수익성 필터와의 조합 동작 100% 정상

## Technical Considerations _(optional)_

### Database Query Logic

```sql
-- 최근 4분기 재무 성장성 여부 확인 (매출과 수익 모두)
WITH financial_growth AS (
  SELECT
    symbol,
    -- 최근 4분기 매출 데이터 추출
    LAG(revenue::numeric, 1) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev_revenue,
    LAG(revenue::numeric, 2) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev2_revenue,
    LAG(revenue::numeric, 3) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev3_revenue,
    revenue::numeric as current_revenue,
    -- 최근 4분기 수익 데이터 추출
    LAG(net_income::numeric, 1) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev_income,
    LAG(net_income::numeric, 2) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev2_income,
    LAG(net_income::numeric, 3) OVER (PARTITION BY symbol ORDER BY period_end_date DESC) as prev3_income,
    net_income::numeric as current_income
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
FROM financial_growth
```

### API Changes

**Request**:

```
GET /api/screener/golden-cross?justTurned=false&lookbackDays=10&profitability=profitable&financialGrowth=true
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
      "profitability_status": "profitable",
      "financial_growth_status": "growing",
      "ordered": true,
      "just_turned": false
    }
  ],
  "trade_date": "2024-10-25"
}
```

## Open Questions _(optional)_

1. **Q**: 매출 연속 상승 판단 기준은 무엇인가?

   - **A**: ✅ **결정됨** - 최근 4분기 매출이 Q4 > Q3 > Q2 > Q1 순서로 연속 상승

2. **Q**: 4분기 미만 데이터가 있는 종목을 어떻게 처리할 것인가?

   - **A**: ✅ **결정됨** - 매출 연속 상승 필터 선택 시 제외, "전체" 선택 시 포함

3. **Q**: 동일한 매출을 어떻게 처리할 것인가?

   - **A**: ✅ **결정됨** - 연속 상승으로 간주하지 않음 (증가해야 함)

4. **Q**: 기존 수익성 필터와의 조합 UI는 어떻게 구성할 것인가?
   - **A**: ✅ **결정됨** - 기존 수익성 필터 옆에 동일한 Select 컴포넌트로 추가

## References _(optional)_

- 기존 스펙: `.specify/specs/golden-cross-profitability-filter/spec.md`
- 기존 스펙: `.specify/specs/stock-screener-overview/spec.md`
- [PostgreSQL LAG Window Function](https://www.postgresql.org/docs/current/tutorial-window.html)
- [Next.js URL State Management with nuqs](https://nuqs.47ng.com/)

---

**Note**: 이 스펙은 Draft 상태이며, 구현 과정에서 발견되는 요구사항에 따라 업데이트될 수 있습니다.
