'use client';

import React, { useState } from 'react';
import { Loan, formatVND, addMonths, parseDateString, formatDateVN } from '@/lib/schedule';
import LoanModal from './LoanModal';
import { Plus, Edit2, Trash2, CheckCircle, Calendar, CreditCard } from 'lucide-react';

interface LoansTabProps {
  loans: Loan[];
  onSaveLoan: (loanData: Partial<Loan>) => Promise<void>;
  onDeleteLoan: (loanId: string) => Promise<void>;
}

export default function LoansTab({
  loans,
  onSaveLoan,
  onDeleteLoan,
}: LoansTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingLoan(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async (loanId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khoản vay này?')) {
      setDeletingId(loanId);
      await onDeleteLoan(loanId);
      setDeletingId(null);
    }
  };

  // Tính tổng số nợ và tổng tiền mỗi tháng
  const totalDebt = loans.reduce(
    (sum, l) => sum + Math.max(0, l.total_installments - l.paid_installments) * l.amount,
    0
  );
  const monthlyTotal = loans.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Danh sách các khoản vay ({loans.length} khoản)
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Tổng nợ còn lại: <strong className="text-[var(--foreground)]">{formatVND(totalDebt)}</strong> &middot;{' '}
            Mỗi tháng khi đủ: <strong className="text-[var(--foreground)]">{formatVND(monthlyTotal)}</strong>
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm khoản vay mới</span>
        </button>
      </div>

      {/* Grid of Loans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loans.map((loan) => {
          const isFinished = loan.paid_installments >= loan.total_installments;
          const remainingInstallments = Math.max(0, loan.total_installments - loan.paid_installments);
          const remainingDebt = remainingInstallments * loan.amount;
          const progressPercent = Math.round((loan.paid_installments / loan.total_installments) * 100);

          // Tính tháng trả xong (kỳ cuối cùng n = total_installments)
          let completionText = 'Đã hoàn thành';
          if (!isFinished) {
            const anchor = parseDateString(loan.anchor_date);
            const offset = loan.total_installments - (loan.base_paid + 1);
            const finalDate = addMonths(anchor, offset);
            const m = String(finalDate.getMonth() + 1).padStart(2, '0');
            const y = finalDate.getFullYear();
            completionText = `Tháng ${m}/${y}`;
          }

          return (
            <div
              key={loan.id}
              className={`bg-[var(--surface)] border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between transition-all ${
                isFinished
                  ? 'border-[var(--success)]/40 bg-[var(--success-bg)]/20 opacity-80'
                  : 'border-[var(--border)] hover:border-[var(--accent)]/50'
              }`}
            >
              <div className="space-y-3">
                {/* Header: Name and Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base tracking-tight truncate">
                      {loan.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--muted)]">
                      <span>Mỗi kỳ: <strong className="text-[var(--foreground)] tabular-nums">{formatVND(loan.amount)}</strong></span>
                      <span>&middot;</span>
                      <span>Hạn kế tiếp: {formatDateVN(loan.anchor_date, true)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(loan)}
                      title="Chỉnh sửa"
                      aria-label={`Sửa ${loan.name}`}
                      className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] active:scale-95 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(loan.id)}
                      disabled={deletingId === loan.id}
                      title="Xóa khoản vay"
                      aria-label={`Xóa ${loan.name}`}
                      className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--muted)]">
                      Đã trả: <strong className="text-[var(--foreground)] tabular-nums">{loan.paid_installments}/{loan.total_installments} kỳ</strong>
                    </span>
                    <span className="font-bold text-[var(--accent)] tabular-nums">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-[var(--surface-raised)] h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFinished ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Info row: Còn nợ & Tháng trả xong */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-xs">
                  <div>
                    <span className="text-[11px] text-[var(--muted)] uppercase font-semibold block">
                      Còn nợ
                    </span>
                    <span className="font-extrabold text-sm tabular-nums text-[var(--foreground)]">
                      {isFinished ? '0 đ' : formatVND(remainingDebt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--muted)] uppercase font-semibold block">
                      Tháng trả xong
                    </span>
                    <span className="font-bold text-sm text-[var(--foreground)] flex items-center gap-1">
                      {isFinished ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />
                          <span>Đã xong</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
                          <span>{completionText}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <LoanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveLoan}
        editingLoan={editingLoan}
      />
    </div>
  );
}
