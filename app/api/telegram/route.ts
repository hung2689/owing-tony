import { NextResponse } from 'next/server';
import {
  getLoans,
  getSettings,
  recordPayment,
  recordDailySaving,
  cancelDailySaving,
} from '@/lib/db';
import { generateSchedule, getTodayVNString, formatVND } from '@/lib/schedule';
import {
  sendTelegramMessage,
  answerCallbackQuery,
  parseAmountText,
  buildStatusMessage,
  buildPaidKeyboard,
  buildMainReplyKeyboard,
  buildSavingPromptMessage,
  buildSavingSuccessMessage,
  buildDebtReportMessage,
  buildFundReportMessage,
  buildUpcomingPaymentsMessage,
} from '@/lib/telegram';

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN chưa được cài đặt' }, { status: 500 });
  }

  try {
    const update = await req.json();

    // 1. Xử lý Callback Query từ Inline Keyboard
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const chatId = cq.message?.chat?.id;

      if (!chatId) return NextResponse.json({ ok: true });

      const todayStr = getTodayVNString();

      // Callback: Thanh toán kỳ trả nợ (pay:<loanId>)
      if (data.startsWith('pay:')) {
        const loanId = data.replace('pay:', '');
        const payResult = await recordPayment(loanId);

        if (payResult.success) {
          await answerCallbackQuery(token, cq.id, 'Đã xác nhận thanh toán kỳ này!');
          const loans = await getLoans();
          const settings = await getSettings();
          const overview = generateSchedule(loans, settings.fund_balance, todayStr);

          await sendTelegramMessage(
            token,
            chatId,
            `✅ <b>${payResult.message}</b>\n💰 Quỹ trả nợ còn lại: <b>${formatVND(
              settings.fund_balance
            )}</b>\n\n${buildStatusMessage(overview, todayStr)}`
          );
        } else {
          await answerCallbackQuery(token, cq.id, payResult.message);
        }
        return NextResponse.json({ ok: true });
      }

      // Callback: Lưu tiền tiết kiệm (save:<amount> hoặc save:cancel)
      if (data.startsWith('save:')) {
        const action = data.replace('save:', '');

        if (action === 'cancel') {
          const cancelRes = await cancelDailySaving(todayStr);
          await answerCallbackQuery(token, cq.id, 'Đã hủy lượt bỏ hôm nay!');

          const loans = await getLoans();
          const settings = await getSettings();
          const overview = generateSchedule(loans, settings.fund_balance, todayStr);

          await sendTelegramMessage(
            token,
            chatId,
            `❌ <b>ĐÃ HỦY LƯỢT TIẾT KIỆM HÔM NAY (${todayStr})</b>\n\n🏦 Quỹ trả nợ hiện tại: <b>${formatVND(
              settings.fund_balance
            )}</b>\n📈 Chỉ tiêu hôm nay vẫn là: <b>${formatVND(
              overview.base_daily_target
            )}</b>\n\n<i>Bấm nút bên dưới khi bạn sẵn sàng để dành lại nhé!</i>`,
            buildMainReplyKeyboard()
          );
          return NextResponse.json({ ok: true });
        }

        const amount = parseInt(action, 10);
        if (!isNaN(amount) && amount > 0) {
          const res = await recordDailySaving(todayStr, amount);
          await answerCallbackQuery(token, cq.id, `Đã ghi nhận +${formatVND(amount)}!`);

          const loans = await getLoans();
          const settings = await getSettings();
          const overview = generateSchedule(loans, settings.fund_balance, todayStr);
          const { text: successText, replyMarkup } = buildSavingSuccessMessage(
            amount,
            overview,
            settings.fund_balance
          );

          await sendTelegramMessage(token, chatId, successText, replyMarkup);
          return NextResponse.json({ ok: true });
        }
      }

      // Callback: Xem nợ
      if (data === 'view:debt') {
        await answerCallbackQuery(token, cq.id);
        const loans = await getLoans();
        const settings = await getSettings();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        await sendTelegramMessage(token, chatId, buildDebtReportMessage(overview, loans));
        return NextResponse.json({ ok: true });
      }

      // Callback: Xem quỹ
      if (data === 'view:fund') {
        await answerCallbackQuery(token, cq.id);
        const loans = await getLoans();
        const settings = await getSettings();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        await sendTelegramMessage(token, chatId, buildFundReportMessage(overview, settings.fund_balance));
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // 2. Xử lý Message dạng tin nhắn văn bản hoặc lệnh
    if (update.message) {
      const msg = update.message;
      const rawText = (msg.text || '').trim();
      const lower = rawText.toLowerCase();
      const chatId = msg.chat?.id;

      if (!chatId || !rawText) return NextResponse.json({ ok: true });

      const todayStr = getTodayVNString();
      const mainKeyboard = buildMainReplyKeyboard();

      // Lệnh /start hoặc /help
      if (lower.startsWith('/start') || lower.startsWith('/help')) {
        const welcomeText = [
          '👋 Xin chào! Tôi là Bot <b>Sổ Trả Nợ</b>.',
          'Tôi sẽ giúp bạn quản lý trả góp, theo dõi quỹ và tích lũy tiền mỗi ngày.',
          '',
          '<b>Các tính năng chính:</b>',
          '🐷 <b>Tiết kiệm hôm nay</b>: Bấm nút hoặc gõ trực tiếp số tiền (VD: <code>161k</code>, <code>200k</code>, <code>1tr5</code>).',
          '📊 <b>Xem nợ hiện tại</b>: Tổng nợ còn lại, số kỳ và chi tiết từng khoản.',
          '💰 <b>Xem quỹ hiện có</b>: Số tiền bạn đang để riêng và mức độ đáp ứng hạn.',
          '🗓️ <b>Kỳ sắp đến hạn</b>: Các khoản cần thanh toán trong 14 ngày tới.',
          '✅ <b>Tick đã trả nợ</b>: Đánh dấu đã trả xong kỳ gần nhất của khoản vay.',
          '',
          '👇 <i>Bấm các nút menu bên dưới để bắt đầu ngay:</i>',
        ].join('\n');

        await sendTelegramMessage(token, chatId, welcomeText, mainKeyboard);
        return NextResponse.json({ ok: true });
      }

      // Nút hoặc lệnh: Tiết kiệm hôm nay
      if (
        lower.includes('tiết kiệm hôm nay') ||
        lower === '/tietkiem' ||
        lower === '/tk' ||
        lower === '/heo'
      ) {
        const loans = await getLoans();
        const settings = await getSettings();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        const { text: promptText, replyMarkup } = buildSavingPromptMessage(overview, todayStr);

        await sendTelegramMessage(token, chatId, promptText, replyMarkup);
        return NextResponse.json({ ok: true });
      }

      // Nút hoặc lệnh: Xem nợ hiện tại
      if (
        lower.includes('xem nợ') ||
        lower.includes('nợ hiện tại') ||
        lower === '/no' ||
        lower === '/debt'
      ) {
        const loans = await getLoans();
        const settings = await getSettings();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        const debtText = buildDebtReportMessage(overview, loans);

        await sendTelegramMessage(token, chatId, debtText, mainKeyboard);
        return NextResponse.json({ ok: true });
      }

      // Nút hoặc lệnh: Xem quỹ hiện có
      if (
        lower.includes('xem quỹ') ||
        lower.includes('quỹ hiện có') ||
        lower.includes('kí quỹ') ||
        lower.includes('ký quỹ') ||
        lower === '/quy' ||
        lower === '/fund'
      ) {
        const loans = await getLoans();
        const settings = await getSettings();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        const fundText = buildFundReportMessage(overview, settings.fund_balance);

        await sendTelegramMessage(token, chatId, fundText, mainKeyboard);
        return NextResponse.json({ ok: true });
      }

      // Nút hoặc lệnh: Kỳ sắp đến hạn
      if (
        lower.includes('sắp đến hạn') ||
        lower.includes('lịch trả') ||
        lower === '/lich'
      ) {
        const loans = await getLoans();
        const settings = await getSettings();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        const upcomingText = buildUpcomingPaymentsMessage(overview);

        await sendTelegramMessage(token, chatId, upcomingText, mainKeyboard);
        return NextResponse.json({ ok: true });
      }

      // Nút hoặc lệnh: Tick đã trả nợ
      if (
        lower.includes('tick đã trả') ||
        lower.includes('đã trả nợ') ||
        lower === '/paid'
      ) {
        const loans = await getLoans();
        const settings = await getSettings();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        const { text: paidText, replyMarkup } = buildPaidKeyboard(overview);

        await sendTelegramMessage(token, chatId, paidText, replyMarkup);
        return NextResponse.json({ ok: true });
      }

      // Lệnh /status
      if (lower.startsWith('/status')) {
        const loans = await getLoans();
        const settings = await getSettings();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        const statusMsg = buildStatusMessage(overview, todayStr);

        await sendTelegramMessage(token, chatId, statusMsg, mainKeyboard);
        return NextResponse.json({ ok: true });
      }

      // Phân tích cú pháp số tiền tự nhiên: 161k, 161828, 200k, 1tr5, 50k, v.v.
      const parsedAmount = parseAmountText(rawText);
      if (parsedAmount !== null && parsedAmount > 0) {
        // Ghi nhận trực tiếp vào Database & cập nhật Quỹ
        await recordDailySaving(todayStr, parsedAmount);

        const loans = await getLoans();
        const settings = await getSettings();
        const overview = generateSchedule(loans, settings.fund_balance, todayStr);
        const { text: successText, replyMarkup } = buildSavingSuccessMessage(
          parsedAmount,
          overview,
          settings.fund_balance
        );

        await sendTelegramMessage(token, chatId, successText, replyMarkup);
        return NextResponse.json({ ok: true });
      }

      // Nếu không khớp lệnh hoặc số tiền nào, gửi gợi ý thân thiện
      const fallbackMsg = [
        '🤖 Tôi chưa hiểu cú pháp này.',
        '',
        '👉 Để ghi nhận tiền bỏ heo hôm nay, bạn có thể gõ nhanh số tiền: <code>161k</code>, <code>200k</code>, <code>50k</code>, <code>1tr5</code>...',
        '👉 Hoặc chọn một tính năng trong menu bên dưới:',
      ].join('\n');

      await sendTelegramMessage(token, chatId, fallbackMsg, mainKeyboard);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Lỗi webhook Telegram:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
