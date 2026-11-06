import {
  ScheduleOverview,
  formatVND,
  formatDateVN,
  getTodayVNString,
} from './schedule';

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

/**
 * Gửi tin nhắn qua Telegram Bot API (sendMessage) dùng fetch thuần
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramInlineKeyboardMarkup
): Promise<{ ok: boolean; description?: string; result?: any }> {
  if (!token || !chatId) {
    return { ok: false, description: 'Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body: Record<string, any> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, description: err?.message || 'Lỗi kết nối Telegram' };
  }
}

/**
 * Trả lời Callback Query từ nút bấm inline
 */
export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    const data = await res.json();
    return data.ok;
  } catch {
    return false;
  }
}

/**
 * Tạo nội dung tin nhắn báo cáo hàng ngày đúng chuẩn mẫu tiếng Việt:
 *
 * Báo cáo trả nợ - 07/11
 *
 * Hôm nay cần tiết kiệm: 165.000 đ
 * (Quỹ hiện có: 1.200.000 đ, mốc căng nhất: hạn 05/12)
 *
 * Sắp đến hạn:
 * - 18/11 (còn 11 ngày): 371.000 đ - Khoản 371k
 * - 19/11 (còn 12 ngày): 1.110.000 đ - 2 khoản
 *
 * Tổng cần có trước hạn gần nhất: 371.000 đ
 * Quỹ đang thiếu: 0 đ
 */
export function buildDailyReportMessage(
  overview: ScheduleOverview,
  todayStr: string = getTodayVNString(),
  remindDaysBefore: number[] = [0, 1, 2]
): { text: string; shouldSend: boolean } {
  const [y, m, d] = todayStr.split('-');
  const dateHeader = `${d}/${m}`;

  // Kiểm tra điều kiện gửi:
  // "không gửi nếu không có khoản nào đến hạn trong 2 ngày tới VÀ quỹ đã đủ"
  const hasDueIn2Days = overview.payments.some(
    (p) => p.days_remaining >= 0 && p.days_remaining <= 2
  );
  const isFundSufficient = overview.daily_saving_needed === 0;

  // Nếu không có khoản nào đến hạn trong 2 ngày tới VÀ quỹ đã đủ => không gửi
  const shouldSend = !( !hasDueIn2Days && isFundSufficient );

  const savingStr = formatVND(overview.daily_saving_needed);
  const fundStr = formatVND(overview.fund_balance);

  let criticalInfo = 'quỹ đã đủ cho mọi hạn';
  if (overview.critical_payment && overview.daily_saving_needed > 0) {
    criticalInfo = `mốc căng nhất: hạn ${formatDateVN(overview.critical_payment.due_date)}`;
  }

  // Nhóm các khoản sắp đến hạn trong vòng 14 ngày hoặc các khoản gần nhất
  const upcomingPayments = overview.payments.filter((p) => p.days_remaining <= 14);
  const groupedByDate = new Map<string, typeof overview.payments>();

  for (const p of upcomingPayments) {
    const list = groupedByDate.get(p.due_date) || [];
    list.push(p);
    groupedByDate.set(p.due_date, list);
  }

  let upcomingSection = '';
  if (groupedByDate.size > 0) {
    const lines: string[] = [];
    groupedByDate.forEach((items, dateKey) => {
      const days = items[0].days_remaining;
      const daysText =
        days <= 0
          ? 'hôm nay'
          : days === 1
          ? 'còn 1 ngày'
          : `còn ${days} ngày`;
      const dateVN = formatDateVN(dateKey);
      const totalDateAmount = items.reduce((s, it) => s + it.amount, 0);
      const amountStr = formatVND(totalDateAmount);

      let labelDesc = '';
      if (items.length === 1) {
        labelDesc = items[0].loan_name;
      } else {
        labelDesc = `${items.length} khoản`;
      }

      lines.push(`- ${dateVN} (${daysText}): ${amountStr} - ${labelDesc}`);
    });
    upcomingSection = lines.slice(0, 5).join('\n');
  } else {
    upcomingSection = 'Hiện không có khoản nào đến hạn trong 14 ngày tới.';
  }

  // Tính tổng cần có trước hạn gần nhất & quỹ đang thiếu
  const nextP = overview.next_payment;
  let nearestAmountStr = '0 đ';
  let fundDeficitStr = '0 đ';

  if (nextP) {
    // Tổng số tiền cần cho các khoản cùng ngày đến hạn gần nhất
    const nearestDuePayments = overview.payments.filter(
      (p) => p.due_date === nextP.due_date
    );
    const nearestTotal = nearestDuePayments.reduce((s, it) => s + it.amount, 0);
    nearestAmountStr = formatVND(nearestTotal);

    const deficit = Math.max(0, nearestTotal - overview.fund_balance);
    fundDeficitStr = formatVND(deficit);
  }

  const text = [
    `<b>Báo cáo trả nợ - ${dateHeader}</b>`,
    '',
    `Hôm nay cần tiết kiệm: <b>${savingStr}</b>`,
    `(Quỹ hiện có: ${fundStr}, ${criticalInfo})`,
    '',
    'Sắp đến hạn:',
    upcomingSection,
    '',
    `Tổng cần có trước hạn gần nhất: ${nearestAmountStr}`,
    `Quỹ đang thiếu: ${fundDeficitStr}`,
  ].join('\n');

  return { text, shouldSend };
}

/**
 * Xây dựng tin nhắn trả về khi gõ lệnh /status
 */
export function buildStatusMessage(
  overview: ScheduleOverview,
  todayStr: string = getTodayVNString()
): string {
  const { text } = buildDailyReportMessage(overview, todayStr);
  const extra = [
    '',
    `📊 <b>Tổng quan nợ:</b>`,
    `- Còn nợ: ${formatVND(overview.total_remaining_debt)} (${overview.total_remaining_installments} kỳ)`,
    `- Tiến độ: ${overview.paid_installments}/${overview.total_installments} kỳ`,
    `- Mỗi tháng tối đa: ${formatVND(overview.max_monthly_payment)}`,
  ].join('\n');
  return text + '\n' + extra;
}

/**
 * Xây dựng bàn phím inline khi gõ lệnh /paid
 */
export function buildPaidKeyboard(
  overview: ScheduleOverview
): { text: string; replyMarkup: TelegramInlineKeyboardMarkup } {
  // Lấy các kỳ gần nhất của các khoản chưa trả xong
  const nearestPayments = overview.payments.filter((p) => p.is_nearest);

  if (nearestPayments.length === 0) {
    return {
      text: '🎉 Chúc mừng! Bạn đã hoàn thành tất cả các kỳ trả nợ.',
      replyMarkup: { inline_keyboard: [] },
    };
  }

  const keyboard: TelegramInlineKeyboardButton[][] = nearestPayments.map((p) => [
    {
      text: `✅ ${p.loan_name} (Kỳ ${p.installment_number}/${p.total_installments} - ${formatVND(p.amount)})`,
      callback_data: `pay:${p.loan_id}`,
    },
  ]);

  return {
    text: '<b>Chọn khoản vay bạn vừa thanh toán kỳ gần nhất:</b>\n(Bấm nút sẽ tăng 1 kỳ và tự trừ tiền khỏi Quỹ trả nợ)',
    replyMarkup: { inline_keyboard: keyboard },
  };
}
