'use client';

import React, { useState, useEffect } from 'react';
import { Loan } from '@/lib/schedule';
import { X } from 'lucide-react';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loanData: Partial<Loan>) => Promise<void>;
  editingLoan: Loan | null;
}

export default function LoanModal({
  isOpen,
  onClose,
  onSave,
  editingLoan,
}: LoanModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [anchorDate, setAnchorDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingLoan) {
      setName(editingLoan.name);
      setAmount(editingLoan.amount.toString());
      setTotalInstallments(editingLoan.total_installments.toString());
      setPaidInstallments(editingLoan.paid_installments.toString());
      setAnchorDate(editingLoan.anchor_date);
    } else {
      setName('');
      setAmount('');
      setTotalInstallments('12');
      setPaidInstallments('0');
      // Mặc định ngày kế tiếp là ngày 15 tháng sau
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      setAnchorDate(`${yyyy}-${mm}-15`);
    }
    setError('');
  }, [editingLoan, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedAmount = Number(amount.replace(/[^0-9]/g, ''));
    const parsedTotal = Number(totalInstallments);
    const parsedPaid = Number(paidInstallments);

    if (!name.trim()) {
      setError('Vui lòng nhập tên khoản vay.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Số tiền mỗi kỳ phải lớn hơn 0.');
      return;
    }
    if (!parsedTotal || parsedTotal <= 0) {
      setError('Tổng số kỳ phải lớn hơn 0.');
      return;
    }
    if (parsedPaid < 0 || parsedPaid > parsedTotal) {
      setError('Số kỳ đã trả không hợp lệ (phải từ 0 đến tổng số kỳ).');
      return;
    }
    if (!anchorDate) {
      setError('Vui lòng chọn ngày trả của kỳ kế tiếp.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...(editingLoan ? { id: editingLoan.id } : {}),
        name: name.trim(),
        amount: parsedAmount,
        total_installments: parsedTotal,
        paid_installments: parsedPaid,
        base_paid: editingLoan ? editingLoan.base_paid : parsedPaid,
        anchor_date: anchorDate,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi lưu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[var(--surface)] border border-[var(--border)] w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-bold text-base">
            {editingLoan ? 'Chỉnh sửa khoản vay' : 'Thêm khoản vay mới'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-raised)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="text-xs text-[var(--danger)] bg-[var(--danger-bg)] p-2.5 rounded-lg border border-[var(--danger)]/20">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Tên khoản vay
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Khoản 371k, ngày 18"
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Số tiền mỗi kỳ (VNĐ)
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={
                amount
                  ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('vi-VN')
                  : ''
              }
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="VD: 371.000"
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Đã trả (kỳ)
              </label>
              <input
                type="number"
                min="0"
                required
                value={paidInstallments}
                onChange={(e) => setPaidInstallments(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Tổng số kỳ
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Ngày trả kỳ kế tiếp
            </label>
            <input
              type="date"
              required
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <p className="text-[11px] text-[var(--muted)]">
              Các kỳ tiếp theo sẽ tự động rơi vào cùng ngày này ở các tháng sau.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu khoản vay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
