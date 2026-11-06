'use client';

import React, { useState, useEffect } from 'react';
import {
  ScheduleOverview,
  DailySavingRecord,
  formatVND,
  formatDateVN,
  parseDateString,
} from '@/lib/schedule';
import {
  TrendingUp,
  Wallet,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Clock,
  ArrowRight,
  PiggyBank,
  Check,
  PlusCircle,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import SavingsHeatmap from './SavingsHeatmap';

interface OverviewTabProps {
  overview: ScheduleOverview;
  fundBalance: number;
  todayStr: string;
  savingsHistory: DailySavingRecord[];
  onUpdateFund: (newFund: number) => Promise<void>;
  onSaveDailySaving: (amount: number, options?: { preserveFund?: boolean }) => Promise<void>;
  onCancelDailySaving: () => Promise<void>;
  onTickPayment: (loanId: string) => Promise<void>;
  onUndoPayment: () => Promise<void>;
  canUndo: boolean;
  onNavigateToSchedule: () => void;
  toastMessage?: string | null;
}

export default function OverviewTab({
  overview,
  fundBalance,
  todayStr,
  savingsHistory,
  onUpdateFund,
  onSaveDailySaving,
  onCancelDailySaving,
  onTickPayment,
  onUndoPayment,
  canUndo,
  onNavigateToSchedule,
  toastMessage,
}: OverviewTabProps) {
  const [fundInput, setFundInput] = useState('');
  const [isSavingFund, setIsSavingFund] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [modalMode, setModalMode] = useState<'set' | 'add'>('set');
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [isSubmittingDaily, setIsSubmittingDaily] = useState(false);

  useEffect(() => {
    setFundInput(fundBalance > 0 ? fundBalance.toLocaleString('vi-VN') : '');
  }, [fundBalance]);

  const handleFundBlurOrSubmit = async () => {
    const rawNumber = Number(fundInput.replace(/\./g, '').replace(/,/g, '')) || 0;
    if (rawNumber !== fundBalance) {
      setIsSavingFund(true);
      await onUpdateFund(rawNumber);
      setIsSavingFund(false);
    }
  };

  const handleAddFund = async (extra: number) => {
    const current = Number(fundInput.replace(/\./g, '').replace(/,/g, '')) || 0;
    const nextVal = Math.max(0, current + extra);
    setFundInput(nextVal.toLocaleString('vi-VN'));
    setIsSavingFund(true);
    await onUpdateFund(nextVal);
    setIsSavingFund(false);
  };

  // Tick đúng số tiền cần bỏ của hôm nay
  const handleQuickTickToday = async () => {
    const target = overview.base_daily_target > 0 ? overview.base_daily_target : 162000;
    setIsSubmittingDaily(true);
    await onSaveDailySaving(target);
    setIsSubmittingDaily(false);
  };

  // Xử lý nhập số an toàn, không bị nhảy con trỏ hay lặp số
  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
      setCustomAmountInput('');
      return;
    }
    const num = parseInt(digitsOnly.slice(0, 11), 10);
    setCustomAmountInput(num.toLocaleString('vi-VN'));
  };

  // Nạp hoặc cộng thêm số tiền cho hôm nay
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(customAmountInput.replace(/[^0-9]/g, ''));
    if (!parsed || parsed <= 0) return;
    setIsSubmittingDaily(true);
    if (modalMode === 'add') {
      const current = overview.today_saved_amount || 0;
      await onSaveDailySaving(current + parsed);
    } else {
      await onSaveDailySaving(parsed);
    }
    setIsSubmittingDaily(false);
    setShowCustomModal(false);
    setCustomAmountInput('');
  };

  // Xác nhận số tiền hiện có trong quỹ đã bao gồm khoản tiết kiệm hôm nay (không cộng dồn thêm quỹ)
  const handleConfirmFundAsTodaySaving = async () => {
    const target = overview.base_daily_target > 0 ? overview.base_daily_target : 162000;
    const amountToConfirm = Math.min(fundBalance, target);
    if (amountToConfirm <= 0) return;
    setIsSubmittingDaily(true);
    await onSaveDailySaving(amountToConfirm, { preserveFund: true });
    setIsSubmittingDaily(false);
  };

  // Các khoản đến hạn trong 14 ngày tới
  const upcoming14Days = overview.payments.filter((p) => p.days_remaining <= 14);

  // Tính phần trăm tiến độ
  const progressPercent =
    overview.total_installments > 0
      ? Math.round((overview.paid_installments / overview.total_installments) * 100)
      : 0;

  // Ngày mai
  const dToday = parseDateString(todayStr);
  const dTomorrow = new Date(dToday);
  dTomorrow.setDate(dTomorrow.getDate() + 1);
  const tomorrowStr = `${dTomorrow.getDate()}/${dTomorrow.getMonth() + 1}`;

  // Tính toán trước cho modal khi người dùng đang gõ số tiền
  const customAmountNumber = Number(customAmountInput.replace(/[^0-9]/g, '')) || 0;
  const targetToday = overview.base_daily_target > 0 ? overview.base_daily_target : 162000;
  const isCustomLessThanTarget = customAmountNumber > 0 && customAmountNumber < targetToday;
  const isCustomMoreThanTarget = customAmountNumber > targetToday;

  return (
    <div className="space-y-6 pb-12">
      {/* KHỐI NỔI BẬT: CHECKLIST TIẾT KIỆM HÔM NAY */}
      {!overview.is_today_saved ? (
        /* TRẠNG THÁI CHƯA TIẾT KIỆM HÔM NAY: HIỆN CHỈ TIÊU & NÚT TICK */
        <section className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-raised)] border-2 border-[var(--accent)]/40 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-sm">
                <PiggyBank className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Mục tiêu tiết kiệm hôm nay ({formatDateVN(todayStr)})
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Bỏ heo mỗi ngày để đủ tiền trước hạn. Có thể bỏ ít hơn hoặc nhiều hơn tùy khả năng.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
                Chỉ tiêu hôm nay:
              </span>
              <div className="text-3xl font-extrabold tabular-nums text-[var(--accent)]">
                {formatVND(overview.base_daily_target)}
              </div>
              <p className="text-xs text-[var(--muted)]">
                Mốc khắt khe nhất: hạn{' '}
                <strong>
                  {overview.critical_payment
                    ? formatDateVN(overview.critical_payment.due_date)
                    : 'sắp tới'}
                </strong>{' '}
                (cần tích lũy {formatVND(overview.critical_payment?.cumulative_amount || 0)})
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
              <button
                onClick={handleQuickTickToday}
                disabled={isSubmittingDaily}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-bold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Tick đúng {formatVND(overview.base_daily_target)}</span>
              </button>

              <button
                onClick={() => {
                  setModalMode('set');
                  setCustomAmountInput('');
                  setShowCustomModal(true);
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-[var(--accent)]" />
                <span>Nhập số tiền khác...</span>
              </button>
            </div>
          </div>

          {/* Hộp gợi ý thông minh nếu trong quỹ đã có sẵn tiền */}
          {fundBalance > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="text-xs text-amber-800 dark:text-amber-200 space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <span>💡 Quỹ trả nợ đang có: <strong>{formatVND(fundBalance)}</strong></span>
                </div>
                <p className="opacity-90">
                  Nếu bạn đã bỏ tiền này hôm nay, bấm xác nhận bên dưới để hoàn thành ngay mà không làm tăng trùng số dư quỹ:
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmittingDaily}
                onClick={handleConfirmFundAsTodaySaving}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shrink-0 active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Xác nhận đã bỏ {formatVND(Math.min(fundBalance, targetToday))} hôm nay</span>
              </button>
            </div>
          )}
        </section>
      ) : (
        /* TRẠNG THÁI ĐÃ HOÀN THÀNH TIẾT KIỆM HÔM NAY: BIỂU TƯỢNG ĂN MỪNG & NÚT NẠP THÊM TIỀN TO NỔI BẬT */
        <section className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/15 border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-md space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-emerald-800 dark:text-emerald-200">
                    🎉 ĐÃ HOÀN THÀNH TIẾT KIỆM HÔM NAY ({formatDateVN(todayStr)})
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                      overview.today_saved_amount >= overview.base_daily_target
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {overview.today_saved_amount > overview.base_daily_target ? (
                      <>🔥 Vượt chỉ tiêu +{formatVND(overview.today_saved_amount - overview.base_daily_target)}</>
                    ) : overview.today_saved_amount === overview.base_daily_target ? (
                      <>✓ Đạt 100% chỉ tiêu</>
                    ) : (
                      <>Đã bỏ một phần ({formatVND(overview.today_saved_amount)})</>
                    )}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Tuyệt vời! Bạn đang duy trì tiến độ hoàn hảo để trả hết toàn bộ nợ trước hạn.
                </p>
              </div>
            </div>

            {/* Nút hủy lượt */}
            <button
              onClick={onCancelDailySaving}
              className="text-xs text-[var(--muted)] hover:text-[var(--danger)] underline self-start sm:self-auto transition-colors"
            >
              Hủy lượt bỏ hôm nay
            </button>
          </div>

          {/* Chi tiết số tiền & Nút Nạp thêm nổi bật */}
          <div className="bg-[var(--surface)]/90 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
                Hôm nay đã để dành:
              </span>
              <div className="text-3xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatVND(overview.today_saved_amount)}
              </div>
              <p className="text-xs text-[var(--muted)]">
                Từ ngày mai ({tomorrowStr}), mỗi ngày cần để dành:{' '}
                <strong className="text-[var(--foreground)] text-sm font-bold tabular-nums">
                  {formatVND(overview.tomorrow_daily_saving_needed)}
                </strong>
                {overview.today_saved_amount > overview.base_daily_target && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                    (đã giảm nhẹ nhờ hôm nay để dành nhiều hơn 🎉)
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              {/* NÚT TO NỔI BẬT: NẠP THÊM TIỀN HÔM NAY */}
              <button
                onClick={() => {
                  setModalMode('add');
                  setCustomAmountInput('');
                  setShowCustomModal(true);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5 stroke-[2.5]" />
                <span>➕ Nạp thêm tiền hôm nay</span>
              </button>

              {/* Nút chỉnh sửa số tiền */}
              <button
                onClick={() => {
                  setModalMode('set');
                  setCustomAmountInput(overview.today_saved_amount.toLocaleString('vi-VN'));
                  setShowCustomModal(true);
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-xs sm:text-sm font-semibold transition-all shadow-sm text-center active:scale-95"
              >
                Chỉnh sửa số tiền
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 4 Chỉ số KPI hàng đầu */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Mỗi ngày cần bỏ thêm */}
        <div className="bg-[var(--accent-light)] border border-[var(--accent)]/30 rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[var(--accent)] mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate">
              {overview.is_today_saved ? 'Từ mai cần bỏ' : 'Mỗi ngày bỏ thêm'}
            </span>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold tabular-nums text-[var(--foreground)] tracking-tight truncate">
              {formatVND(overview.daily_saving_needed)}
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-1 sm:mt-1.5 font-medium leading-relaxed line-clamp-2">
              {overview.is_today_saved ? (
                <>
                  Hôm nay đã xong! Từ <strong>{tomorrowStr}</strong>
                </>
              ) : overview.critical_payment && overview.daily_saving_needed > 0 ? (
                <>
                  Theo hạn <strong>{formatDateVN(overview.critical_payment.due_date)}</strong>
                </>
              ) : (
                'Quỹ hiện đã đủ hạn'
              )}
            </p>
          </div>
        </div>

        {/* Metric 2: Còn phải trả */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[var(--muted)] mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Còn phải trả</span>
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold tabular-nums tracking-tight truncate">
              {formatVND(overview.total_remaining_debt)}
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-1 sm:mt-1.5 font-medium truncate">
              Còn {overview.total_remaining_installments} kỳ &middot; Tối đa {formatVND(overview.max_monthly_payment)}/th
            </p>
          </div>
        </div>

        {/* Metric 3: Hạn kế tiếp */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[var(--muted)] mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Hạn kế tiếp</span>
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold tabular-nums tracking-tight truncate">
              {overview.next_payment ? formatDateVN(overview.next_payment.due_date) : 'Hết nợ'}
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-1 sm:mt-1.5 font-medium truncate">
              {overview.next_payment ? (
                <>
                  {overview.next_payment.days_remaining <= 0
                    ? 'Hôm nay'
                    : `Còn ${overview.next_payment.days_remaining} ngày`}
                  , {formatVND(overview.next_payment.amount)}
                </>
              ) : (
                'Đã trả hết!'
              )}
            </p>
          </div>
        </div>

        {/* Metric 4: Tiến độ */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[var(--muted)] mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Tiến độ</span>
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold tabular-nums tracking-tight">
              {overview.paid_installments}/{overview.total_installments}{' '}
              <span className="text-xs sm:text-sm font-normal text-[var(--muted)]">kỳ</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full bg-[var(--surface-raised)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--accent)] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--muted)] text-right font-medium">
                {progressPercent}% hoàn thành
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quỹ trả nợ & Hoàn tác */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Số dư quỹ trả nợ hiện có
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Tổng số tiền bạn đang để riêng trong tài khoản (đã bao gồm các khoản bạn vừa bỏ vào).
            </p>
          </div>
          <button
            onClick={onUndoPayment}
            disabled={!canUndo}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Hoàn tác lần tick gần nhất</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              inputMode="numeric"
              value={fundInput}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^0-9]/g, '');
                const num = Number(cleaned);
                setFundInput(cleaned ? num.toLocaleString('vi-VN') : '');
              }}
              onBlur={handleFundBlurOrSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFundBlurOrSubmit();
              }}
              placeholder="0"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)] pr-10"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)] pointer-events-none">
              đ
            </span>
          </div>

          {/* Quick buttons */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1.5 text-xs w-full sm:w-auto">
            <button
              onClick={() => handleAddFund(100000)}
              className="py-2.5 sm:py-2 px-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] font-semibold transition-all active:scale-95 text-center flex items-center justify-center border border-[var(--border)] sm:border-transparent"
            >
              +100k
            </button>
            <button
              onClick={() => handleAddFund(500000)}
              className="py-2.5 sm:py-2 px-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] font-semibold transition-all active:scale-95 text-center flex items-center justify-center border border-[var(--border)] sm:border-transparent"
            >
              +500k
            </button>
            <button
              onClick={() => handleAddFund(1000000)}
              className="py-2.5 sm:py-2 px-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] font-semibold transition-all active:scale-95 text-center flex items-center justify-center border border-[var(--border)] sm:border-transparent"
            >
              +1tr
            </button>
            <button
              onClick={() => {
                setFundInput('0');
                onUpdateFund(0);
              }}
              className="py-2.5 sm:py-2 px-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] font-semibold transition-all active:scale-95 text-center flex items-center justify-center border border-[var(--border)] sm:border-transparent"
            >
              Về 0
            </button>
          </div>

          {isSavingFund && (
            <span className="text-xs text-[var(--muted)] animate-pulse">Đang lưu...</span>
          )}
        </div>

        {toastMessage && (
          <div className="text-xs text-[var(--success)] bg-[var(--success-bg)] p-2.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Lịch sử tiết kiệm các ngày gần đây */}
        {savingsHistory && savingsHistory.length > 0 && (
          <div className="pt-2 border-t border-[var(--border)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-2">
              Lịch sử đã bỏ heo gần đây:
            </span>
            <div className="flex flex-wrap gap-2">
              {savingsHistory.slice(0, 7).map((s) => (
                <div
                  key={s.date}
                  className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs flex items-center gap-1.5"
                >
                  <span className="font-medium text-[var(--muted)]">{formatDateVN(s.date)}:</span>
                  <strong className="text-[var(--foreground)] tabular-nums">{formatVND(s.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Danh sách các hạn trong 14 ngày tới */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Hạn trong 14 ngày tới ({upcoming14Days.length} kỳ)
            </h2>
          </div>
          <button
            onClick={onNavigateToSchedule}
            className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <span>Xem toàn bộ lịch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcoming14Days.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--muted)]">
            Không có khoản nào đến hạn trong 14 ngày tới. Thư thái tiết kiệm!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming14Days.map((item) => {
              const isDueToday = item.days_remaining <= 0;
              const isDueSoon = item.days_remaining > 0 && item.days_remaining <= 3;
              const isFundEnough = fundBalance >= item.cumulative_amount;

              return (
                <div
                  key={`${item.loan_id}-${item.installment_number}`}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isDueToday
                      ? 'bg-[var(--danger-bg)] border-[var(--danger)]/40 shadow-sm'
                      : isDueSoon
                      ? 'bg-[var(--warning-bg)] border-[var(--warning)]/40'
                      : 'bg-[var(--surface-raised)] border-[var(--border)]'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">{item.loan_name}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                        Kỳ {item.installment_number}/{item.total_installments}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                          isDueToday
                            ? 'bg-[var(--danger)] text-white'
                            : isDueSoon
                            ? 'bg-[var(--warning)] text-white'
                            : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'
                        }`}
                      >
                        {formatDateVN(item.due_date)} (
                        {isDueToday
                          ? 'Hôm nay'
                          : item.days_remaining === 1
                          ? 'Ngày mai'
                          : `còn ${item.days_remaining} ngày`}
                        )
                      </span>

                      <span
                        className={`text-[11px] font-medium ${
                          isFundEnough ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                        }`}
                      >
                        {isFundEnough
                          ? '• Đủ tiền'
                          : `• Thiếu ${formatVND(item.cumulative_amount - fundBalance)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="font-extrabold text-sm tabular-nums text-[var(--foreground)]">
                      {formatVND(item.amount)}
                    </span>
                    {item.is_nearest && (
                      <button
                        onClick={() => onTickPayment(item.loan_id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
                      >
                        Tick đã trả
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Biểu đồ nhiệt bỏ heo mỗi ngày kiểu GitHub */}
      <section className="space-y-2">
        <SavingsHeatmap
          savingsHistory={savingsHistory}
          dailyTarget={overview.base_daily_target || 162000}
          todayStr={todayStr}
        />
      </section>

      {/* MODAL TÙY CHỈNH HOẶC NẠP THÊM TIỀN TIẾT KIỆM HÔM NAY */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--surface)] border border-[var(--border)] w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span>
                  {modalMode === 'add'
                    ? `Nạp thêm tiền hôm nay (${formatDateVN(todayStr)})`
                    : `Số tiền để dành hôm nay (${formatDateVN(todayStr)})`}
                </span>
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-raised)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="p-4 sm:p-5 space-y-4">
              {/* Nếu nạp thêm: Hiển thị số tiền đã có sẵn */}
              {modalMode === 'add' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                  <span className="text-[var(--muted)] font-medium">Hôm nay đã để dành:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold tabular-nums">
                    {formatVND(overview.today_saved_amount)}
                  </strong>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-[var(--muted)] uppercase tracking-wider">
                    {modalMode === 'add'
                      ? 'Nhập số tiền muốn nạp thêm (+):'
                      : 'Nhập số tiền bạn có hôm nay:'}
                  </label>
                  {modalMode === 'set' && (
                    <span className="text-[var(--muted)]">
                      Chỉ tiêu: <strong className="text-[var(--foreground)]">{formatVND(targetToday)}</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    autoFocus
                    value={customAmountInput}
                    onChange={handleCustomInputChange}
                    onFocus={(e) => e.target.select()}
                    placeholder={modalMode === 'add' ? 'VD: 50.000, 100.000, 200.000...' : 'VD: 50.000, 100.000, 170.000...'}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)] pr-10"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)] pointer-events-none">
                    đ
                  </span>
                </div>

                {/* Phản hồi thời gian thực khi đang nhập số tiền nạp thêm */}
                {modalMode === 'add' && customAmountNumber > 0 && (
                  <div className="p-2.5 rounded-lg bg-[var(--success-bg)] border border-[var(--success)]/30 text-xs text-[var(--success)] space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        Tổng hôm nay sẽ thành: {formatVND((overview.today_saved_amount || 0) + customAmountNumber)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--foreground)] opacity-90">
                      Tuyệt vời! Số tiền vượt này sẽ giúp giảm số tiền cần gom mỗi ngày từ ngày mai!
                    </p>
                  </div>
                )}

                {/* Phản hồi thời gian thực khi đang nhập số tiền chế độ set */}
                {modalMode === 'set' && isCustomLessThanTarget && (
                  <div className="p-2.5 rounded-lg bg-[var(--warning-bg)] border border-[var(--warning)]/30 text-xs text-[var(--warning)] space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Ít hơn chỉ tiêu {formatVND(targetToday - customAmountNumber)}</span>
                    </div>
                    <p className="text-[11px] text-[var(--foreground)] opacity-90">
                      Không sao cả! Số tiền còn thiếu sẽ được chia đều nhẹ cho các ngày còn lại để bạn gom dần.
                    </p>
                  </div>
                )}

                {modalMode === 'set' && isCustomMoreThanTarget && (
                  <div className="p-2.5 rounded-lg bg-[var(--success-bg)] border border-[var(--success)]/30 text-xs text-[var(--success)] space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Nhiều hơn chỉ tiêu {formatVND(customAmountNumber - targetToday)} 🎉</span>
                    </div>
                    <p className="text-[11px] text-[var(--foreground)] opacity-90">
                      Rất tốt! Các ngày còn lại sẽ được giảm nhẹ số tiền cần tiết kiệm mỗi ngày.
                    </p>
                  </div>
                )}
              </div>

              {/* Phím bấm chọn nhanh */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-[var(--muted)] font-medium block">
                  {modalMode === 'add' ? 'Bấm chọn nhanh số tiền nạp thêm:' : 'Hoặc bấm chọn nhanh:'}
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(modalMode === 'add'
                    ? [50000, 100000, 200000, 300000, 500000, 1000000, 1500000, 2000000]
                    : [50000, 100000, 170000, 200000, 300000, 500000, 1000000, 2000000]
                  ).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomAmountInput(amt.toLocaleString('vi-VN'))}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors border bg-[var(--surface-raised)] border-[var(--border)] hover:bg-[var(--surface)] active:scale-95"
                    >
                      {modalMode === 'add' ? '+' : ''}{amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-raised)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDaily || !customAmountInput}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmittingDaily
                    ? 'Đang lưu...'
                    : modalMode === 'add'
                    ? `Xác nhận nạp thêm`
                    : 'Xác nhận nạp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
