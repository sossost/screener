# Golden Cross API 스펙

## 엔드포인트

```
GET /api/screener/golden-cross
```

## 쿼리 파라미터

| 파라미터        | 타입    | 기본값 | 필수 | 설명                                                  |
| --------------- | ------- | ------ | ---- | ----------------------------------------------------- |
| `justTurned`    | boolean | false  | No   | 최근 전환된 종목만 표시                               |
| `lookbackDays`  | number  | 10     | No   | 전환 기간 (1-60일)                                    |
| `minMcap`       | number  | 0      | No   | 최소 시가총액                                         |
| `minPrice`      | number  | 0      | No   | 최소 주가                                             |
| `minAvgVol`     | number  | 0      | No   | 최소 평균 거래량                                      |
| `allowOTC`      | boolean | false  | No   | OTC 거래소 포함                                       |
| `profitability` | string  | "all"  | No   | 수익성 필터 ("all" \| "profitable" \| "unprofitable") |
| `revenueGrowth` | string  | "all"  | No   | 매출 성장 필터 ("all" \| "growing")                   |

## 응답 구조

```typescript
interface GoldenCrossResponse {
  count: number;
  trade_date: string | null;
  lookback_days: number | null;
  data: GoldenCrossCompany[];
}

interface GoldenCrossCompany {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  quarterly_financials: QuarterlyFinancial[];
  profitability_status: "profitable" | "unprofitable" | "unknown";
  revenue_growth_status: "growing" | "not_growing" | "unknown";
  ordered: boolean;
  just_turned: boolean;
}

interface QuarterlyFinancial {
  period_end_date: string;
  revenue: number | null;
  eps_diluted: number | null;
}
```

## 예시 요청

### 기본 요청

```
GET /api/screener/golden-cross
```

### 필터 적용 요청

```
GET /api/screener/golden-cross?justTurned=true&lookbackDays=5&profitability=profitable&revenueGrowth=growing
```

## 예시 응답

```json
{
  "count": 25,
  "trade_date": "2024-01-15",
  "lookback_days": 5,
  "data": [
    {
      "symbol": "AAPL",
      "market_cap": "3000000000000",
      "last_close": "150.25",
      "quarterly_financials": [
        {
          "period_end_date": "2024-12-31",
          "revenue": 123900000000,
          "eps_diluted": 2.18
        },
        {
          "period_end_date": "2024-09-30",
          "revenue": 119600000000,
          "eps_diluted": 2.11
        },
        {
          "period_end_date": "2024-06-30",
          "revenue": 115600000000,
          "eps_diluted": 2.08
        },
        {
          "period_end_date": "2024-03-31",
          "revenue": 110800000000,
          "eps_diluted": 2.05
        }
      ],
      "profitability_status": "profitable",
      "revenue_growth_status": "growing",
      "ordered": true,
      "just_turned": true
    }
  ]
}
```

## 에러 응답

```json
{
  "error": "Error message"
}
```

## 캐시 정책

- **재검증 주기**: 24시간 (86400초)
- **캐시 태그**: `golden-cross-{justTurned}-{lookbackDays}-{profitability}-{revenueGrowth}`
- **동적 라우트**: `force-dynamic`

## 비즈니스 로직

### Golden Cross 조건

- MA20 > MA50 > MA100 > MA200 정배열
- 정상적인 주식만 (워런트, ETF, 우선주 제외)

### 매출 연속 상승 조건

- 최근 4분기 매출 데이터가 모두 존재
- Q4 > Q3 > Q2 > Q1 순서로 매출 증가
- NULL 값이 있는 분기가 있으면 제외

### 수익성 조건

- `profitable`: 최근 분기 EPS > 0
- `unprofitable`: 최근 분기 EPS < 0
- `all`: EPS 조건 없음
