# 스크리너 API 캐싱 작업 목록

**Branch**: `api-caching` | **Date**: 2025-10-26 | **Tasks**: [link]  
**Input**: 스크리너 API 캐싱 구현 계획 기반 상세 작업 목록

## User Story 1: 빠른 페이지 로딩 (P1)

### US1.0: 캐시 설정 상수 정의

- [x] **T1.0.1**: 캐시 설정 파일 생성 ✅

  ```typescript
  // src/lib/cache-config.ts

  /**
   * 시간 단위 상수 (초)
   * 프로젝트 전체에서 재사용 가능
   */
  export const TIME = {
    ONE_MINUTE: 60,
    FIVE_MINUTES: 5 * 60,
    ONE_HOUR: 60 * 60,
    ONE_DAY: 60 * 60 * 24,
    ONE_WEEK: 7 * 60 * 60 * 24,
  } as const;

  /**
   * 캐시 TTL 설정 (초 단위)
   */
  export const CACHE_TTL = {
    // 일일 주가 데이터 기반 스크리너 (종가 기준, 하루 1회 갱신)
    GOLDEN_CROSS: TIME.ONE_DAY,

    // 분기별 재무 데이터 기반 스크리너 (분기 1회 갱신)
    RULE_OF_40: TIME.ONE_DAY,
    TURNED_PROFITABLE: TIME.ONE_DAY,
  } as const;

  /**
   * 캐시 태그 정의
   */
  export const CACHE_TAGS = {
    GOLDEN_CROSS: "golden-cross",
    DAILY_DATA: "daily-data",
    QUARTERLY_DATA: "quarterly-data",
    RULE_OF_40: "rule-of-40",
    TURNED_PROFITABLE: "turned-profitable",
  } as const;
  ```

  - 파일: `/src/lib/cache-config.ts` (신규)
  - TIME 상수로 시간 단위 재사용 가능
  - API별 캐시 전략 문서화
  - 향후 조정 용이 (TIME.ONE_HOUR, TIME.ONE_WEEK 등)

### US1.1: Golden Cross API 캐싱

- [x] **T1.1.1**: `route.ts`에 캐싱 설정 추가 ✅

  ```typescript
  import { CACHE_TTL } from "@/lib/cache-config";

  // 캐싱 설정: 24시간 (종가 기준 데이터, 하루 1회 갱신)
  export const revalidate = CACHE_TTL.GOLDEN_CROSS;
  ```

  - 파일: `/src/app/api/screener/golden-cross/route.ts`
  - 위치: import 문 다음, GET 함수 위
  - 매직 넘버 대신 명확한 상수 사용

- [ ] **T1.1.2**: 로컬 환경에서 캐싱 동작 테스트

  - `yarn dev` 실행
  - API 호출 2회 연속 (같은 파라미터)
  - 응답 시간 비교 (첫 번째 vs 두 번째)
  - 브라우저 개발자 도구에서 Cache 헤더 확인

- [ ] **T1.1.3**: 캐시 동작 검증
  - 첫 요청: 데이터베이스 쿼리 실행 확인
  - 두 번째 요청: 쿼리 미실행 확인
  - 응답 데이터 동일성 확인
  - 성능 개선 측정 (예: 1500ms → 80ms)

### US1.2: Rule of 40 API 캐싱

- [x] **T1.2.1**: `route.ts`에 캐싱 설정 추가 ✅

  ```typescript
  import { CACHE_TTL } from "@/lib/cache-config";

  // 캐싱 설정: 24시간 (분기별 재무 데이터 기반)
  export const revalidate = CACHE_TTL.RULE_OF_40;
  ```

  - 파일: `/src/app/api/screener/rule-of-40/route.ts`
  - 위치: import 문 다음, GET 함수 위
  - 명확한 상수 사용으로 가독성 향상

- [ ] **T1.2.2**: 로컬 환경에서 캐싱 동작 테스트

  - 다양한 필터 조합 테스트
  - `minRule40`, `minYoY`, `minMcap` 등 파라미터 변경
  - 각 파라미터 조합별로 캐시 독립 동작 확인

- [ ] **T1.2.3**: 캐시 키 정합성 확인
  - 같은 파라미터: 캐시 히트
  - 다른 파라미터: 캐시 미스 (새로운 쿼리)
  - 파라미터 순서 다를 때 동작 확인

### US1.3: Turned Profitable API 캐싱

- [x] **T1.3.1**: `route.ts`에 캐싱 설정 추가 ✅

  ```typescript
  import { CACHE_TTL } from "@/lib/cache-config";

  // 캐싱 설정: 24시간 (분기별 재무 데이터 기반)
  export const revalidate = CACHE_TTL.TURNED_PROFITABLE;
  ```

  - 파일: `/src/app/api/screener/turned-profitable/route.ts`
  - 위치: import 문 다음, GET 함수 위
  - 명확한 상수 사용으로 가독성 향상

- [ ] **T1.3.2**: 로컬 환경에서 캐싱 동작 테스트

  - `requireOCF`, `epsCap`, `minMcap` 등 파라미터 테스트
  - dedupe 옵션 변경 시 캐시 동작 확인

- [ ] **T1.3.3**: 전체 스크리너 API 통합 테스트
  - 세 개 API 모두 캐싱 동작 확인
  - 서로 다른 캐시로 독립 동작 확인
  - 메모리 사용량 확인

### US1.4: Vercel 배포 및 프로덕션 테스트

- [ ] **T1.4.1**: Vercel에 Preview 배포

  - 기능 브랜치 푸시
  - Vercel Preview URL 확인
  - 프로덕션 환경과 동일한 설정 적용

- [ ] **T1.4.2**: 프로덕션 환경에서 캐시 동작 검증

  - 응답 헤더 확인:
    - `Cache-Control: s-maxage=86400, stale-while-revalidate`
    - `Age: 0` (첫 요청) → `Age: 120` (2분 후)
  - CDN 캐싱과의 상호작용 확인

- [ ] **T1.4.3**: 성능 측정 및 기록
  - 캐시 미스 시 평균 응답 시간 측정
  - 캐시 히트 시 평균 응답 시간 측정
  - 개선율 계산 및 문서화

---

## User Story 2: ETL 완료 후 자동 캐시 갱신 (P2)

### US2.1: 캐시 태그 추가

- [ ] **T2.1.1**: Golden Cross API에 캐시 태그 추가

  ```typescript
  import { CACHE_TTL, CACHE_TAGS } from "@/lib/cache-config";

  export const revalidate = CACHE_TTL.GOLDEN_CROSS;
  export const tags = [CACHE_TAGS.GOLDEN_CROSS, CACHE_TAGS.DAILY_DATA];
  ```

  - 파일: `/src/app/api/screener/golden-cross/route.ts`
  - 태그도 상수로 관리하여 오타 방지

- [ ] **T2.1.2**: Rule of 40 API에 캐시 태그 추가

  ```typescript
  import { CACHE_TTL, CACHE_TAGS } from "@/lib/cache-config";

  export const revalidate = CACHE_TTL.RULE_OF_40;
  export const tags = [CACHE_TAGS.RULE_OF_40, CACHE_TAGS.QUARTERLY_DATA];
  ```

  - 파일: `/src/app/api/screener/rule-of-40/route.ts`
  - 분기 데이터 기반이므로 `QUARTERLY_DATA` 태그 추가

- [ ] **T2.1.3**: Turned Profitable API에 캐시 태그 추가

  ```typescript
  import { CACHE_TTL, CACHE_TAGS } from "@/lib/cache-config";

  export const revalidate = CACHE_TTL.TURNED_PROFITABLE;
  export const tags = [CACHE_TAGS.TURNED_PROFITABLE, CACHE_TAGS.QUARTERLY_DATA];
  ```

  - 파일: `/src/app/api/screener/turned-profitable/route.ts`

- [ ] **T2.1.4**: 태그 설계 문서화
  - 각 태그의 의미와 사용처 정리
  - ETL 작업과 태그 매핑 문서화
  - 예: `daily-ma` ETL → `golden-cross` 태그 무효화

### US1.5: 서버 컴포넌트에 fetch tags 캐싱 구현 (신규)

- [x] **T1.5.1**: Golden Cross 페이지에 fetch tags 추가 ✅

  ```typescript
  // src/app/screener/golden-cross/page.tsx
  async function fetchGoldenCrossData(searchParams: SearchParams) {
    const justTurned = searchParams.justTurned === "true";
    const lookbackDays = searchParams.lookbackDays || "10";

    // 캐시 태그 생성 (필터별로 다른 태그)
    const cacheTag = `golden-cross-${justTurned}-${lookbackDays}`;

    const response = await fetch(
      `${baseUrl}/api/screener/golden-cross?${params}`,
      {
        next: {
          revalidate: 60 * 60 * 24, // 24시간 캐싱
          tags: [CACHE_TAGS.GOLDEN_CROSS, cacheTag],
        },
      }
    );
  }
  ```

  - 파일: `/src/app/screener/golden-cross/page.tsx`
  - 필터별로 독립적인 캐시 태그 생성
  - Next.js 15 searchParams Promise 타입 처리 (`await searchParams`)

- [x] **T1.5.2**: nuqs 설치 및 설정 ✅

  ```bash
  yarn add nuqs
  ```

  ```typescript
  // src/app/layout.tsx
  import { NuqsAdapter } from "nuqs/adapters/next/app";

  export default function RootLayout({ children }) {
    return (
      <html>
        <body>
          <NuqsAdapter>{children}</NuqsAdapter>
        </body>
      </html>
    );
  }
  ```

- [x] **T1.5.3**: 클라이언트 컴포넌트에 nuqs 통합 ✅

  ```typescript
  // src/app/screener/golden-cross/GoldenCrossClient.tsx
  import { useQueryState, parseAsBoolean, parseAsInteger } from "nuqs";
  import { useState } from "react";

  const [justTurned, setJustTurned] = useQueryState(
    "justTurned",
    parseAsBoolean.withDefault(false)
  );
  const [lookbackDays, setLookbackDays] = useQueryState(
    "lookbackDays",
    parseAsInteger.withDefault(10)
  );

  // 로컬 input 상태 (입력 중에는 리패치 안함)
  const [inputValue, setInputValue] = useState(lookbackDays.toString());
  ```

  - URL 쿼리 파라미터를 상태로 직접 관리
  - blur/Enter 이벤트로 불필요한 리패치 방지

### US2.2: 캐시 무효화 API 구현

- [x] **T2.2.1**: 캐시 무효화 API 엔드포인트 생성 ✅

  ```typescript
  // src/app/api/cache/revalidate/route.ts
  import { revalidateTag } from "next/cache";

  export async function POST(request: NextRequest) {
    const { tag } = await request.json();
    revalidateTag(tag);
    return NextResponse.json({ success: true, revalidated: tag });
  }
  ```

  - 파일: `/src/app/api/cache/revalidate/route.ts` (신규)
  - 메서드: POST
  - ~~인증: Bearer Token~~ (일단 생략, Phase 2에서 추가)

- [ ] **T2.2.2**: 요청 스키마 정의 및 검증

  ```typescript
  interface RevalidateRequest {
    tags?: string[]; // 무효화할 태그들
    paths?: string[]; // 무효화할 경로들
  }
  ```

  - Zod 또는 TypeScript 타입 가드 사용
  - 잘못된 요청 형식 시 400 응답

- [ ] **T2.2.3**: 인증 로직 구현

  ```typescript
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CACHE_REVALIDATE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```

- [x] **T2.2.4**: 캐시 무효화 로직 구현 ✅

  ```typescript
  import { revalidateTag } from "next/cache";

  const { tag } = await request.json();
  if (!tag) {
    return NextResponse.json({ error: "Tag is required" }, { status: 400 });
  }
  revalidateTag(tag);
  ```

- [x] **T2.2.5**: 응답 로깅 및 반환 ✅
  - 무효화된 태그 로그
  - 성공 응답 반환 (`{ success: true, revalidated: tag }`)
  - 에러 발생 시 상세 에러 메시지

### US2.2.1: 클라이언트에서 캐시 무효화 처리 (신규)

- [x] **T2.2.1.1**: 필터 변경 시 캐시 무효화 핸들러 구현 ✅

  ```typescript
  // src/app/screener/golden-cross/GoldenCrossClient.tsx
  const handleFilterChange = async (
    newJustTurned: boolean,
    newLookbackDays: number
  ) => {
    // 이전 캐시 무효화
    const oldTag = `golden-cross-${justTurned}-${lookbackDays}`;
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: oldTag }),
    });

    // URL 업데이트
    await setJustTurned(newJustTurned);
    await setLookbackDays(newLookbackDays);

    // 서버 컴포넌트 리패치
    router.refresh();
  };
  ```

- [x] **T2.2.1.2**: 기간 입력 최적화 ✅

  ```typescript
  // 로컬 input 상태
  const [inputValue, setInputValue] = useState(lookbackDays.toString());

  // blur 또는 Enter로만 확정
  const handleLookbackConfirm = () => {
    const newValue = Number(inputValue);
    if (newValue >= 1 && newValue <= 60 && newValue !== lookbackDays) {
      handleFilterChange(justTurned, newValue);
    }
  };

  <input
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    onBlur={handleLookbackConfirm}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        handleLookbackConfirm();
        e.currentTarget.blur();
      }
    }}
  />;
  ```

  - 입력할 때마다 리패치 방지
  - blur 또는 Enter 키로만 리패치

### US2.3: ETL 스크립트에 캐시 무효화 호출 추가

- [ ] **T2.3.1**: 캐시 무효화 유틸리티 함수 생성

  - 파일: `/src/etl/utils/cache.ts` (신규)

  ```typescript
  export async function invalidateCache(
    tags: string[]
  ): Promise<{ success: boolean }> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const secret = process.env.CACHE_REVALIDATE_SECRET;

    const response = await fetch(`${apiUrl}/api/cache/revalidate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tags }),
    });

    return response.json();
  }
  ```

- [ ] **T2.3.2**: `load-daily-prices.ts`에 캐시 무효화 추가

  - 성공 시에만 호출
  - `golden-cross` 태그 무효화
  - 에러 처리 (캐시 무효화 실패해도 ETL은 성공으로 간주)

  ```typescript
  // ETL 완료 후
  try {
    await invalidateCache(["golden-cross"]);
    console.log("✅ Cache invalidated for golden-cross");
  } catch (error) {
    console.warn("⚠️  Failed to invalidate cache:", error);
    // Continue - cache will expire naturally
  }
  ```

- [ ] **T2.3.3**: `build-daily-ma.ts`에 캐시 무효화 추가

  - 성공 시에만 호출
  - `golden-cross` 태그 무효화

- [ ] **T2.3.4**: `load-ratios.ts`에 캐시 무효화 추가

  - 성공 시에만 호출
  - `quarterly-data` 태그 무효화 (Rule of 40, Turned Profitable 모두 갱신)

- [ ] **T2.3.5**: 캐시 무효화 로직 테스트
  - ETL 로컬 실행 후 API 데이터 변경 확인
  - 에러 시나리오 테스트 (인증 실패, 네트워크 오류 등)

### US2.4: GitHub Actions 워크플로우 수정

- [ ] **T2.4.1**: `etl-daily.yml`에 환경 변수 추가

  ```yaml
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    FMP_API_KEY: ${{ secrets.FMP_API_KEY }}
    CACHE_REVALIDATE_SECRET: ${{ secrets.CACHE_REVALIDATE_SECRET }}
    NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
  ```

- [ ] **T2.4.2**: `etl-weekly.yml`에 환경 변수 추가

  - 동일한 환경 변수 설정

- [ ] **T2.4.3**: GitHub Secrets 설정 문서 작성

  - `CACHE_REVALIDATE_SECRET`: 랜덤 문자열 (32자 이상)
  - `NEXT_PUBLIC_API_URL`: 프로덕션 URL (예: `https://screener.vercel.app`)
  - 설정 방법 스크린샷 포함

- [ ] **T2.4.4**: 워크플로우 테스트
  - 수동 실행으로 ETL 실행 및 캐시 무효화 확인
  - 로그에서 캐시 무효화 성공 메시지 확인

---

## User Story 3: 캐시 상태 모니터링 (P3)

### US3.1: 캐시 통계 수집 로직 구현

- [ ] **T3.1.1**: 캐시 통계 데이터 구조 정의

  ```typescript
  interface CacheStats {
    apiName: string;
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    avgHitResponseTime: number;
    avgMissResponseTime: number;
    lastUpdated: Date;
  }
  ```

- [ ] **T3.1.2**: 캐시 통계 수집 유틸리티 구현

  - 파일: `/src/lib/cache-stats.ts` (신규)
  - 메모리 기반 통계 (서버 재시작 시 리셋)
  - 향후 Redis/Database로 확장 가능하게 설계

  ```typescript
  class CacheStatsCollector {
    private stats: Map<string, CacheStats>;

    recordRequest(apiName: string, isHit: boolean, responseTime: number) {
      // 통계 업데이트 로직
    }

    getStats(apiName?: string): CacheStats | CacheStats[] {
      // 통계 조회 로직
    }
  }

  export const cacheStats = new CacheStatsCollector();
  ```

- [ ] **T3.1.3**: 각 API에 통계 수집 코드 추가

  ```typescript
  export async function GET(req: Request) {
    const startTime = Date.now();
    const isCacheHit = false; // 실제 판단 로직 필요

    try {
      // 기존 로직...
      const responseTime = Date.now() - startTime;
      cacheStats.recordRequest("golden-cross", isCacheHit, responseTime);
    } catch (error) {
      // ...
    }
  }
  ```

  - Golden Cross, Rule of 40, Turned Profitable 모두 적용

### US3.2: 캐시 통계 API 구현

- [ ] **T3.2.1**: 캐시 통계 API 엔드포인트 생성

  - 파일: `/src/app/api/cache/stats/route.ts` (신규)
  - 메서드: GET
  - 인증: 선택 사항 (내부 대시보드용)

- [ ] **T3.2.2**: 전체 통계 조회 엔드포인트

  ```typescript
  // GET /api/cache/stats
  {
    "overall": {
      "totalRequests": 1250,
      "cacheHits": 890,
      "hitRate": 71.2
    },
    "byAPI": [
      {
        "apiName": "golden-cross",
        "totalRequests": 500,
        "cacheHits": 380,
        "hitRate": 76.0,
        "avgHitResponseTime": 45,
        "avgMissResponseTime": 1200
      },
      // ...
    ]
  }
  ```

- [ ] **T3.2.3**: 특정 API 통계 조회

  ```typescript
  // GET /api/cache/stats?api=golden-cross
  {
    "apiName": "golden-cross",
    "totalRequests": 500,
    "cacheHits": 380,
    // ...
  }
  ```

### US3.3: ETL 대시보드에 캐시 통계 UI 추가

- [ ] **T3.3.1**: 캐시 통계 컴포넌트 생성

  - 파일: `/src/app/etl/CacheStats.tsx` (신규)
  - 카드 형태의 통계 표시
  - 실시간 업데이트 (옵션)

- [ ] **T3.3.2**: 캐시 통계 시각화

  - 히트율 게이지 차트
  - API별 비교 막대 그래프
  - 응답 시간 추이 (캐시 히트 vs 미스)

- [ ] **T3.3.3**: ETL 대시보드 페이지에 통합

  - 파일: `/src/app/etl/page.tsx` (수정)
  - 기존 ETL 상태 위 또는 아래에 캐시 통계 섹션 추가

  ```tsx
  <div className="space-y-6">
    <ETLStatus />
    <CacheStats /> {/* 신규 추가 */}
    <ETLMetrics />
    <ETLLogs />
  </div>
  ```

- [ ] **T3.3.4**: UI/UX 테스트
  - 다양한 화면 크기에서 레이아웃 확인
  - 데이터 로딩 상태 표시
  - 에러 상태 처리

### US3.4: 캐시 수동 무효화 UI (선택)

- [ ] **T3.4.1**: 수동 무효화 버튼 추가

  - 각 API별 "Clear Cache" 버튼
  - 전체 캐시 무효화 버튼

- [ ] **T3.4.2**: 무효화 확인 다이얼로그

  - 사용자 확인 후 실행
  - 무효화 결과 피드백 (성공/실패 토스트)

- [ ] **T3.4.3**: 권한 관리
  - 관리자만 수동 무효화 가능 (옵션)
  - 또는 비밀번호 입력

---

## Edge Cases & Error Handling

### EC1: ETL 실행 중 API 요청

- [ ] **T-EC1.1**: 시나리오 테스트

  - ETL이 데이터를 업데이트하는 중간에 API 호출
  - 이전 캐시 데이터를 반환하는지 확인
  - ETL 완료 후 캐시 무효화되는지 확인

- [ ] **T-EC1.2**: 문서화
  - "캐시는 ETL 완료 전까지 이전 데이터 제공"
  - 최대 지연 시간: ETL 실행 시간 + 캐시 만료 시간

### EC2: 캐시 저장 실패

- [ ] **T-EC2.1**: 캐시 저장 실패 시나리오 테스트

  - 메모리 부족, 네트워크 오류 등
  - API가 정상 응답하는지 확인

- [ ] **T-EC2.2**: Graceful degradation 구현
  - 캐시 실패해도 DB 쿼리는 실행
  - 에러 로그 기록
  - 사용자에게는 정상 응답

### EC3: 동시 요청 (Cache Stampede)

- [ ] **T-EC3.1**: Cache Stampede 시나리오 테스트

  - 캐시 만료 직후 100개 동시 요청
  - 모두 DB 조회하는지 확인

- [ ] **T-EC3.2**: Stale-While-Revalidate 검토
  - Next.js의 SWR 설정 활용 검토
  - 만료된 캐시 제공하면서 백그라운드 갱신

### EC4: 캐시 키 충돌

- [ ] **T-EC4.1**: 파라미터 정렬 테스트

  ```
  /api?a=1&b=2 === /api?b=2&a=1 (같은 캐시)
  ```

  - Next.js가 자동으로 처리하는지 확인
  - 필요 시 수동 캐시 키 생성

- [ ] **T-EC4.2**: 특수 문자 처리
  - URL 인코딩된 파라미터
  - 공백, 특수문자 포함 파라미터

### EC5: 개발 환경 캐시 문제

- [ ] **T-EC5.1**: 개발 환경 캐시 비활성화 옵션

  ```typescript
  import { CACHE_TTL } from "@/lib/cache-config";

  export const revalidate =
    process.env.NODE_ENV === "development"
      ? 0 // 개발 환경: 캐시 비활성화
      : CACHE_TTL.GOLDEN_CROSS; // 프로덕션: 24시간
  ```

  - 또는 환경 변수로 제어:

  ```typescript
  export const revalidate =
    process.env.CACHE_ENABLED === "false" ? 0 : CACHE_TTL.GOLDEN_CROSS;
  ```

- [ ] **T-EC5.2**: 캐시 비활성화 문서 작성
  - 개발 시 캐시 무효화 방법
  - 하드 리프레시, 서버 재시작 등

---

## Documentation & Testing

### DOC1: 사용자 문서

- [ ] **T-DOC1.1**: 캐싱 동작 설명 문서

  - 어떤 데이터가 캐시되는지
  - 캐시 유효 기간
  - 캐시 갱신 시점 (ETL 완료 시)

- [ ] **T-DOC1.2**: 문제 해결 가이드

  - "데이터가 오래된 것 같아요" → ETL 스케줄 확인
  - "캐시가 작동 안 해요" → 환경 변수 확인

- [ ] **T-DOC1.3**: API 문서 업데이트
  - 응답 헤더 설명 (`Cache-Control`, `Age`)
  - 캐시 동작 명시

### DOC2: 개발자 문서

- [ ] **T-DOC2.1**: 아키텍처 다이어그램

  - 캐시 플로우 시각화
  - ETL → 캐시 무효화 → API 갱신 흐름

- [ ] **T-DOC2.2**: 환경 변수 설정 가이드

  - 필수 환경 변수 목록
  - 개발/스테이징/프로덕션 설정 예시

- [ ] **T-DOC2.3**: 새로운 API 추가 시 가이드
  - 캐시 설정 체크리스트
  - 태그 네이밍 컨벤션
  - ETL 연동 방법

### TEST1: 통합 테스트

- [ ] **T-TEST1.1**: 전체 플로우 E2E 테스트

  1. API 호출 (캐시 미스)
  2. 두 번째 호출 (캐시 히트)
  3. ETL 실행
  4. 세 번째 호출 (캐시 미스, 새 데이터)

- [ ] **T-TEST1.2**: 성능 벤치마크
  - 캐싱 전후 응답 시간 비교
  - 데이터베이스 쿼리 수 비교
  - 결과 문서화

### TEST2: 부하 테스트

- [ ] **T-TEST2.1**: 동시 요청 테스트

  - 100 동시 사용자 시뮬레이션
  - 캐시 히트율 측정
  - 응답 시간 분포

- [ ] **T-TEST2.2**: 캐시 크기 테스트
  - 다양한 필터 조합으로 캐시 크기 증가
  - 메모리 사용량 모니터링
  - 최대 캐시 엔트리 수 확인

---

## Rollout Plan

### Phase 1 Rollout (P1)

- [ ] **T-ROLL1.1**: 기능 브랜치 생성 및 개발
- [ ] **T-ROLL1.2**: Preview 배포 테스트
- [ ] **T-ROLL1.3**: 메인 브랜치 머지 및 프로덕션 배포
- [ ] **T-ROLL1.4**: 24시간 모니터링

  - 캐시 히트율 확인
  - 에러 로그 확인
  - 사용자 피드백 수집

- [ ] **T-ROLL1.5**: 문제 발생 시 롤백 계획
  - `revalidate` 설정 제거로 빠른 롤백 가능
  - 데이터 정합성 문제 없음 (읽기 전용)

### Phase 2 Rollout (P2)

- [ ] **T-ROLL2.1**: 캐시 무효화 API 배포
- [ ] **T-ROLL2.2**: GitHub Secrets 설정
- [ ] **T-ROLL2.3**: ETL 워크플로우 업데이트
- [ ] **T-ROLL2.4**: 첫 ETL 실행 후 검증

  - 캐시 무효화 로그 확인
  - API 데이터 갱신 확인

- [ ] **T-ROLL2.5**: 1주일 모니터링
  - ETL 실행 성공률
  - 캐시 무효화 성공률
  - 데이터 최신성 확인

### Phase 3 Rollout (P3)

- [ ] **T-ROLL3.1**: 캐시 통계 시스템 배포
- [ ] **T-ROLL3.2**: 대시보드 UI 업데이트
- [ ] **T-ROLL3.3**: 1주일 데이터 수집 후 분석
  - 평균 히트율 계산
  - 성능 개선 지표 정리
  - 최적화 필요 영역 식별

---

## Success Metrics

### 기술 지표

- [ ] **캐시 히트율**: 60% 이상 (1주일 평균)
- [ ] **캐시 히트 시 응답 시간**: 100ms 이하
- [ ] **데이터베이스 쿼리 감소**: 50% 이상
- [ ] **ETL 후 캐시 갱신 성공률**: 95% 이상

### 사용자 경험 지표

- [ ] **페이지 로딩 속도**: 체감 속도 개선
- [ ] **데이터 최신성**: ETL 후 최대 5분 이내 갱신
- [ ] **에러율**: 캐시 관련 에러 < 0.1%

### 운영 지표

- [ ] **비용 절감**: 데이터베이스 연결 시간 감소
- [ ] **시스템 안정성**: 캐시 도입 후 장애 없음
- [ ] **유지보수성**: 새 API 추가 시 캐싱 설정 < 5분

---

**Version**: 1.0.0 | **Created**: 2025-10-26 | **Last Updated**: 2025-10-26
