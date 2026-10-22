import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBox, Loading, Panel } from '../components/ui';
import { addDays, dowLabel, eachDay, fmtDate, fmtShort, startOfWeek, today } from '../lib/date';
import { num, parseNumber } from '../lib/format';
import { supabase } from '../lib/supabase';
import type { DailyMetric, ReportRow } from '../lib/types';
import { useSources } from '../lib/useSources';

type FormRow = { spend: string; messages: string; impressions: string; clicks: string };
const EMPTY_ROW: FormRow = { spend: '', messages: '', impressions: '', clicks: '' };

function toForm(m?: DailyMetric): FormRow {
  if (!m) {
    return { ...EMPTY_ROW };
  }
  const f = (n: number) => (n ? Number(n).toLocaleString('vi-VN') : '');
  return { spend: f(m.spend), messages: f(m.messages), impressions: f(m.impressions), clicks: f(m.clicks) };
}

export default function DailyEntry() {
  const { sources, loading: loadingSources, error: sourcesError } = useSources();
  const [day, setDay] = useState(today());
  const weekStart = startOfWeek(day);
  const week = useMemo(() => eachDay(weekStart, addDays(weekStart, 6)), [weekStart]);

  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [form, setForm] = useState<Record<string, FormRow>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWeek = useCallback(async () => {
    const [m, r] = await Promise.all([
      supabase.from('daily_metrics').select('*').gte('metric_date', addDays(week[0], -1)).lte('metric_date', week[6]),
      supabase.rpc('report_daily', { p_from: week[0], p_to: week[6], p_source_ids: null }),
    ]);
    setError(m.error?.message ?? r.error?.message ?? null);
    setMetrics((m.data as DailyMetric[]) ?? []);
    setReport((r.data as ReportRow[]) ?? []);
  }, [week]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  // Đổ dữ liệu ngày đang chọn vào form.
  useEffect(() => {
    const next: Record<string, FormRow> = {};
    for (const s of sources) {
      next[s.id] = toForm(metrics.find((m) => m.metric_date === day && m.source_id === s.id));
    }
    setForm(next);
    setDirty(false);
    setMessage(null);
  }, [day, metrics, sources]);

  const dayStatus = (d: string): 'done' | 'partial' | 'empty' | 'future' => {
    if (d > today()) {
      return 'future';
    }
    const n = sources.filter((s) => metrics.some((m) => m.metric_date === d && m.source_id === s.id)).length;
    if (n === 0) {
      return 'empty';
    }
    return n === sources.length ? 'done' : 'partial';
  };

  const leadCounts = useMemo(() => {
    const rows = report.filter((r) => r.day === day);
    const sum = (k: keyof ReportRow) => rows.reduce((a, r) => a + Number(r[k]), 0);
    return { leads: sum('leads'), reached: sum('reached'), consulted: sum('consulted'), closed: sum('closed') };
  }, [report, day]);

  const update = (sourceId: string, key: keyof FormRow, value: string) => {
    setForm((f) => ({ ...f, [sourceId]: { ...f[sourceId], [key]: value } }));
    setDirty(true);
  };

  const copyYesterday = () => {
    const y = addDays(day, -1);
    const next: Record<string, FormRow> = {};
    for (const s of sources) {
      next[s.id] = toForm(metrics.find((m) => m.metric_date === y && m.source_id === s.id));
    }
    setForm(next);
    setDirty(true);
  };

  const pickDay = (d: string) => {
    if (dirty && !window.confirm('Số liệu chưa lưu sẽ mất. Tiếp tục?')) {
      return;
    }
    setDay(d);
  };

  const save = async () => {
    setSaving(true);
    const payload = sources.map((s) => {
      const f = form[s.id] ?? EMPTY_ROW;
      return {
        metric_date: day,
        source_id: s.id,
        spend: s.has_cost ? parseNumber(f.spend) : 0,
        messages: parseNumber(f.messages),
        impressions: parseNumber(f.impressions),
        clicks: parseNumber(f.clicks),
      };
    });
    const { error: err } = await supabase.from('daily_metrics').upsert(payload, { onConflict: 'metric_date,source_id' });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    await loadWeek();
    setMessage(`Đã lưu số liệu ngày ${fmtDate(day)}.`);
  };

  if (loadingSources) {
    return <Loading />;
  }

  const dot = { done: 'bg-[#1F8A4C]', partial: 'bg-accent', empty: 'bg-[#D92D20]', future: 'bg-line2' };

  return (
    <>
      <div>
        <h1 className="text-[22px] font-bold">Nhập số liệu hằng ngày</h1>
        <p className="mt-1 text-sm text-muted">
          Mỗi ngày chỉ cần nhập chi phí và tin nhắn của từng nguồn. Lead, tiếp cận, tư vấn, chốt được đếm tự động từ <Link to="/lead">danh sách lead</Link>.
        </p>
      </div>
      <ErrorBox message={sourcesError ?? error} />

      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Tuần trước" className="btn h-11 w-11 justify-center p-0" onClick={() => pickDay(addDays(day, -7))}>
            ‹
          </button>
          <div className="text-[15px] font-semibold">
            Tuần {fmtShort(week[0])} – {fmtDate(week[6])}
          </div>
          <button type="button" aria-label="Tuần sau" className="btn h-11 w-11 justify-center p-0" onClick={() => pickDay(addDays(day, 7))}>
            ›
          </button>
          <button type="button" className="btn-ghost" onClick={() => pickDay(today())}>
            Hôm nay
          </button>
          <div className="ml-auto flex flex-wrap gap-4 text-xs text-muted">
            <Legend className={dot.done} label="Đã nhập đủ" />
            <Legend className={dot.partial} label="Còn thiếu nguồn" />
            <Legend className={dot.empty} label="Chưa nhập" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {week.map((d) => {
            const active = d === day;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                onClick={() => pickDay(d)}
                className={
                  'flex min-h-16 flex-col items-center justify-center gap-1 rounded-[10px] ' +
                  (active ? 'border-2 border-brand bg-brand-soft text-brand-dark' : 'border border-line2 bg-white')
                }
              >
                <span className="text-xs text-muted">{dowLabel(d)}</span>
                <span className="text-base font-semibold">{fmtShort(d)}</span>
                <span className={'h-2 w-2 rounded-full ' + dot[dayStatus(d)]} />
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="flex flex-wrap items-start gap-5">
        <Panel title={`Số liệu ngày ${fmtDate(day)}`} className="flex-[999_1_640px]">
          {sources.length === 0 ? (
            <p className="text-sm text-muted">
              Chưa có nguồn nào. Vào <Link to="/cai-dat">Nguồn &amp; mục tiêu</Link> để thêm.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="flex flex-col gap-3"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left">
                      <th scope="col" className="th">
                        Nguồn
                      </th>
                      <th scope="col" className="th">
                        Chi phí (đ)
                      </th>
                      <th scope="col" className="th">
                        Tin nhắn
                      </th>
                      <th scope="col" className="th">
                        Hiển thị
                      </th>
                      <th scope="col" className="th">
                        Click
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((s) => {
                      const f = form[s.id] ?? EMPTY_ROW;
                      const missingMsg = s.has_cost && parseNumber(f.spend) > 0 && !parseNumber(f.messages);
                      return (
                        <tr key={s.id}>
                          <th scope="row" className="td text-left font-medium">
                            <div>{s.name}</div>
                            <div className="text-xs font-normal text-muted">{s.channel_group}</div>
                          </th>
                          <td className="td">
                            {s.has_cost ? (
                              <NumberInput label={`Chi phí ${s.name}`} value={f.spend} onChange={(v) => update(s.id, 'spend', v)} />
                            ) : (
                              <span className="text-[13px] text-muted">Không tốn phí</span>
                            )}
                          </td>
                          <td className="td">
                            <NumberInput label={`Tin nhắn ${s.name}`} value={f.messages} warn={missingMsg} onChange={(v) => update(s.id, 'messages', v)} />
                          </td>
                          <td className="td">
                            <NumberInput label={`Hiển thị ${s.name}`} value={f.impressions} onChange={(v) => update(s.id, 'impressions', v)} />
                          </td>
                          <td className="td">
                            <NumberInput label={`Click ${s.name}`} value={f.clicks} onChange={(v) => update(s.id, 'clicks', v)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                {message && !dirty && (
                  <span role="status" className="mr-auto text-sm text-[#1A7A43]">
                    {message}
                  </span>
                )}
                <button type="button" className="btn min-h-11" onClick={copyYesterday}>
                  Chép từ hôm trước
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu…' : `Lưu ngày ${fmtShort(day)}`}
                </button>
              </div>
            </form>
          )}
        </Panel>

        <Panel title="Tự đếm từ danh sách lead" className="flex-[1_1_280px]">
          <p className="text-[13px] text-muted">Ngày {fmtDate(day)}, tất cả nguồn</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              ['Lead', leadCounts.leads],
              ['Tiếp cận', leadCounts.reached],
              ['Tư vấn', leadCounts.consulted],
              ['Khách chốt', leadCounts.closed],
            ].map(([label, v]) => (
              <div key={label} className="rounded-[10px] bg-soft p-3">
                <div className="text-xs text-muted">{label}</div>
                <div className="text-[22px] font-bold">{num(Number(v))}</div>
              </div>
            ))}
          </div>
          <Link to={`/lead?from=${day}&to=${day}`} className="text-sm font-semibold">
            Xem lead của ngày này →
          </Link>
        </Panel>
      </div>
    </>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={'h-2 w-2 rounded-full ' + className} />
      {label}
    </span>
  );
}

function NumberInput({ label, value, onChange, warn }: { label: string; value: string; onChange: (v: string) => void; warn?: boolean }) {
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      placeholder="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        const n = parseNumber(e.target.value);
        const formatted = n ? n.toLocaleString('vi-VN') : '';
        if (formatted !== value) {
          onChange(formatted);
        }
      }}
      className={'input min-w-24 text-right tabular-nums ' + (warn ? 'border-accent bg-[#FFF8EF]' : '')}
    />
  );
}
