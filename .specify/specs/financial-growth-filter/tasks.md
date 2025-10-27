---
description: "Task list for financial growth filter implementation"
---

# Tasks: 매출/수익 성장성 필터

**Input**: Design documents from `/specs/financial-growth-filter/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: API 테스트 및 통합 테스트 포함

**Organization**: 사용자 스토리별로 그룹화하여 독립적 구현 및 테스트 가능

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 사용자 스토리 (US1, US2, US3)
- 파일 경로를 설명에 포함

## Path Conventions

- **Next.js 프로젝트**: `src/` at repository root
- **API**: `src/app/api/`
- **UI**: `src/app/screener/golden-cross/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기화 및 기본 구조

- [ ] T001 [P] 기존 프로젝트 구조 확인 및 백업
- [ ] T002 [P] Git 브랜치 생성: `feature/revenue-growth-filter`
- [ ] T003 [P] TypeScript 타입 정의 준비

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 사용자 스토리 구현 전에 완료되어야 하는 핵심 인프라

**⚠️ CRITICAL**: 이 단계가 완료되기 전까지는 사용자 스토리 작업을 시작할 수 없음

- [ ] T004 [P] 데이터베이스 스키마 확인 (quarterly_financials 테이블)
- [ ] T005 [P] 기존 API 구조 분석 (golden-cross route.ts)
- [ ] T006 [P] 기존 UI 컴포넌트 구조 분석 (GoldenCrossClient.tsx)
- [ ] T007 [P] 캐시 시스템 구조 분석 (DataWrapper.tsx)
- [ ] T008 [P] nuqs URL 상태 관리 패턴 분석

**Checkpoint**: Foundation ready - 사용자 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 매출 성장성 필터로 종목 선별 (Priority: P1) 🎯 MVP

**Goal**: 최근 4분기 매출이 연속으로 상승하는 종목만 선별하는 토글 필터 기능

**Independent Test**: "매출 성장성" 토글 ON 시 최근 4분기 매출이 Q4 > Q3 > Q2 > Q1 순서로 증가하는 종목만 표시

### Tests for User Story 1

> **NOTE: 구현 전에 테스트를 먼저 작성하고 실패하는지 확인**

- [ ] T009 [P] [US1] API 엔드포인트 테스트: `src/app/api/screener/golden-cross/__tests__/route.test.ts`
- [ ] T010 [P] [US1] 매출 성장성 계산 로직 테스트: `src/utils/__tests__/revenue-growth.test.ts`

### Implementation for User Story 1

- [ ] T011 [US1] API에 revenueGrowth 파라미터 추가: `src/app/api/screener/golden-cross/route.ts`
- [ ] T012 [US1] 매출 성장성 계산 로직 구현 (LAG 윈도우 함수)
- [ ] T013 [US1] 응답에 revenue_growth_status 필드 추가
- [ ] T014 [US1] 캐시 태그에 revenueGrowth 포함
- [ ] T015 [US1] 에러 처리 및 로깅 추가

**Checkpoint**: 이 시점에서 User Story 1이 완전히 기능하고 독립적으로 테스트 가능해야 함

---

## Phase 4: User Story 2 - 수익 성장성 필터로 종목 선별 (Priority: P1)

**Goal**: 최근 4분기 수익이 연속으로 상승하는 종목만 선별하는 토글 필터 기능

**Independent Test**: "수익 성장성" 토글 ON 시 최근 4분기 수익이 Q4 > Q3 > Q2 > Q1 순서로 증가하는 종목만 표시

### Tests for User Story 2

- [ ] T016 [P] [US2] 수익 성장성 API 테스트: `src/app/api/screener/golden-cross/__tests__/income-growth.test.ts`
- [ ] T017 [P] [US2] 수익 성장성 계산 로직 테스트: `src/utils/__tests__/income-growth.test.ts`

### Implementation for User Story 2

- [ ] T018 [US2] API에 incomeGrowth 파라미터 추가: `src/app/api/screener/golden-cross/route.ts`
- [ ] T019 [US2] 수익 성장성 계산 로직 구현 (LAG 윈도우 함수)
- [ ] T020 [US2] 응답에 income_growth_status 필드 추가
- [ ] T021 [US2] 캐시 태그에 incomeGrowth 포함

**Checkpoint**: 이 시점에서 User Stories 1 AND 2가 모두 독립적으로 작동해야 함

---

## Phase 5: User Story 3 - 다중 성장성 필터 조합 (Priority: P1)

**Goal**: 매출 성장성 + 수익 성장성 + 수익성 필터를 독립적으로 조합하여 정교한 종목 선별

**Independent Test**: "흑자만" + "매출 성장성" + "수익 성장성" 토글 동시 적용 시 세 조건 모두 만족하는 종목만 표시

### Tests for User Story 3

- [ ] T022 [P] [US3] 필터 조합 API 테스트: `src/app/api/screener/golden-cross/__tests__/filter-combination.test.ts`
- [ ] T023 [P] [US3] URL 파라미터 동기화 테스트: `src/app/screener/golden-cross/__tests__/url-sync.test.ts`

### Implementation for User Story 3

- [ ] T024 [US3] DataWrapper에 revenueGrowth, incomeGrowth 파라미터 전달: `src/app/screener/golden-cross/DataWrapper.tsx`
- [ ] T025 [US3] 캐시 태그 업데이트: `src/app/screener/golden-cross/page.tsx`
- [ ] T026 [US3] API 호출 시 다중 필터 파라미터 전달
- [ ] T027 [US3] 필터 조합 로직 검증

**Checkpoint**: 모든 사용자 스토리가 독립적으로 기능해야 함

---

## Phase 6: User Story 4 - 성장성 필터 UI (Priority: P2)

**Goal**: 매출/수익 성장성 필터를 직관적인 버튼으로 조작할 수 있게 하고 싶습니다

**Independent Test**: 수익성 필터 옆에 성장성 필터들이 배치되고 타원형 버튼 스타일로 직관적인 UI 제공

### Tests for User Story 4

- [ ] T028 [P] [US4] UI 컴포넌트 테스트: `src/app/screener/golden-cross/__tests__/filter-ui.test.tsx`
- [ ] T029 [P] [US4] 버튼 상호작용 테스트: `src/app/screener/golden-cross/__tests__/button-interaction.test.tsx`

### Implementation for User Story 4

- [ ] T030 [US4] GoldenCrossClient에 revenueGrowth, incomeGrowth 상태 추가: `src/app/screener/golden-cross/GoldenCrossClient.tsx`
- [ ] T031 [US4] 수익성 필터 옆에 성장성 필터 버튼들 배치
- [ ] T032 [US4] 타원형 버튼 스타일로 직관적인 UI 구현
- [ ] T033 [US4] 초록색 계열 색상으로 일관성 있는 디자인 적용
- [ ] T034 [US4] 테두리, 커서 포인터, 호버 효과 등 기본적인 상호작용 요소 추가
- [ ] T035 [US4] 필터 변경 핸들러 업데이트

**Checkpoint**: 모든 사용자 스토리가 완전히 기능해야 함

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 여러 사용자 스토리에 영향을 미치는 개선사항

- [ ] T036 [P] TypeScript 타입 정의 업데이트: `src/types/golden-cross.ts`
- [ ] T037 [P] 성능 최적화 (쿼리 실행 계획 분석)
- [ ] T038 [P] 캐시 히트율 모니터링 추가
- [ ] T039 [P] 에러 로깅 개선
- [ ] T040 [P] 코드 정리 및 리팩토링
- [ ] T041 [P] 문서 업데이트 (README.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 - 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 후 - 모든 사용자 스토리 차단
- **User Stories (Phase 3+)**: Foundational 단계 완료 후
  - 사용자 스토리는 병렬로 진행 가능 (인력이 있다면)
  - 또는 우선순위 순서로 순차 진행 (P1 → P2 → P3)
- **Polish (Final Phase)**: 모든 원하는 사용자 스토리 완료 후

### User Story Dependencies

- **User Story 1 (P1)**: Foundational (Phase 2) 후 시작 가능 - 다른 스토리와 의존성 없음
- **User Story 2 (P2)**: Foundational (Phase 2) 후 시작 가능 - US1과 통합 가능하지만 독립적으로 테스트 가능해야 함
- **User Story 3 (P3)**: Foundational (Phase 2) 후 시작 가능 - US1/US2와 통합 가능하지만 독립적으로 테스트 가능해야 함

### Within Each User Story

- 테스트(포함된 경우)는 구현 전에 먼저 작성하고 실패하는지 확인
- 모델 → 서비스 → 엔드포인트 순서
- 핵심 구현 → 통합 순서
- 스토리 완료 후 다음 우선순위로 이동

### Parallel Opportunities

- [P]로 표시된 모든 Setup 작업은 병렬 실행 가능
- [P]로 표시된 모든 Foundational 작업은 병렬 실행 가능 (Phase 2 내에서)
- Foundational 단계 완료 후 모든 사용자 스토리를 병렬로 시작 가능 (팀 용량이 허용한다면)
- [P]로 표시된 사용자 스토리의 모든 테스트는 병렬 실행 가능
- [P]로 표시된 스토리 내 모델들은 병렬 실행 가능
- 다른 사용자 스토리는 다른 팀원이 병렬로 작업 가능

---

## Parallel Example: User Story 1

```bash
# User Story 1의 모든 테스트를 함께 실행:
Task: "API 엔드포인트 테스트: src/app/api/screener/golden-cross/__tests__/route.test.ts"
Task: "매출 연속 상승 계산 로직 테스트: src/utils/__tests__/revenue-growth.test.ts"

# User Story 1의 핵심 구현을 함께 실행:
Task: "API에 revenueGrowth 파라미터 추가: src/app/api/screener/golden-cross/route.ts"
Task: "매출 연속 상승 계산 로직 구현 (LAG 윈도우 함수)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료 (CRITICAL - 모든 스토리 차단)
3. Phase 3: User Story 1 완료
4. **STOP and VALIDATE**: User Story 1을 독립적으로 테스트
5. 배포/데모 준비

### Incremental Delivery

1. Setup + Foundational 완료 → Foundation ready
2. User Story 1 추가 → 독립적으로 테스트 → 배포/데모 (MVP!)
3. User Story 2 추가 → 독립적으로 테스트 → 배포/데모
4. User Story 3 추가 → 독립적으로 테스트 → 배포/데모
5. 각 스토리는 이전 스토리를 깨뜨리지 않고 가치를 추가

### Parallel Team Strategy

여러 개발자가 있는 경우:

1. 팀이 Setup + Foundational을 함께 완료
2. Foundational 완료 후:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. 스토리들이 독립적으로 완료되고 통합

---

## Notes

- [P] 작업 = 다른 파일, 의존성 없음
- [Story] 라벨은 추적 가능성을 위해 특정 사용자 스토리에 작업 매핑
- 각 사용자 스토리는 독립적으로 완료 가능하고 테스트 가능해야 함
- 구현 전에 테스트가 실패하는지 확인
- 각 작업 또는 논리적 그룹 후 커밋
- 모든 체크포인트에서 스토리를 독립적으로 검증
- 피해야 할 것: 모호한 작업, 같은 파일 충돌, 독립성을 깨뜨리는 스토리 간 의존성
