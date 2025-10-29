/**
 * 공통 에러 핸들링 유틸리티
 */

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  statusCode: number;
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * API 에러 처리
 */
export function handleApiError(error: unknown): ApiError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    // 데이터베이스 연결 에러
    if (
      error.message?.includes("connection") ||
      error.message?.includes("database")
    ) {
      return {
        code: "DATABASE_CONNECTION_ERROR",
        message: "Database connection failed",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
        statusCode: 503,
      };
    }

    // 환경변수 에러
    if (
      error.message?.includes("DATABASE_URL") ||
      error.message?.includes("FMP_API_KEY")
    ) {
      return {
        code: "ENVIRONMENT_ERROR",
        message: "Environment variables not configured",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Configuration error",
        statusCode: 500,
      };
    }

    // 일반 에러
    return {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      statusCode: 500,
    };
  }

  // 알 수 없는 에러
  return {
    code: "UNKNOWN_ERROR",
    message: "An unknown error occurred",
    details: process.env.NODE_ENV === "development" ? String(error) : undefined,
    statusCode: 500,
  };
}

/**
 * 클라이언트 에러 처리
 */
export function handleClientError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * 에러 로깅
 */
export function logError(error: unknown, context?: string): void {
  const errorInfo = handleApiError(error);

  console.error(`[${context || "Unknown"}] Error:`, {
    code: errorInfo.code,
    message: errorInfo.message,
    details: errorInfo.details,
    statusCode: errorInfo.statusCode,
  });
}
