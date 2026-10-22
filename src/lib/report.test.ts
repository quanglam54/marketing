import { describe, expect, it } from 'vitest';
import { eachDay, overlapDays, startOfWeek } from './date';
import { buildComparison, derive, sumRows, summarizeGoals } from './report';
import type { Goal, ReportRow, Source } from './types';

const row = (day: string, source_id: string, p: Partial<ReportRow>): ReportRow => ({
  day,
  source_id,
  spend: 0,
  messages: 0,
  impressions: 0,
  clicks: 0,
  leads: 0,
  reached: 0,
  consulted: 0,
  closed: 0,
  ...p,
});

const sources: Source[] = [
  { id: 'fa', code: 'fb_ads', name: 'Facebook Ads', channel_group: 'Facebook', has_cost: true, sort_order: 1, is_active: true },
  { id: 'ta', code: 'tiktok_ads', name: 'TikTok Ads', channel_group: 'TikTok', has_cost: true, sort_order: 2, is_active: true },
  { id: 'to', code: 'tiktok_organic', name: 'TikTok Organic', channel_group: 'TikTok', has_cost: false, sort_order: 3, is_active: true },
];

const rows = [
  row('2026-10-01', 'fa', { leads: 5 }),
  row('2026-10-04', 'ta', { spend: 277918, leads: 4, reached: 1, consulted: 1 }),
  row('2026-10-05', 'ta', { spend: 301255, leads: 7, reached: 1, consulted: 1 }),
  row('2026-10-05', 'to', { leads: 2, closed: 1 }),
];

describe('sumRows / derive', () => {
  it('cộng tất cả các dòng', () => {
    const t = sumRows(rows);
    expect(t.spend).toBe(579173);
    expect(t.leads).toBe(18);
    expect(t.closed).toBe(1);
  });

  it('tính CPL và tỷ lệ, trả null khi mẫu số = 0', () => {
    const d = derive(sumRows(rows, (r) => r.source_id === 'ta'));
    expect(d.cpl).toBeCloseTo(579173 / 11);
    expect(d.consultRate).toBeCloseTo(2 / 11);
    expect(d.costPerMessage).toBeNull();
    expect(d.costPerClosed).toBeNull();
  });

  it('không tính chi phí / bước khi không có chi phí', () => {
    const d = derive(sumRows(rows, (r) => r.source_id === 'to'));
    expect(d.cpl).toBeNull();
    expect(d.closeRate).toBe(0.5);
  });
});

describe('buildComparison', () => {
  it('tạo dòng Tổng → nhóm → nguồn chỉ với nguồn được chọn', () => {
    const out = buildComparison(rows, sources, ['ta', 'to']);
    expect(out.map((r) => r.name)).toEqual(['Tổng', 'TikTok', 'TikTok Ads', 'TikTok Organic']);
    expect(out[1].totals.leads).toBe(13);
  });
});

describe('summarizeGoals', () => {
  const goals: Goal[] = [
    { month: '2026-10-01', source_id: 'ta', metric: 'spend', target: 3100000 },
    { month: '2026-10-01', source_id: 'ta', metric: 'lead', target: 31 },
    { month: '2026-10-01', source_id: 'fa', metric: 'lead', target: 62 },
    { month: '2026-10-01', source_id: null, metric: 'cpl', target: 150000 },
    { month: '2026-10-01', source_id: null, metric: 'close_rate', target: 0 },
  ];

  it('cả tháng = nguyên mục tiêu của các nguồn đã chọn', () => {
    const g = summarizeGoals(goals, ['ta'], '2026-10-01', '2026-10-31');
    expect(g.count.spend).toBe(3100000);
    expect(g.count.lead).toBe(31);
    expect(g.rate.cpl).toBe(150000);
    expect(g.rate.close_rate).toBeUndefined();
  });

  it('một tuần = chia theo số ngày', () => {
    const g = summarizeGoals(goals, ['ta', 'fa'], '2026-10-05', '2026-10-11');
    expect(g.count.lead).toBeCloseTo((93 * 7) / 31);
  });

  it('khoảng vắt qua 2 tháng chỉ tính phần ngày thuộc tháng có mục tiêu', () => {
    const g = summarizeGoals(goals, ['ta'], '2026-09-29', '2026-10-02');
    expect(g.count.lead).toBeCloseTo(2);
  });
});

describe('date helpers', () => {
  it('tuần bắt đầu từ thứ Hai', () => {
    expect(startOfWeek('2026-10-22')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19');
  });

  it('đếm ngày giao nhau', () => {
    expect(overlapDays('2026-10-05', '2026-10-11', '2026-10-01', '2026-10-31')).toBe(7);
    expect(overlapDays('2026-09-01', '2026-09-30', '2026-10-01', '2026-10-31')).toBe(0);
    expect(eachDay('2026-09-30', '2026-10-02')).toEqual(['2026-09-30', '2026-10-01', '2026-10-02']);
  });
});
