import type { ReactNode } from 'react';

export function Panel({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={'flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:p-5 ' + className}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center gap-3">
          {title && <h2 className="mr-auto text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={
        'flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium ' +
        (active ? 'border-brand bg-brand text-white' : 'border-line2 bg-white text-ink hover:bg-soft')
      }
    >
      {children}
    </button>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

export function Loading() {
  return <div className="py-10 text-center text-sm text-muted">Đang tải…</div>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center">
          <h2 className="mr-auto text-lg font-semibold">{title}</h2>
          <button type="button" aria-label="Đóng" className="btn-ghost h-10 w-10 justify-center p-0" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      {label}
      {children}
    </label>
  );
}
