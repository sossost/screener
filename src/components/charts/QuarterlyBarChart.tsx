"use client";

import React, { useState } from "react";

// 상수 정의
const COLORS = {
  NULL: "#e5e7eb", // gray-200
  ZERO: "#9ca3af", // gray-400
  POSITIVE: "#22c55e", // green-500
  NEGATIVE: "#ef4444", // red-500
  GREEN_TEXT: "text-green-600",
  RED_TEXT: "text-red-600",
} as const;

const CHART_CONFIG = {
  DEFAULT_HEIGHT: 28,
  DEFAULT_WIDTH: 160, // 8분기 × 20px
  BAR_WIDTH: "w-3",
  BAR_GAP: "gap-0.5",
  HEIGHT_MULTIPLIER: 0.8,
  MIN_BAR_HEIGHT: 3,
  ZERO_BAR_HEIGHT: 2,
  TOOLTIP_WIDTH: 100,
  TOOLTIP_MARGIN: 10,
} as const;

type QuarterlyData = {
  quarter: string; // "Q3 2024"
  value: number | null;
  date: string; // "2024-09-30"
};

type QuarterlyBarChartProps = {
  data: QuarterlyData[];
  type: "revenue" | "eps";
  height?: number;
  width?: number;
};

/**
 * 막대 차트 색상 결정
 * - null: 회색 (데이터 없음)
 * - 0: 진한 회색 (0 값)
 * - 양수: 초록색
 * - 음수: 빨간색
 */
function getBarColor(value: number | null): string {
  if (value === null) return COLORS.NULL;
  if (value === 0) return COLORS.ZERO;
  return value < 0 ? COLORS.NEGATIVE : COLORS.POSITIVE;
}

/**
 * 툴팁에 표시할 값 포맷팅
 * - Revenue: $XB, $XM 형식
 * - EPS: 소수점 2자리
 */
function formatValue(value: number | null, type: "revenue" | "eps"): string {
  if (value === null) return "-";

  if (type === "revenue") {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (absValue >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  } else {
    // EPS
    return value.toFixed(2);
  }
}

export const QuarterlyBarChart = React.memo(function QuarterlyBarChart({
  data,
  type,
  height = CHART_CONFIG.DEFAULT_HEIGHT,
  width = CHART_CONFIG.DEFAULT_WIDTH,
}: QuarterlyBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // 데이터가 없으면 빈 상태 표시
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-xs"
        style={{ width, height }}
      >
        -
      </div>
    );
  }

  // 최근 분기가 오른쪽에 오도록 역순 정렬
  const reversedData = [...data].reverse();

  // 최대값 찾기 (높이 계산용)
  const maxValue = Math.max(...reversedData.map((d) => Math.abs(d.value || 0)));

  return (
    <div
      className={`relative inline-flex items-end ${CHART_CONFIG.BAR_GAP} justify-end`}
      style={{ height, width }}
    >
      {reversedData.map((item, index) => {
        const isNegative = item.value !== null && item.value < 0;
        const isZero = item.value === 0;
        const barHeight = isZero
          ? CHART_CONFIG.ZERO_BAR_HEIGHT
          : item.value
          ? Math.max(
              (Math.abs(item.value) / maxValue) *
                height *
                CHART_CONFIG.HEIGHT_MULTIPLIER,
              CHART_CONFIG.MIN_BAR_HEIGHT
            )
          : CHART_CONFIG.MIN_BAR_HEIGHT;
        const color = getBarColor(item.value);

        return (
          <div
            key={index}
            className={`relative flex ${
              isNegative ? "items-start" : "items-end"
            }`}
            style={{ height }}
          >
            <div
              className={`${
                CHART_CONFIG.BAR_WIDTH
              } cursor-pointer transition-opacity hover:opacity-80 ${
                isNegative ? "rounded-b-[1px]" : "rounded-t-[1px]"
              }`}
              style={{
                height: `${barHeight}px`,
                backgroundColor: color,
              }}
              onMouseEnter={(e) => {
                setHoveredIndex(index);
                const rect = e.currentTarget.getBoundingClientRect();
                let x = rect.left + rect.width / 2;

                // 화면 경계 체크
                if (
                  x - CHART_CONFIG.TOOLTIP_WIDTH / 2 <
                  CHART_CONFIG.TOOLTIP_MARGIN
                ) {
                  x =
                    CHART_CONFIG.TOOLTIP_WIDTH / 2 +
                    CHART_CONFIG.TOOLTIP_MARGIN;
                } else if (
                  x + CHART_CONFIG.TOOLTIP_WIDTH / 2 >
                  window.innerWidth - CHART_CONFIG.TOOLTIP_MARGIN
                ) {
                  x =
                    window.innerWidth -
                    CHART_CONFIG.TOOLTIP_WIDTH / 2 -
                    CHART_CONFIG.TOOLTIP_MARGIN;
                }

                setTooltipPos({ x, y: rect.top });
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
                setTooltipPos(null);
              }}
            />

            {/* 툴팁 */}
            {hoveredIndex === index && tooltipPos && (
              <div
                className="fixed bg-white px-2 py-1.5 rounded shadow-lg border border-gray-200 whitespace-nowrap z-[9999] pointer-events-none"
                style={{
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y - 10}px`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <p className="text-xs font-semibold">{item.quarter}</p>
                <p className="text-[10px] text-gray-500">{item.date}</p>
                <p
                  className={`text-xs font-medium mt-0.5 ${
                    item.value && item.value >= 0
                      ? COLORS.GREEN_TEXT
                      : COLORS.RED_TEXT
                  }`}
                >
                  {formatValue(item.value, type)}
                </p>
                {/* 화살표 */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
