import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, RotateCcw } from "lucide-react";

export default function Home() {
  const screeners = [
    {
      title: "Golden Cross",
      description: "이동평균선 정배열로 상승 추세 전환을 감지합니다",
      icon: TrendingUp,
      href: "/screener/golden-cross",
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Rule of 40",
      description: "성장성과 수익성을 동시에 만족하는 기업을 찾습니다",
      icon: Target,
      href: "/screener/rule-of-40",
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Turn-Around",
      description: "적자에서 흑자로 전환한 기업을 발견합니다",
      icon: RotateCcw,
      href: "/screener/turn-around",
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            📈 Stock Screener
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            정량적 투자 전략을 위한 종합적인 주식 스크리닝 플랫폼
          </p>
        </div>

        {/* Screener Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {screeners.map((screener) => {
            const Icon = screener.icon;
            return (
              <Link key={screener.href} href={screener.href}>
                <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-0 shadow-lg">
                  <CardHeader className="text-center pb-4">
                    <div
                      className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${screener.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className={`w-8 h-8 ${screener.iconColor}`} />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                      {screener.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-slate-600 leading-relaxed">
                      {screener.description}
                    </p>
                    <div
                      className={`mt-6 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r ${screener.color} group-hover:shadow-lg transition-shadow duration-300`}
                    >
                      스크리너 시작하기
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">주요 기능</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="p-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                실시간 데이터
              </h3>
              <p className="text-slate-600">
                최신 주가 및 재무 데이터를 기반으로 한 정확한 분석
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                정교한 필터링
              </h3>
              <p className="text-slate-600">
                다양한 조건을 조합한 맞춤형 스크리닝
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                자동화된 분석
              </h3>
              <p className="text-slate-600">
                복잡한 계산을 자동화하여 빠른 결과 제공
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
