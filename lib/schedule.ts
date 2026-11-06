export interface Loan {
  id: string;
  name: string;
  amount: number;
  total_installments: number;
  paid_installments: number;
  base_paid: number;
  anchor_date: string; // YYYY-MM-DD
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledPayment {
  loan_id: string;
  loan_name: string;
  amount: number;
  installment_number: number;
  total_installments: number;
  due_date: string; // YYYY-MM-DD
  cumulative_amount: number;
  days_remaining: number;
  is_nearest: boolean;
}

export interface ScheduleOverview {
  daily_saving_needed: number;
  critical_payment: ScheduledPayment | null;
  total_remaining_debt: number;
  total_remaining_installments: number;
  total_installments: number;
  paid_installments: number;
  max_monthly_payment: number;
  next_payment: ScheduledPayment | null;
  payments: ScheduledPayment[];
  fund_balance: number;
}

/**
 * Phân tích chuỗi YYYY-MM-DD thành Date (an toàn múi giờ bằng cách chỉ dùng y, m, d)
 */
export function parseDateString(s: string): Date {
  const parts = s.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Định dạng Date thành YYYY-MM-DD
 */
export function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Cộng thêm m tháng vào ngày d, nếu tháng mới không có ngày đó thì lấy ngày cuối tháng
 */
export function addMonths(d: Date, m: number): Date {
  const day = d.getDate();
  const r = new Date(d.getFullYear(), d.getMonth() + m, 1);
  const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, lastDay));
  return r;
}

/**
 * Tính số ngày chênh lệch giữa ngày mục tiêu và ngày hiện tại (target - today)
 */
export function getDaysDifference(todayStr: string, targetStr: string): number {
  const dToday = parseDateString(todayStr);
  const dTarget = parseDateString(targetStr);
  const msDiff = dTarget.getTime() - dToday.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Định dạng tiền tệ VND: 1.031.000 đ
 */
export function formatVND(amount: number): string {
  const rounded = Math.round(amount);
  return rounded.toLocaleString('vi-VN').replace(/,/g, '.') + ' đ';
}

/**
 * Định dạng ngày dd/MM hoặc dd/MM/yyyy
 */
export function formatDateVN(dateStr: string, withYear = false): string {
  const [y, m, d] = dateStr.split('-');
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

/**
 * Lấy ngày hôm nay theo múi giờ Asia/Ho_Chi_Minh dạng YYYY-MM-DD
 */
export function getTodayVNString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Sinh danh sách tất cả kỳ trả nợ còn lại và tính toán quỹ, số tiền cần tiết kiệm mỗi ngày
 */
export function generateSchedule(
  loans: Loan[],
  fundBalance: number,
  todayStr: string = getTodayVNString()
): ScheduleOverview {
  const payments: ScheduledPayment[] = [];

  // 1. Tạo danh sách các kỳ chưa trả
  for (const loan of loans) {
    const anchorDate = parseDateString(loan.anchor_date);
    for (let n = loan.paid_installments + 1; n <= loan.total_installments; n++) {
      const monthOffset = n - (loan.base_paid + 1);
      const dueDateObj = addMonths(anchorDate, monthOffset);
      const dueDateStr = formatDateString(dueDateObj);
      const daysRemaining = getDaysDifference(todayStr, dueDateStr);

      payments.push({
        loan_id: loan.id,
        loan_name: loan.name,
        amount: loan.amount,
        installment_number: n,
        total_installments: loan.total_installments,
        due_date: dueDateStr,
        cumulative_amount: 0,
        days_remaining: daysRemaining,
        is_nearest: false, // sẽ cập nhật sau
      });
    }
  }

  // 2. Sắp xếp các kỳ theo thứ tự ngày tăng dần, sau đó theo loan_id, sau đó theo kỳ n
  payments.sort((a, b) => {
    if (a.due_date !== b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }
    if (a.loan_id !== b.loan_id) {
      return a.loan_id.localeCompare(b.loan_id);
    }
    return a.installment_number - b.installment_number;
  });

  // Đánh dấu kỳ gần nhất của mỗi khoản (chỉ kỳ gần nhất mới được tick)
  const nearestMap = new Set<string>();
  for (const p of payments) {
    if (!nearestMap.has(p.loan_id)) {
      nearestMap.add(p.loan_id);
      p.is_nearest = true;
    }
  }

  // 3. Tính tiền tích lũy cum(d)
  let cum = 0;
  for (const p of payments) {
    cum += p.amount;
    p.cumulative_amount = cum;
  }

  // 4. Tính số tiền cần tiết kiệm mỗi ngày:
  // Với mỗi hạn d: can_moi_ngay(d) = max(0, cum(d) - quy) / max(1, số ngày từ hôm nay đến d).
  // Số tiền cần tiết kiệm mỗi ngày = giá trị LỚN NHẤT của can_moi_ngay(d) trên mọi hạn.
  let dailySavingNeeded = 0;
  let criticalPayment: ScheduledPayment | null = null;

  for (const p of payments) {
    const days = Math.max(1, p.days_remaining);
    const needDaily = Math.max(0, p.cumulative_amount - fundBalance) / days;
    if (needDaily > dailySavingNeeded) {
      dailySavingNeeded = needDaily;
      criticalPayment = p;
    }
  }

  // 5. Thống kê tổng hợp
  const totalRemainingDebt = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInstallments = loans.reduce((sum, l) => sum + l.total_installments, 0);
  const paidInstallments = loans.reduce((sum, l) => sum + l.paid_installments, 0);
  const maxMonthlyPayment = loans.reduce(
    (sum, l) => (l.paid_installments < l.total_installments ? sum + l.amount : sum),
    0
  );
  const nextPayment = payments.length > 0 ? payments[0] : null;

  return {
    daily_saving_needed: Math.round(dailySavingNeeded),
    critical_payment: criticalPayment,
    total_remaining_debt: totalRemainingDebt,
    total_remaining_installments: payments.length,
    total_installments: totalInstallments,
    paid_installments: paidInstallments,
    max_monthly_payment: maxMonthlyPayment,
    next_payment: nextPayment,
    payments,
    fund_balance: fundBalance,
  };
}

/**
 * Xử lý tick "đã trả" cho kỳ gần nhất của một khoản:
 * - Tăng số kỳ đã trả thêm 1
 * - Trừ số tiền kỳ đó khỏi quỹ trả nợ (nếu quỹ > số tiền thì trừ, nếu ít hơn thì về 0 hoặc trừ âm)
 */
export function tickPayment(
  loans: Loan[],
  loanId: string,
  currentFund: number
): {
  updatedLoans: Loan[];
  updatedFund: number;
  tickedPayment: ScheduledPayment;
  fundDeducted: number;
} {
  const loanIndex = loans.findIndex((l) => l.id === loanId);
  if (loanIndex === -1) {
    throw new Error(`Không tìm thấy khoản vay với ID ${loanId}`);
  }

  const loan = loans[loanIndex];
  if (loan.paid_installments >= loan.total_installments) {
    throw new Error(`Khoản vay "${loan.name}" đã thanh toán hết các kỳ.`);
  }

  const nextInstallmentNumber = loan.paid_installments + 1;
  const monthOffset = nextInstallmentNumber - (loan.base_paid + 1);
  const dueDateObj = addMonths(parseDateString(loan.anchor_date), monthOffset);
  const dueDateStr = formatDateString(dueDateObj);

  const updatedLoan: Loan = {
    ...loan,
    paid_installments: nextInstallmentNumber,
  };

  const updatedLoans = [...loans];
  updatedLoans[loanIndex] = updatedLoan;

  const fundDeducted = loan.amount;
  const updatedFund = Math.max(0, currentFund - fundDeducted);

  const tickedPayment: ScheduledPayment = {
    loan_id: loan.id,
    loan_name: loan.name,
    amount: loan.amount,
    installment_number: nextInstallmentNumber,
    total_installments: loan.total_installments,
    due_date: dueDateStr,
    cumulative_amount: loan.amount,
    days_remaining: 0,
    is_nearest: true,
  };

  return {
    updatedLoans,
    updatedFund,
    tickedPayment,
    fundDeducted,
  };
}

/**
 * Hoàn tác lần tick gần nhất
 */
export function undoPayment(
  loans: Loan[],
  loanId: string,
  currentFund: number,
  fundRefunded: number
): {
  updatedLoans: Loan[];
  updatedFund: number;
} {
  const loanIndex = loans.findIndex((l) => l.id === loanId);
  if (loanIndex === -1) {
    throw new Error(`Không tìm thấy khoản vay với ID ${loanId}`);
  }

  const loan = loans[loanIndex];
  if (loan.paid_installments <= 0) {
    throw new Error(`Khoản vay "${loan.name}" chưa có kỳ nào được thanh toán để hoàn tác.`);
  }

  const updatedLoan: Loan = {
    ...loan,
    paid_installments: loan.paid_installments - 1,
  };

  const updatedLoans = [...loans];
  updatedLoans[loanIndex] = updatedLoan;
  const updatedFund = currentFund + fundRefunded;

  return {
    updatedLoans,
    updatedFund,
  };
}
