'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header, { TabType } from '@/components/Header';
import OverviewTab from '@/components/OverviewTab';
import ScheduleTab from '@/components/ScheduleTab';
import LoansTab from '@/components/LoansTab';
import TelegramTab from '@/components/TelegramTab';
import { Loan, ScheduleOverview, generateSchedule, getTodayVNString } from '@/lib/schedule';
import { AppSettings, PaymentLog } from '@/lib/db';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    id: 1,
    fund_balance: 0,
    telegram_chat_id: '',
    telegram_remind_enabled: true,
    remind_days_before: [0, 1, 2],
  });
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [overview, setOverview] = useState<ScheduleOverview | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Tải dữ liệu từ server
  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data && data.loans) {
        setLoans(data.loans);
        setSettings(data.settings);
        setLogs(data.logs || []);
        setOverview(data.overview);
        setIsSupabaseConnected(Boolean(data.isSupabaseConnected));
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cập nhật số dư quỹ
  const handleUpdateFund = async (newFund: number) => {
    try {
      const res = await fetch('/api/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fund_balance: newFund }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({ ...prev, fund_balance: newFund }));
        if (data.overview) {
          setOverview(data.overview);
        } else {
          setOverview(generateSchedule(loans, newFund, getTodayVNString()));
        }
        showToast('Đã lưu số dư quỹ trả nợ!');
      }
    } catch {
      showToast('Lỗi khi lưu số dư quỹ.');
    }
  };

  // Tick đã trả một kỳ
  const handleTickPayment = async (loanId: string) => {
    try {
      const res = await fetch('/api/payments/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: loanId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Đã tick thanh toán thành công!');
        await loadData();
      } else {
        alert(data.error || 'Không thể tick thanh toán.');
      }
    } catch {
      alert('Lỗi kết nối máy chủ khi tick thanh toán.');
    }
  };

  // Hoàn tác lần tick gần nhất
  const handleUndoPayment = async () => {
    try {
      const res = await fetch('/api/payments/undo', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Đã hoàn tác thành công!');
        await loadData();
      } else {
        alert(data.error || 'Không có lượt trả nào để hoàn tác.');
      }
    } catch {
      alert('Lỗi máy chủ khi hoàn tác.');
    }
  };

  // Thêm hoặc sửa khoản vay
  const handleSaveLoan = async (loanData: Partial<Loan>) => {
    const isEdit = Boolean(loanData.id);
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch('/api/loans', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi lưu khoản vay');
    }

    showToast(isEdit ? 'Đã cập nhật khoản vay!' : 'Đã thêm khoản vay mới!');
    await loadData();
  };

  // Xóa khoản vay
  const handleDeleteLoan = async (loanId: string) => {
    try {
      const res = await fetch(`/api/loans?id=${loanId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa khoản vay thành công!');
        await loadData();
      } else {
        alert(data.error || 'Lỗi khi xóa khoản vay.');
      }
    } catch {
      alert('Lỗi kết nối máy chủ.');
    }
  };

  // Cập nhật cài đặt Telegram
  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi cập nhật cài đặt');
    }

    setSettings(data.settings);
    showToast('Đã cập nhật cài đặt Telegram!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <span className="text-sm font-medium">Đang tải dữ liệu Sổ Trả Nợ...</span>
        </div>
      </div>
    );
  }

  const currentOverview =
    overview || generateSchedule(loans, settings.fund_balance, getTodayVNString());

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isSupabaseConnected={isSupabaseConnected}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
        {currentTab === 'overview' && (
          <OverviewTab
            overview={currentOverview}
            fundBalance={settings.fund_balance}
            onUpdateFund={handleUpdateFund}
            onTickPayment={handleTickPayment}
            onUndoPayment={handleUndoPayment}
            canUndo={logs.length > 0}
            onNavigateToSchedule={() => setCurrentTab('schedule')}
            toastMessage={toastMessage}
          />
        )}

        {currentTab === 'schedule' && (
          <ScheduleTab
            overview={currentOverview}
            fundBalance={settings.fund_balance}
            onTickPayment={handleTickPayment}
            onUndoPayment={handleUndoPayment}
            canUndo={logs.length > 0}
            toastMessage={toastMessage}
          />
        )}

        {currentTab === 'loans' && (
          <LoansTab
            loans={loans}
            onSaveLoan={handleSaveLoan}
            onDeleteLoan={handleDeleteLoan}
          />
        )}

        {currentTab === 'telegram' && (
          <TelegramTab
            settings={settings}
            overview={currentOverview}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>
    </div>
  );
}
