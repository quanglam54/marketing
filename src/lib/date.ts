/**
 * Ngày luôn được lưu dạng chuỗi 'YYYY-MM-DD' theo giờ máy (không dùng UTC)
 * để tránh lệch ngày khi múi giờ +7.
 */

export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISO(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Thứ Hai của tuần chứa ngày s. */
export function startOfWeek(s: string): string {
  const d = parseISO(s);
  const dow = (d.getDay() + 6) % 7;
  return addDays(s, -dow);
}

export function startOfMonth(s: string): string {
  return s.slice(0, 8) + '01';
}

export function endOfMonth(s: string): string {
  const d = parseISO(startOfMonth(s));
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function daysInMonth(s: string): number {
  return Number(endOfMonth(s).slice(8, 10));
}

/** Danh sách ngày từ from đến to (gồm cả hai đầu). */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push(d);
  }
  return out;
}

/** Số ngày trùng nhau giữa [from, to] và [a, b]. */
export function overlapDays(from: string, to: string, a: string, b: string): number {
  const start = from > a ? from : a;
  const end = to < b ? to : b;
  if (start > end) {
    return 0;
  }
  return eachDay(start, end).length;
}

/** Ngày đầu của mỗi tháng nằm trong [from, to]. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = startOfMonth(from); m <= to; m = addDays(endOfMonth(m), 1)) {
    out.push(m);
  }
  return out;
}

export function fmtDate(s: string): string {
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
}

export function fmtShort(s: string): string {
  return `${s.slice(8, 10)}/${s.slice(5, 7)}`;
}

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function dowLabel(s: string): string {
  return DOW[parseISO(s).getDay()];
}

export interface RangePreset {
  id: string;
  label: string;
  range: (now: string) => { from: string; to: string };
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: 'today', label: 'Hôm nay', range: (n) => ({ from: n, to: n }) },
  { id: 'yesterday', label: 'Hôm qua', range: (n) => ({ from: addDays(n, -1), to: addDays(n, -1) }) },
  { id: '7d', label: '7 ngày', range: (n) => ({ from: addDays(n, -6), to: n }) },
  { id: 'week', label: 'Tuần này', range: (n) => ({ from: startOfWeek(n), to: n }) },
  { id: 'lastweek', label: 'Tuần trước', range: (n) => ({ from: addDays(startOfWeek(n), -7), to: addDays(startOfWeek(n), -1) }) },
  { id: 'month', label: 'Tháng này', range: (n) => ({ from: startOfMonth(n), to: n }) },
  {
    id: 'lastmonth',
    label: 'Tháng trước',
    range: (n) => {
      const end = addDays(startOfMonth(n), -1);
      return { from: startOfMonth(end), to: end };
    },
  },
];
