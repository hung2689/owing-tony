import { NextResponse } from 'next/server';
import {
  recordDailySaving,
  cancelDailySaving,
  getLoans,
  getSavingForDate,
  getSavingsHistory,
} from '@/lib/db';
import { generateSchedule, getTodayVNString } from '@/lib/schedule';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const { date, amount, preserveFund } = await req.json();
    if (!date || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Ngày và số tiền không hợp lệ.' }, { status: 400 });
    }

    const result = await recordDailySaving(date, amount, {
      preserveFund: Boolean(preserveFund),
    });
    const todayStr = getTodayVNString();
    const [loans, todaySaving, savingsHistory] = await Promise.all([
      getLoans(),
      getSavingForDate(todayStr),
      getSavingsHistory(14),
    ]);
    const overview = generateSchedule(loans, result.newFund, todayStr, todaySaving);

    return NextResponse.json({
      ...result,
      overview,
      todaySaving,
      savingsHistory,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: 'Thiếu ngày cần hủy.' }, { status: 400 });
    }

    const result = await cancelDailySaving(date);
    const todayStr = getTodayVNString();
    const [loans, todaySaving, savingsHistory] = await Promise.all([
      getLoans(),
      getSavingForDate(todayStr),
      getSavingsHistory(14),
    ]);
    const overview = generateSchedule(loans, result.newFund, todayStr, todaySaving);

    return NextResponse.json({
      ...result,
      overview,
      todaySaving,
      savingsHistory,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
