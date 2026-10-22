import { useState } from 'react';
import { ErrorBox, Field } from '../components/ui';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';

function translateError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'Sai email hoặc mật khẩu.';
  }
  if (/already registered/i.test(message)) {
    return 'Email này đã có tài khoản, hãy đăng nhập.';
  }
  if (/signups not allowed/i.test(message)) {
    return 'Hệ thống đang tắt đăng ký tài khoản mới.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Email chưa được xác nhận. Kiểm tra hộp thư.';
  }
  if (/password/i.test(message)) {
    return 'Mật khẩu cần ít nhất 6 ký tự.';
  }
  return message;
}

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (mode === 'signup' && password !== confirm) {
      setError('Hai mật khẩu không khớp.');
      return;
    }
    setLoading(true);
    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (err) {
        setError(translateError(err.message));
      }
      return;
    }
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setError(translateError(err.message));
      return;
    }
    // Khi đã tắt "Confirm email" trong Supabase, signUp trả về session và app vào thẳng.
    if (!data.session) {
      setInfo('Đã tạo tài khoản. Kiểm tra email để xác nhận rồi đăng nhập.');
      setMode('login');
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft p-4">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-line bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-center gap-2.5 text-lg font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">Z</div>
          Báo cáo Marketing
        </div>

        <div role="tablist" aria-label="Đăng nhập hoặc đăng ký" className="grid grid-cols-2 gap-1 rounded-lg bg-soft p-1 text-sm font-medium">
          {(
            [
              ['login', 'Đăng nhập'],
              ['signup', 'Tạo tài khoản'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={'min-h-9 rounded-md ' + (mode === m ? 'bg-white text-ink shadow-sm' : 'text-sub')}
            >
              {label}
            </button>
          ))}
        </div>

        <ErrorBox message={error} />
        {info && (
          <p role="status" className="rounded-lg bg-[#E7F5EC] px-4 py-3 text-sm text-[#155E34]">
            {info}
          </p>
        )}

        <Field label="Email">
          <input type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mật khẩu">
          <input
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            minLength={6}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {isSignup && (
          <Field label="Nhập lại mật khẩu">
            <input type="password" autoComplete="new-password" required minLength={6} className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        )}
        <button type="submit" className="btn-primary justify-center" disabled={loading}>
          {loading ? 'Đang xử lý…' : isSignup ? 'Tạo tài khoản' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
