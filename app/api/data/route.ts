import { NextResponse } from 'next/server';
import { getLoans, getSettings, getRecentPayments, updateFundBalance } from '@/lib/db';
import { generateSchedule, getTodayVNString } from '@/lib/schedule';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const [loans, settings, logs] = await Promise.all([
      getLoans(),
      getSettings(),
      getRecentPayments(15),
    ]);

    const todayStr = getTodayVNString();
    const overview = generateSchedule(loans, settings.fund_balance, todayStr);

    return NextResponse.json({
      loans,
      settings,
      logs,
      overview,
      today: todayStr,
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

    const updatedFund = await updateFundBalance(fund_balance);
    const loans = await getLoans();
    const todayStr = getTodayVNString();
    const overview = generateSchedule(loans, updatedFund, todayStr);

    return NextResponse.json({ success: true, fund_balance: updatedFund, overview });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
