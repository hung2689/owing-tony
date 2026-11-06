'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  CreditCard,
  Send,
  LogOut,
  Database,
  Flame,
} from 'lucide-react';

export type TabType = 'overview' | 'schedule' | 'loans' | 'stats' | 'telegram';

interface HeaderProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  isSupabaseConnected: boolean;
}

export default function Header({
  currentTab,
  onTabChange,
  isSupabaseConnected,
}: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'schedule', label: 'Lịch trả', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'loans', label: 'Khoản vay', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'stats', label: 'Thống kê', icon: <Flame className="w-4 h-4" /> },
    { id: 'telegram', label: 'Telegram', icon: <Send className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-md bg-opacity-95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Logo & App title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                N
              </div>
              <div className="min-w-0">
                <span className="font-bold text-base sm:text-lg tracking-tight block truncate">
                  Sổ Trả Nợ
                </span>
              </div>
              {isSupabaseConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-[var(--success-bg)] text-[var(--success)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                  <span className="hidden xs:inline">Supabase</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-[var(--warning-bg)] text-[var(--warning)]">
                  <Database className="w-3 h-3" />
                  <span className="hidden xs:inline">Tạm</span>
                </span>
              )}
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => {
                const active = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right actions: Logout */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 sm:px-3 sm:py-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] active:scale-95 transition-all flex items-center gap-1.5 text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fixed at the bottom of the viewport) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)]/95 backdrop-blur-lg border-t border-[var(--border)] px-1 sm:px-2 py-1.5 md:hidden pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {tabs.map((tab) => {
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-[10px] sm:text-[11px] font-medium transition-all active:scale-95 ${
                  active
                    ? 'text-[var(--accent)] font-bold'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    active ? 'bg-[var(--accent-light)] text-[var(--accent)]' : ''
                  }`}
                >
                  {tab.icon}
                </div>
                <span className="mt-0.5 tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
