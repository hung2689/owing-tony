import { describe, it, expect } from 'vitest';
import {
  Loan,
  generateSchedule,
  tickPayment,
  undoPayment,
  formatVND,
  addMonths,
  parseDateString,
  formatDateString,
} from '../schedule';

const SEED_LOANS: Loan[] = [
  { id: '1', name: 'Khoản 371k, ngày 18', amount: 371000, total_installments: 3, paid_installments: 2, base_paid: 2, anchor_date: '2026-11-18' },
  { id: '2', name: 'Khoản 740k, ngày 19', amount: 740000, total_installments: 3, paid_installments: 1, base_paid: 1, anchor_date: '2026-11-19' },
  { id: '3', name: 'Khoản 370k, ngày 19', amount: 370000, total_installments: 3, paid_installments: 0, base_paid: 0, anchor_date: '2026-11-19' },
  { id: '4', name: 'Khoản 346k, ngày 22', amount: 346000, total_installments: 12, paid_installments: 3, base_paid: 3, anchor_date: '2026-11-22' },
  { id: '5', name: 'Khoản 725k, ngày 25', amount: 725000, total_installments: 9, paid_installments: 5, base_paid: 5, anchor_date: '2026-11-25' },
  { id: '6', name: 'Khoản 740k, ngày 1', amount: 740000, total_installments: 3, paid_installments: 1, base_paid: 1, anchor_date: '2026-12-01' },
  { id: '7', name: 'Khoản 370k, ngày 1', amount: 370000, total_installments: 3, paid_installments: 0, base_paid: 0, anchor_date: '2026-12-01' },
  { id: '8', name: 'Khoản 1031k, ngày 5', amount: 1031000, total_installments: 6, paid_installments: 0, base_paid: 0, anchor_date: '2026-12-05' },
  { id: '9', name: 'Khoản 370k, ngày 9', amount: 370000, total_installments: 3, paid_installments: 1, base_paid: 1, anchor_date: '2026-12-09' },
  { id: '10', name: 'Khoản 231k, ngày 14', amount: 231000, total_installments: 12, paid_installments: 5, base_paid: 5, anchor_date: '2026-12-14' },
];

describe('Sổ Trả Nợ - Logic tính toán theo kiểm tra mục 3', () => {
  const TODAY = '2026-11-06';

  it('1. Tổng còn phải trả: 20.108.000 đ, tổng 39 kỳ', () => {
    const overview = generateSchedule(SEED_LOANS, 0, TODAY);
    expect(overview.total_remaining_debt).toBe(20108000);
    expect(overview.total_remaining_installments).toBe(39);
    expect(formatVND(overview.total_remaining_debt)).toBe('20.108.000 đ');
  });

  it('2. Tổng mỗi tháng khi đủ 10 khoản: 5.294.000 đ', () => {
    const totalMonthlyWhenFull = SEED_LOANS.reduce((sum, l) => sum + l.amount, 0);
    expect(totalMonthlyWhenFull).toBe(5294000);
    expect(formatVND(totalMonthlyWhenFull)).toBe('5.294.000 đ');
  });

  it('3. Cần trả tháng 11/2026 (từ 06/11): 2.552.000 đ', () => {
    const overview = generateSchedule(SEED_LOANS, 0, TODAY);
    const novPayments = overview.payments.filter((p) => p.due_date.startsWith('2026-11'));
    const novTotal = novPayments.reduce((sum, p) => sum + p.amount, 0);
    expect(novTotal).toBe(2552000);
    expect(formatVND(novTotal)).toBe('2.552.000 đ');
  });

  it('4. Cần trả tháng 12/2026: 4.923.000 đ', () => {
    const overview = generateSchedule(SEED_LOANS, 0, TODAY);
    const decPayments = overview.payments.filter((p) => p.due_date.startsWith('2026-12'));
    const decTotal = decPayments.reduce((sum, p) => sum + p.amount, 0);
    expect(decTotal).toBe(4923000);
    expect(formatVND(decTotal)).toBe('4.923.000 đ');
  });

  it('5. Khoản cuối cùng trả xong: tháng 07/2027', () => {
    const overview = generateSchedule(SEED_LOANS, 0, TODAY);
    const lastPayment = overview.payments[overview.payments.length - 1];
    expect(lastPayment.due_date.startsWith('2027-07')).toBe(true);
    expect(lastPayment.due_date).toBe('2027-07-22');
  });

  it('6. Tính tiền tiết kiệm mỗi ngày với quỹ hiện có', () => {
    const overview = generateSchedule(SEED_LOANS, 1200000, '2026-11-07');
    expect(overview.daily_saving_needed).toBeGreaterThan(0);
    expect(overview.critical_payment).not.toBeNull();
    expect(overview.critical_payment?.due_date).toBeDefined();
  });

  it('7. Quỹ đã đủ thì mỗi ngày cần bỏ thêm = 0', () => {
    const overview = generateSchedule(SEED_LOANS, 30000000, TODAY);
    expect(overview.daily_saving_needed).toBe(0);
  });

  it('8. Tick đã trả tăng số kỳ và trừ quỹ', () => {
    const initialFund = 1000000;
    const { updatedLoans, updatedFund, tickedPayment } = tickPayment(SEED_LOANS, '1', initialFund);
    const updatedLoan1 = updatedLoans.find((l) => l.id === '1');
    expect(updatedLoan1?.paid_installments).toBe(3);
    expect(updatedFund).toBe(1000000 - 371000);
    expect(tickedPayment.installment_number).toBe(3);
    expect(tickedPayment.due_date).toBe('2026-11-18');
  });

  it('9. Hoàn tác trả lại số kỳ và hoàn tiền vào quỹ', () => {
    const initialFund = 1000000;
    const { updatedLoans, updatedFund, fundDeducted } = tickPayment(SEED_LOANS, '1', initialFund);
    const { updatedLoans: revertedLoans, updatedFund: revertedFund } = undoPayment(
      updatedLoans,
      '1',
      updatedFund,
      fundDeducted
    );
    const revertedLoan1 = revertedLoans.find((l) => l.id === '1');
    expect(revertedLoan1?.paid_installments).toBe(2);
    expect(revertedFund).toBe(initialFund);
  });

  it('10. Hàm addMonths xử lý ngày cuối tháng chính xác', () => {
    const d31Jan = parseDateString('2027-01-31');
    const dFeb = addMonths(d31Jan, 1);
    expect(formatDateString(dFeb)).toBe('2027-02-28');
  });

  it('11. Khi tick đã để dành 162.000 đ hôm nay, mục tiêu ngày mai vẫn duy trì 162.000 đ (không bị giảm giả tạo 157k)', () => {
    // Ban đầu quỹ = 0
    const beforeSaving = generateSchedule(SEED_LOANS, 0, TODAY, null);
    expect(beforeSaving.daily_saving_needed).toBe(161828);
    expect(beforeSaving.is_today_saved).toBe(false);

    // Sau khi tick đã để dành 162.000 đ hôm nay (quỹ lên 162.000 đ)
    const afterSaving = generateSchedule(SEED_LOANS, 162000, TODAY, {
      date: TODAY,
      amount: 162000,
    });

    expect(afterSaving.is_today_saved).toBe(true);
    expect(afterSaving.today_saved_amount).toBe(162000);
    // Mục tiêu từ ngày mai: (4.693.000 - 162.000) / 28 = 161.821 đ ~ 162.000 đ
    expect(afterSaving.tomorrow_daily_saving_needed).toBe(161821);
    expect(afterSaving.daily_saving_needed).toBe(161821);
  });

  it('12. Khi để dành nhiều hơn (VD 500.000 đ), số tiền mỗi ngày còn lại tự động giảm xuống', () => {
    const afterExtraSaving = generateSchedule(SEED_LOANS, 500000, TODAY, {
      date: TODAY,
      amount: 500000,
    });

    expect(afterExtraSaving.is_today_saved).toBe(true);
    expect(afterExtraSaving.tomorrow_daily_saving_needed).toBe(154508);
    expect(afterExtraSaving.tomorrow_daily_saving_needed).toBeLessThan(161828);
    expect(afterExtraSaving.daily_saving_needed).toBeLessThan(161828);
  });
});
