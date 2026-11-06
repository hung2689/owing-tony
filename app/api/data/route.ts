import { NextResponse } from 'next/server';
import {
  getLoans,
  getSettings,
  getRecentPayments,
  updateFundBalance,
  getSavingForDate,
  getSavingsHistory,
} from '@/lib/db';
import { generateSchedule, getTodayVNString } from '@/lib/schedule';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const todayStr = getTodayVNString();
    const [loans, settings, logs, todaySaving, savingsHistory] = await Promise.all([
      getLoans(),
      getSettings(),
      getRecentPayments(15),
      getSavingForDate(todayStr),
      getSavingsHistory(14),
    ]);

    const overview = generateSchedule(loans, settings.fund_balance, todayStr, todaySaving);

    return NextResponse.json({
      loans,
      settings,
      logs,
      overview,
      today: todayStr,
      todaySaving,
      savingsHistory,
      isSupabaseConnected: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id'),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const { fund_balance } = await req.json();
    if (typeof fund_balance !== 'number' || fund_balance < 0) {
      return NextResponse.json({ error: 'Số tiền quỹ không hợp lệ' }, { status: 400 });
    }

    const todayStr = getTodayVNString();
    const updatedFund = await updateFundBalance(fund_balance);
    const [loans, todaySaving] = await Promise.all([
      getLoans(),
      getSavingForDate(todayStr),
    ]);
    const overview = generateSchedule(loans, updatedFund, todayStr, todaySaving);

    return NextResponse.json({ success: true, fund_balance: updatedFund, overview });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
