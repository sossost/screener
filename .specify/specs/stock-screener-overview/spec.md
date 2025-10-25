# Stock Screener 프로젝트 명세서

**Branch**: `stock-screener-overview` | **Date**: 2025-10-25 | **Spec**: [link]
**Input**: 기존 Stock Screener 프로젝트 분석 및 문서화

## Summary

Stock Screener는 개인 투자자를 위한 주식 스크리닝 도구로, 기술적 분석과 펀더멘털 분석을 통해 투자 기회를 발견할 수 있는 웹 애플리케이션입니다. 현재 3개의 핵심 스크리너(Golden Cross, Rule of 40, Turn-Around)를 제공하며, Next.js 15 + PostgreSQL + Drizzle ORM 스택으로 구축되어 있습니다.

## User Stories

### Epic 1: Golden Cross 스크리닝

**As a** 개인 투자자  
**I want to** 이동평균선 정배열을 통해 상승 추세 전환을 감지하고 싶습니다  
**So that** 기술적 분석을 바탕으로 매수 타이밍을 포착할 수 있습니다

#### User Story 1.1: 정배열 종목 조회

- **Given** 사용자가 Golden Cross 스크리너에 접근했을 때
- **When** "전체 정배열" 옵션을 선택하면
- **Then** MA20 > MA50 > MA100 > MA200 조건을 만족하는 모든 종목을 볼 수 있어야 합니다

#### User Story 1.2: 최근 전환 종목 조회

- **Given** 사용자가 Golden Cross 스크리너에 접근했을 때
- **When** "최근 전환" 옵션을 선택하면
- **Then** 최근에 정배열로 전환한 종목만 볼 수 있어야 합니다

#### User Story 1.3: 필터링 옵션

- **Given** 사용자가 Golden Cross 스크리너를 사용할 때
- **When** 시총, 최소 가격, 평균 거래량을 설정하면
- **Then** 해당 조건에 맞는 종목만 필터링되어 표시되어야 합니다

### Epic 2: Rule of 40 스크리닝

**As a** 개인 투자자  
**I want to** 성장성과 수익성을 동시에 만족하는 SaaS 기업을 찾고 싶습니다  
**So that** 고성장하면서도 수익성이 좋은 기업에 투자할 수 있습니다

#### User Story 2.1: Rule of 40 계산

- **Given** 사용자가 Rule of 40 스크리너에 접근했을 때
- **When** 스크리너를 실행하면
- **Then** (성장률 + EBITDA 마진) ≥ 40% 조건을 만족하는 기업을 볼 수 있어야 합니다

#### User Story 2.2: 성장률 및 수익성 지표 표시

- **Given** 사용자가 Rule of 40 결과를 볼 때
- **When** 각 기업의 상세 정보를 확인하면
- **Then** TTM 매출 성장률, EBITDA 마진, Rule of 40 점수를 볼 수 있어야 합니다

### Epic 3: Turn-Around 스크리닝

**As a** 개인 투자자  
**I want to** 적자에서 흑자로 전환한 기업을 발견하고 싶습니다  
**So that** 회생하는 기업에 조기 투자할 수 있습니다

#### User Story 3.1: 흑자 전환 감지

- **Given** 사용자가 Turn-Around 스크리너에 접근했을 때
- **When** 스크리너를 실행하면
- **Then** 최근 분기에 흑자로 전환한 기업을 볼 수 있어야 합니다

#### User Story 3.2: 수익성 개선 추적

- **Given** 사용자가 Turn-Around 결과를 볼 때
- **When** 각 기업의 재무 정보를 확인하면
- **Then** 이전 분기 대비 수익성 개선 정도를 볼 수 있어야 합니다

### Epic 4: 데이터 관리

**As a** 시스템 관리자  
**I want to** 주식 데이터를 자동으로 수집하고 관리하고 싶습니다  
**So that** 스크리너가 항상 최신 데이터를 제공할 수 있습니다

#### User Story 4.1: 일일 주가 데이터 수집

- **Given** 시스템이 설정된 시간에 실행될 때
- **When** ETL 작업이 시작되면
- **Then** FMP API에서 최신 주가 데이터를 수집해야 합니다

#### User Story 4.2: 이동평균선 계산

- **Given** 일일 주가 데이터가 수집되었을 때
- **When** 이동평균선 계산 작업이 실행되면
- **Then** MA20, MA50, MA100, MA200을 계산해야 합니다

#### User Story 4.3: 분기별 재무 데이터 수집

- **Given** 분기별 재무 데이터가 업데이트되었을 때
- **When** 재무 데이터 수집 작업이 실행되면
- **Then** 최신 분기별 재무 정보를 수집해야 합니다

## Functional Requirements

### FR1: Golden Cross 스크리너

- **FR1.1**: MA20 > MA50 > MA100 > MA200 정배열 조건 필터링
- **FR1.2**: "전체 정배열" vs "최근 전환" 토글 기능
- **FR1.3**: 시총, 최소 가격, 평균 거래량 필터링
- **FR1.4**: OTC 주식 포함/제외 옵션
- **FR1.5**: 워런트, ETF, 펀드 자동 제외

### FR2: Rule of 40 스크리너

- **FR2.1**: (성장률 + EBITDA 마진) ≥ 40% 조건 계산
- **FR2.2**: TTM 매출 성장률 계산
- **FR2.3**: 최소 시총, 최소 TTM 매출 필터링
- **FR2.4**: ETF, 펀드 제외
- **FR2.5**: Rule of 40 점수 표시

### FR3: Turn-Around 스크리너

- **FR3.1**: 최근 분기 흑자 전환 감지
- **FR3.2**: 이전 분기 대비 수익성 개선 추적
- **FR3.3**: 시총 및 거래소 필터링
- **FR3.4**: 순이익 변화율 계산

### FR4: 데이터 파이프라인

- **FR4.1**: NASDAQ 심볼 자동 수집
- **FR4.2**: 일일 주가 데이터 수집 (최근 20일)
- **FR4.3**: 이동평균선 자동 계산
- **FR4.4**: 분기별 재무 데이터 수집
- **FR4.5**: 재무 비율 데이터 수집
- **FR4.6**: 비정상 종목 자동 정리

### FR5: 사용자 인터페이스

- **FR5.1**: 반응형 웹 디자인 (모바일/데스크톱)
- **FR5.2**: 3개 스크리너 카드 형태 메인 페이지
- **FR5.3**: 실시간 데이터 테이블 표시
- **FR5.4**: 로딩 상태 및 에러 메시지 표시
- **FR5.5**: 필터링 옵션 UI

### FR6: API 설계

- **FR6.1**: RESTful API 엔드포인트 제공
- **FR6.2**: JSON 형식 데이터 응답
- **FR6.3**: 쿼리 파라미터를 통한 필터링
- **FR6.4**: 표준 HTTP 상태 코드 사용
- **FR6.5**: 에러 응답 표준화

## Non-Functional Requirements

### NFR1: 성능

- **NFR1.1**: API 응답 시간 < 2초
- **NFR1.2**: 데이터베이스 쿼리 최적화
- **NFR1.3**: 대용량 데이터 처리 지원 (10,000+ 종목)

### NFR2: 확장성

- **NFR2.1**: 새로운 스크리너 추가 용이성
- **NFR2.2**: 데이터베이스 스키마 확장 가능
- **NFR2.3**: API 버전 관리 지원

### NFR3: 신뢰성

- **NFR3.1**: 데이터 무결성 보장
- **NFR3.2**: API 호출 실패 시 재시도 로직
- **NFR3.3**: 데이터 누락 시 기본값 처리

### NFR4: 보안

- **NFR4.1**: API 키 보안 관리
- **NFR4.2**: 데이터 검증 및 검증
- **NFR4.3**: SQL 인젝션 방지

### NFR5: 유지보수성

- **NFR5.1**: 모듈화된 코드 구조
- **NFR5.2**: TypeScript 타입 안전성
- **NFR5.3**: 테스트 코드 작성

## Technical Constraints

### TC1: 기술 스택

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Data Source**: FMP API
- **Deployment**: Vercel

### TC2: 데이터베이스 설계

- **TC2.1**: 정규화된 스키마 구조
- **TC2.2**: 외래키 제약조건으로 데이터 일관성 보장
- **TC2.3**: 성능 최적화를 위한 인덱스 설계
- **TC2.4**: 유니크 제약조건으로 중복 데이터 방지

### TC3: API 설계

- **TC3.1**: RESTful 원칙 준수
- **TC3.2**: JSON 형식 데이터 교환
- **TC3.3**: 표준 HTTP 메서드 사용
- **TC3.4**: 에러 응답 표준화

## Data Model

### 핵심 엔티티

1. **Symbol**: 주식 심볼 및 기본 정보
2. **DailyPrice**: 일일 주가 데이터
3. **DailyMA**: 이동평균선 데이터
4. **QuarterlyFinancial**: 분기별 재무 데이터
5. **QuarterlyRatio**: 재무 비율 데이터

### 관계

- Symbol 1:N DailyPrice
- Symbol 1:N DailyMA
- Symbol 1:N QuarterlyFinancial
- Symbol 1:N QuarterlyRatio

## API Contracts

### GET /api/screener/golden-cross

**Query Parameters:**

- `justTurned`: boolean (최근 전환 여부)
- `minMcap`: number (최소 시총)
- `minPrice`: number (최소 가격)
- `minAvgVol`: number (최소 평균 거래량)
- `allowOTC`: boolean (OTC 주식 포함 여부)

**Response:**

```json
{
  "data": [
    {
      "symbol": "AAPL",
      "trade_date": "2025-01-27",
      "last_close": "150.00",
      "ma20": "148.50",
      "ma50": "145.20",
      "ma100": "142.80",
      "ma200": "140.10"
    }
  ]
}
```

### GET /api/screener/rule-of-40

**Query Parameters:**

- `minMcap`: number (최소 시총)
- `minTTMRev`: number (최소 TTM 매출)

**Response:**

```json
{
  "data": [
    {
      "symbol": "MSFT",
      "as_of_q": "2024Q4",
      "period_end_date": "2024-12-31",
      "ttm_rev": "211915000000",
      "ttm_op": "88423000000",
      "yoy_ttm_rev_growth_pct": "15.5",
      "ttm_op_margin_pct": "41.7",
      "rule40_score": "57.2",
      "market_cap": "3000000000000"
    }
  ]
}
```

### GET /api/screener/turned-profitable

**Query Parameters:**

- `minMcap`: number (최소 시총)

**Response:**

```json
{
  "data": [
    {
      "symbol": "TSLA",
      "as_of_q": "2024Q4",
      "period_end_date": "2024-12-31",
      "net_income": "15000000000",
      "net_income_prev": "-1000000000",
      "net_income_change_pct": "1600.0",
      "market_cap": "800000000000"
    }
  ]
}
```

## Testing Strategy

### 단위 테스트

- 비즈니스 로직 테스트
- API 엔드포인트 테스트
- 유틸리티 함수 테스트
- 데이터 검증 로직 테스트

### 통합 테스트

- ETL 파이프라인 테스트
- 데이터베이스 쿼리 테스트
- API 통합 테스트
- 외부 API 연동 테스트

### E2E 테스트

- 사용자 시나리오 테스트
- 스크리너 기능 테스트
- 성능 테스트
- 에러 핸들링 테스트

## Deployment & Operations

### 배포 환경

- **Platform**: Vercel
- **Database**: PostgreSQL (클라우드)
- **Environment**: Production, Staging

### 모니터링

- API 응답 시간 모니터링
- 데이터베이스 성능 모니터링
- 에러율 모니터링
- 데이터 수집 상태 모니터링

### 로깅

- API 호출 로그
- 에러 로그
- 성능 메트릭
- 데이터 수집 로그

## Future Enhancements

### 기능 개선

- 더 많은 스크리닝 전략 추가
- 사용자 맞춤 필터 저장
- 알림 기능 추가
- 포트폴리오 추적 기능

### 기술 개선

- 실시간 데이터 스트리밍
- 머신러닝 기반 추천 시스템
- 모바일 앱 개발
- 캐싱 전략 개선

## Constitution Compliance

이 프로젝트는 다음 Constitution 원칙을 준수합니다:

1. **Data-First Architecture**: 모든 기능이 데이터 중심으로 설계됨
2. **API-Driven Development**: RESTful API로 모든 기능 노출
3. **Test-First**: TDD 원칙에 따른 테스트 우선 개발
4. **Real-Time Data Integrity**: 실시간 데이터 무결성 보장
5. **Performance & Scalability**: 대용량 데이터 처리 최적화
6. **Financial Data Accuracy**: 금융 데이터 정확성 최우선

---

**Version**: 1.0.0 | **Created**: 2025-10-25 | **Last Updated**: 2025-10-25
