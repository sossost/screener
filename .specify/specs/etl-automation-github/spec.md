# ETL 자동화 시스템 명세서 (GitHub Actions 기반)

**Branch**: `etl-automation-github` | **Date**: 2025-01-27 | **Spec**: [link]
**Input**: GitHub Actions를 활용한 ETL 자동화 시스템 구축

## Summary

기존의 수동 ETL 작업을 GitHub Actions를 활용한 자동화 시스템으로 전환하여, 안정적이고 확장 가능한 데이터 파이프라인을 구축합니다.

## Background

현재 Stock Screener 프로젝트는 다음과 같은 ETL 작업들을 수동으로 실행하고 있습니다:

- NASDAQ 심볼 로드
- 일일 주가 데이터 수집
- 이동평균선 계산
- 재무 비율 데이터 수집

이러한 작업들을 자동화하여 데이터의 신선도를 보장하고 운영 효율성을 높여야 합니다.

## Goals

### Primary Goals

1. **자동화된 ETL 파이프라인**: GitHub Actions를 통한 스케줄 기반 자동 실행
2. **안정적인 데이터 수집**: 에러 처리 및 재시도 로직 구현
3. **확장 가능한 아키텍처**: 새로운 ETL 작업 추가 용이성
4. **모니터링 및 알림**: 실행 상태 추적 및 실패 시 알림

### Secondary Goals

1. **비용 효율성**: GitHub Actions 무료 티어 활용
2. **개발자 경험**: 간단한 설정 및 관리
3. **데이터 품질**: 검증 로직 및 데이터 무결성 보장

## Requirements

### Functional Requirements

#### FR1: 스케줄 기반 자동 실행

- **FR1.1**: 매일 오전 6시(UTC) 일일 주가 데이터 수집
- **FR1.2**: 매일 오전 8시 이동평균선 계산
- **FR1.3**: 매주 월요일 자정 NASDAQ 심볼 업데이트
- **FR1.4**: 매주 일요일 오전 7시 재무 비율 데이터 수집

#### FR2: 에러 처리 및 재시도

- **FR2.1**: API 호출 실패 시 최대 3회 재시도
- **FR2.2**: 데이터베이스 연결 실패 시 재시도
- **FR2.3**: 임계치 초과 시 워크플로우 중단

#### FR3: 데이터 검증

- **FR3.1**: 수집된 데이터의 기본 유효성 검사
- **FR3.2**: 누락된 데이터 감지 및 로깅
- **FR3.3**: 데이터 일관성 검사

#### FR4: 모니터링 및 알림

- **FR4.1**: 워크플로우 실행 상태 추적
- **FR4.2**: 실패 시 GitHub Issues 자동 생성
- **FR4.3**: 실행 로그 및 메트릭 수집

### Non-Functional Requirements

#### NFR1: 성능

- **NFR1.1**: 전체 ETL 파이프라인 6시간 이내 완료
- **NFR1.2**: API 호출 제한 준수 (초당 5회 이하)
- **NFR1.3**: 데이터베이스 배치 처리 최적화

#### NFR2: 안정성

- **NFR2.1**: 99% 이상의 워크플로우 성공률
- **NFR2.2**: 부분 실패 시에도 다른 작업 계속 실행
- **NFR2.3**: 데이터 손실 방지

#### NFR3: 보안

- **NFR3.1**: API 키 및 데이터베이스 연결 정보 보안
- **NFR3.2**: GitHub Secrets 활용
- **NFR3.3**: 최소 권한 원칙 적용

## User Stories

### US1: 데이터 엔지니어로서

**As a** 데이터 엔지니어  
**I want** ETL 작업이 자동으로 실행되도록  
**So that** 수동 개입 없이 최신 데이터를 확보할 수 있다

### US2: 개발자로서

**As a** 개발자  
**I want** ETL 실행 상태를 모니터링할 수 있도록  
**So that** 문제 발생 시 빠르게 대응할 수 있다

### US3: 시스템 관리자로서

**As a** 시스템 관리자  
**I want** ETL 실패 시 알림을 받도록  
**So that** 시스템 안정성을 유지할 수 있다

## Technical Context

### Current ETL Jobs

1. **load-nasdaq-symbols.ts**: NASDAQ 거래소 심볼 목록 수집
2. **load-daily-prices.ts**: 일일 주가 데이터 수집
3. **build-daily-ma.ts**: 이동평균선 계산
4. **load-ratios.ts**: 재무 비율 데이터 수집

### Technology Stack

- **CI/CD**: GitHub Actions
- **Runtime**: Node.js 18+
- **Database**: PostgreSQL with Drizzle ORM
- **API**: Financial Modeling Prep API
- **Language**: TypeScript

### Constraints

- GitHub Actions 무료 티어 제한 (월 2,000분)
- FMP API 호출 제한 (월 250,000회)
- 데이터베이스 연결 풀 제한

## Success Criteria

### Primary Success Criteria

1. **자동화 달성**: 모든 ETL 작업이 스케줄에 따라 자동 실행
2. **안정성 달성**: 30일 연속 95% 이상 성공률
3. **성능 달성**: 전체 파이프라인 6시간 이내 완료
4. **모니터링 달성**: 실시간 상태 추적 및 알림 시스템

### Secondary Success Criteria

1. **비용 효율성**: GitHub Actions 무료 티어 내에서 운영
2. **확장성**: 새로운 ETL 작업 추가 시 1시간 이내 설정
3. **개발자 경험**: 설정 변경 시 5분 이내 배포

## Out of Scope

- 실시간 데이터 스트리밍
- 복잡한 데이터 변환 로직
- 다중 데이터 소스 통합
- 고급 데이터 품질 관리
- 사용자 인터페이스

## Dependencies

### External Dependencies

- Financial Modeling Prep API 서비스
- GitHub Actions 서비스
- PostgreSQL 데이터베이스

### Internal Dependencies

- 기존 ETL 스크립트들
- 데이터베이스 스키마
- 환경 변수 설정

## Risks and Mitigations

### Risk 1: GitHub Actions 제한

- **Risk**: 월 2,000분 제한 초과
- **Mitigation**: 배치 크기 최적화 및 불필요한 작업 제거

### Risk 2: API 제한

- **Risk**: FMP API 호출 제한 초과
- **Mitigation**: 요청 간격 조절 및 캐싱 전략

### Risk 3: 데이터베이스 부하

- **Risk**: 동시 연결 수 초과
- **Mitigation**: 연결 풀 관리 및 배치 처리

### Risk 4: 비용 증가

- **Risk**: GitHub Actions 유료 플랜 필요
- **Mitigation**: 효율적인 스케줄링 및 최적화

## Acceptance Criteria

### AC1: 자동 실행

- [ ] 모든 ETL 작업이 설정된 스케줄에 따라 자동 실행
- [ ] 수동 트리거도 가능
- [ ] 실행 상태가 GitHub Actions에서 확인 가능

### AC2: 에러 처리

- [ ] API 호출 실패 시 재시도 로직 작동
- [ ] 데이터베이스 오류 시 적절한 에러 메시지
- [ ] 워크플로우 실패 시 GitHub Issue 자동 생성

### AC3: 데이터 품질

- [ ] 수집된 데이터의 기본 유효성 검사 통과
- [ ] 누락된 데이터 감지 및 로깅
- [ ] 데이터 일관성 검사 통과

### AC4: 모니터링

- [ ] 워크플로우 실행 상태 실시간 추적
- [ ] 실행 로그 및 메트릭 수집
- [ ] 실패 시 알림 발송

### AC5: 성능

- [ ] 전체 ETL 파이프라인 6시간 이내 완료
- [ ] API 호출 제한 준수
- [ ] 데이터베이스 성능 최적화

## Implementation Notes

### Phase 1: 기본 워크플로우 설정

- GitHub Actions 워크플로우 파일 생성
- 기본 ETL 작업 실행 로직 구현
- 환경 변수 및 시크릿 설정

### Phase 2: 에러 처리 및 재시도

- 재시도 로직 구현
- 에러 핸들링 개선
- 로깅 시스템 구축

### Phase 3: 모니터링 및 알림

- 상태 추적 시스템 구현
- 알림 메커니즘 구축
- 메트릭 수집 및 분석

### Phase 4: 최적화 및 확장

- 성능 최적화
- 새로운 ETL 작업 추가
- 문서화 및 가이드 작성

---

**Version**: 1.0.0 | **Created**: 2025-01-27 | **Last Updated**: 2025-01-27
