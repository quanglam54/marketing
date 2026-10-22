import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FilterBar, { type FilterState } from '../components/FilterBar';
import { ErrorBox, Loading, Panel } from '../components/ui';
import { eachDay, fmtDate, fmtShort, monthsBetween, RANGE_PRESETS, today } from '../lib/date';
import { num, percent, vnd } from '../lib/format';
import { buildComparison, byDay, derive, sumRows, summarizeGoals, type Totals } from '../lib/report';
import { supabase } from '../lib/supabase';
import type { Goal, ReportRow } from '../lib/types';
import { useSources } from '../lib/useSources';

const STORAGE_KEY = 'zeno-report.filter';

function initialFilter(): FilterState {
  const month = RANGE_PRESETS.find((p) => p.id === 'month')!;
  const fallback: FilterState = { preset: 'month', ...month.range(today()), sourceIds: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as FilterState | null;
    if (!saved) {
      return fallback;
    }
    const preset = RANGE_PRESETS.find((p) => p.id === saved.preset);
    return preset ? { ...saved, ...preset.range(today()) } : saved;
  } catch {
    return fallback;
  }
}

export default function Dashboard() {
  const { sources, loading: loadingSources, error: sourcesError } = useSources();
  const [filter, setFilter] = useState<FilterState>(initialFilter);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lần đầu (hoặc khi nguồn đã lưu không còn) → chọn tất cả nguồn.
  useEffect(() => {
    if (!sources.length) {
      return;
    }
    const valid = filter.sourceIds.filter((id) => sources.some((s) => s.id === id));
    if (filter.sourceIds.length === 0 || valid.length !== filter.sourceIds.length) {
      setFilter((f) => ({ ...f, sourceIds: valid.length ? valid : sources.map((s) => s.id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
    } catch {
      /* bỏ qua khi trình duyệt chặn storage */
    }
  }, [filter]);

  useEffect(() => {
    if (!filter.sourceIds.length) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.rpc('report_daily', { p_from: filter.from, p_to: filter.to, p_source_ids: filter.sourceIds }),
      supabase.from('goals').select('*').in('month', monthsBetween(filter.from, filter.to)),
    ]).then(([report, goalRes]) => {
      if (cancelled) {
        return;
      }
      setError(report.error?.message ?? goalRes.error?.message ?? null);
      setRows((report.data as ReportRow[]) ?? []);
      setGoals((goalRes.data as Goal[]) ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [filter.from, filter.to, filter.sourceIds]);

  const view = useMemo(() => {
    const totals = sumRows(rows);
    const d = derive(totals);
    const goal = summarizeGoals(goals, filter.sourceIds, filter.from, filter.to);
    const costSourceIds = new Set(sources.filter((s) => s.has_cost).map((s) => s.id));
    const missingMessageDays = rows.filter((r) => costSourceIds.has(r.source_id) && Number(r.spend) > 0 && Number(r.messages) === 0).length;
    return {
      totals,
      d,
      goal,
      missingMessageDays,
      comparison: buildComparison(rows, sources, filter.sourceIds),
      days: byDay(rows, eachDay(filter.from, filter.to)),
    };
  }, [rows, goals, sources, filter]);

  if (loadingSources) {
    return <Loading />;
  }

  const { totals: t, d, goal } = view;

  return (
    <>
      <ErrorBox message={sourcesError ?? error} />
      {sources.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted">
            Chưa có nguồn nào. Vào <Link to="/cai-dat">Nguồn &amp; mục tiêu</Link> để thêm.
          </p>
        </Panel>
      ) : (
        <FilterBar sources={sources} value={filter} onChange={setFilter} />
      )}

      {filter.sourceIds.length === 0 ? (
        <Panel>
          <p className="py-8 text-center text-muted">Chọn ít nhất một nguồn để xem báo cáo.</p>
        </Panel>
      ) : loading ? (
        <Loading />
      ) : (
        <>
          {view.missingMessageDays > 0 && (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#F3C98B] bg-accent-soft px-4 py-3 text-sm text-[#6B3D00]">
              <span className="flex-[1_1_280px]">
                Có <b>{view.missingMessageDays} ngày × nguồn</b> đã chi tiền nhưng chưa nhập số tin nhắn, nên các chỉ số theo tin nhắn chưa chính xác.
              </span>
              <Link to="/nhap-lieu" className="font-semibold text-[#6B3D00]">
                Nhập ngay →
              </Link>
            </div>
          )}

          <section aria-label="Chỉ số chính" className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
            <KpiCard label="Chi phí" value={vnd(t.spend)} actual={t.spend} goal={goal.count.spend} fmt={vnd} />
            <KpiCard label="Tin nhắn" value={num(t.messages)} actual={t.messages} goal={goal.count.messages} fmt={num} />
            <KpiCard label="Lead" value={num(t.leads)} actual={t.leads} goal={goal.count.lead} fmt={num} />
            <KpiCard label="Tiếp cận" value={num(t.reached)} actual={t.reached} goal={goal.count.reached} fmt={num} />
            <KpiCard label="Tư vấn" value={num(t.consulted)} actual={t.consulted} goal={goal.count.consulted || (goal.rate.consult_rate ?? 0) * t.leads} fmt={(x) => num(Math.ceil(x))} />
            <KpiCard label="Khách chốt" value={num(t.closed)} actual={t.closed} goal={goal.count.closed || (goal.rate.close_rate ?? 0) * t.leads} fmt={(x) => num(Math.ceil(x))} />
          </section>

          <div className="flex flex-wrap gap-5">
            <Panel title="Phễu chuyển đổi" className="flex-[1_1_520px]">
              <Funnel t={t} />
              <div className="grid grid-cols-2 gap-2 pt-2 text-sm sm:grid-cols-4">
                <RateTile label="Lead / Tin nhắn" value={d.leadPerMessage} />
                <RateTile label="Tiếp cận / Lead" value={d.reachedRate} />
                <RateTile label="Tư vấn / Lead" value={d.consultRate} goal={goal.rate.consult_rate} />
                <RateTile label="Chốt / Lead" value={d.closeRate} goal={goal.rate.close_rate} />
              </div>
            </Panel>

            <Panel title="Chi phí trên mỗi bước" className="flex-[1_1_340px]">
              <CostRow label="Chi phí / Tin nhắn" value={d.costPerMessage} />
              <CostRow label="Chi phí / Lead (CPL)" value={d.cpl} goal={goal.rate.cpl} />
              <CostRow label="Chi phí / Tiếp cận" value={d.costPerReached} />
              <CostRow label="Chi phí / Tư vấn" value={d.costPerConsulted} />
              <CostRow label="Chi phí / Khách chốt" value={d.costPerClosed} />
              <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
                <RateTile label="CPM" value={d.cpm} money />
                <RateTile label="CTR" value={d.ctr} />
              </div>
            </Panel>
          </div>

          <DailyChart days={view.days} />

          <Panel
            title="So sánh theo nguồn"
            actions={
              <button type="button" className="btn" onClick={() => exportCsv(view.comparison, filter)}>
                Xuất CSV
              </button>
            }
          >
            <ComparisonTable rows={view.comparison} />
          </Panel>
        </>
      )}
    </>
  );
}

function KpiCard({ label, value, actual, goal, fmt }: { label: string; value: string; actual: number; goal: number; fmt: (n: number) => string }) {
  const p = goal > 0 ? Math.round((actual / goal) * 100) : null;
  const done = p !== null && p >= 100;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className="text-[26px] font-bold tabular-nums tracking-tight">{value}</div>
      <div className="h-1.5 overflow-hidden rounded bg-[#EEF0F3]">
        <div className={'h-1.5 rounded ' + (done ? 'bg-[#1F8A4C]' : 'bg-brand')} style={{ width: `${Math.min(p ?? 0, 100)}%` }} />
      </div>
      <div className="flex justify-between gap-2 text-xs text-muted">
        <span>{goal > 0 ? 'Mục tiêu ' + fmt(goal) : 'Chưa đặt mục tiêu'}</span>
        {p !== null && <span className={'font-semibold ' + (done ? 'text-[#1A7A43]' : 'text-sub')}>{p}%</span>}
      </div>
    </div>
  );
}

function Funnel({ t }: { t: Totals }) {
  const steps = [
    { label: 'Tin nhắn', v: t.messages },
    { label: 'Lead', v: t.leads },
    { label: 'Tiếp cận', v: t.reached },
    { label: 'Tư vấn', v: t.consulted },
    { label: 'Khách chốt', v: t.closed },
  ];
  const max = Math.max(1, ...steps.map((s) => s.v));
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="w-24 shrink-0 text-[13px] text-sub">{s.label}</div>
          <div className="h-8 flex-1 overflow-hidden rounded-md bg-soft">
            <div className="h-8 rounded-md bg-brand" style={{ width: `${s.v > 0 ? Math.max((s.v / max) * 100, 2) : 0}%`, opacity: 1 - i * 0.15 }} />
          </div>
          <div className="w-14 text-right font-semibold tabular-nums">{num(s.v)}</div>
        </div>
      ))}
    </div>
  );
}

function RateTile({ label, value, goal, money }: { label: string; value: number | null; goal?: number; money?: boolean }) {
  const ok = goal !== undefined && value !== null ? value >= goal : null;
  return (
    <div className="rounded-[10px] bg-soft p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-bold tabular-nums">{money ? vnd(value) : percent(value)}</div>
      {goal !== undefined && (
        <div className={'text-xs ' + (ok === null ? 'text-muted' : ok ? 'text-[#1A7A43]' : 'text-[#B42318]')}>Mục tiêu {percent(goal, 0)}</div>
      )}
    </div>
  );
}

function CostRow({ label, value, goal }: { label: string; value: number | null; goal?: number }) {
  let note = value === null ? 'Chưa đủ dữ liệu' : '';
  let color = 'text-muted';
  if (goal && value !== null) {
    const ok = value <= goal;
    note = (ok ? 'Đạt' : 'Vượt') + ' mục tiêu ' + vnd(goal);
    color = ok ? 'text-[#1A7A43]' : 'text-[#B42318]';
  }
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#EEF0F3] py-2">
      <div className="text-sm text-sub">{label}</div>
      <div className="text-right">
        <div className="font-semibold tabular-nums">{vnd(value)}</div>
        {note && <div className={'text-xs ' + color}>{note}</div>}
      </div>
    </div>
  );
}

function DailyChart({ days }: { days: { day: string; totals: Totals }[] }) {
  const maxSpend = Math.max(1, ...days.map((d) => d.totals.spend));
  const maxLead = Math.max(1, ...days.map((d) => d.totals.leads));
  const minWidth = Math.max(560, days.length * 22);
  return (
    <Panel
      title="Theo ngày"
      actions={
        <div className="flex gap-4 text-[13px] text-sub">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
            Chi phí
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
            Lead
          </span>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <div className="flex h-52 items-end gap-1.5 border-b border-line2 px-1" style={{ minWidth }}>
          {days.map((d) => (
            <div key={d.day} title={`${fmtDate(d.day)} · ${vnd(d.totals.spend)} · ${d.totals.leads} lead`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="min-h-3.5 text-[11px] font-semibold text-accent-dark">{d.totals.leads || ''}</div>
              <div className="flex w-full items-end justify-center gap-0.5">
                <div className="w-[45%] max-w-3.5 rounded-t-sm bg-brand" style={{ height: (d.totals.spend / maxSpend) * 160 }} />
                <div className="w-[45%] max-w-3.5 rounded-t-sm bg-accent" style={{ height: (d.totals.leads / maxLead) * 160 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 px-1 pt-1.5" style={{ minWidth }}>
          {days.map((d) => (
            <div key={d.day} className="flex-1 text-center text-[11px] text-muted">
              {days.length > 31 ? fmtShort(d.day) : d.day.slice(8, 10)}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ComparisonTable({ rows }: { rows: ReturnType<typeof buildComparison> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-sm tabular-nums">
        <thead>
          <tr className="text-right">
            <th scope="col" className="th text-left">
              Nguồn
            </th>
            {['Chi phí', 'Tin nhắn', 'Lead', 'Tiếp cận', 'Tư vấn', 'Chốt', 'CPL', 'TV / Lead', 'Chốt / Lead'].map((h) => (
              <th key={h} scope="col" className="th">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = derive(r.totals);
            const strong = r.level !== 'source';
            return (
              <tr key={r.key} className={'text-right ' + (strong ? 'bg-soft font-semibold' : '')}>
                <th scope="row" className={'td text-left ' + (strong ? 'font-semibold' : 'pl-7 font-normal')}>
                  {r.name}
                </th>
                <td className="td">{r.totals.spend ? vnd(r.totals.spend) : '—'}</td>
                <td className="td">{num(r.totals.messages)}</td>
                <td className="td">{num(r.totals.leads)}</td>
                <td className="td">{num(r.totals.reached)}</td>
                <td className="td">{num(r.totals.consulted)}</td>
                <td className="td">{num(r.totals.closed)}</td>
                <td className="td">{vnd(d.cpl)}</td>
                <td className="td">{percent(d.consultRate)}</td>
                <td className="td">{percent(d.closeRate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function exportCsv(rows: ReturnType<typeof buildComparison>, filter: FilterState) {
  const header = ['Nguồn', 'Chi phí', 'Tin nhắn', 'Hiển thị', 'Click', 'Lead', 'Tiếp cận', 'Tư vấn', 'Chốt', 'CPL', 'TV/Lead', 'Chốt/Lead'];
  const lines = rows.map((r) => {
    const d = derive(r.totals);
    const t = r.totals;
    return [r.name, t.spend, t.messages, t.impressions, t.clicks, t.leads, t.reached, t.consulted, t.closed, d.cpl ? Math.round(d.cpl) : '', percent(d.consultRate), percent(d.closeRate)];
  });
  const csv = [header, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bao-cao_${filter.from}_${filter.to}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
