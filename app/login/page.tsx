'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Mật khẩu không đúng. Vui lòng thử lại.');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] mb-1">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sổ Trả Nợ</h1>
          <p className="text-sm text-[var(--muted)]">
            Vui lòng nhập mật khẩu truy cập (APP_PASSWORD)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="app-password"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="app-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                required
                autoFocus
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-[var(--danger)] bg-[var(--danger-bg)] p-2.5 rounded-lg border border-[var(--danger)]/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Đang xác thực...' : 'Mở sổ nợ'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Bảo vệ phiên bằng httpOnly cookie</span>
        </div>
      </div>
    </main>
  );
}
