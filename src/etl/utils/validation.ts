/**
 * ETL 환경 변수 및 데이터 검증 유틸리티
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 필수 환경 변수 검증
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 필수 환경 변수 확인
  const requiredEnvVars = ["DATABASE_URL", "FMP_API_KEY"];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`필수 환경 변수가 누락되었습니다: ${envVar}`);
    }
  }

  // DATABASE_URL 형식 검증
  if (process.env.DATABASE_URL) {
    try {
      new URL(process.env.DATABASE_URL);
    } catch {
      errors.push("DATABASE_URL 형식이 올바르지 않습니다");
    }
  }

  // FMP_API_KEY 형식 검증 (기본적인 길이 체크)
  if (process.env.FMP_API_KEY && process.env.FMP_API_KEY.length < 10) {
    warnings.push(
      "FMP_API_KEY가 너무 짧습니다. 올바른 API 키인지 확인해주세요"
    );
  }

  // 선택적 환경 변수 확인 (현재 없음)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 심볼 데이터 검증
 */
export function validateSymbolData(symbolData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 필수 필드 확인
  if (!symbolData.symbol || typeof symbolData.symbol !== "string") {
    errors.push("심볼이 누락되었거나 올바르지 않습니다");
  }

  if (!symbolData.companyName || typeof symbolData.companyName !== "string") {
    errors.push("회사명이 누락되었거나 올바르지 않습니다");
  }

  // 심볼 형식 검증 (기본적인 형식 체크)
  if (symbolData.symbol && !/^[A-Z]{1,5}$/.test(symbolData.symbol)) {
    warnings.push(`심볼 형식이 일반적이지 않습니다: ${symbolData.symbol}`);
  }

  // 시장 데이터 유효성 검사
  if (
    symbolData.marketCap &&
    (isNaN(Number(symbolData.marketCap)) || Number(symbolData.marketCap) < 0)
  ) {
    warnings.push(`시가총액이 올바르지 않습니다: ${symbolData.marketCap}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 주가 데이터 검증
 */
export function validatePriceData(priceData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 필수 필드 확인
  if (!priceData.symbol || typeof priceData.symbol !== "string") {
    errors.push("심볼이 누락되었거나 올바르지 않습니다");
  }

  if (!priceData.date || typeof priceData.date !== "string") {
    errors.push("날짜가 누락되었거나 올바르지 않습니다");
  }

  // 가격 데이터 유효성 검사
  const priceFields = ["open", "high", "low", "close"];
  for (const field of priceFields) {
    if (priceData[field] !== undefined && priceData[field] !== null) {
      const value = Number(priceData[field]);
      if (isNaN(value) || value < 0) {
        errors.push(`${field} 가격이 올바르지 않습니다: ${priceData[field]}`);
      }
    }
  }

  // OHLC 논리적 검증
  if (
    priceData.high &&
    priceData.low &&
    Number(priceData.high) < Number(priceData.low)
  ) {
    errors.push("고가가 저가보다 낮습니다");
  }

  if (priceData.open && priceData.close) {
    const open = Number(priceData.open);
    const close = Number(priceData.close);
    const high = Number(priceData.high);
    const low = Number(priceData.low);

    if (high && (open > high || close > high)) {
      errors.push("시가 또는 종가가 고가를 초과합니다");
    }

    if (low && (open < low || close < low)) {
      errors.push("시가 또는 종가가 저가보다 낮습니다");
    }
  }

  // 거래량 검증
  if (priceData.volume !== undefined && priceData.volume !== null) {
    const volume = Number(priceData.volume);
    if (isNaN(volume) || volume < 0) {
      warnings.push(`거래량이 올바르지 않습니다: ${priceData.volume}`);
    }
  }

  // 날짜 형식 검증
  if (priceData.date && !/^\d{4}-\d{2}-\d{2}$/.test(priceData.date)) {
    errors.push(`날짜 형식이 올바르지 않습니다: ${priceData.date}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 재무 비율 데이터 검증
 */
export function validateRatioData(ratioData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 필수 필드 확인
  if (!ratioData.symbol || typeof ratioData.symbol !== "string") {
    errors.push("심볼이 누락되었거나 올바르지 않습니다");
  }

  if (!ratioData.periodEndDate || typeof ratioData.periodEndDate !== "string") {
    errors.push("분기 말일이 누락되었거나 올바르지 않습니다");
  }

  // 비율 값 범위 검증
  const ratioFields = [
    "peRatio",
    "pegRatio",
    "psRatio",
    "pbRatio",
    "evEbitda",
    "grossMargin",
    "opMargin",
    "netMargin",
    "debtEquity",
    "debtAssets",
    "intCoverage",
    "divYield",
    "payoutRatio",
  ];

  for (const field of ratioFields) {
    if (ratioData[field] !== undefined && ratioData[field] !== null) {
      const value = Number(ratioData[field]);
      if (isNaN(value)) {
        warnings.push(`${field} 값이 숫자가 아닙니다: ${ratioData[field]}`);
      } else if (
        value < 0 &&
        ["peRatio", "psRatio", "pbRatio"].includes(field)
      ) {
        warnings.push(`${field} 값이 음수입니다: ${value}`);
      } else if (
        value > 1000 &&
        ["peRatio", "psRatio", "pbRatio"].includes(field)
      ) {
        warnings.push(`${field} 값이 비정상적으로 높습니다: ${value}`);
      }
    }
  }

  // 분기 데이터 일관성 검사
  if (
    ratioData.periodEndDate &&
    !/^\d{4}-\d{2}-\d{2}$/.test(ratioData.periodEndDate)
  ) {
    errors.push(
      `분기 말일 형식이 올바르지 않습니다: ${ratioData.periodEndDate}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 이동평균 데이터 검증
 */
export function validateMovingAverageData(maData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 필수 필드 확인
  if (!maData.symbol || typeof maData.symbol !== "string") {
    errors.push("심볼이 누락되었거나 올바르지 않습니다");
  }

  if (!maData.date || typeof maData.date !== "string") {
    errors.push("날짜가 누락되었거나 올바르지 않습니다");
  }

  // 이동평균 값 검증
  const maFields = ["ma20", "ma50", "ma100", "ma200", "volMa30"];
  for (const field of maFields) {
    if (maData[field] !== undefined && maData[field] !== null) {
      const value = Number(maData[field]);
      if (isNaN(value) || value < 0) {
        errors.push(`${field} 값이 올바르지 않습니다: ${maData[field]}`);
      }
    }
  }

  // 이동평균 논리적 검증
  if (maData.ma20 && maData.ma50 && Number(maData.ma20) < Number(maData.ma50)) {
    warnings.push(
      "20일 이동평균이 50일 이동평균보다 낮습니다 (골든크로스 가능성)"
    );
  }

  if (
    maData.ma50 &&
    maData.ma200 &&
    Number(maData.ma50) < Number(maData.ma200)
  ) {
    warnings.push(
      "50일 이동평균이 200일 이동평균보다 낮습니다 (골든크로스 가능성)"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 배치 데이터 검증
 */
export function validateBatchData(
  dataArray: any[],
  validator: (data: any) => ValidationResult
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const result = validator(dataArray[i]);

    if (result.isValid) {
      validCount++;
    } else {
      invalidCount++;
      errors.push(`항목 ${i + 1}: ${result.errors.join(", ")}`);
    }

    warnings.push(...result.warnings.map((w) => `항목 ${i + 1}: ${w}`));
  }

  if (invalidCount > 0) {
    errors.push(
      `배치 검증 실패: ${validCount}/${dataArray.length} 항목 유효, ${invalidCount}개 항목 실패`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 데이터 품질 메트릭 계산
 */
export function calculateDataQualityMetrics(
  dataArray: any[],
  validator: (data: any) => ValidationResult
) {
  const totalRecords = dataArray.length;
  let validRecords = 0;
  let invalidRecords = 0;
  let warningCount = 0;

  for (const data of dataArray) {
    const result = validator(data);

    if (result.isValid) {
      validRecords++;
    } else {
      invalidRecords++;
    }

    warningCount += result.warnings.length;
  }

  return {
    totalRecords,
    validRecords,
    invalidRecords,
    warningCount,
    validityRate: totalRecords > 0 ? (validRecords / totalRecords) * 100 : 0,
    warningRate: totalRecords > 0 ? (warningCount / totalRecords) * 100 : 0,
  };
}
