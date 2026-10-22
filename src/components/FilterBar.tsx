import { RANGE_PRESETS, today } from '../lib/date';
import { groupSources } from '../lib/useSources';
import type { Source } from '../lib/types';
import { Chip } from './ui';

export interface FilterState {
  preset: string;
  from: string;
  to: string;
  sourceIds: string[];
}

export default function FilterBar({ sources, value, onChange }: { sources: Source[]; value: FilterState; onChange: (v: FilterState) => void }) {
  const selected = new Set(value.sourceIds);
  const setSources = (ids: string[]) => onChange({ ...value, sourceIds: ids });

  return (
    <section aria-label="Bộ lọc" className="flex flex-col gap-3.5 rounded-xl border border-line bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-[13px] font-semibold text-muted">Thời gian</span>
        {RANGE_PRESETS.map((p) => (
          <Chip key={p.id} active={value.preset === p.id} onClick={() => onChange({ ...value, preset: p.id, ...p.range(today()) })}>
            {p.label}
          </Chip>
        ))}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <label className="sr-only" htmlFor="from">
            Từ ngày
          </label>
          <input
            id="from"
            type="date"
            className="input w-auto"
            value={value.from}
            max={value.to}
            onChange={(e) => e.target.value && onChange({ ...value, preset: 'custom', from: e.target.value })}
          />
          <span className="text-muted">→</span>
          <label className="sr-only" htmlFor="to">
            Đến ngày
          </label>
          <input
            id="to"
            type="date"
            className="input w-auto"
            value={value.to}
            min={value.from}
            onChange={(e) => e.target.value && onChange({ ...value, preset: 'custom', to: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-[13px] font-semibold text-muted">Nguồn</span>
        <button type="button" className="min-h-9 rounded-lg border border-dashed border-[#B9BFC7] bg-white px-3 text-[13px]" onClick={() => setSources(sources.map((s) => s.id))}>
          Tất cả
        </button>
        {groupSources(sources).map((g) => {
          const allOn = g.items.every((s) => selected.has(s.id));
          return (
            <div key={g.name} role="group" aria-label={g.name} className="flex flex-wrap items-center gap-1.5 rounded-[10px] bg-soft py-1 pl-2.5 pr-1.5">
              <button
                type="button"
                className="min-h-8 px-1 text-xs font-semibold text-sub"
                onClick={() => {
                  const ids = new Set(selected);
                  g.items.forEach((s) => (allOn ? ids.delete(s.id) : ids.add(s.id)));
                  setSources([...ids]);
                }}
              >
                {g.name}
              </button>
              {g.items.map((s) => {
                const on = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const ids = new Set(selected);
                      if (on) {
                        ids.delete(s.id);
                      } else {
                        ids.add(s.id);
                      }
                      setSources([...ids]);
                    }}
                    className={
                      'flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium ' +
                      (on ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line2 bg-white text-sub')
                    }
                  >
                    {on && (
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                    {s.name}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
