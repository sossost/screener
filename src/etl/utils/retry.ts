/**
 * ETL 재시도 로직 유틸리티
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * 기본 재시도 옵션
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000, // 1초
  maxDelay: 30000, // 30초
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * 지수 백오프 지연 계산
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay =
    options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);

  if (options.jitter) {
    // 지터 추가 (±25% 랜덤 변동)
    const jitterRange = cappedDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, cappedDelay + jitter);
  }

  return cappedDelay;
}

/**
 * 재시도 가능한 에러인지 확인
 */
function isRetryableError(error: any): boolean {
  // 네트워크 에러
  if (
    error.code === "ECONNRESET" ||
    error.code === "ENOTFOUND" ||
    error.code === "ECONNREFUSED"
  ) {
    return true;
  }

  // HTTP 상태 코드
  if (error.response?.status) {
    const status = error.response.status;
    // 5xx 서버 에러, 429 Too Many Requests, 408 Request Timeout
    return status >= 500 || status === 429 || status === 408;
  }

  // 타임아웃 에러
  if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
    return true;
  }

  // API 제한 에러
  if (
    error.message?.includes("rate limit") ||
    error.message?.includes("quota exceeded")
  ) {
    return true;
  }

  return false;
}

/**
 * 재시도 로직이 적용된 함수 실행
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const finalOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= finalOptions.maxAttempts; attempt++) {
    try {
      const data = await fn();
      const totalTime = Date.now() - startTime;

      return {
        success: true,
        data,
        attempts: attempt,
        totalTime,
      };
    } catch (error) {
      lastError = error as Error;

      // 재시도 불가능한 에러인 경우 즉시 실패
      if (!isRetryableError(error)) {
        const totalTime = Date.now() - startTime;
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalTime,
        };
      }

      // 마지막 시도인 경우 실패
      if (attempt === finalOptions.maxAttempts) {
        const totalTime = Date.now() - startTime;
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalTime,
        };
      }

      // 다음 시도 전 대기
      const delay = calculateDelay(attempt, finalOptions);
      console.log(
        `⚠️ 시도 ${attempt} 실패, ${delay}ms 후 재시도... (에러: ${lastError.message})`
      );
      await sleep(delay);
    }
  }

  // 이 코드는 실행되지 않아야 하지만 타입 안전성을 위해 추가
  const totalTime = Date.now() - startTime;
  return {
    success: false,
    error: lastError,
    attempts: finalOptions.maxAttempts,
    totalTime,
  };
}

/**
 * API 호출용 재시도 래퍼
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const result = await withRetry(apiCall, options);

  if (!result.success) {
    throw new Error(
      `API 호출 실패 (${result.attempts}회 시도): ${result.error?.message}`
    );
  }

  return result.data!;
}

/**
 * 데이터베이스 작업용 재시도 래퍼
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const result = await withRetry(operation, options);

  if (!result.success) {
    throw new Error(
      `데이터베이스 작업 실패 (${result.attempts}회 시도): ${result.error?.message}`
    );
  }

  return result.data!;
}

/**
 * 배치 처리용 재시도 래퍼
 */
export async function retryBatchOperation<T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: Partial<RetryOptions> = {}
): Promise<{ success: T[]; failed: { item: T; error: Error }[] }> {
  const success: T[] = [];
  const failed: { item: T; error: Error }[] = [];

  for (const item of items) {
    try {
      await retryApiCall(() => operation(item), options);
      success.push(item);
    } catch (error) {
      failed.push({ item, error: error as Error });
    }
  }

  return { success, failed };
}

/**
 * 지연 함수
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재시도 통계
 */
export interface RetryStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageAttempts: number;
  totalTime: number;
  averageTime: number;
}

/**
 * 재시도 통계 계산
 */
export function calculateRetryStats(results: RetryResult<any>[]): RetryStats {
  const totalAttempts = results.reduce(
    (sum, result) => sum + result.attempts,
    0
  );
  const successfulAttempts = results.filter((r) => r.success).length;
  const failedAttempts = results.filter((r) => !r.success).length;
  const totalTime = results.reduce((sum, result) => sum + result.totalTime, 0);

  return {
    totalAttempts,
    successfulAttempts,
    failedAttempts,
    averageAttempts: results.length > 0 ? totalAttempts / results.length : 0,
    totalTime,
    averageTime: results.length > 0 ? totalTime / results.length : 0,
  };
}

/**
 * 재시도 로그 생성
 */
export function generateRetryLog(stats: RetryStats): string {
  const successRate =
    stats.totalAttempts > 0
      ? (stats.successfulAttempts / stats.totalAttempts) * 100
      : 0;

  return `
📊 재시도 통계:
- 총 시도 횟수: ${stats.totalAttempts}
- 성공: ${stats.successfulAttempts} (${successRate.toFixed(1)}%)
- 실패: ${stats.failedAttempts}
- 평균 시도 횟수: ${stats.averageAttempts.toFixed(1)}
- 총 소요 시간: ${stats.totalTime}ms
- 평균 소요 시간: ${stats.averageTime.toFixed(1)}ms
  `.trim();
}
