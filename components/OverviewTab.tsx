'use client';

import React, { useState, useEffect } from 'react';
import {
  ScheduleOverview,
  ScheduledPayment,
  formatVND,
  formatDateVN,
} from '@/lib/schedule';
import {
  TrendingUp,
  Wallet,
  Calendar,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface OverviewTabProps {
  overview: ScheduleOverview;
  fundBalance: number;
  onUpdateFund: (newFund: number) => Promise<void>;
  onTickPayment: (loanId: string) => Promise<void>;
  onUndoPayment: () => Promise<void>;
  canUndo: boolean;
  onNavigateToSchedule: () => void;
  toastMessage?: string | null;
}

export default function OverviewTab({
  overview,
  fundBalance,
  onUpdateFund,
  onTickPayment,
  onUndoPayment,
  canUndo,
  onNavigateToSchedule,
  toastMessage,
}: OverviewTabProps) {
  const [fundInput, setFundInput] = useState('');
  const [isSavingFund, setIsSavingFund] = useState(false);

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

  // Các khoản đến hạn trong 14 ngày tới
  const upcoming14Days = overview.payments.filter((p) => p.days_remaining <= 14);

  // Tính phần trăm tiến độ
  const progressPercent =
    overview.total_installments > 0
      ? Math.round((overview.paid_installments / overview.total_installments) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* 4 Chỉ số KPI hàng đầu */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Mỗi ngày cần bỏ thêm (Primary Card) */}
        <div className="bg-[var(--accent-light)] border border-[var(--accent)]/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[var(--accent)] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Mỗi ngày cần bỏ thêm
            </span>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums text-[var(--foreground)] tracking-tight">
              {formatVND(overview.daily_saving_needed)}
            </div>
            <p className="text-xs text-[var(--muted)] mt-1.5 font-medium leading-relaxed">
              {overview.critical_payment && overview.daily_saving_needed > 0 ? (
                <>
                  Tính theo hạn <strong>{formatDateVN(overview.critical_payment.due_date)}</strong>, cần có{' '}
                  {formatVND(overview.critical_payment.cumulative_amount)}
                </>
              ) : (
                'Quỹ hiện đã đủ cho mọi hạn sắp tới'
              )}
            </p>
          </div>
        </div>

        {/* Metric 2: Còn phải trả */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Còn phải trả</span>
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight">
              {formatVND(overview.total_remaining_debt)}
            </div>
            <p className="text-xs text-[var(--muted)] mt-1.5 font-medium">
              Còn {overview.total_remaining_installments} kỳ, mỗi tháng tối đa{' '}
              {formatVND(overview.max_monthly_payment)}
            </p>
          </div>
        </div>

        {/* Metric 3: Hạn kế tiếp */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Hạn kế tiếp</span>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight">
              {overview.next_payment ? formatDateVN(overview.next_payment.due_date) : 'Hết nợ'}
            </div>
            <p className="text-xs text-[var(--muted)] mt-1.5 font-medium">
              {overview.next_payment ? (
                <>
                  {overview.next_payment.days_remaining <= 0
                    ? 'Hôm nay'
                    : `Còn ${overview.next_payment.days_remaining} ngày`}
                  , {formatVND(overview.next_payment.amount)}
                </>
              ) : (
                'Đã thanh toán tất cả các khoản!'
              )}
            </p>
          </div>
        </div>

        {/* Metric 4: Tiến độ */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tiến độ</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight">
              {overview.paid_installments}/{overview.total_installments}{' '}
              <span className="text-sm font-normal text-[var(--muted)]">kỳ</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full bg-[var(--surface-raised)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--accent)] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-[var(--muted)] text-right font-medium">
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
              Nhập số tiền đang để riêng trong tài khoản để hệ thống tính tiền tiết kiệm mỗi ngày.
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
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => handleAddFund(100000)}
              className="px-2.5 py-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] font-medium transition-colors"
            >
              +100k
            </button>
            <button
              onClick={() => handleAddFund(500000)}
              className="px-2.5 py-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] font-medium transition-colors"
            >
              +500k
            </button>
            <button
              onClick={() => handleAddFund(1000000)}
              className="px-2.5 py-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] font-medium transition-colors"
            >
              +1.000k
            </button>
            <button
              onClick={() => {
                setFundInput('0');
                onUpdateFund(0);
              }}
              className="px-2.5 py-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] font-medium transition-colors"
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

        <div className="text-xs text-[var(--muted)] bg-[var(--surface-raised)] p-3 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[var(--accent)] mt-0.5" />
          <span>
            <strong>Ghi chú:</strong> Khi bạn tick &quot;Đã trả&quot; một kỳ, tiền của kỳ đó sẽ tự động được trừ khỏi Quỹ trả nợ này. Hãy cộng thêm vào đây mỗi khi bạn dành dụm được tiền nhé!
          </span>
        </div>
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
    </div>
  );
}
