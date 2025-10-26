import { Navigation } from "@/components/navigation";
import { ETLStatus } from "./ETLStatus";
import { ETLLogs } from "./ETLLogs";
import { ETLMetrics } from "./ETLMetrics";

export default function ETLPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation title="ETL 관리" />

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* ETL 상태 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              ETL 시스템 상태
            </h2>

            <ETLStatus />
          </div>

          {/* GitHub Actions 상태 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              GitHub Actions 상태
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">
                    Daily ETL Pipeline
                  </h4>
                  <p className="text-sm text-slate-600">
                    매일 오후 3시 일일 주가, 오후 5시 이동평균 (KST)
                  </p>
                </div>
                <a
                  href="https://github.com/sossost/screener/actions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  실행 상태 확인
                </a>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">
                    Weekly ETL Pipeline
                  </h4>
                  <p className="text-sm text-slate-600">
                    매주 월요일 오전 9시 심볼, 일요일 오후 4시 재무 비율 (KST)
                  </p>
                </div>
                <a
                  href="https://github.com/sossost/screener/actions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  실행 상태 확인
                </a>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">
                    Manual ETL Execution
                  </h4>
                  <p className="text-sm text-slate-600">
                    수동 실행 및 디버깅용
                  </p>
                </div>
                <a
                  href="https://github.com/sossost/screener/actions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  수동 실행
                </a>
              </div>

              <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                <p>
                  • <strong>스케줄:</strong> 자동 실행 (일일/주간)
                </p>
                <p>
                  • <strong>실행 시간:</strong> 일일 1시간, 주간 2시간
                </p>
                <p>
                  • <strong>처리량:</strong> 전체 NASDAQ 데이터
                </p>
                <p>
                  • <strong>상태:</strong> GitHub Actions에서 확인 가능
                </p>
              </div>
            </div>
          </div>

          {/* ETL 로그 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              ETL 실행 로그
            </h3>

            <ETLLogs />
          </div>

          {/* ETL 메트릭 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              성능 메트릭
            </h3>

            <ETLMetrics />
          </div>

          {/* 주의사항 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">⚠️ 주의사항</h4>
            <p className="text-sm text-yellow-800">
              ETL 시스템은 GitHub Actions를 통해 자동으로 실행됩니다. 수동
              실행이나 실시간 모니터링이 필요한 경우 GitHub Actions 페이지를
              확인해주세요. 모든 로그와 메트릭은 GitHub Actions에서 확인할 수
              있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
