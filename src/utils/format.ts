export function formatNumber(v: string | number | null): string {
  if (v == null) return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "-";

  const abs = Math.abs(n);

  const format = (num: number, div: number, suffix: string) => {
    const val = num / div;
    return (Number.isInteger(val) ? val.toString() : val.toFixed(2)) + suffix;
  };

  if (abs >= 1e12) return format(n, 1e12, "T");
  if (abs >= 1e9) return format(n, 1e9, "B");
  if (abs >= 1e6) return format(n, 1e6, "M");
  if (abs >= 1e3) return format(n, 1e3, "K");
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

export function formatPercent(value: any, decimals = 1): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";

  // 소수점 고정 후 불필요한 .0 제거
  return n.toFixed(decimals).replace(/\.0+$/, "") + "%";
}
