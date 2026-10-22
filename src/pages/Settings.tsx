import { useEffect, useState } from 'react';
import { ErrorBox, Field, Loading, Panel } from '../components/ui';
import { addDays, startOfMonth, today } from '../lib/date';
import { parseNumber } from '../lib/format';
import { supabase } from '../lib/supabase';
import type { CountMetric, Goal, RateMetric, Source } from '../lib/types';
import { useSources } from '../lib/useSources';

export default function Settings() {
  const { sources, loading, error, reload } = useSources(true);
  if (loading) {
    return <Loading />;
  }
  return (
    <>
      <h1 className="text-[22px] font-bold">Nguồn &amp; mục tiêu</h1>
      <ErrorBox message={error} />
      <SourcesPanel sources={sources} onChanged={reload} />
      <GoalsPanel sources={sources.filter((s) => s.is_active)} />
    </>
  );
}

function slugify(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'nguon'
  );
}

/* ------------------------------------------------------------------ */

function SourcesPanel({ sources, onChanged }: { sources: Source[]; onChanged: () => Promise<void> }) {
  const [rows, setRows] = useState<Source[]>(sources);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', channel_group: '', has_cost: false });
  const groups = [...new Set(sources.map((s) => s.channel_group))];

  useEffect(() => setRows(sources), [sources]);

  const patch = (id: string, p: Partial<Source>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const saveAll = async () => {
    const changed = rows.filter((r) => {
      const o = sources.find((s) => s.id === r.id);
      return o && JSON.stringify(o) !== JSON.stringify(r);
    });
    for (const r of changed) {
      const { error: err } = await supabase
        .from('sources')
        .update({ name: r.name.trim(), channel_group: r.channel_group.trim() || 'Khác', has_cost: r.has_cost, sort_order: r.sort_order, is_active: r.is_active })
        .eq('id', r.id);
      if (err) {
        setError(err.message);
        return;
      }
    }
    setError(null);
    setSaved(changed.length ? `Đã lưu ${changed.length} nguồn.` : 'Không có thay đổi.');
    await onChanged();
  };

  const add = async () => {
    if (!draft.name.trim()) {
      setError('Nhập tên nguồn.');
      return;
    }
    let code = slugify(draft.name);
    if (sources.some((s) => s.code === code)) {
      code += '_' + Date.now().toString(36);
    }
    const sortOrder = Math.max(0, ...sources.map((s) => s.sort_order)) + 10;
    const { error: err } = await supabase.from('sources').insert({
      code,
      name: draft.name.trim(),
      channel_group: draft.channel_group.trim() || 'Khác',
      has_cost: draft.has_cost,
      sort_order: sortOrder,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setSaved(`Đã thêm nguồn "${draft.name.trim()}".`);
    setDraft({ name: '', channel_group: '', has_cost: false });
    await onChanged();
  };

  const remove = async (s: Source) => {
    if (!window.confirm(`Xoá hẳn nguồn "${s.name}"? Số liệu ngày và mục tiêu của nguồn này cũng bị xoá.`)) {
      return;
    }
    const { error: err } = await supabase.from('sources').delete().eq('id', s.id);
    if (err) {
      setError(err.code === '23503' ? `Nguồn "${s.name}" đã có lead nên không xoá được. Hãy bỏ chọn "Đang dùng" để ẩn nó.` : err.message);
      return;
    }
    setError(null);
    await onChanged();
  };

  return (
    <Panel
      title="Nguồn"
      actions={
        <button type="button" className="btn-primary" onClick={() => void saveAll()}>
          Lưu thay đổi
        </button>
      }
    >
      <p className="text-sm text-muted">Nguồn ẩn (bỏ "Đang dùng") sẽ không hiện ở báo cáo và nhập liệu, nhưng lead cũ vẫn giữ nguyên.</p>
      <ErrorBox message={error} />
      {saved && !error && (
        <p role="status" className="text-sm text-[#1A7A43]">
          {saved}
        </p>
      )}
      <datalist id="group-list">
        {groups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="text-left">
              <th scope="col" className="th">
                Tên nguồn
              </th>
              <th scope="col" className="th">
                Nhóm kênh
              </th>
              <th scope="col" className="th text-center">
                Có chi phí
              </th>
              <th scope="col" className="th">
                Thứ tự
              </th>
              <th scope="col" className="th text-center">
                Đang dùng
              </th>
              <th scope="col" className="th">
                <span className="sr-only">Xoá</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.is_active ? '' : 'opacity-60'}>
                <td className="td">
                  <input aria-label="Tên nguồn" className="input" value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} />
                </td>
                <td className="td">
                  <input aria-label="Nhóm kênh" className="input" list="group-list" value={r.channel_group} onChange={(e) => patch(r.id, { channel_group: e.target.value })} />
                </td>
                <td className="td text-center">
                  <input type="checkbox" aria-label={`${r.name} có chi phí`} className="h-[18px] w-[18px] accent-brand" checked={r.has_cost} onChange={(e) => patch(r.id, { has_cost: e.target.checked })} />
                </td>
                <td className="td">
                  <input aria-label="Thứ tự" className="input w-20" inputMode="numeric" value={r.sort_order} onChange={(e) => patch(r.id, { sort_order: parseNumber(e.target.value) })} />
                </td>
                <td className="td text-center">
                  <input type="checkbox" aria-label={`${r.name} đang dùng`} className="h-[18px] w-[18px] accent-brand" checked={r.is_active} onChange={(e) => patch(r.id, { is_active: e.target.checked })} />
                </td>
                <td className="td text-right">
                  <button type="button" className="btn-ghost text-[#B42318]" onClick={() => void remove(r)}>
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="flex flex-wrap items-end gap-2.5 rounded-[10px] bg-soft p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Field label="Tên nguồn mới">
          <input className="input min-w-52" placeholder="VD: Zalo OA" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Nhóm kênh">
          <input className="input min-w-40" list="group-list" placeholder="VD: Zalo" value={draft.channel_group} onChange={(e) => setDraft({ ...draft, channel_group: e.target.value })} />
        </Field>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand" checked={draft.has_cost} onChange={(e) => setDraft({ ...draft, has_cost: e.target.checked })} />
          Có chi phí quảng cáo
        </label>
        <button type="submit" className="btn-primary">
          + Thêm nguồn
        </button>
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

const COUNT_METRICS: { key: CountMetric; label: string; costOnly?: boolean }[] = [
  { key: 'spend', label: 'Ngân sách (đ)', costOnly: true },
  { key: 'messages', label: 'Tin nhắn' },
  { key: 'lead', label: 'Lead' },
  { key: 'reached', label: 'Tiếp cận' },
  { key: 'consulted', label: 'Tư vấn' },
  { key: 'closed', label: 'Khách chốt' },
];

const RATE_METRICS: { key: RateMetric; label: string; percent: boolean }[] = [
  { key: 'cpl', label: 'CPL tối đa (đ / lead)', percent: false },
  { key: 'consult_rate', label: 'Tỷ lệ Tư vấn / Lead (%)', percent: true },
  { key: 'close_rate', label: 'Tỷ lệ Chốt / Lead (%)', percent: true },
];

const cellKey = (sourceId: string | null, metric: string) => `${sourceId ?? 'all'}:${metric}`;

function GoalsPanel({ sources }: { sources: Source[] }) {
  const [month, setMonth] = useState(startOfMonth(today()));
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const toValues = (goals: Goal[]) => {
    const v: Record<string, string> = {};
    for (const g of goals) {
      const rate = RATE_METRICS.find((m) => m.key === g.metric);
      const n = Number(g.target);
      v[cellKey(g.source_id, g.metric)] = rate?.percent ? String(+(n * 100).toFixed(2)) : n.toLocaleString('vi-VN');
    }
    return v;
  };

  const loadMonth = async (m: string) => {
    const { data, error: err } = await supabase.from('goals').select('*').eq('month', m);
    if (err) {
      setError(err.message);
    }
    return (data as Goal[]) ?? [];
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSaved(null);
    void loadMonth(month).then((goals) => {
      if (!cancelled) {
        setValues(toValues(goals));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const copyPrevious = async () => {
    const prev = startOfMonth(addDays(month, -1));
    setValues(toValues(await loadMonth(prev)));
    setSaved('Đã chép mục tiêu tháng trước, bấm Lưu để áp dụng.');
  };

  const save = async () => {
    const payload: Goal[] = [];
    for (const s of sources) {
      for (const m of COUNT_METRICS) {
        if (m.costOnly && !s.has_cost) {
          continue;
        }
        payload.push({ month, source_id: s.id, metric: m.key, target: parseNumber(values[cellKey(s.id, m.key)] ?? '') });
      }
    }
    for (const m of RATE_METRICS) {
      const raw = (values[cellKey(null, m.key)] ?? '').replace(',', '.');
      const n = m.percent ? Number(raw) / 100 : parseNumber(raw);
      payload.push({ month, source_id: null, metric: m.key, target: Number.isFinite(n) ? n : 0 });
    }
    const { error: err } = await supabase.from('goals').upsert(payload, { onConflict: 'month,source_id,metric' });
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setSaved('Đã lưu mục tiêu.');
  };

  const set = (k: string, v: string) => setValues((x) => ({ ...x, [k]: v }));

  return (
    <Panel
      title="Mục tiêu theo tháng"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="goal-month">
            Tháng
          </label>
          <input id="goal-month" type="month" className="input w-auto" value={month.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value + '-01')} />
          <button type="button" className="btn" onClick={() => void copyPrevious()}>
            Chép tháng trước
          </button>
          <button type="button" className="btn-primary" onClick={() => void save()}>
            Lưu mục tiêu
          </button>
        </div>
      }
    >
      <p className="text-sm text-muted">Để trống = không đặt mục tiêu. Khi xem báo cáo theo tuần, mục tiêu tháng được chia theo số ngày.</p>
      <ErrorBox message={error} />
      {saved && !error && (
        <p role="status" className="text-sm text-[#1A7A43]">
          {saved}
        </p>
      )}
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th scope="col" className="th">
                    Nguồn
                  </th>
                  {COUNT_METRICS.map((m) => (
                    <th key={m.key} scope="col" className="th">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <th scope="row" className="td text-left font-medium">
                      {s.name}
                    </th>
                    {COUNT_METRICS.map((m) => (
                      <td key={m.key} className="td">
                        {m.costOnly && !s.has_cost ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <input
                            aria-label={`${m.label} ${s.name}`}
                            className="input min-w-24 text-right tabular-nums"
                            inputMode="numeric"
                            placeholder="—"
                            value={values[cellKey(s.id, m.key)] ?? ''}
                            onChange={(e) => set(cellKey(s.id, m.key), e.target.value)}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-[10px] bg-soft p-3 sm:grid-cols-3">
            {RATE_METRICS.map((m) => (
              <Field key={m.key} label={m.label}>
                <input
                  className="input text-right tabular-nums"
                  inputMode="decimal"
                  placeholder="—"
                  value={values[cellKey(null, m.key)] ?? ''}
                  onChange={(e) => set(cellKey(null, m.key), e.target.value)}
                />
              </Field>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
