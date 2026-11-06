import { NextResponse } from 'next/server';
import { getLoans, getSettings, recordPayment } from '@/lib/db';
import { generateSchedule, getTodayVNString, formatVND } from '@/lib/schedule';
import {
  sendTelegramMessage,
  answerCallbackQuery,
  buildStatusMessage,
  buildPaidKeyboard,
} from '@/lib/telegram';

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN chưa được cài đặt' }, { status: 500 });
  }

  try {
    const update = await req.json();

    // 1. Xử lý Callback Query từ Inline Keyboard (nút tick đã trả)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const chatId = cq.message?.chat?.id;

      if (data.startsWith('pay:')) {
        const loanId = data.replace('pay:', '');
        const payResult = await recordPayment(loanId);

        if (payResult.success) {
          await answerCallbackQuery(token, cq.id, 'Đã xác nhận thanh toán kỳ này!');
          if (chatId) {
            const loans = await getLoans();
            const settings = await getSettings();
            const todayStr = getTodayVNString();
            const overview = generateSchedule(loans, settings.fund_balance, todayStr);

            await sendTelegramMessage(
              token,
              chatId,
              `✅ <b>${payResult.message}</b>\n💰 Quỹ trả nợ còn lại: <b>${formatVND(
                settings.fund_balance
              )}</b>\n\n${buildStatusMessage(overview, todayStr)}`
            );
          }
        } else {
          await answerCallbackQuery(token, cq.id, payResult.message);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Xử lý Message dạng tin nhắn lệnh
    if (update.message) {
      const msg = update.message;
      const text = (msg.text || '').trim();
      const chatId = msg.chat?.id;

      if (!chatId) return NextResponse.json({ ok: true });

      if (text.startsWith('/start') || text.startsWith('/help')) {
        const helpText = [
          '👋 Xin chào! Tôi là Bot <b>Sổ Trả Nợ</b>.',
          '',
          'Các lệnh hỗ trợ:',
          '👉 <b>/status</b> : Xem báo cáo tổng quan nợ và tiền cần tiết kiệm hôm nay.',
          '👉 <b>/paid</b> : Hiện danh sách kỳ gần nhất để bấm nút xác nhận Đã Trả.',
        ].join('\n');
        await sendTelegramMessage(token, chatId, helpText);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith('/status')) {
        const loans = await getLoans();
        const settings = await getSettings();
        const todayStr = getTodayVNString();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        const statusMsg = buildStatusMessage(overview, todayStr);

        await sendTelegramMessage(token, chatId, statusMsg);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith('/paid')) {
        const loans = await getLoans();
        const settings = await getSettings();
        const todayStr = getTodayVNString();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        const { text: paidText, replyMarkup } = buildPaidKeyboard(overview);

        await sendTelegramMessage(token, chatId, paidText, replyMarkup);
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Lỗi webhook Telegram:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
