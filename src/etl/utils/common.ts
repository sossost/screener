export async function fetchJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function toStrNum(v: any): string | null {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : null;
}
