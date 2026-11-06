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
} from 'lucide-react';

export type TabType = 'overview' | 'schedule' | 'loans' | 'telegram';

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
    { id: 'telegram', label: 'Telegram', icon: <Send className="w-4 h-4" /> },
  ];

  return (
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
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--success-bg)] text-[var(--success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                Supabase
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--warning-bg)] text-[var(--warning)]">
                <Database className="w-3 h-3" />
                Bộ nhớ tạm
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
              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <nav className="flex md:hidden items-center justify-around border-t border-[var(--border)] py-1 -mx-4 px-2">
          {tabs.map((tab) => {
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[11px] font-medium transition-all ${
                  active
                    ? 'text-[var(--accent)] font-bold'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <div
                  className={`p-1 rounded-md ${
                    active ? 'bg-[var(--accent-light)] text-[var(--accent)]' : ''
                  }`}
                >
                  {tab.icon}
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
