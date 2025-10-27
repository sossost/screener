# Feature Specification: Golden Cross 스크리너 성장성 필터 기능 강화

**Feature Branch**: `feature/golden-cross-growth-filters-enhancement`  
**Created**: 2025-01-27  
**Status**: In Progress  
**Input**: Golden Cross 스크리너에 매출/수익 성장성 필터 추가 및 차트 데이터 8분기로 확장

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 매출 성장성 필터로 종목 선별 (Priority: P1)

투자자가 Golden Cross 정배열 조건을 만족하는 종목 중에서 **연속 N분기 매출 성장** 기업을 선별하여 성장 모멘텀을 가진 종목을 찾을 수 있어야 합니다.

**Why this priority**:

- 기술적 지표(이동평균)와 재무 성장성(매출 증가)을 결합한 분석
- 지속적인 성장 기업을 필터링하여 장기 투자 가치 확보
- 성장 모멘텀과 기술적 신호의 시너지 효과

**Independent Test**:

- 매출 성장 필터 선택 시 연속 N분기 매출 증가 종목만 표시
- 연속 분기 수 설정 (2~8분기) 가능
- 기본값 3분기로 설정
- 데이터베이스 쿼리 결과와 화면 표시 일치 확인

**Acceptance Scenarios**:

1. **Given** Golden Cross 페이지 접속, **When** "매출 성장" 필터 선택, **Then** 연속 3분기 매출 증가 기업만 표시
2. **Given** 매출 성장 필터 선택된 상태, **When** 연속 분기 수를 5로 변경, **Then** 연속 5분기 매출 증가 기업만 표시
3. **Given** 매출 성장 필터 선택된 상태, **When** 필터 해제, **Then** 모든 Golden Cross 종목 표시
4. **Given** 매출 데이터 부족한 종목, **When** 매출 성장 필터 선택, **Then** 해당 종목은 표시되지 않음

---

### User Story 2 - 수익 성장성 필터로 종목 선별 (Priority: P1)

투자자가 Golden Cross 정배열 조건을 만족하는 종목 중에서 **연속 N분기 수익(EPS) 성장** 기업을 선별하여 수익성과 성장성을 동시에 갖춘 종목을 찾을 수 있어야 합니다.

**Why this priority**:

- 기술적 지표(이동평균)와 수익성 성장(EPS 증가)을 결합한 분석
- 지속적인 수익성 개선 기업을 필터링하여 안정적 성장 확보
- 수익성과 성장성의 이중 필터링으로 고품질 종목 선별

**Independent Test**:

- 수익 성장 필터 선택 시 연속 N분기 EPS 증가 종목만 표시
- 연속 분기 수 설정 (2~8분기) 가능
- 기본값 3분기로 설정
- 데이터베이스 쿼리 결과와 화면 표시 일치 확인

**Acceptance Scenarios**:

1. **Given** Golden Cross 페이지 접속, **When** "수익 성장" 필터 선택, **Then** 연속 3분기 EPS 증가 기업만 표시
2. **Given** 수익 성장 필터 선택된 상태, **When** 연속 분기 수를 4로 변경, **Then** 연속 4분기 EPS 증가 기업만 표시
3. **Given** 수익 성장 필터 선택된 상태, **When** 필터 해제, **Then** 모든 Golden Cross 종목 표시
4. **Given** EPS 데이터 부족한 종목, **When** 수익 성장 필터 선택, **Then** 해당 종목은 표시되지 않음

---

### User Story 3 - 8분기 재무 차트로 트렌드 분석 (Priority: P2)

투자자가 선택한 종목의 **최근 8분기 매출 및 EPS 트렌드**를 시각적으로 분석하여 성장 패턴과 안정성을 파악할 수 있어야 합니다.

**Why this priority**:

- 4분기 → 8분기로 확장하여 더 긴 기간의 트렌드 분석 가능
- 성장 지속성과 안정성을 더 정확하게 평가
- 분기별 변동성과 추세를 시각적으로 확인

**Independent Test**:

- 테이블에 8분기 매출 및 EPS 막대 차트 표시
- 마우스 호버 시 분기별 수치 표시
- 차트 크기와 색상이 일관되게 표시
- 데이터 부족 시 적절한 처리

**Acceptance Scenarios**:

1. **Given** Golden Cross 페이지 접속, **When** 종목 목록 확인, **Then** 각 종목별 8분기 매출/EPS 차트 표시
2. **Given** 차트 표시된 상태, **When** 마우스 호버, **Then** 해당 분기 수치 툴팁 표시
3. **Given** 데이터 부족한 종목, **When** 차트 확인, **Then** "-" 또는 빈 차트로 표시
4. **Given** 음수 데이터, **When** 차트 확인, **Then** 음수는 빨간색으로 구분 표시

---

### User Story 4 - 복합 필터 조합으로 정밀 선별 (Priority: P2)

투자자가 **매출 성장 + 수익 성장 + 수익성** 필터를 조합하여 고품질 성장 기업을 정밀하게 선별할 수 있어야 합니다.

**Why this priority**:

- 다중 필터 조합으로 더 정교한 종목 선별
- 성장성과 수익성을 동시에 만족하는 우량 기업 발굴
- 투자 리스크 최소화 및 수익성 극대화

**Independent Test**:

- 매출 성장 + 수익 성장 + 흑자 필터 동시 적용
- 각 필터의 독립적 동작 확인
- 필터 조합에 따른 결과 집합 변화 확인

**Acceptance Scenarios**:

1. **Given** 모든 성장 필터 선택, **When** 5분기 연속 성장 설정, **Then** 모든 조건을 만족하는 종목만 표시
2. **Given** 복합 필터 적용된 상태, **When** 일부 필터 해제, **Then** 해당 조건이 제외된 결과 표시
3. **Given** 복합 필터 적용된 상태, **When** 필터 초기화, **Then** 모든 Golden Cross 종목 표시

## Functional Requirements

### FR1: 매출 성장성 필터

- **Description**: 연속 N분기 매출 증가 기업을 필터링
- **Input**: 연속 분기 수 (2~8, 기본값 3)
- **Logic**: 분기별 매출 순차 비교하여 연속 성장 분기 수 계산
- **Output**: 조건을 만족하는 종목만 표시

### FR2: 수익 성장성 필터

- **Description**: 연속 N분기 EPS 증가 기업을 필터링
- **Input**: 연속 분기 수 (2~8, 기본값 3)
- **Logic**: 분기별 EPS 순차 비교하여 연속 성장 분기 수 계산
- **Output**: 조건을 만족하는 종목만 표시

### FR3: 8분기 재무 차트

- **Description**: 최근 8분기 매출 및 EPS 트렌드 시각화
- **Input**: 분기별 재무 데이터 (매출, EPS)
- **Logic**: 막대 차트로 분기별 수치 표시, 호버 시 툴팁
- **Output**: 시각적 트렌드 차트

### FR4: 필터 UI/UX

- **Description**: 직관적이고 사용하기 쉬운 필터 인터페이스
- **Input**: 체크박스 + 숫자 입력 필드
- **Logic**: 필터 활성화 시에만 분기 수 입력 가능
- **Output**: 명확한 필터 상태 표시

## Non-Functional Requirements

### NFR1: 성능

- **Response Time**: 필터 적용 시 3초 이내 응답
- **Data Volume**: 최대 8분기 × 1000개 종목 데이터 처리
- **Caching**: 필터별 캐시 태그로 효율적 캐싱

### NFR2: 사용성

- **Accessibility**: 키보드 네비게이션 지원
- **Responsive**: 모바일/태블릿 대응
- **Intuitive**: 필터 상태가 명확하게 표시

### NFR3: 데이터 품질

- **Accuracy**: 데이터베이스 쿼리 결과와 화면 표시 일치
- **Completeness**: 데이터 부족 시 적절한 처리
- **Consistency**: 필터 적용 시 일관된 결과

## API Contract

**Request Parameters**:

- `revenueGrowth`: 매출 성장 필터 활성화 여부 (boolean)
- `revenueGrowthQuarters`: 매출 성장 연속 분기 수 (2-8, 기본값 3)
- `incomeGrowth`: 수익 성장 필터 활성화 여부 (boolean)
- `incomeGrowthQuarters`: 수익 성장 연속 분기 수 (2-8, 기본값 3)
- 기존 필터들: `justTurned`, `lookbackDays`, `minMcap`, `minPrice`, `minAvgVol`, `allowOTC`, `profitability`

**Response Format**:

- `data`: Golden Cross 조건을 만족하는 종목 배열
- 각 종목은 `revenue_growth_quarters`, `income_growth_quarters` 필드 포함
- `quarterly_financials`: 최근 8분기 재무 데이터 (매출, 순이익, EPS)
- `totalCount`: 필터링된 종목 수
- `trade_date`: 데이터 기준일

## Database Schema Changes

**기존 테이블 활용**:

- `quarterly_financials` 테이블의 기존 컬럼 활용
- 추가 컬럼 생성 없이 기존 데이터로 연속 성장 계산
- `revenue`, `eps_diluted` 필드를 사용하여 성장성 분석

**데이터 요구사항**:

- 최근 8분기 재무 데이터 필요
- 매출(`revenue`) 및 EPS(`eps_diluted`) 데이터의 연속성 확인
- 분기별 순차적 비교를 통한 연속 성장 분기 수 계산

## UI/UX Requirements

### 필터 섹션

- 매출 성장 필터: 체크박스 + 분기 수 입력 (2-8)
- 수익 성장 필터: 체크박스 + 분기 수 입력 (2-8)
- 필터 비활성화 시 입력 필드 비활성화
- 기존 필터들과 일관된 디자인

### 테이블 섹션

- 8분기 매출 차트 컬럼 (기존 4분기에서 확장)
- 8분기 EPS 차트 컬럼 (기존 4분기에서 확장)
- 차트 호버 시 분기별 수치 툴팁
- 음수 데이터는 빨간색으로 구분 표시

### 반응형 디자인

- 모바일: 필터 세로 배치, 차트 크기 조정
- 태블릿: 필터 가로 배치, 적절한 차트 크기
- 데스크톱: 최적화된 레이아웃

## Success Metrics

### 기능적 성공 지표

- [ ] 매출 성장 필터 정상 작동 (연속 3분기 기본값)
- [ ] 수익 성장 필터 정상 작동 (연속 3분기 기본값)
- [ ] 8분기 차트 정상 표시
- [ ] 복합 필터 조합 정상 작동

### 성능 지표

- [ ] 필터 적용 시 응답 시간 3초 이내
- [ ] 1000개 종목 데이터 처리 가능
- [ ] 캐시 효율성 90% 이상

### 사용성 지표

- [ ] 필터 UI 직관성 (사용자 테스트 통과)
- [ ] 모바일 반응형 정상 작동
- [ ] 접근성 가이드라인 준수

## Dependencies

### 내부 의존성

- 기존 Golden Cross 스크리너 기능
- `quarterly_financials` 테이블 데이터
- 기존 캐싱 시스템

### 외부 의존성

- 재무 데이터 제공 API
- 데이터베이스 성능 (쿼리 최적화 필요)

## Risks & Mitigation

### 기술적 리스크

- **복잡한 SQL 쿼리로 인한 성능 저하**
  - _Mitigation_: 인덱스 최적화, 쿼리 튜닝
- **8분기 데이터 부족으로 인한 빈 결과**
  - _Mitigation_: 데이터 유효성 검사, 적절한 에러 처리

### 사용자 경험 리스크

- **필터 조합으로 인한 결과 집합 축소**
  - _Mitigation_: 필터 상태 명확 표시, 초기화 기능
- **모바일에서 차트 가독성 저하**
  - _Mitigation_: 반응형 디자인, 터치 최적화

## Out of Scope

- 실시간 데이터 업데이트 (기존 일일 배치 유지)
- 추가 재무 지표 필터 (현재 매출, EPS만)
- 차트 상호작용 기능 (현재 호버 툴팁만)
- 데이터 내보내기 기능
