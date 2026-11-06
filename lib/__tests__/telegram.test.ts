import { describe, it, expect } from 'vitest';
import { Loan, generateSchedule } from '../schedule';
import { buildDailyReportMessage, buildStatusMessage, buildPaidKeyboard } from '../telegram';

const SEED_LOANS: Loan[] = [
  { id: '1', name: 'Khoản 371k, ngày 18', amount: 371000, total_installments: 3, paid_installments: 2, base_paid: 2, anchor_date: '2026-11-18' },
  { id: '2', name: 'Khoản 740k, ngày 19', amount: 740000, total_installments: 3, paid_installments: 1, base_paid: 1, anchor_date: '2026-11-19' },
  { id: '3', name: 'Khoản 370k, ngày 19', amount: 370000, total_installments: 3, paid_installments: 0, base_paid: 0, anchor_date: '2026-11-19' },
  { id: '4', name: 'Khoản 346k, ngày 22', amount: 346000, total_installments: 12, paid_installments: 3, base_paid: 3, anchor_date: '2026-11-22' },
  { id: '5', name: 'Khoản 725k, ngày 25', amount: 725000, total_installments: 9, paid_installments: 5, base_paid: 5, anchor_date: '2026-11-25' },
  { id: '6', name: 'Khoản 740k, ngày 1', amount: 740000, total_installments: 3, paid_installments: 1, base_paid: 1, anchor_date: '2026-12-01' },
  { id: '7', name: 'Khoản 370k, ngày 1', amount: 370000, total_installments: 3, paid_installments: 0, base_paid: 0, anchor_date: '2026-12-01' },
  { id: '8', name: 'Khoản 1031k, ngày 5', amount: 1031000, total_installments: 6, paid_installments: 0, base_paid: 0, anchor_date: '2026-12-05' },
  { id: '9', name: 'Khoản 370k, ngày 9', amount: 370000, total_installments: 3, paid_installments: 1, base_paid: 1, anchor_date: '2026-12-09' },
  { id: '10', name: 'Khoản 231k, ngày 14', amount: 231000, total_installments: 12, paid_installments: 5, base_paid: 5, anchor_date: '2026-12-14' },
];

describe('Telegram Notification & Commands', () => {
  it('Tạo tin nhắn báo cáo hàng ngày đúng mẫu', () => {
    const TODAY = '2026-11-07';
    const FUND = 1200000;
    const overview = generateSchedule(SEED_LOANS, FUND, TODAY);
    const { text, shouldSend } = buildDailyReportMessage(overview, TODAY);

    expect(text).toContain('Báo cáo trả nợ - 07/11');
    expect(text).toContain('Hôm nay cần tiết kiệm:');
    expect(text).toContain('Quỹ hiện có: 1.200.000 đ');
    expect(text).toContain('Sắp đến hạn:');
    expect(text).toContain('Tổng cần có trước hạn gần nhất:');
    expect(text).toContain('Quỹ đang thiếu:');
    expect(shouldSend).toBe(true);
  });

  it('Điều kiện bỏ qua gửi tin: không có khoản nào đến hạn trong 2 ngày tới VÀ quỹ đã đủ', () => {
    const TODAY = '2026-11-07';
    // Quỹ 30 triệu là dư sức trả mọi hạn
    const overview = generateSchedule(SEED_LOANS, 30000000, TODAY);
    const { shouldSend } = buildDailyReportMessage(overview, TODAY);
    // Ngày 07/11 thì hạn gần nhất là 18/11 (còn 11 ngày > 2 ngày) VÀ quỹ đã đủ => không gửi
    expect(shouldSend).toBe(false);
  });

  it('Lệnh /status hiển thị đầy đủ tổng quan nợ', () => {
    const TODAY = '2026-11-06';
    const overview = generateSchedule(SEED_LOANS, 0, TODAY);
    const msg = buildStatusMessage(overview, TODAY);
    expect(msg).toContain('Tổng quan nợ:');
    expect(msg).toContain('20.108.000 đ');
    expect(msg).toContain('39 kỳ');
  });

  it('Lệnh /paid tạo danh sách bàn phím các kỳ gần nhất', () => {
    const TODAY = '2026-11-06';
    const overview = generateSchedule(SEED_LOANS, 0, TODAY);
    const { replyMarkup } = buildPaidKeyboard(overview);
    expect(replyMarkup.inline_keyboard.length).toBeGreaterThan(0);
    expect(replyMarkup.inline_keyboard[0][0].callback_data).toContain('pay:');
  });
});
