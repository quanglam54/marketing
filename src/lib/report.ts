import { daysInMonth, endOfMonth, monthsBetween, overlapDays } from './date';
import type { CountMetric, Goal, RateMetric, ReportRow, Source } from './types';

export interface Totals {
  spend: number;
  messages: number;
  impressions: number;
  clicks: number;
  leads: number;
  reached: number;
  consulted: number;
  closed: number;
}

export const EMPTY_TOTALS: Totals = {
  spend: 0,
  messages: 0,
  impressions: 0,
  clicks: 0,
  leads: 0,
  reached: 0,
  consulted: 0,
  closed: 0,
};

const KEYS = Object.keys(EMPTY_TOTALS) as (keyof Totals)[];

export function sumRows(rows: ReportRow[], predicate: (r: ReportRow) => boolean = () => true): Totals {
  const t: Totals = { ...EMPTY_TOTALS };
  for (const r of rows) {
    if (!predicate(r)) {
      continue;
    }
    for (const k of KEYS) {
      t[k] += Number(r[k]) || 0;
    }
  }
  return t;
}

function ratio(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

/** Chi phí / tỷ lệ suy ra từ tổng. null khi mẫu số = 0. */
export function derive(t: Totals) {
  const costIfAny = (n: number) => (t.spend > 0 ? ratio(t.spend, n) : null);
  return {
    cpm: t.impressions > 0 ? (t.spend / t.impressions) * 1000 : null,
    ctr: ratio(t.clicks, t.impressions),
    costPerMessage: costIfAny(t.messages),
    cpl: costIfAny(t.leads),
    costPerReached: costIfAny(t.reached),
    costPerConsulted: costIfAny(t.consulted),
    costPerClosed: costIfAny(t.closed),
    leadPerMessage: ratio(t.leads, t.messages),
    reachedRate: ratio(t.reached, t.leads),
    consultRate: ratio(t.consulted, t.leads),
    closeRate: ratio(t.closed, t.leads),
  };
}

export type Derived = ReturnType<typeof derive>;

export interface GoalSummary {
  count: Record<CountMetric, number>;
  rate: Partial<Record<RateMetric, number>>;
}

/**
 * Mục tiêu cho khoảng [from, to] và các nguồn đã chọn.
 * Mục tiêu số lượng theo tháng được quy đổi theo số ngày nằm trong khoảng.
 * Mục tiêu tỷ lệ lấy của tháng mới nhất trong khoảng có đặt.
 */
export function summarizeGoals(goals: Goal[], sourceIds: string[], from: string, to: string): GoalSummary {
  const count: Record<CountMetric, number> = { spend: 0, messages: 0, lead: 0, reached: 0, consulted: 0, closed: 0 };
  const rate: Partial<Record<RateMetric, number>> = {};
  const selected = new Set(sourceIds);

  for (const month of monthsBetween(from, to)) {
    const factor = overlapDays(from, to, month, endOfMonth(month)) / daysInMonth(month);
    for (const g of goals) {
      if (g.month !== month || !(Number(g.target) > 0)) {
        continue;
      }
      if (g.source_id === null) {
        if (g.metric === 'cpl' || g.metric === 'consult_rate' || g.metric === 'close_rate') {
          rate[g.metric] = Number(g.target);
        }
        continue;
      }
      if (selected.has(g.source_id) && g.metric in count) {
        count[g.metric as CountMetric] += Number(g.target) * factor;
      }
    }
  }
  return { count, rate };
}

export interface GroupedRow {
  key: string;
  name: string;
  level: 'total' | 'group' | 'source';
  totals: Totals;
}

/** Bảng so sánh: Tổng → từng nhóm kênh → từng nguồn. */
export function buildComparison(rows: ReportRow[], sources: Source[], selectedIds: string[]): GroupedRow[] {
  const selected = sources.filter((s) => selectedIds.includes(s.id));
  const out: GroupedRow[] = [{ key: 'total', name: 'Tổng', level: 'total', totals: sumRows(rows) }];
  const groups = [...new Set(selected.map((s) => s.channel_group))];
  for (const g of groups) {
    const members = selected.filter((s) => s.channel_group === g);
    const ids = new Set(members.map((s) => s.id));
    out.push({ key: 'g:' + g, name: g, level: 'group', totals: sumRows(rows, (r) => ids.has(r.source_id)) });
    for (const s of members) {
      out.push({ key: s.id, name: s.name, level: 'source', totals: sumRows(rows, (r) => r.source_id === s.id) });
    }
  }
  return out;
}

export function byDay(rows: ReportRow[], days: string[]): { day: string; totals: Totals }[] {
  return days.map((day) => ({ day, totals: sumRows(rows, (r) => r.day === day) }));
}
