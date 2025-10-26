# 스크리너 API 캐싱 구현 계획

**Branch**: `api-caching` | **Date**: 2025-10-26 | **Plan**: [link]  
**Input**: 종가 기준 스크리너 데이터에 대한 캐싱 시스템 구현

## Technical Context

### Current System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Client/Browser │    │   Next.js API   │    │   PostgreSQL    │
│                 │───▶│                 │───▶│                 │
│ - Golden Cross  │    │ - Route Handler │    │ - daily_ma      │
│ - Rule of 40    │    │ - SQL Query     │    │ - daily_prices  │
│ - Profitable    │    │ - JSON Response │    │ - quarterly_fin │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     매번 DB 조회           매번 쿼리 실행          복잡한 집계 쿼리
     (500ms~2s)            (무캐싱)               (부하 높음)
```

### Target Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Client/Browser │    │   Next.js API   │    │   PostgreSQL    │
│                 │───▶│   with Cache    │───▶│                 │
│ - Golden Cross  │    │                 │    │ - daily_ma      │
│ - Rule of 40    │    │ ┌─────────────┐ │    │ - daily_prices  │
│ - Profitable    │    │ │ Revalidate  │ │    │ - quarterly_fin │
└─────────────────┘    │ │ 24h Cache   │ │    └─────────────────┘
     캐시 히트           │ └─────────────┘ │
     (<100ms)          │        │        │
                       │        ▼        │
                       │ ┌─────────────┐ │
                       │ │ ETL 완료 시   │ │
                       │ │ 캐시 무효화    │ │
                       │ └─────────────┘ │
                       └─────────────────┘
```

## Constitution Check

### Performance-First ✅

- 캐시 히트 시 100ms 이하 응답 시간 목표
- 데이터베이스 부하 50% 감소
- 사용자 경험 향상

### Data Integrity ✅

- ETL 완료 후 자동 캐시 무효화로 최신 데이터 보장
- 종가 기준 데이터 특성에 최적화된 캐싱 전략
- 캐시 실패 시에도 정상 동작 (Graceful Degradation)

### Modular & Maintainable ✅

- 단계적 구현 (Phase 1 → 2 → 3)
- 기존 API 인터페이스 변경 없음
- 환경별 독립적 설정 가능

## Project Structure

```
src/
├── app/
│   └── api/
│       ├── screener/
│       │   ├── golden-cross/
│       │   │   └── route.ts          # + revalidate 추가
│       │   ├── rule-of-40/
│       │   │   └── route.ts          # + revalidate 추가
│       │   └── turned-profitable/
│       │       └── route.ts          # + revalidate 추가
│       └── cache/
│           ├── revalidate/
│           │   └── route.ts          # NEW: 캐시 무효화 API
│           └── stats/
│               └── route.ts          # NEW: 캐시 통계 API
├── lib/
│   └── cache-stats.ts                # NEW: 캐시 통계 수집
└── etl/
    └── jobs/
        ├── load-daily-prices.ts      # + 캐시 무효화 호출
        ├── build-daily-ma.ts         # + 캐시 무효화 호출
        └── load-ratios.ts            # + 캐시 무효화 호출

.github/
└── workflows/
    ├── etl-daily.yml                 # + 캐시 무효화 단계
    └── etl-weekly.yml                # + 캐시 무효화 단계

.env
+ CACHE_REVALIDATE_SECRET             # 캐시 무효화 API 인증
+ CACHE_ENABLED=true                  # 캐시 활성화 여부
```

## Research

### Next.js Caching Mechanisms

1. **Data Cache (Route Handler)**

   - `export const revalidate = 86400` (24시간)
   - 서버 사이드 캐싱
   - 빌드 타임/런타임 모두 지원

2. **On-Demand Revalidation**

   - `revalidateTag('cache-key')`
   - `revalidatePath('/api/screener/golden-cross')`
   - ETL 완료 후 프로그래밍 방식으로 캐시 무효화

3. **Cache Tags**
   - 태그 기반 캐시 그룹화
   - 여러 API를 한 번에 무효화 가능

### Caching Best Practices

1. **Cache Key Design**

   - URL + Query Parameters 조합
   - 정렬된 파라미터로 일관성 보장

2. **TTL Strategy**

   - 일일 데이터: 24시간
   - 분기 데이터: 24시간 이상 가능
   - ETL 스케줄과 동기화

3. **Cache Invalidation**
   - Time-based: 자동 만료
   - Event-based: ETL 완료 시 무효화
   - Manual: 수동 무효화 API

## Data Models

### Cache Entry (내부)

```typescript
// Next.js가 자동 관리
interface CacheEntry {
  key: string; // API path + query params
  data: any; // 응답 데이터
  tags?: string[]; // 캐시 태그
  revalidate: number; // TTL (초)
  cachedAt: number; // 캐시 생성 시각
}
```

### Cache Stats

```typescript
interface CacheStats {
  apiName: string;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number; // %
  avgHitResponseTime: number; // ms
  avgMissResponseTime: number; // ms
  lastUpdated: Date;
}
```

## API Contracts

### Cache Revalidation API

```typescript
// POST /api/cache/revalidate
// Authorization: Bearer <CACHE_REVALIDATE_SECRET>

interface RevalidateRequest {
  tags?: string[]; // 무효화할 태그들
  paths?: string[]; // 무효화할 경로들
}

interface RevalidateResponse {
  success: boolean;
  revalidated: string[]; // 무효화된 캐시 목록
  timestamp: Date;
}
```

### Cache Stats API

```typescript
// GET /api/cache/stats

interface CacheStatsResponse {
  overall: {
    totalRequests: number;
    cacheHits: number;
    hitRate: number;
  };
  byAPI: CacheStats[];
}
```

## Implementation Phases

### Phase 1: 기본 캐싱 (P1) - Day 1

**목표**: Next.js Route Handler의 `revalidate` 설정으로 간단한 캐싱 구현

**Tasks**:

1. 캐시 상수 정의 파일 생성 (`src/lib/cache-config.ts`)
2. Golden Cross API에 캐싱 적용
3. Rule of 40 API에 캐싱 적용
4. Turned Profitable API에 캐싱 적용
5. 로컬 환경에서 캐싱 동작 테스트
6. Vercel 배포 후 프로덕션 테스트

**Deliverables**:

- `/src/lib/cache-config.ts` (신규 - 캐시 설정 상수)
- `/src/app/api/screener/golden-cross/route.ts` (수정)
- `/src/app/api/screener/rule-of-40/route.ts` (수정)
- `/src/app/api/screener/turned-profitable/route.ts` (수정)
- 테스트 결과 문서

**Success Criteria**:

- 같은 URL 재요청 시 캐시 히트 확인
- 응답 헤더에 `Cache-Control`, `Age` 표시
- 응답 시간 100ms 이하 (캐시 히트 시)
- 데이터베이스 쿼리 로그에서 두 번째 요청 시 쿼리 미실행 확인

### Phase 2: ETL 연동 캐시 무효화 (P2) - Day 2-3

**목표**: ETL 완료 시 Next.js의 `revalidateTag` 또는 `revalidatePath`를 사용하여 캐시 무효화

**Tasks**:

1. 각 API에 cache tag 추가
2. 캐시 무효화 API 엔드포인트 생성 (`/api/cache/revalidate`)
3. ETL 스크립트에 캐시 무효화 호출 추가
4. GitHub Actions 워크플로우에 캐시 무효화 단계 추가
5. 인증 시크릿 설정 및 보안 검증

**Deliverables**:

- `/src/app/api/screener/*/route.ts` (태그 추가)
- `/src/app/api/cache/revalidate/route.ts` (신규)
- `/src/etl/jobs/*.ts` (캐시 무효화 호출 추가)
- `/.github/workflows/etl-daily.yml` (수정)
- `/.github/workflows/etl-weekly.yml` (수정)
- 환경 변수 설정 가이드

**Success Criteria**:

- ETL 실행 전후로 API 응답 데이터 변경 확인
- 로그에서 캐시 무효화 이벤트 확인
- 캐시 무효화 API가 인증 없이 호출 불가 확인
- ETL 실패 시에도 다음 스케줄에 정상 동작

### Phase 3: 캐시 모니터링 (P3) - Day 4+

**목표**: 캐시 성능 메트릭 수집 및 모니터링 대시보드

**Tasks**:

1. 캐시 통계 수집 로직 구현
2. 캐시 통계 API 엔드포인트 생성
3. ETL 대시보드에 캐시 통계 섹션 추가
4. 캐시 히트율 알림 설정 (선택)

**Deliverables**:

- `/src/app/api/cache/stats/route.ts` (신규)
- `/src/lib/cache-stats.ts` (신규)
- `/src/app/etl/page.tsx` (캐시 통계 UI 추가)

**Success Criteria**:

- 대시보드에서 실시간 히트율 확인 가능
- API별 캐시 성능 비교 가능
- 평균 응답 시간 추적
- 캐시 효율성 메트릭 시각화

## Risk Mitigation

### Technical Risks

1. **Vercel 배포 시 캐시 동작 다름**

   - 로컬 개발과 프로덕션 환경 차이
   - 완화: Vercel 문서 참고, Preview 배포로 사전 테스트

2. **캐시 키 폭발 (많은 필터 조합)**

   - 사용자가 다양한 필터 사용 시 캐시 많아짐
   - 완화: 주요 필터 조합만 캐싱, LRU 정책

3. **ETL 중 캐시 불일치**

   - ETL 진행 중 API 호출 시 중간 상태 데이터
   - 완화: ETL 완료 후에만 캐시 무효화

4. **캐시 무효화 실패**
   - API 호출 실패 시 오래된 캐시 유지
   - 완화: Time-based 만료로 최대 24시간 내 갱신 보장

### Operational Risks

1. **개발 환경에서 캐시 문제**

   - 개발 시 캐시 때문에 변경사항 확인 어려움
   - 완화: `CACHE_ENABLED=false` 환경 변수

2. **캐시 무효화 시크릿 유출**

   - 악의적 캐시 무효화 가능
   - 완화: GitHub Secrets 사용, IP 화이트리스트 (선택)

3. **성능 측정 어려움**
   - 캐시 효과 정량화 어려움
   - 완화: Phase 3 통계 시스템으로 메트릭 수집

## Testing Strategy

### Unit Tests

- 캐시 키 생성 로직 테스트
- 캐시 무효화 API 인증 테스트

### Integration Tests

- API 응답 캐싱 테스트
- ETL 후 캐시 무효화 테스트
- 캐시 만료 동작 테스트

### Performance Tests

- 캐시 히트 시 응답 시간 측정
- 동시 요청 시 캐시 동작 확인
- Cache Stampede 시나리오 테스트

## Deployment Strategy

### Development

```bash
# 캐시 비활성화
CACHE_ENABLED=false yarn dev

# 또는 캐시 활성화 (짧은 TTL)
CACHE_ENABLED=true yarn dev
```

### Staging (Vercel Preview)

- Preview 배포로 캐싱 동작 확인
- ETL 수동 실행으로 무효화 테스트
- 캐시 헤더 검증

### Production

- 메인 브랜치 머지 후 자동 배포
- GitHub Secrets에 `CACHE_REVALIDATE_SECRET` 설정
- 첫 24시간 모니터링

## Monitoring and Maintenance

### Key Metrics

1. **성능 메트릭**

   - 평균 응답 시간 (히트/미스 별도)
   - 캐시 히트율 (목표: 60% 이상)
   - API별 캐시 효율

2. **운영 메트릭**
   - 데이터베이스 쿼리 수 (캐싱 전/후 비교)
   - 캐시 무효화 성공률
   - ETL 완료 후 캐시 갱신 시간

### Maintenance Tasks

1. **일일**: 캐시 히트율 확인
2. **주간**: 캐시 성능 분석, 최적화 검토
3. **월간**: 캐시 전략 리뷰, TTL 조정 검토

### Alert Conditions

- 캐시 히트율 < 40% (1주일 평균)
- 캐시 무효화 실패 > 3회 연속
- 응답 시간 > 500ms (캐시 히트 시)

---

**Version**: 1.0.0 | **Created**: 2025-10-26 | **Last Updated**: 2025-10-26
