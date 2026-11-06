'use client';

import React, { useMemo } from 'react';
import {
  ScheduleOverview,
  ScheduledPayment,
  formatVND,
  formatDateVN,
} from '@/lib/schedule';
import { RotateCcw, AlertTriangle, CalendarCheck2 } from 'lucide-react';

interface ScheduleTabProps {
  overview: ScheduleOverview;
  fundBalance: number;
  onTickPayment: (loanId: string) => Promise<void>;
  onUndoPayment: () => Promise<void>;
  canUndo: boolean;
  toastMessage?: string | null;
}

export default function ScheduleTab({
  overview,
  fundBalance,
  onTickPayment,
  onUndoPayment,
  canUndo,
  toastMessage,
}: ScheduleTabProps) {
  // Nhóm các kỳ theo tháng: "YYYY-MM"
  const monthlyGroups = useMemo(() => {
    const map = new Map<string, { label: string; total: number; payments: ScheduledPayment[] }>();

    for (const p of overview.payments) {
      const [year, month] = p.due_date.split('-');
      const key = `${year}-${month}`;
      const existing = map.get(key) || {
        label: `Tháng ${month}/${year}`,
        total: 0,
        payments: [],
      };
      existing.total += p.amount;
      existing.payments.push(p);
      map.set(key, existing);
    }

    return Array.from(map.entries()).map(([key, data]) => ({
      key,
      ...data,
    }));
  }, [overview.payments]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Lịch trả nợ theo ngày
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Cột &quot;Cần có&quot; là số tiền tích lũy phải có trong quỹ tính đến ngày đó. Chỉ kỳ gần nhất của mỗi khoản mới tick được.
          </p>
        </div>

        <button
          onClick={onUndoPayment}
          disabled={!canUndo}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Hoàn tác lần tick gần nhất</span>
        </button>
      </div>

      {toastMessage && (
        <div className="text-xs text-[var(--success)] bg-[var(--success-bg)] p-3 rounded-xl border border-[var(--success)]/20 font-medium">
          {toastMessage}
        </div>
      )}

      {overview.payments.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-[var(--success-bg)] text-[var(--success)]">
            <CalendarCheck2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold">Bạn đã thanh toán hết nợ!</h3>
          <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
            Không còn khoản trả góp nào cần thanh toán. Hãy tiếp tục duy trì thói quen quản lý tài chính tuyệt vời này!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {monthlyGroups.map((group) => (
            <div
              key={group.key}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Month Header Banner */}
              <div className="bg-[var(--surface-raised)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-sm sm:text-base tracking-tight text-[var(--foreground)]">
                  {group.label}
                </span>
                <span className="text-xs font-semibold text-[var(--muted)]">
                  Tổng tháng: <strong className="text-[var(--foreground)] font-bold">{formatVND(group.total)}</strong>
                </span>
              </div>

              {/* Table view with horizontal scroll on small devices */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[580px]">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--muted)] text-[11px] uppercase tracking-wider bg-[var(--surface)]/50">
                      <th className="py-2.5 px-3 font-semibold">Ngày hạn</th>
                      <th className="py-2.5 px-3 font-semibold">Khoản nợ</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Số tiền</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Kỳ</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Cần có tích lũy</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Trạng thái quỹ</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Đã trả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {group.payments.map((p) => {
                      const isToday = p.days_remaining <= 0;
                      const isSoon = p.days_remaining > 0 && p.days_remaining <= 3;
                      const isSufficient = fundBalance >= p.cumulative_amount;
                      const deficit = p.cumulative_amount - fundBalance;

                      return (
                        <tr
                          key={`${p.loan_id}-${p.installment_number}`}
                          className={`transition-colors ${
                            isToday
                              ? 'bg-[var(--danger-bg)]/80 font-medium'
                              : isSoon
                              ? 'bg-[var(--warning-bg)]/60'
                              : 'hover:bg-[var(--surface-raised)]/50'
                          }`}
                        >
                          {/* Ngày & Countdown */}
                          <td className="py-3 px-3">
                            <div className="font-bold tabular-nums text-sm">
                              {formatDateVN(p.due_date)}
                            </div>
                            <div
                              className={`text-[11px] font-medium ${
                                isToday
                                  ? 'text-[var(--danger)] font-bold'
                                  : isSoon
                                  ? 'text-[var(--warning)] font-semibold'
                                  : 'text-[var(--muted)]'
                              }`}
                            >
                              {isToday
                                ? 'Hôm nay'
                                : p.days_remaining === 1
                                ? 'Ngày mai'
                                : `Còn ${p.days_remaining} ngày`}
                            </div>
                          </td>

                          {/* Tên khoản nợ */}
                          <td className="py-3 px-3">
                            <span className="font-semibold text-xs sm:text-sm">
                              {p.loan_name}
                            </span>
                          </td>

                          {/* Số tiền kỳ này */}
                          <td className="py-3 px-3 text-right font-extrabold tabular-nums">
                            {formatVND(p.amount)}
                          </td>

                          {/* Kỳ */}
                          <td className="py-3 px-3 text-center tabular-nums text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-[var(--surface-raised)] font-medium border border-[var(--border)]">
                              {p.installment_number}/{p.total_installments}
                            </span>
                          </td>

                          {/* Tiền cần có tích lũy */}
                          <td className="py-3 px-3 text-right tabular-nums text-[var(--muted)] font-medium text-xs sm:text-sm">
                            {formatVND(p.cumulative_amount)}
                          </td>

                          {/* Trạng thái quỹ */}
                          <td className="py-3 px-3 text-center">
                            {isSufficient ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--success-bg)] text-[var(--success)]">
                                Đủ
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  isSoon || isToday
                                    ? 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30'
                                    : 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/30'
                                }`}
                              >
                                Thiếu {formatVND(deficit)}
                              </span>
                            )}
                          </td>

                          {/* Checkbox tick đã trả */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={false}
                                disabled={!p.is_nearest}
                                onChange={() => onTickPayment(p.loan_id)}
                                title={
                                  p.is_nearest
                                    ? `Bấm để đánh dấu đã thanh toán ${p.loan_name} kỳ ${p.installment_number}`
                                    : 'Chỉ có thể tick kỳ gần nhất của mỗi khoản'
                                }
                                aria-label={`Tick đã trả ${p.loan_name} kỳ ${p.installment_number}`}
                                className="w-5 h-5 rounded cursor-pointer accent-[var(--accent)] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
