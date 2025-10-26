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
