# 📈 Stock Screener

개인 투자용으로 만든 주식 스크리닝 도구입니다. 기술적 분석과 펀더멘털 분석을 간단하게 확인할 수 있어요.

## 🎯 뭐가 있나요?

### 📈 Golden Cross 스크리너

- 이동평균선이 정배열(MA20 > MA50 > MA100 > MA200)인 종목들
- 최근에 갑자기 정배열로 바뀐 종목들도 따로 볼 수 있음
- **🆕 성장성 필터**: 연속 2-8분기 매출/수익 성장 기업 선별
- **🆕 8분기 재무 차트**: 최근 8분기 매출/EPS 트렌드 시각화
- **🆕 수익성 필터**: 흑자/적자 기업 구분

### 🎯 Rule of 40 스크리너

- SaaS 기업들 중에서 성장률 + 수익성이 좋은 애들
- (성장률 + EBITDA 마진) ≥ 40% 조건

### 🔄 Turn-Around 스크리너

- 손실에서 수익으로 바뀐 기업들
- 회생하는 기업들 찾기

## 🛠️ 뭘 썼나요?

- **Next.js 15** + **React 19** + **TypeScript**
- **Tailwind CSS** + **Shadcn/ui** (UI가 예쁘게 나오게)
- **PostgreSQL** + **Drizzle ORM** (데이터 저장)
- **FMP API** (주식 데이터 가져오기)
- **Vercel** (배포)

## 📊 데이터는 어떻게?

1. **NASDAQ 심볼들** 가져오기
2. **일일 주가** 데이터 수집
3. **분기별 재무** 데이터 수집
4. **이동평균선** 계산
5. **비정상 종목들** (워런트, ETF 등) 제거

## 🚀 어떻게 실행하나요?

### 1. 클론하고 설치

```bash
git clone https://github.com/your-username/screener.git
cd screener
yarn install
```

### 2. 환경변수 설정

`.env.local` 파일 만들고:

```env
FMP_API_KEY=your_fmp_api_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/screener
```

### 3. 데이터베이스 설정

```bash
yarn db:push
yarn etl:symbols
yarn etl:daily-prices
yarn etl:daily-ma
```

### 4. 실행

```bash
yarn dev
```

## 📝 사용법

- 메인 페이지에서 원하는 스크리너 클릭
- **Golden Cross 스크리너**:
  - "전체 정배열" vs "최근 전환" 토글 가능
  - 매출 성장 필터: 연속 2-8분기 매출 증가 기업 선별
  - 수익 성장 필터: 연속 2-8분기 EPS 증가 기업 선별
  - 수익성 필터: 흑자/적자 기업 구분
  - 8분기 재무 차트로 트렌드 분석
- 데이터는 매일 업데이트 (수동으로 `yarn etl:daily-prices` 실행)

## 🔧 유용한 명령어들

```bash
yarn dev                    # 개발 서버
yarn build                  # 빌드
yarn etl:daily-prices       # 주가 업데이트
yarn etl:daily-ma          # 이동평균선 계산
yarn etl:cleanup-invalid-symbols  # 비정상 종목 정리
```

## 📁 폴더 구조

```
src/
├── app/                    # Next.js 페이지들
│   ├── api/               # API 엔드포인트
│   └── screener/          # 스크리너 페이지들
├── components/            # 재사용 컴포넌트
├── db/                   # 데이터베이스
├── etl/                  # 데이터 처리 작업들
└── utils/               # 유틸리티
```
