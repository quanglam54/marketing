import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorBox, Field, Loading, Modal, Panel } from '../components/ui';
import { fmtDate, RANGE_PRESETS, today } from '../lib/date';
import { LEAD_STATUSES, statusOf } from '../lib/statuses';
import { supabase } from '../lib/supabase';
import type { Lead, Source } from '../lib/types';
import { useSources } from '../lib/useSources';

const PAGE_SIZE = 50;
const FUNNEL_LABEL = { reached: 'Tiếp cận', consulted: 'Tư vấn', closed: 'Chốt' } as const;

type Draft = Omit<Lead, 'id'> & { id?: string };

export default function Leads() {
  const { sources, loading: loadingSources } = useSources(true);
  const [params, setParams] = useSearchParams();
  const month = RANGE_PRESETS.find((p) => p.id === 'month')!.range(today());
  const from = params.get('from') ?? month.from;
  const to = params.get('to') ?? month.to;
  const sourceId = params.get('source') ?? '';
  const sale = params.get('sale') ?? '';
  const status = params.get('status') ?? '';

  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Draft | null>(null);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next, { replace: true });
    setPage(0);
  };

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('leads').select('*').gte('lead_date', from).lte('lead_date', to).order('lead_date', { ascending: false }).order('created_at', { ascending: false });
    if (sourceId) {
      q = q.eq('source_id', sourceId);
    }
    if (sale) {
      q = q.eq('sale', sale);
    }
    const { data, error: err } = await q;
    setError(err?.message ?? null);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, [from, to, sourceId, sale]);

  useEffect(() => {
    void load();
  }, [load]);

  const searched = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) {
      return leads;
    }
    return leads.filter((l) => [l.name, l.phone, l.service, l.note].some((v) => v?.toLowerCase().includes(s)));
  }, [leads, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    searched.forEach((l) => (c[l.status] = (c[l.status] ?? 0) + 1));
    return c;
  }, [searched]);

  const filtered = status ? searched.filter((l) => l.status === status) : searched;
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const sourceName = (id: string) => sources.find((s) => s.id === id)?.name ?? '—';
  const sales = useMemo(() => [...new Set(leads.map((l) => l.sale).filter(Boolean) as string[])].sort(), [leads]);

  const toggle = async (lead: Lead, key: 'reached' | 'consulted' | 'closed') => {
    const value = !lead[key];
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, [key]: value } : l)));
    const { error: err } = await supabase.from('leads').update({ [key]: value }).eq('id', lead.id);
    if (err) {
      setError(err.message);
      void load();
    }
  };

  const newDraft = (): Draft => ({
    lead_date: today(),
    name: '',
    phone: '',
    service: '',
    source_id: sourceId || sources.find((s) => s.is_active)?.id || '',
    sale: '',
    status: 'new',
    reached: false,
    consulted: false,
    closed: false,
    note: '',
  });

  if (loadingSources) {
    return <Loading />;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-[22px] font-bold">
          Lead <span className="text-base font-medium text-muted">· {filtered.length} lead</span>
        </h1>
        <button type="button" className="btn-primary" onClick={() => setEditing(newDraft())} disabled={!sources.length}>
          + Thêm lead
        </button>
      </div>
      <ErrorBox message={error} />

      <Panel>
        <div className="flex flex-wrap gap-2.5">
          <Field label="Tìm kiếm">
            <input className="input min-w-60" placeholder="Tên, SĐT, sản phẩm, ghi chú…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <Field label="Nguồn">
            <select className="input" value={sourceId} onChange={(e) => setParam('source', e.target.value)}>
              <option value="">Tất cả nguồn</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sale">
            <select className="input" value={sale} onChange={(e) => setParam('sale', e.target.value)}>
              <option value="">Tất cả sale</option>
              {sales.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Từ ngày">
            <input type="date" className="input" value={from} max={to} onChange={(e) => e.target.value && setParam('from', e.target.value)} />
          </Field>
          <Field label="Đến ngày">
            <input type="date" className="input" value={to} min={from} onChange={(e) => e.target.value && setParam('to', e.target.value)} />
          </Field>
        </div>
        <div role="group" aria-label="Lọc theo tình trạng" className="flex flex-wrap gap-2">
          <StatusChip active={!status} label="Tất cả" count={searched.length} dot="#1A1D21" onClick={() => setParam('status', '')} />
          {LEAD_STATUSES.map((s) => (
            <StatusChip key={s.code} active={status === s.code} label={s.label} count={counts[s.code] ?? 0} dot={s.dot} onClick={() => setParam('status', s.code)} />
          ))}
        </div>
      </Panel>

      <section aria-label="Bảng lead" className="overflow-hidden rounded-xl border border-line bg-white">
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-sm">
              <thead className="bg-[#F9FAFB] text-left">
                <tr>
                  {['Ngày', 'Khách', 'Sản phẩm / dịch vụ', 'Nguồn', 'Sale', 'Tình trạng'].map((h) => (
                    <th key={h} scope="col" className="th">
                      {h}
                    </th>
                  ))}
                  {['Tiếp cận', 'Tư vấn', 'Chốt'].map((h) => (
                    <th key={h} scope="col" className="th text-center">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="th">
                    <span className="sr-only">Sửa</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="td py-10 text-center text-muted">
                      Không có lead nào khớp bộ lọc.
                    </td>
                  </tr>
                )}
                {pageRows.map((l) => {
                  const st = statusOf(l.status);
                  return (
                    <tr key={l.id} className="hover:bg-[#FAFBFC]">
                      <td className="td whitespace-nowrap text-sub">{fmtDate(l.lead_date)}</td>
                      <td className="td">
                        <div className="font-medium">{l.name}</div>
                        {l.phone && <div className="text-xs text-muted">{l.phone}</div>}
                      </td>
                      <td className="td">
                        {l.service}
                        {l.note && <div className="max-w-xs truncate text-xs text-muted">{l.note}</div>}
                      </td>
                      <td className="td whitespace-nowrap">{sourceName(l.source_id)}</td>
                      <td className="td whitespace-nowrap">{l.sale}</td>
                      <td className="td">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: st.bg, color: st.fg }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      </td>
                      {(['reached', 'consulted', 'closed'] as const).map((k) => (
                        <td key={k} className="td text-center">
                          <input type="checkbox" aria-label={`${FUNNEL_LABEL[k]} – ${l.name}`} className="h-[18px] w-[18px] accent-brand" checked={l[k]} onChange={() => void toggle(l, k)} />
                        </td>
                      ))}
                      <td className="td text-right">
                        <button type="button" className="btn-ghost" onClick={() => setEditing({ ...l })}>
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px] text-muted">
          <span className="mr-auto">
            Trang {page + 1} / {pageCount} · {filtered.length} lead
          </span>
          <button type="button" className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Trang trước
          </button>
          <button type="button" className="btn" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Trang sau
          </button>
        </div>
      </section>

      {editing && (
        <LeadForm
          draft={editing}
          sources={sources}
          sales={sales}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </>
  );
}

function StatusChip({ active, label, count, dot, onClick }: { active: boolean; label: string; count: number; dot: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={'flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] ' + (active ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-ink')}
    >
      {!active && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {label} <b>{count}</b>
    </button>
  );
}

function LeadForm({ draft, sources, sales, onClose, onSaved }: { draft: Draft; sources: Source[]; sales: string[]; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!d.name.trim() || !d.source_id) {
      setError('Cần nhập tên khách và chọn nguồn.');
      return;
    }
    setSaving(true);
    const { id, ...rest } = d;
    const payload = { ...rest, name: rest.name.trim(), phone: rest.phone || null, service: rest.service || null, sale: rest.sale || null, note: rest.note || null };
    const res = id ? await supabase.from('leads').update(payload).eq('id', id) : await supabase.from('leads').insert(payload);
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    onSaved();
  };

  const remove = async () => {
    if (!d.id || !window.confirm(`Xoá lead "${d.name}"?`)) {
      return;
    }
    const { error: err } = await supabase.from('leads').delete().eq('id', d.id);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  };

  return (
    <Modal title={d.id ? 'Sửa lead' : 'Thêm lead'} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <ErrorBox message={error} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Ngày">
            <input type="date" className="input" required value={d.lead_date} onChange={(e) => set('lead_date', e.target.value)} />
          </Field>
          <Field label="Nguồn">
            <select className="input" required value={d.source_id} onChange={(e) => set('source_id', e.target.value)}>
              <option value="">Chọn nguồn…</option>
              {sources
                .filter((s) => s.is_active || s.id === d.source_id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Tên khách">
            <input className="input" required value={d.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Số điện thoại">
            <input className="input" inputMode="tel" value={d.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Sản phẩm / dịch vụ">
            <input className="input" value={d.service ?? ''} onChange={(e) => set('service', e.target.value)} />
          </Field>
          <Field label="Sale phụ trách">
            <input className="input" list="sales-list" value={d.sale ?? ''} onChange={(e) => set('sale', e.target.value)} />
            <datalist id="sales-list">
              {sales.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Tình trạng">
            <select
              className="input"
              value={d.status}
              onChange={(e) => {
                const st = statusOf(e.target.value);
                setD((x) => ({ ...x, status: st.code, ...st.implies }));
              }}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs font-medium text-muted">Phễu</legend>
            <div className="flex h-10 items-center gap-4 text-sm">
              {(
                [
                  ['reached', 'Tiếp cận'],
                  ['consulted', 'Tư vấn'],
                  ['closed', 'Chốt'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" className="h-4 w-4 accent-brand" checked={d[k]} onChange={(e) => set(k, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <Field label="Ghi chú">
          <textarea className="input h-20 py-2" value={d.note ?? ''} onChange={(e) => set('note', e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {d.id && (
            <button type="button" className="btn-ghost text-[#B42318]" onClick={() => void remove()}>
              Xoá
            </button>
          )}
          <button type="button" className="btn ml-auto" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
