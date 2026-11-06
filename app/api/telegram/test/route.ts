import { NextResponse } from 'next/server';
import { getLoans, getSettings } from '@/lib/db';
import { generateSchedule, getTodayVNString } from '@/lib/schedule';
import { sendTelegramMessage, buildDailyReportMessage } from '@/lib/telegram';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Chưa cấu hình biến môi trường TELEGRAM_BOT_TOKEN trên server.' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const settings = await getSettings();
    const chatId = body.chat_id || settings.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

    if (!chatId) {
      return NextResponse.json(
        { error: 'Vui lòng nhập Telegram Chat ID trước khi gửi thử.' },
        { status: 400 }
      );
    }

    const loans = await getLoans();
    const todayStr = getTodayVNString();
    const overview = generateSchedule(loans, settings.fund_balance, todayStr);

    const { text } = buildDailyReportMessage(overview, todayStr, settings.remind_days_before);
    const result = await sendTelegramMessage(token, chatId, text);

    if (!result.ok) {
      return NextResponse.json(
        { error: `Telegram Bot API báo lỗi: ${result.description}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi tin nhắn mẫu đến Telegram thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
