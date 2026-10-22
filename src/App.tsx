import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Loading } from './components/ui';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import DailyEntry from './pages/DailyEntry';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Login from './pages/Login';
import Settings from './pages/Settings';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-xl p-8 text-sm leading-6">
        <h1 className="mb-2 text-xl font-bold">Chưa cấu hình Supabase</h1>
        <p>
          Tạo file <code>.env</code> ở thư mục gốc (copy từ <code>.env.example</code>), điền <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code>, rồi chạy lại{' '}
          <code>npm run dev</code>.
        </p>
      </div>
    );
  }

  if (session === undefined) {
    return <Loading />;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout email={session.user.email ?? ''} />}>
          <Route index element={<Dashboard />} />
          <Route path="nhap-lieu" element={<DailyEntry />} />
          <Route path="lead" element={<Leads />} />
          <Route path="cai-dat" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
