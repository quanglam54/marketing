export function vnd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return '—';
  }
  return Math.round(n).toLocaleString('vi-VN') + ' đ';
}

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return '—';
  }
  return Math.round(n).toLocaleString('vi-VN');
}

export function percent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return '—';
  }
  return (n * 100).toFixed(digits).replace('.', ',') + '%';
}

/** '1.234.567' hoặc '1,234,567' → 1234567 */
export function parseNumber(s: string): number {
  const cleaned = s.replace(/[^\d-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
