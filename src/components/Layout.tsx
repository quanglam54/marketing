import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const NAV = [
  { to: '/', label: 'Tổng quan', end: true },
  { to: '/nhap-lieu', label: 'Nhập số liệu', end: false },
  { to: '/lead', label: 'Lead', end: false },
  { to: '/cai-dat', label: 'Nguồn & mục tiêu', end: false },
];

export default function Layout({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-soft text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2.5 text-base font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm text-white">Z</div>
            Báo cáo Marketing
          </div>
          <nav aria-label="Điều hướng chính" className="flex flex-wrap gap-1 text-sm font-medium">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  'rounded-lg px-3.5 py-2.5 no-underline ' + (isActive ? 'bg-brand-soft text-brand-dark' : 'text-sub hover:bg-soft')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted">
            <span className="hidden sm:inline">{email}</span>
            <button type="button" className="btn-ghost" onClick={() => void supabase.auth.signOut()}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
