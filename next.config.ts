import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 최적화 설정
  experimental: {
    // 서버 컴포넌트에서 동적 함수 사용 허용
    serverComponentsExternalPackages: ['@libsql/client'],
  },
  // 빌드 시 정적 생성 방지 (동적 라우트)
  output: 'standalone',
  // 환경변수 검증
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    FMP_API_KEY: process.env.FMP_API_KEY,
  },
};

export default nextConfig;
