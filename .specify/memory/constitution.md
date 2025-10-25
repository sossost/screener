# Stock Screener Constitution

## Core Principles

### I. Data-First Architecture

모든 기능은 데이터 중심으로 설계되어야 함. 스크리닝 로직은 독립적인 라이브러리로 분리하고, 데이터 처리 파이프라인은 모듈화되어야 함. ETL 작업들은 각각 독립적으로 실행 가능하고 테스트 가능해야 함.

### II. API-Driven Development

모든 스크리닝 기능은 RESTful API로 노출되어야 함. API는 JSON 형식으로 데이터를 주고받으며, 에러는 표준 HTTP 상태 코드로 처리. 클라이언트와 서버의 명확한 분리 유지.

### III. Test-First (NON-NEGOTIABLE)

TDD 필수: 테스트 작성 → 사용자 승인 → 테스트 실패 → 구현. Red-Green-Refactor 사이클 엄격 적용. 특히 금융 데이터 처리 로직은 반드시 단위 테스트와 통합 테스트 필요.

### IV. Real-Time Data Integrity

실시간 데이터 처리 시 데이터 무결성 보장. API 호출 실패, 데이터 누락, 잘못된 계산에 대한 견고한 에러 핸들링. 데이터 검증과 정규화 과정 필수.

### V. Performance & Scalability

대량의 주식 데이터 처리에 최적화. 데이터베이스 쿼리 최적화, 캐싱 전략, 비동기 처리 활용. 사용자 경험을 위한 빠른 응답 시간 보장.

### VI. Financial Data Accuracy

금융 데이터의 정확성은 최우선. 모든 계산 로직은 검증 가능하고 추적 가능해야 함. 데이터 소스 변경 시 영향도 분석 필수.

## Technology Stack Requirements

### Core Technologies

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **Database**: PostgreSQL + Drizzle ORM
- **Data Source**: FMP API
- **Deployment**: Vercel

### Data Processing Standards

- ETL 작업은 TypeScript로 작성
- 모든 데이터 변환은 검증 가능한 스키마 사용
- 에러 로깅과 모니터링 필수
- 데이터 백업 및 복구 계획 수립

## Development Workflow

### Code Quality Gates

- 모든 PR은 TypeScript 타입 체크 통과 필수
- ESLint 규칙 준수
- 데이터베이스 스키마 변경 시 마이그레이션 스크립트 제공
- API 엔드포인트는 OpenAPI 스펙 문서화

### Testing Requirements

- 단위 테스트: 모든 비즈니스 로직
- 통합 테스트: API 엔드포인트
- E2E 테스트: 주요 사용자 시나리오
- 성능 테스트: 대용량 데이터 처리

### Deployment Process

- 모든 변경사항은 스테이징 환경에서 검증
- 데이터베이스 마이그레이션은 롤백 가능해야 함
- API 버전 관리 및 하위 호환성 유지

## Governance

이 constitution은 모든 개발 관행을 지배하며, 수정 시에는 다음이 필요함:

- 변경 사유의 명시적 문서화
- 프로젝트 유지보수자의 검토 및 승인
- 하위 호환성 영향도 평가
- 마이그레이션 계획 수립

모든 PR과 코드 리뷰는 이 constitution 준수를 검증해야 하며, 복잡성은 반드시 정당화되어야 함.

**Version**: 1.0.0 | **Ratified**: 2025-10-25 | **Last Amended**: 2025-10-25
