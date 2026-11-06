import { NextResponse } from 'next/server';
import { getLoans, getSettings } from '@/lib/db';
import { generateSchedule, getTodayVNString } from '@/lib/schedule';
import { sendTelegramMessage, buildDailyReportMessage } from '@/lib/telegram';

export async function GET(req: Request) {
  return handleCronRemind(req);
}

export async function POST(req: Request) {
  return handleCronRemind(req);
}

async function handleCronRemind(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  // Kiểm tra header Authorization: Bearer CRON_SECRET để bảo vệ route
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Truy cập bị từ chối. Cần Authorization: Bearer CRON_SECRET' },
        { status: 401 }
      );
    }
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Chưa cấu hình TELEGRAM_BOT_TOKEN' },
      { status: 500 }
    );
  }

  try {
    const settings = await getSettings();
    const chatId = settings.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chưa có TELEGRAM_CHAT_ID được cài đặt' },
        { status: 400 }
      );
    }

    if (!settings.telegram_remind_enabled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Người dùng đã tắt tính năng nhắc nhở tự động.',
      });
    }

    const loans = await getLoans();
    const todayStr = getTodayVNString();
    const overview = generateSchedule(loans, settings.fund_balance, todayStr);

    const { text, shouldSend } = buildDailyReportMessage(
      overview,
      todayStr,
      settings.remind_days_before
    );

    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    if (!shouldSend && !force) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Không có khoản nào đến hạn trong 2 ngày tới VÀ quỹ đã đủ.',
        preview: text,
      });
    }

    const sendRes = await sendTelegramMessage(token, chatId, text);
    if (!sendRes.ok) {
      return NextResponse.json(
        { error: `Lỗi từ Telegram API: ${sendRes.description}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: true,
      message: 'Đã gửi báo cáo nhắc nhở trả nợ thành công!',
      detail: text,
    });
  } catch (error: any) {
    console.error('Lỗi cron remind:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
