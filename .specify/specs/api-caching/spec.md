# Feature Specification: 스크리너 API 캐싱

**Feature Branch**: `feature/api-caching`  
**Created**: 2025-10-26  
**Status**: Draft
**Input**: 종가 기준 스크리너 데이터에 대한 캐싱 시스템 구현

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 빠른 페이지 로딩 (Priority: P1)

사용자가 스크리너 페이지(Golden Cross, Rule of 40, Turned Profitable)를 방문했을 때, 데이터베이스 쿼리 없이 캐시된 결과를 즉시 받아 빠르게 화면을 볼 수 있어야 합니다.

**Why this priority**:

- 사용자 경험의 핵심 요소
- 데이터베이스 부하 감소로 운영 비용 절감
- 종가 기반 데이터는 장 마감 후 변경되지 않으므로 캐싱에 이상적
- 즉시 구현 가능하며 효과가 명확함

**Independent Test**:

- 같은 필터 조건으로 스크리너 API를 2번 연속 호출했을 때, 두 번째 응답이 첫 번째보다 최소 10배 이상 빠르게 반환되는지 확인
- 네트워크 탭에서 캐시 헤더 확인 (Cache-Control, Age)
- 데이터베이스 쿼리 로그에서 두 번째 요청 시 쿼리가 실행되지 않았는지 확인

**Acceptance Scenarios**:

1. **Given** Golden Cross 페이지에 아무도 접속하지 않은 상태, **When** 사용자가 Golden Cross 페이지를 처음 방문, **Then** DB에서 데이터를 조회하고 캐시에 저장하며 결과를 반환
2. **Given** 1분 전에 다른 사용자가 같은 필터로 조회한 상태, **When** 새로운 사용자가 같은 필터로 조회, **Then** 캐시에서 즉시 데이터를 반환하고 응답 시간이 100ms 이하
3. **Given** Rule of 40 페이지 캐시가 있는 상태, **When** 사용자가 다른 필터 파라미터로 조회, **Then** 새로운 필터에 대해 DB 조회 후 캐시 저장
4. **Given** 24시간 전 캐시된 데이터, **When** 사용자가 조회, **Then** 만료된 캐시는 무시하고 새로 DB 조회 후 캐시 갱신

---

### User Story 2 - ETL 완료 후 자동 캐시 갱신 (Priority: P2)

ETL 작업이 완료되면 기존 캐시가 자동으로 무효화되어, 사용자가 항상 최신 데이터를 볼 수 있어야 합니다.

**Why this priority**:

- 데이터 정확성 보장
- 사용자가 수동으로 새로고침할 필요 없음
- ETL 스케줄과 캐시 전략의 통합

**Independent Test**:

- ETL 작업 실행 전후로 API 호출하여 데이터가 다른지 확인
- ETL 완료 후 캐시 키가 업데이트되었는지 확인
- 로그에서 캐시 무효화 이벤트 확인

**Acceptance Scenarios**:

1. **Given** 오전 6시 이전 캐시된 Golden Cross 데이터, **When** 오전 6시 ETL(daily-prices) 완료, **Then** 캐시가 자동으로 무효화되고 다음 요청 시 새 데이터 조회
2. **Given** 오전 8시 이전 캐시된 이동평균 데이터, **When** 오전 8시 ETL(daily-ma) 완료, **Then** 캐시 무효화 및 갱신
3. **Given** 주말 캐시된 Rule of 40 데이터, **When** 월요일 분기 재무 데이터 ETL 완료, **Then** 분기 데이터 기반 스크리너의 캐시 무효화

---

### User Story 3 - 캐시 상태 모니터링 (Priority: P3)

운영자가 캐시 히트율, 만료 시간, 저장된 키 목록을 모니터링하여 캐싱 전략의 효과를 측정하고 최적화할 수 있어야 합니다.

**Why this priority**:

- 운영 및 최적화에 필요하지만 기능 동작에는 필수 아님
- 추후 캐싱 전략 개선을 위한 데이터 수집
- 개발 초기보다는 운영 안정화 후 필요

**Independent Test**:

- `/api/cache/stats` 엔드포인트 호출하여 캐시 통계 확인
- 캐시 히트율이 정상 범위(예: 60% 이상)인지 검증
- 로깅 시스템에서 캐시 관련 메트릭 추출 가능한지 확인

**Acceptance Scenarios**:

1. **Given** 캐시가 동작 중인 상태, **When** 운영자가 `/api/cache/stats` 호출, **Then** 총 요청 수, 히트 수, 미스 수, 히트율 반환
2. **Given** 여러 스크리너 API 사용 중, **When** 통계 조회, **Then** API별 캐시 히트율을 개별적으로 확인 가능
3. **Given** 캐시에 저장된 키들, **When** 운영자가 특정 캐시 키를 수동 삭제, **Then** 해당 키의 캐시만 제거되고 다른 캐시는 유지

---

### Edge Cases

- **ETL 실행 중 API 요청**: ETL이 데이터를 업데이트하는 동안 API 요청이 오면 이전 캐시를 제공하거나 ETL 완료까지 대기할지 결정 필요
- **필터 파라미터 조합 폭발**: 사용자가 다양한 필터 조합을 사용하면 캐시 키가 무한히 증가할 수 있음 → 캐시 크기 제한 및 LRU 정책 필요
- **캐시 저장 실패**: 캐시 저장 중 오류 발생 시에도 API 응답은 정상적으로 반환되어야 함 (캐시는 best-effort)
- **시간대 차이**: ETL은 UTC 기준이지만 사용자는 한국 시간대 → 캐시 만료 시간 계산 시 시간대 고려
- **동시 요청 (Cache Stampede)**: 캐시 만료 직후 여러 요청이 동시에 들어와 모두 DB를 조회하는 문제 → Lock 또는 Stale-While-Revalidate 전략

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 시스템은 각 스크리너 API(`/api/screener/golden-cross`, `/api/screener/rule-of-40`, `/api/screener/turned-profitable`)의 응답을 캐시해야 함
- **FR-002**: 캐시 키는 API 경로와 쿼리 파라미터 조합으로 생성되어야 함 (예: `golden-cross:justTurned=true&lookbackDays=10`)
- **FR-003**: Golden Cross 캐시는 24시간 후 자동 만료되어야 함
- **FR-004**: Rule of 40 및 Turned Profitable 캐시는 24시간 후 자동 만료되어야 함 (분기 데이터이므로 더 길게 가능)
- **FR-005**: ETL 작업(`daily-prices`, `daily-ma`, `quarterly-financials`)이 완료되면 관련 API의 캐시가 무효화되어야 함
- **FR-006**: 캐시 저장 실패 시에도 API는 정상적으로 데이터를 반환해야 함
- **FR-007**: 동일 요청에 대한 캐시 히트 시 응답 시간은 100ms 이하여야 함
- **FR-008**: 시스템은 Next.js의 `revalidate` 또는 `unstable_cache` API를 활용해야 함

### Non-Functional Requirements

- **NFR-001**: 캐시 구현은 단계적으로 진행 가능해야 함 (Phase 1: revalidate → Phase 2: unstable_cache → Phase 3: Redis)
- **NFR-002**: 기존 API 인터페이스는 변경되지 않아야 함 (하위 호환성)
- **NFR-003**: 캐시 로직은 API 핸들러에 투명하게 적용되어야 함
- **NFR-004**: 개발/프로덕션 환경에서 캐시 동작을 독립적으로 제어 가능해야 함

### Key Entities

- **CacheKey**: API 경로 + 쿼리 파라미터로 구성된 고유 식별자

  - 형식: `{api-name}:{sorted-query-params}`
  - 예: `golden-cross:allowOTC=false&justTurned=true&lookbackDays=10&minAvgVol=1000000&minMcap=100000000&minPrice=5`

- **CacheEntry**: 캐시된 데이터와 메타데이터

  - `key`: CacheKey
  - `data`: API 응답 데이터 (JSON)
  - `cachedAt`: 캐시 생성 시각 (ISO 8601)
  - `expiresAt`: 캐시 만료 시각 (ISO 8601)
  - `etag`: 데이터 버전 (옵션, ETL 실행 횟수 기반)

- **CacheStats**: 캐시 성능 메트릭
  - `totalRequests`: 총 요청 수
  - `cacheHits`: 캐시 히트 수
  - `cacheMisses`: 캐시 미스 수
  - `hitRate`: 히트율 (%)
  - `avgHitResponseTime`: 캐시 히트 시 평균 응답 시간 (ms)
  - `avgMissResponseTime`: 캐시 미스 시 평균 응답 시간 (ms)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 캐시 히트 시 API 응답 시간이 100ms 이하
- **SC-002**: 캐시 히트율이 평균 60% 이상 (운영 1주일 후 측정)
- **SC-003**: 데이터베이스 쿼리 수가 캐싱 전 대비 50% 이상 감소
- **SC-004**: ETL 완료 후 5분 이내에 모든 관련 캐시가 무효화됨
- **SC-005**: 캐시 관련 장애 발생 시에도 API는 정상 동작 (Graceful Degradation)
- **SC-006**: P1 기능(기본 캐싱) 구현 및 배포 완료: 1일 이내
- **SC-007**: P2 기능(ETL 연동) 구현 및 배포 완료: 3일 이내

## Implementation Plan _(optional)_

### Phase 1: 기본 캐싱 (P1) - Day 1 ✅ 완료

**목표**: Next.js fetch tags를 사용한 캐싱 및 무효화 구현

**작업 내역**:

1. 캐시 설정 상수 파일 생성 (`src/lib/cache-config.ts`)
2. 서버 컴포넌트에서 fetch tags 기반 캐싱 구현
3. 캐시 무효화 API 생성 (`/api/cache/revalidate`)
4. 클라이언트 필터 변경 시 캐시 무효화 처리
5. nuqs를 사용한 URL 상태 관리
6. input blur/Enter 이벤트로 불필요한 리패치 방지
7. Next.js 15 searchParams async 처리

**변경 파일**:

- `/src/lib/cache-config.ts` (신규 - 캐시 설정 상수)
- `/src/app/api/screener/golden-cross/route.ts` (캐시 TTL 적용)
- `/src/app/api/screener/rule-of-40/route.ts` (캐시 TTL 적용)
- `/src/app/api/screener/turned-profitable/route.ts` (캐시 TTL 적용)
- `/src/app/api/cache/revalidate/route.ts` (신규 - 캐시 무효화 API)
- `/src/app/screener/golden-cross/page.tsx` (fetch tags, searchParams async)
- `/src/app/screener/golden-cross/GoldenCrossClient.tsx` (nuqs, 캐시 무효화)
- `/src/app/layout.tsx` (NuqsAdapter 추가)

**성공 기준**:

- 같은 URL 재요청 시 캐시 히트 확인
- 응답 시간 100ms 이하
- 필터 변경 시 이전 캐시 무효화 및 새 데이터 fetch
- 기간 입력 시 blur/Enter로만 리패치

### Phase 2: ETL 연동 캐시 무효화 (P2) - Day 2-3 ⏳ 대기 중

**목표**: ETL 완료 시 자동으로 캐시 무효화하여 최신 데이터 반영

**작업 내역**:

1. ETL 스크립트 수정하여 완료 후 `/api/cache/revalidate` 호출
2. GitHub Actions 워크플로우에 캐시 무효화 단계 추가
3. 환경 변수 `CACHE_REVALIDATE_SECRET` 설정

**변경 파일**:

- `/src/etl/jobs/*.ts` (ETL 완료 후 API 호출 추가)
- `/.github/workflows/etl-daily.yml`
- `/.github/workflows/etl-weekly.yml`

**성공 기준**:

- ETL 실행 전후로 API 응답 데이터 변경 확인
- 로그에서 캐시 무효화 이벤트 확인

**Note**: Phase 1에서 캐시 무효화 API는 이미 구현되었으며, 클라이언트 필터 변경 시 활용 중

### Phase 3: 캐시 모니터링 (P3) - Day 4+

**목표**: 캐시 성능 메트릭 수집 및 모니터링 대시보드

**작업 내역**:

1. 캐시 통계 수집 로직 구현
2. `/api/cache/stats` 엔드포인트 생성
3. ETL 대시보드에 캐시 통계 섹션 추가

**변경 파일**:

- `/src/app/api/cache/stats/route.ts` (신규)
- `/src/lib/cache-stats.ts` (신규)
- `/src/app/etl/page.tsx` (캐시 통계 UI 추가)

**성공 기준**:

- 대시보드에서 실시간 히트율 확인 가능
- API별 캐시 성능 비교 가능

### Future Enhancements (Optional)

- **Redis 캐싱**: Vercel KV 또는 외부 Redis 사용하여 더 강력한 캐싱
- **Stale-While-Revalidate**: 만료된 캐시를 제공하면서 백그라운드에서 갱신
- **Partial Caching**: 필터 없는 기본 쿼리만 캐시하고 클라이언트에서 필터링
- **Cache Warming**: ETL 완료 후 주요 필터 조합에 대해 미리 캐시 생성

## Technical Considerations _(optional)_

### Cache Key 설계

쿼리 파라미터를 정렬하여 일관된 캐시 키 생성:

```typescript
function getCacheKey(apiName: string, searchParams: URLSearchParams): string {
  const sortedParams = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return `${apiName}:${sortedParams}`;
}
```

### Revalidation Strategy

- **Time-based**: `revalidate = 86400` (24시간)
- **On-demand**: ETL 완료 후 `revalidateTag()` 호출
- **Stale-While-Revalidate**: 만료 후에도 이전 캐시 제공하며 백그라운드 갱신

### ETL 완료 후 캐시 무효화 플로우

```
ETL Job (GitHub Actions)
  └─> ETL 스크립트 실행
      └─> 성공 시 POST /api/cache/revalidate
          └─> revalidateTag('golden-cross')
              └─> Next.js가 다음 요청 시 재생성
```

### Environment Variables

```env
# 캐시 관련 설정
CACHE_ENABLED=true                    # 캐시 활성화 여부
CACHE_TTL_SECONDS=86400              # 기본 TTL (24시간)
CACHE_REVALIDATE_SECRET=xxx          # 캐시 무효화 API 인증 시크릿
```

## Open Questions _(optional)_

1. **Q**: 캐시 크기 제한을 어떻게 설정할 것인가?

   - **A**: Phase 1에서는 Next.js 기본 캐싱 사용 (자동 관리), Phase 3에서 Redis 도입 시 100MB 제한 검토

2. **Q**: 서버 재시작 시 캐시가 모두 사라지는데 괜찮은가?

   - **A**: Phase 1에서는 허용 (Vercel 배포 시 캐시 유지됨), 문제 발생 시 Phase 3에서 Redis로 해결

3. **Q**: 개발 환경에서도 캐시를 활성화할 것인가?
   - **A**: 환경 변수로 제어, 개발 시에는 `CACHE_ENABLED=false` 권장

## References _(optional)_

- [Next.js Data Cache](https://nextjs.org/docs/app/building-your-application/caching#data-cache)
- [Next.js revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [Vercel Edge Config](https://vercel.com/docs/storage/edge-config)
- [HTTP Caching: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

---

**Note**: 이 스펙은 Draft 상태이며, 구현 과정에서 발견되는 요구사항에 따라 업데이트될 수 있습니다.
