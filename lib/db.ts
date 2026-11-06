import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Loan, DailySavingRecord } from './schedule';
import fs from 'fs';
import path from 'path';

// 10 khoản mẫu khởi tạo
export const DEFAULT_LOANS: Loan[] = [
  { id: 'loan-1', name: 'Khoản 371k, ngày 18', amount: 371000, total_installments: 3, paid_installments: 2, base_paid: 2, anchor_date: '2026-11-18' },
  { id: 'loan-2', name: 'Khoản 740k, ngày 19', amount: 740000, total_installments: 3, paid_installments: 1, base_paid: 1, anchor_date: '2026-11-19' },
  { id: 'loan-3', name: 'Khoản 370k, ngày 19', amount: 370000, total_installments: 3, paid_installments: 0, base_paid: 0, anchor_date: '2026-11-19' },
  { id: 'loan-4', name: 'Khoản 346k, ngày 22', amount: 346000, total_installments: 12, paid_installments: 3, base_paid: 3, anchor_date: '2026-11-22' },
  { id: 'loan-5', name: 'Khoản 725k, ngày 25', amount: 725000, total_installments: 9, paid_installments: 5, base_paid: 5, anchor_date: '2026-11-25' },
  { id: 'loan-6', name: 'Khoản 740k, ngày 1', amount: 740000, total_installments: 3, paid_installments: 1, base_paid: 1, anchor_date: '2026-12-01' },
  { id: 'loan-7', name: 'Khoản 370k, ngày 1', amount: 370000, total_installments: 3, paid_installments: 0, base_paid: 0, anchor_date: '2026-12-01' },
  { id: 'loan-8', name: 'Khoản 1031k, ngày 5', amount: 1031000, total_installments: 6, paid_installments: 0, base_paid: 0, anchor_date: '2026-12-05' },
  { id: 'loan-9', name: 'Khoản 370k, ngày 9', amount: 370000, total_installments: 3, paid_installments: 1, base_paid: 1, anchor_date: '2026-12-09' },
  { id: 'loan-10', name: 'Khoản 231k, ngày 14', amount: 231000, total_installments: 12, paid_installments: 5, base_paid: 5, anchor_date: '2026-12-14' },
];

export interface AppSettings {
  id: number;
  fund_balance: number;
  telegram_chat_id: string;
  telegram_remind_enabled: boolean;
  remind_days_before: number[];
  updated_at?: string;
}

export interface PaymentLog {
  id: string;
  loan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  fund_deducted: number;
  paid_at: string;
  loans?: { name: string };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes('your-project-id')) {
    return null;
  }

  // Tự động làm sạch URL nếu người dùng lỡ copy cả đuôi /rest/v1 hoặc dấu gạch chéo
  url = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseInstance;
}

// Bộ nhớ đệm tạm khi chưa kết nối Supabase (để app luôn build & chạy được không lỗi)
let memoryLoans: Loan[] = [...DEFAULT_LOANS];
let memorySettings: AppSettings = {
  id: 1,
  fund_balance: 0,
  telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '',
  telegram_remind_enabled: true,
  remind_days_before: [0, 1, 2],
};
let memoryLogs: PaymentLog[] = [];

/**
 * Lấy danh sách khoản vay
 */
export async function getLoans(): Promise<Loan[]> {
  const sb = getSupabase();
  if (!sb) return memoryLoans;

  try {
    const { data, error } = await sb
      .from('loans')
      .select('*')
      .order('anchor_date', { ascending: true });

    if (error || !data || data.length === 0) {
      // Nếu bảng rỗng, nạp seed data vào supabase
      if (!error && data && data.length === 0) {
        await sb.from('loans').insert(DEFAULT_LOANS);
        return DEFAULT_LOANS;
      }
      return memoryLoans;
    }

    // Lọc bỏ các bản ghi lưu trữ savings nếu có
    const filtered = data.filter((item: any) => !item.id?.startsWith('__saving__'));

    return filtered.map((item) => ({
      id: item.id,
      name: item.name,
      amount: Number(item.amount),
      total_installments: Number(item.total_installments),
      paid_installments: Number(item.paid_installments),
      base_paid: Number(item.base_paid),
      anchor_date: item.anchor_date,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (err) {
    console.warn('Lỗi kết nối Supabase getLoans, dùng fallback bộ nhớ:', err);
    return memoryLoans;
  }
}

/**
 * Lấy cài đặt ứng dụng
 */
export async function getSettings(): Promise<AppSettings> {
  const sb = getSupabase();
  if (!sb) return memorySettings;

  try {
    const { data, error } = await sb.from('settings').select('*').eq('id', 1).single();

    if (error || !data) {
      // Tự khởi tạo nếu chưa có
      await sb.from('settings').upsert({
        id: 1,
        fund_balance: memorySettings.fund_balance,
        telegram_chat_id: memorySettings.telegram_chat_id,
        telegram_remind_enabled: memorySettings.telegram_remind_enabled,
        remind_days_before: memorySettings.remind_days_before,
      });
      return memorySettings;
    }

    return {
      id: 1,
      fund_balance: Number(data.fund_balance || 0),
      telegram_chat_id: data.telegram_chat_id || '',
      telegram_remind_enabled: data.telegram_remind_enabled !== false,
      remind_days_before: data.remind_days_before || [0, 1, 2],
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.warn('Lỗi kết nối Supabase getSettings, dùng fallback:', err);
    return memorySettings;
  }
}

/**
 * Cập nhật số dư quỹ
 */
export async function updateFundBalance(newBalance: number): Promise<number> {
  const balance = Math.max(0, Math.round(newBalance));
  const sb = getSupabase();
  if (!sb) {
    memorySettings.fund_balance = balance;
    return balance;
  }

  try {
    await sb
      .from('settings')
      .upsert({ id: 1, fund_balance: balance, updated_at: new Date().toISOString() });
    return balance;
  } catch {
    memorySettings.fund_balance = balance;
    return balance;
  }
}

/**
 * Cập nhật cài đặt Telegram
 */
export async function updateSettings(
  partial: Partial<Omit<AppSettings, 'id'>>
): Promise<AppSettings> {
  const sb = getSupabase();
  if (!sb) {
    memorySettings = { ...memorySettings, ...partial };
    return memorySettings;
  }

  try {
    const current = await getSettings();
    const updated = { ...current, ...partial, updated_at: new Date().toISOString() };
    await sb.from('settings').upsert({
      id: 1,
      fund_balance: updated.fund_balance,
      telegram_chat_id: updated.telegram_chat_id,
      telegram_remind_enabled: updated.telegram_remind_enabled,
      remind_days_before: updated.remind_days_before,
      updated_at: updated.updated_at,
    });
    return updated;
  } catch {
    memorySettings = { ...memorySettings, ...partial };
    return memorySettings;
  }
}

/**
 * Thêm hoặc sửa khoản vay
 */
export async function saveLoan(loan: Loan): Promise<Loan> {
  const sb = getSupabase();
  if (!sb) {
    const idx = memoryLoans.findIndex((l) => l.id === loan.id);
    if (idx >= 0) {
      memoryLoans[idx] = loan;
    } else {
      memoryLoans.push(loan);
    }
    return loan;
  }

  const payload = {
    id: loan.id,
    name: loan.name,
    amount: loan.amount,
    total_installments: loan.total_installments,
    paid_installments: loan.paid_installments,
    base_paid: loan.base_paid,
    anchor_date: loan.anchor_date,
    updated_at: new Date().toISOString(),
  };

  await sb.from('loans').upsert(payload);
  return loan;
}

/**
 * Xóa khoản vay
 */
export async function deleteLoan(loanId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) {
    memoryLoans = memoryLoans.filter((l) => l.id !== loanId);
    return true;
  }

  const { error } = await sb.from('loans').delete().eq('id', loanId);
  return !error;
}

/**
 * Lấy lịch sử trả nợ gần nhất
 */
export async function getRecentPayments(limit = 10): Promise<PaymentLog[]> {
  const sb = getSupabase();
  if (!sb) {
    return memoryLogs.slice(0, limit);
  }

  try {
    const { data, error } = await sb
      .from('payments_log')
      .select('*, loans(name)')
      .order('paid_at', { ascending: false })
      .limit(limit);

    if (error || !data) return memoryLogs.slice(0, limit);

    return data.map((d: any) => ({
      id: d.id,
      loan_id: d.loan_id,
      installment_number: d.installment_number,
      amount: Number(d.amount),
      due_date: d.due_date,
      fund_deducted: Number(d.fund_deducted),
      paid_at: d.paid_at,
      loans: d.loans,
    }));
  } catch {
    return memoryLogs.slice(0, limit);
  }
}

/**
 * Ghi nhận một kỳ trả nợ (tick đã trả)
 */
export async function recordPayment(
  loanId: string
): Promise<{ success: boolean; message: string; log?: PaymentLog }> {
  const loans = await getLoans();
  const settings = await getSettings();

  const loan = loans.find((l) => l.id === loanId);
  if (!loan) {
    return { success: false, message: 'Không tìm thấy khoản vay.' };
  }

  if (loan.paid_installments >= loan.total_installments) {
    return { success: false, message: 'Khoản vay đã thanh toán đủ tất cả các kỳ.' };
  }

  const nextInstallment = loan.paid_installments + 1;
  const deducted = loan.amount;
  const newFund = Math.max(0, settings.fund_balance - deducted);

  const sb = getSupabase();
  const logId = crypto.randomUUID();
  const now = new Date().toISOString();

  if (sb) {
    try {
      // 1. Tăng kỳ đã trả
      await sb
        .from('loans')
        .update({
          paid_installments: nextInstallment,
          updated_at: now,
        })
        .eq('id', loanId);

      // 2. Trừ quỹ
      await sb
        .from('settings')
        .update({
          fund_balance: newFund,
          updated_at: now,
        })
        .eq('id', 1);

      // 3. Ghi log
      await sb.from('payments_log').insert({
        id: logId,
        loan_id: loanId,
        installment_number: nextInstallment,
        amount: loan.amount,
        due_date: loan.anchor_date,
        fund_deducted: deducted,
        paid_at: now,
      });

      return {
        success: true,
        message: `Đã thanh toán kỳ ${nextInstallment}/${loan.total_installments} cho ${loan.name}`,
        log: {
          id: logId,
          loan_id: loanId,
          installment_number: nextInstallment,
          amount: loan.amount,
          due_date: loan.anchor_date,
          fund_deducted: deducted,
          paid_at: now,
        },
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi khi lưu thanh toán vào CSDL.' };
    }
  }

  // Fallback bộ nhớ
  loan.paid_installments = nextInstallment;
  memorySettings.fund_balance = newFund;
  const memLog: PaymentLog = {
    id: logId,
    loan_id: loanId,
    installment_number: nextInstallment,
    amount: loan.amount,
    due_date: loan.anchor_date,
    fund_deducted: deducted,
    paid_at: now,
    loans: { name: loan.name },
  };
  memoryLogs.unshift(memLog);

  return {
    success: true,
    message: `Đã thanh toán kỳ ${nextInstallment}/${loan.total_installments} cho ${loan.name}`,
    log: memLog,
  };
}

/**
 * Hoàn tác lần tick gần nhất
 */
export async function undoLastPayment(): Promise<{ success: boolean; message: string }> {
  const sb = getSupabase();

  if (sb) {
    try {
      // Lấy bản ghi thanh toán gần nhất
      const { data: logs, error } = await sb
        .from('payments_log')
        .select('*')
        .order('paid_at', { ascending: false })
        .limit(1);

      if (error || !logs || logs.length === 0) {
        return { success: false, message: 'Chưa có lượt thanh toán nào để hoàn tác.' };
      }

      const lastLog = logs[0];
      const settings = await getSettings();
      const loans = await getLoans();
      const loan = loans.find((l) => l.id === lastLog.loan_id);

      if (loan && loan.paid_installments > 0) {
        // Giảm số kỳ đã trả
        await sb
          .from('loans')
          .update({
            paid_installments: loan.paid_installments - 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', loan.id);
      }

      // Hoàn lại tiền vào quỹ
      await sb
        .from('settings')
        .update({
          fund_balance: settings.fund_balance + Number(lastLog.fund_deducted),
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      // Xóa log
      await sb.from('payments_log').delete().eq('id', lastLog.id);

      return {
        success: true,
        message: `Đã hoàn tác kỳ ${lastLog.installment_number} của ${loan?.name || 'khoản vay'} (+${lastLog.fund_deducted.toLocaleString('vi-VN')} đ)`,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi khi hoàn tác.' };
    }
  }

  // Fallback bộ nhớ
  if (memoryLogs.length === 0) {
    return { success: false, message: 'Chưa có lượt thanh toán nào để hoàn tác.' };
  }

  const lastLog = memoryLogs.shift()!;
  const loan = memoryLoans.find((l) => l.id === lastLog.loan_id);
  if (loan && loan.paid_installments > 0) {
    loan.paid_installments -= 1;
  }
  memorySettings.fund_balance += lastLog.fund_deducted;

  return {
    success: true,
    message: `Đã hoàn tác kỳ ${lastLog.installment_number} của ${loan?.name || 'khoản vay'}`,
  };
}

// Lưu trữ cục bộ cho các ngày để dành (dự phòng khi Supabase chưa tạo bảng savings_log)
const SAVINGS_FILE = path.join(process.cwd(), '.data', 'savings.json');

function readLocalSavings(): DailySavingRecord[] {
  try {
    if (!fs.existsSync(SAVINGS_FILE)) return [];
    const raw = fs.readFileSync(SAVINGS_FILE, 'utf-8');
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function writeLocalSavings(data: DailySavingRecord[]) {
  try {
    const dir = path.dirname(SAVINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SAVINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Lỗi ghi local savings:', e);
  }
}

// Cờ ghi nhớ bảng savings_log có tồn tại trên Supabase hay không (tránh 404 lặp lại làm chậm app)
let hasSavingsLogTable: boolean | null = null;

/**
 * Lấy lịch sử để dành tiền các ngày
 */
export async function getSavingsHistory(limit = 14): Promise<DailySavingRecord[]> {
  const sb = getSupabase();
  if (sb) {
    if (hasSavingsLogTable !== false) {
      try {
        const { data, error } = await sb
          .from('savings_log')
          .select('*')
          .order('date', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          hasSavingsLogTable = true;
          return data.map((d: any) => ({
            id: d.id,
            date: d.date,
            amount: Number(d.amount),
            created_at: d.created_at,
          }));
        } else if (error && (error.code === 'PGRST205' || error.message?.includes('not find'))) {
          hasSavingsLogTable = false;
        }
      } catch {
        hasSavingsLogTable = false;
      }
    }

    // Fallback qua Supabase table 'loans' lưu trữ vĩnh viễn không sợ mất trên Vercel
    try {
      const { data, error } = await sb
        .from('loans')
        .select('*')
        .like('id', '__saving__%')
        .order('anchor_date', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          date: d.anchor_date,
          amount: Number(d.amount),
          created_at: d.created_at || d.updated_at,
        }));
      }
    } catch (e) {
      console.warn('Lỗi đọc fallback saving từ supabase:', e);
    }
  }

  const local = readLocalSavings();
  return local.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/**
 * Lấy bản ghi để dành tiền của một ngày cụ thể (ví dụ hôm nay)
 */
export async function getSavingForDate(dateStr: string): Promise<DailySavingRecord | null> {
  const sb = getSupabase();
  if (sb) {
    if (hasSavingsLogTable !== false) {
      try {
        const { data, error } = await sb
          .from('savings_log')
          .select('*')
          .eq('date', dateStr)
          .maybeSingle();

        if (!error && data) {
          hasSavingsLogTable = true;
          return {
            id: data.id,
            date: data.date,
            amount: Number(data.amount),
            created_at: data.created_at,
          };
        } else if (error && (error.code === 'PGRST205' || error.message?.includes('not find'))) {
          hasSavingsLogTable = false;
        }
      } catch {
        hasSavingsLogTable = false;
      }
    }

    // Fallback qua Supabase table 'loans' lưu trữ vĩnh viễn
    try {
      const { data, error } = await sb
        .from('loans')
        .select('*')
        .eq('id', `__saving__${dateStr}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          date: data.anchor_date,
          amount: Number(data.amount),
          created_at: data.created_at || data.updated_at,
        };
      }
    } catch {}
  }

  const local = readLocalSavings();
  const found = local.find((s) => s.date === dateStr);
  return found || null;
}

/**
 * Ghi nhận để dành tiền cho một ngày (tick 161k hoặc nhập số tiền lớn hơn):
 * - Nếu ngày này đã có trước đó: cộng dồn hoặc cập nhật số tiền chênh lệch vào quỹ
 * - Nếu ngày này chưa có: cộng toàn bộ số tiền vào quỹ
 * - Nếu options.preserveFund = true: chỉ ghi log tiết kiệm mà không tăng quỹ lại (dành cho trường hợp đã nạp sẵn vào quỹ)
 */
export async function recordDailySaving(
  dateStr: string,
  amount: number,
  options?: { preserveFund?: boolean }
): Promise<{ success: boolean; newFund: number; record: DailySavingRecord }> {
  const settings = await getSettings();
  const existing = await getSavingForDate(dateStr);
  const oldAmount = existing ? existing.amount : 0;

  let newFund = settings.fund_balance;
  if (!options?.preserveFund) {
    const diff = amount - oldAmount;
    newFund = Math.max(0, settings.fund_balance + diff);
    await updateFundBalance(newFund);
  }

  const sb = getSupabase();
  const record: DailySavingRecord = {
    id: existing?.id || crypto.randomUUID(),
    date: dateStr,
    amount: Math.round(amount),
    created_at: new Date().toISOString(),
  };

  if (sb) {
    if (hasSavingsLogTable !== false) {
      try {
        const { error } = await sb.from('savings_log').upsert({
          date: dateStr,
          amount: Math.round(amount),
          created_at: record.created_at,
        });
        if (error && (error.code === 'PGRST205' || error.message?.includes('not find'))) {
          hasSavingsLogTable = false;
        }
      } catch {
        hasSavingsLogTable = false;
      }
    }

    // Luôn lưu cả vào Supabase table 'loans' để đảm bảo dữ liệu vĩnh viễn trên Vercel
    try {
      await sb.from('loans').upsert({
        id: `__saving__${dateStr}`,
        name: `Tiết kiệm ${dateStr}`,
        amount: Math.round(amount),
        total_installments: 1,
        paid_installments: 1,
        base_paid: 0,
        anchor_date: dateStr,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Lỗi lưu fallback saving vào supabase loans:', e);
    }
  }

  // Luôn lưu local dự phòng
  const local = readLocalSavings().filter((s) => s.date !== dateStr);
  local.push(record);
  writeLocalSavings(local);

  return { success: true, newFund, record };
}

/**
 * Hủy bỏ việc đã để dành của một ngày (trừ lại tiền khỏi quỹ)
 */
export async function cancelDailySaving(
  dateStr: string
): Promise<{ success: boolean; newFund: number }> {
  const settings = await getSettings();
  const existing = await getSavingForDate(dateStr);
  if (!existing) {
    return { success: false, newFund: settings.fund_balance };
  }

  const newFund = Math.max(0, settings.fund_balance - existing.amount);
  await updateFundBalance(newFund);

  const sb = getSupabase();
  if (sb) {
    if (hasSavingsLogTable !== false) {
      try {
        const { error } = await sb.from('savings_log').delete().eq('date', dateStr);
        if (error && (error.code === 'PGRST205' || error.message?.includes('not find'))) {
          hasSavingsLogTable = false;
        }
      } catch {
        hasSavingsLogTable = false;
      }
    }

    // Xóa trong Supabase table 'loans'
    try {
      await sb.from('loans').delete().eq('id', `__saving__${dateStr}`);
    } catch {}
  }

  const local = readLocalSavings().filter((s) => s.date !== dateStr);
  writeLocalSavings(local);

  return { success: true, newFund };
}

