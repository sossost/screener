# ETL 자동화 시스템 구현 계획 (GitHub Actions 기반)

**Branch**: `etl-automation-github` | **Date**: 2025-01-27 | **Plan**: [link]
**Input**: ETL 자동화 시스템 명세서 기반 기술 구현 계획

## Technical Context

### Current System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FMP API       │    │   ETL Scripts   │    │   PostgreSQL    │
│                 │───▶│                 │───▶│                 │
│ - Symbols       │    │ - load-symbols  │    │ - symbols       │
│ - Prices        │    │ - load-prices   │    │ - daily_prices  │
│ - Ratios        │    │ - build-ma      │    │ - daily_ma      │
│ - Historical    │    │ - load-ratios   │    │ - ratios        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Target Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ GitHub Actions  │    │   ETL Scripts   │    │   PostgreSQL    │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Scheduler   │ │───▶│ │ Enhanced    │ │───▶│ │ Database    │ │
│ │ (Cron)      │ │    │ │ Scripts     │ │    │ │ with        │ │
│ └─────────────┘ │    │ │ with        │ │    │ │ Monitoring  │ │
│                 │    │ │ Error       │ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ │ Handling    │ │    │                 │
│ │ Monitoring  │ │    │ └─────────────┘ │    │ ┌─────────────┐ │
│ │ & Alerts    │ │    │                 │    │ │ Logs        │ │
│ └─────────────┘ │    │ ┌─────────────┐ │    │ │ & Metrics   │ │
└─────────────────┘    │ │ Validation  │ │    │ └─────────────┘ │
                       │ │ & Retry     │ │    └─────────────────┘
                       │ └─────────────┘ │
                       └─────────────────┘
```

## Constitution Check

### Data-First Architecture ✅

- 모든 ETL 작업이 데이터 중심으로 설계됨
- 데이터 품질 검증 로직 포함
- 데이터 무결성 보장

### Modular Design ✅

- 각 ETL 작업이 독립적으로 실행 가능
- 재사용 가능한 유틸리티 함수
- 명확한 책임 분리

### Error Handling ✅

- 포괄적인 에러 처리 및 재시도 로직
- 실패 시 적절한 알림 및 로깅
- 부분 실패 시에도 다른 작업 계속 실행

## Project Structure

```
.github/
└── workflows/
    ├── etl-daily.yml          # 일일 ETL 파이프라인
    ├── etl-weekly.yml         # 주간 ETL 파이프라인
    └── etl-manual.yml         # 수동 실행 워크플로우

src/
├── etl/
│   ├── jobs/
│   │   ├── load-nasdaq-symbols.ts
│   │   ├── load-daily-prices.ts
│   │   ├── build-daily-ma.ts
│   │   └── load-ratios.ts
│   ├── utils/
│   │   ├── retry.ts           # 재시도 로직
│   │   ├── validation.ts      # 데이터 검증
│   │   ├── monitoring.ts      # 모니터링
│   │   └── notifications.ts   # 알림
│   └── config/
│       └── etl-config.ts      # ETL 설정
└── app/
    └── api/
        └── etl/
            ├── status/        # ETL 상태 API
            └── logs/          # 로그 조회 API
```

## Research

### GitHub Actions Best Practices

1. **Matrix Strategy**: 여러 Node.js 버전에서 테스트
2. **Caching**: 의존성 및 빌드 결과 캐싱
3. **Secrets Management**: 환경 변수 보안 관리
4. **Conditional Execution**: 조건부 워크플로우 실행
5. **Artifact Management**: 로그 및 결과물 저장

### ETL Optimization Strategies

1. **Batch Processing**: 대량 데이터 처리 최적화
2. **Parallel Execution**: 병렬 처리로 성능 향상
3. **Connection Pooling**: 데이터베이스 연결 최적화
4. **Rate Limiting**: API 호출 제한 준수
5. **Error Recovery**: 부분 실패 시 복구 로직

### Monitoring and Alerting

1. **GitHub Actions Status**: 워크플로우 실행 상태 추적
2. **Custom Metrics**: 데이터 품질 및 성능 메트릭
3. **Slack Integration**: 실패 시 Slack 알림
4. **Email Notifications**: 중요 이벤트 이메일 알림
5. **Dashboard**: ETL 상태 대시보드

## Data Models

### ETL Execution Log

```typescript
interface ETLExecution {
  id: string;
  jobName: string;
  startTime: Date;
  endTime?: Date;
  status: "running" | "completed" | "failed";
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}
```

### ETL Job Configuration

```typescript
interface ETLJobConfig {
  name: string;
  schedule: string;
  timeout: number;
  retryCount: number;
  dependencies: string[];
  environment: Record<string, string>;
}
```

### Data Quality Metrics

```typescript
interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  missingFields: string[];
  duplicateRecords: number;
  dataFreshness: Date;
}
```

## API Contracts

### ETL Status API

```typescript
// GET /api/etl/status
interface ETLStatusResponse {
  overallStatus: "healthy" | "degraded" | "failed";
  lastExecution: Date;
  nextExecution: Date;
  jobs: {
    name: string;
    status: "success" | "failed" | "running";
    lastRun: Date;
    nextRun: Date;
  }[];
}
```

### ETL Logs API

```typescript
// GET /api/etl/logs?job=symbols&limit=100
interface ETLLogsResponse {
  logs: {
    timestamp: Date;
    level: "info" | "warn" | "error";
    message: string;
    metadata?: Record<string, any>;
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
```

## Implementation Phases

### Phase 1: 기본 워크플로우 설정 (Week 1)

**목표**: GitHub Actions 기반 기본 ETL 파이프라인 구축

**Tasks**:

1. GitHub Actions 워크플로우 파일 생성
2. 기본 ETL 작업 실행 로직 구현
3. 환경 변수 및 시크릿 설정
4. 기본 에러 처리 구현

**Deliverables**:

- `.github/workflows/etl-daily.yml`
- `.github/workflows/etl-weekly.yml`
- 기본 ETL 스크립트 개선
- 환경 변수 설정 가이드

**Success Criteria**:

- 모든 ETL 작업이 GitHub Actions에서 실행
- 기본 에러 처리 작동
- 환경 변수 보안 관리

### Phase 2: 에러 처리 및 재시도 (Week 2)

**목표**: 안정적인 에러 처리 및 재시도 로직 구현

**Tasks**:

1. 재시도 로직 구현
2. 데이터 검증 로직 추가
3. 로깅 시스템 구축
4. 부분 실패 처리

**Deliverables**:

- `src/etl/utils/retry.ts`
- `src/etl/utils/validation.ts`
- `src/etl/utils/monitoring.ts`
- 향상된 에러 처리

**Success Criteria**:

- API 호출 실패 시 재시도 작동
- 데이터 검증 로직 통과
- 상세한 로깅 및 모니터링

### Phase 3: 모니터링 및 알림 (Week 3)

**목표**: 실시간 모니터링 및 알림 시스템 구축

**Tasks**:

1. ETL 상태 API 구현
2. 로그 조회 API 구현
3. Slack 알림 통합
4. 이메일 알림 설정

**Deliverables**:

- `src/app/api/etl/status/route.ts`
- `src/app/api/etl/logs/route.ts`
- `src/etl/utils/notifications.ts`
- 알림 시스템 설정

**Success Criteria**:

- 실시간 ETL 상태 추적
- 실패 시 즉시 알림
- 로그 조회 및 분석 가능

### Phase 4: 최적화 및 확장 (Week 4)

**목표**: 성능 최적화 및 확장성 개선

**Tasks**:

1. 성능 최적화
2. 새로운 ETL 작업 추가
3. 문서화 및 가이드 작성
4. 모니터링 대시보드 구축

**Deliverables**:

- 최적화된 ETL 스크립트
- 새로운 ETL 작업 예시
- 운영 가이드 문서
- 모니터링 대시보드

**Success Criteria**:

- 전체 파이프라인 6시간 이내 완료
- 새로운 ETL 작업 쉽게 추가
- 완전한 문서화 및 가이드

## Risk Mitigation

### Technical Risks

1. **GitHub Actions 제한**: 배치 크기 최적화 및 불필요한 작업 제거
2. **API 제한**: 요청 간격 조절 및 캐싱 전략
3. **데이터베이스 부하**: 연결 풀 관리 및 배치 처리
4. **메모리 부족**: 스트리밍 처리 및 청크 단위 처리

### Operational Risks

1. **비용 증가**: 효율적인 스케줄링 및 최적화
2. **데이터 손실**: 백업 및 복구 전략
3. **보안 위험**: 시크릿 관리 및 접근 제어
4. **의존성 문제**: 버전 고정 및 테스트

## Testing Strategy

### Unit Tests

- 각 ETL 스크립트의 개별 함수 테스트
- 유틸리티 함수 테스트
- 데이터 검증 로직 테스트

### Integration Tests

- 전체 ETL 파이프라인 테스트
- 데이터베이스 연동 테스트
- API 호출 테스트

### End-to-End Tests

- GitHub Actions 워크플로우 테스트
- 알림 시스템 테스트
- 모니터링 시스템 테스트

## Deployment Strategy

### Development Environment

- 로컬 개발 환경 설정
- 테스트 데이터베이스 사용
- 개발용 API 키 사용

### Staging Environment

- GitHub Actions 테스트 워크플로우
- 스테이징 데이터베이스 사용
- 제한된 API 호출

### Production Environment

- 프로덕션 GitHub Actions 워크플로우
- 프로덕션 데이터베이스 사용
- 전체 API 할당량 사용

## Monitoring and Maintenance

### Key Metrics

1. **성능 메트릭**: 실행 시간, 처리량, 성공률
2. **품질 메트릭**: 데이터 유효성, 누락률, 중복률
3. **운영 메트릭**: 리소스 사용량, 비용, 가용성

### Maintenance Tasks

1. **일일**: ETL 실행 상태 확인
2. **주간**: 성능 메트릭 분석
3. **월간**: 비용 및 사용량 검토
4. **분기**: 시스템 최적화 및 개선

---

**Version**: 1.0.0 | **Created**: 2025-01-27 | **Last Updated**: 2025-01-27
