import {
  Loan,
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

export interface TelegramKeyboardButton {
  text: string;
}

export interface TelegramReplyKeyboardMarkup {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  is_persistent?: boolean;
}

export type TelegramMarkup = TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup;

/**
 * Gửi tin nhắn qua Telegram Bot API (sendMessage) dùng fetch thuần
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramMarkup
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

/**
 * Phân tích chuỗi tin nhắn người dùng gõ trên Telegram thành số tiền (VNĐ).
 * Hỗ trợ các định dạng:
 * - "161k", "161K", "161.8k" -> 161000, 161800
 * - "1tr", "1.5tr", "1,5tr", "1tr5", "2 triệu" -> 1000000, 1500000, 1500000, 1500000, 2000000
 * - "161828", "161.828", "161,828" -> 161828
 * - "50k", "50 nghìn", "50 ng" -> 50000
 * - Tiền tố: "tiết kiệm 161k", "bỏ 161k", "nạp 200k", "tk 161k", "+161k"
 * - Số nhỏ < 1000 (vd: "161", "200", "50") -> trong ngữ cảnh nạp tiền người Việt, số < 1000 mặc định hiểu là nghìn (x1000)
 */
export function parseAmountText(rawInput: string): number | null {
  if (!rawInput) return null;

  let text = rawInput.trim().toLowerCase();

  // Bỏ qua các từ khóa lệnh hoặc menu hệ thống
  if (
    text.startsWith('/') ||
    text.includes('xem nợ') ||
    text.includes('xem quỹ') ||
    text.includes('sắp đến hạn') ||
    text.includes('đã trả nợ')
  ) {
    return null;
  }

  // Loại bỏ các tiền tố thông dụng: "tiết kiệm", "tiet kiem", "tietkiem", "tk", "bỏ heo", "bo heo", "bỏ", "bo", "nạp", "nap", "+", "="
  text = text.replace(/^(tiết\s*kiệm|tiet\s*kiem|tietkiem|tk|bỏ\s*heo|bo\s*heo|bỏ|bo|nạp|nap|cộng|cong|\+|=)\s*/i, '').trim();

  // Loại bỏ đuôi tiền tệ: "vnd", "vnđ", "đồng", "dong", "d", "đ" ở cuối
  text = text.replace(/\s*(vnđ|vnd|đồng|dong|đ|d)$/i, '').trim();

  if (!text) return null;

  // 1. Dạng đặc biệt "1tr5", "2tr3", "1 triệu 5" (triệu + hàng trăm nghìn)
  const trSlangMatch = text.match(/^(\d+)\s*(?:tr|triệu|trieu)\s*(\d+)$/i);
  if (trSlangMatch) {
    const million = parseInt(trSlangMatch[1], 10);
    const sub = trSlangMatch[2];
    const factor = Math.pow(10, 6 - sub.length);
    const subNum = parseInt(sub, 10) * factor;
    return million * 1_000_000 + subNum;
  }

  // 2. Dạng Triệu: "1.5tr", "1,5tr", "2tr", "2.5 triệu", "1m"
  const millionMatch = text.match(/^(\d+(?:[\.,]\d+)?)\s*(?:tr|triệu|trieu|m)\b/i);
  if (millionMatch) {
    const cleanNum = parseFloat(millionMatch[1].replace(',', '.'));
    if (!isNaN(cleanNum) && cleanNum > 0) {
      return Math.round(cleanNum * 1_000_000);
    }
  }

  // 3. Dạng Nghìn / K: "161k", "161.8k", "50 nghìn", "50k", "50ng", "500k"
  const thousandMatch = text.match(/^(\d+(?:[\.,]\d+)?)\s*(?:k|nghìn|nghin|ng|kilo)\b/i);
  if (thousandMatch) {
    const cleanNum = parseFloat(thousandMatch[1].replace(',', '.'));
    if (!isNaN(cleanNum) && cleanNum > 0) {
      return Math.round(cleanNum * 1_000);
    }
  }

  // 4. Dạng số thuần có dấu phân cách nghìn (VD: "161.828" hoặc "161,828" hoặc "1.031.000")
  if (/^\d{1,3}(?:[\.,]\d{3})+$/.test(text)) {
    const cleanDigits = text.replace(/[\.,]/g, '');
    const num = parseInt(cleanDigits, 10);
    if (!isNaN(num) && num > 0) return num;
  }

  // 5. Dạng số thuần không dấu (VD: "161828", "200000", "50000", "161")
  if (/^\d+$/.test(text)) {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0) {
      // Nếu nhập số nhỏ hơn 1000 (VD: "161", "200", "50"), trong ngữ cảnh tiết kiệm ở VN hiểu là 161k, 200k
      if (num < 1000) {
        return num * 1_000;
      }
      return num;
    }
  }

  return null;
}

/**
 * Bàn phím chính thường trực (Reply Keyboard) hiển thị các nút thao tác nhanh
 */
export function buildMainReplyKeyboard(): TelegramReplyKeyboardMarkup {
  return {
    keyboard: [
      [{ text: '🐷 Tiết kiệm hôm nay' }, { text: '💰 Xem quỹ hiện có' }],
      [{ text: '📊 Xem nợ hiện tại' }, { text: '🗓️ Kỳ sắp đến hạn' }],
      [{ text: '✅ Tick đã trả nợ' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/**
 * Bàn phím Inline cho lệnh tiết kiệm nhanh
 */
export function buildSavingInlineKeyboard(
  targetAmount: number,
  todaySavedAmount: number = 0
): TelegramInlineKeyboardMarkup {
  if (todaySavedAmount > 0) {
    return {
      inline_keyboard: [
        [
          { text: '➕ Nạp thêm +50k', callback_data: 'save:add_50000' },
          { text: '➕ +100k', callback_data: 'save:add_100000' },
        ],
        [
          { text: '➕ +200k', callback_data: 'save:add_200000' },
          { text: '➕ +500k', callback_data: 'save:add_500000' },
        ],
        [
          { text: '❌ Hủy lượt bỏ hôm nay', callback_data: 'save:cancel' },
        ],
      ],
    };
  }

  return {
    inline_keyboard: [
      [
        {
          text: `⚡ Bỏ đúng ${formatVND(targetAmount)}`,
          callback_data: `save:${targetAmount}`,
        },
      ],
      [
        { text: '+100k', callback_data: 'save:100000' },
        { text: '+200k', callback_data: 'save:200000' },
        { text: '+300k', callback_data: 'save:300000' },
        { text: '+500k', callback_data: 'save:500000' },
      ],
      [
        { text: '❌ Hủy lượt bỏ hôm nay', callback_data: 'save:cancel' },
      ],
    ],
  };
}

/**
 * Tin nhắn hướng dẫn / hiển thị mục tiêu tiết kiệm hôm nay
 */
export function buildSavingPromptMessage(
  overview: ScheduleOverview,
  todayStr: string = getTodayVNString()
): { text: string; replyMarkup: TelegramInlineKeyboardMarkup } {
  const target = overview.base_daily_target || 162000;
  const isSaved = overview.is_today_saved;
  const savedAmount = overview.today_saved_amount || 0;

  const lines: string[] = [
    `🐷 <b>TIẾT KIỆM HÔM NAY (${formatDateVN(todayStr, true)})</b>`,
    '',
    `🎯 Chỉ tiêu hôm nay: <b>${formatVND(target)}</b>`,
    overview.critical_payment
      ? `(Mốc khắt khe nhất: hạn <b>${formatDateVN(overview.critical_payment.due_date)}</b>, cần tích lũy ${formatVND(overview.critical_payment.cumulative_amount)})`
      : '',
    '',
    isSaved
      ? `✅ <b>Hôm nay bạn đã để dành: ${formatVND(savedAmount)}</b>` +
        (savedAmount >= target
          ? ' (Đã hoàn thành xuất sắc! 🎉)'
          : ` (Còn thiếu ${formatVND(target - savedAmount)})`)
      : '⏳ Hôm nay bạn chưa ghi nhận để dành tiền.',
    '',
    isSaved
      ? '💡 <i>Bạn đã hoàn thành hôm nay! Nếu muốn nạp thêm, bấm các nút cộng thêm bên dưới hoặc gõ trực tiếp số tiền (VD: 50k, 100k)...</i>'
      : '💡 <i>Bạn có thể bấm nút chọn nhanh bên dưới hoặc gõ số tiền trực tiếp vào khung chat (Ví dụ: <code>161k</code>, <code>200k</code>, <code>50k</code>, <code>1tr5</code>)...</i>',
  ].filter(Boolean);

  return {
    text: lines.join('\n'),
    replyMarkup: buildSavingInlineKeyboard(target, savedAmount),
  };
}

/**
 * Tin nhắn xác nhận đã ghi nhận số tiền tiết kiệm hôm nay
 */
export function buildSavingSuccessMessage(
  savedAmount: number,
  overview: ScheduleOverview,
  newFundBalance: number,
  isUpdate: boolean = false,
  addedAmount?: number
): { text: string; replyMarkup: TelegramInlineKeyboardMarkup } {
  const target = overview.base_daily_target || 162000;
  const isExceeded = savedAmount > target;
  const isExact = savedAmount === target;
  const isUnder = savedAmount < target;

  let title = '✅ <b>ĐÃ GHI NHẬN BỎ HEO HÔM NAY!</b>';
  if (addedAmount && addedAmount > 0) {
    title = `🎉 <b>ĐÃ NẠP THÊM +${formatVND(addedAmount)} HÔM NAY!</b>`;
  } else if (isUpdate) {
    title = '✅ <b>ĐÃ CẬP NHẬT BỎ HEO HÔM NAY!</b>';
  }

  let evaluation = '';
  if (isExact) {
    evaluation = '🎯 Đạt chuẩn chỉ tiêu hôm nay!';
  } else if (isExceeded) {
    evaluation = `🎉 Vượt chỉ tiêu +${formatVND(savedAmount - target)}! Tuyệt vời!`;
  } else if (isUnder) {
    evaluation = `⚠️ Ít hơn chỉ tiêu ${formatVND(target - savedAmount)}. Phần thiếu sẽ được chia đều nhẹ cho các ngày tiếp theo.`;
  }

  const lines = [
    title,
    '',
    addedAmount && addedAmount > 0
      ? `➕ Nạp thêm: <b>+${formatVND(addedAmount)}</b>\n💰 Tổng hôm nay đã để dành: <b>${formatVND(savedAmount)}</b>`
      : `💰 Số tiền hôm nay: <b>${formatVND(savedAmount)}</b>`,
    evaluation,
    '',
    `🏦 <b>Số dư quỹ trả nợ hiện có: ${formatVND(newFundBalance)}</b>`,
    `📈 Từ ngày mai, mỗi ngày cần để dành: <b>${formatVND(overview.daily_saving_needed)}</b>`,
    overview.critical_payment
      ? `(Tính theo mốc hạn ${formatDateVN(overview.critical_payment.due_date)})`
      : '',
  ].filter(Boolean);

  return {
    text: lines.join('\n'),
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '➕ Nạp thêm +50k', callback_data: 'save:add_50000' },
          { text: '➕ +100k', callback_data: 'save:add_100000' },
        ],
        [
          { text: '📊 Xem nợ', callback_data: 'view:debt' },
          { text: '💰 Xem quỹ', callback_data: 'view:fund' },
          { text: '❌ Hủy bỏ', callback_data: 'save:cancel' },
        ],
      ],
    },
  };
}

/**
 * Tin nhắn báo cáo chi tiết Nợ hiện tại
 */
export function buildDebtReportMessage(
  overview: ScheduleOverview,
  loans: Loan[]
): string {
  const lines: string[] = [
    '📊 <b>TỔNG QUAN NỢ HIỆN TẠI</b>',
    '',
    `💸 Tổng nợ còn lại: <b>${formatVND(overview.total_remaining_debt)}</b>`,
    `⏳ Số kỳ còn phải trả: <b>${overview.total_remaining_installments} kỳ</b>`,
    `📈 Tiến độ hoàn thành: <b>${overview.paid_installments}/${overview.total_installments} kỳ</b> (${Math.round((overview.paid_installments / Math.max(1, overview.total_installments)) * 100)}%)`,
    `🗓️ Mỗi tháng tối đa: <b>${formatVND(overview.max_monthly_payment)}</b>`,
    '',
    overview.next_payment
      ? `🚨 Hạn kế tiếp: <b>${formatDateVN(overview.next_payment.due_date)}</b> (${overview.next_payment.days_remaining <= 0 ? 'Hôm nay' : `còn ${overview.next_payment.days_remaining} ngày`}) - <b>${formatVND(overview.next_payment.amount)}</b>`
      : '🎉 Bạn không còn khoản nợ nào!',
    '',
    '📋 <b>Danh sách từng khoản vay:</b>',
  ];

  for (const loan of loans) {
    const isDone = loan.paid_installments >= loan.total_installments;
    const remainingKys = Math.max(0, loan.total_installments - loan.paid_installments);
    const icon = isDone ? '✅' : '🔹';
    lines.push(
      `${icon} <b>${loan.name}</b>: ${isDone ? 'Đã xong' : `còn ${remainingKys}/${loan.total_installments} kỳ (${formatVND(remainingKys * loan.amount)})`}`
    );
  }

  return lines.join('\n');
}

/**
 * Tin nhắn báo cáo tình trạng Quỹ trả nợ hiện có
 */
export function buildFundReportMessage(
  overview: ScheduleOverview,
  fundBalance: number
): string {
  const nextP = overview.next_payment;
  let coverageText = 'Quỹ hiện đủ đáp ứng mọi kỳ trả nợ sắp tới!';
  if (overview.critical_payment && overview.daily_saving_needed > 0) {
    coverageText = `Mốc khắt khe nhất cần gom tiền: hạn <b>${formatDateVN(overview.critical_payment.due_date)}</b> (cần ${formatVND(overview.critical_payment.cumulative_amount)}).`;
  }

  const lines = [
    '💰 <b>SỐ DƯ QUỸ TRẢ NỢ HIỆN CÓ</b>',
    '',
    `🏦 Số dư quỹ hiện tại: <b>${formatVND(fundBalance)}</b>`,
    overview.is_today_saved
      ? `🐷 Hôm nay đã để dành: <b>${formatVND(overview.today_saved_amount)}</b>`
      : '⏳ Hôm nay chưa bỏ heo.',
    '',
    `📌 Khả năng đáp ứng: ${coverageText}`,
    nextP
      ? `• Hạn gần nhất (${formatDateVN(nextP.due_date)}): ${fundBalance >= nextP.amount ? '✅ Đã đủ tiền' : `⚠️ Còn thiếu ${formatVND(nextP.amount - fundBalance)}`}`
      : '',
    '',
    `📈 Mỗi ngày cần để dành tiếp: <b>${formatVND(overview.daily_saving_needed)}</b>`,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Tin nhắn danh sách các kỳ sắp đến hạn trong 14 ngày tới
 */
export function buildUpcomingPaymentsMessage(
  overview: ScheduleOverview
): string {
  const upcoming = overview.payments.filter((p) => p.days_remaining <= 14);

  if (upcoming.length === 0) {
    return '🗓️ <b>LỊCH TRẢ NỢ SẮP TỚI</b>\n\nKhông có khoản nào đến hạn trong 14 ngày tới. Thư thái tiết kiệm!';
  }

  const lines: string[] = [
    `🗓️ <b>CÁC KỲ ĐẾN HẠN TRONG 14 NGÀY TỚI (${upcoming.length} kỳ)</b>`,
    '',
  ];

  for (const p of upcoming) {
    const isToday = p.days_remaining <= 0;
    const isSoon = p.days_remaining > 0 && p.days_remaining <= 3;
    const isEnough = overview.fund_balance >= p.cumulative_amount;

    const badge = isToday ? '🚨 HÔM NAY' : isSoon ? '⚠️ GẦN HẠN' : '⏳';
    const status = isEnough ? '✅ Đủ quỹ' : `❌ Thiếu ${formatVND(p.cumulative_amount - overview.fund_balance)}`;

    lines.push(
      `${badge} <b>${formatDateVN(p.due_date)}</b>: <b>${formatVND(p.amount)}</b>` +
      `\n  • ${p.loan_name} (Kỳ ${p.installment_number}/${p.total_installments})` +
      `\n  • Trạng thái: ${status}`
    );
  }

  return lines.join('\n\n');
}
