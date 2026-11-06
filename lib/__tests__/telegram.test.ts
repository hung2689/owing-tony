import { describe, it, expect } from 'vitest';
import { Loan, generateSchedule } from '../schedule';
import {
  buildDailyReportMessage,
  buildStatusMessage,
  buildPaidKeyboard,
  parseAmountText,
  buildMainReplyKeyboard,
  buildSavingPromptMessage,
  buildSavingSuccessMessage,
  buildDebtReportMessage,
  buildFundReportMessage,
  buildUpcomingPaymentsMessage,
} from '../telegram';

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

  describe('parseAmountText - Parser số tiền thông minh', () => {
    it('Nhận diện đúng dạng k / nghìn', () => {
      expect(parseAmountText('161k')).toBe(161000);
      expect(parseAmountText('161K')).toBe(161000);
      expect(parseAmountText('161.8k')).toBe(161800);
      expect(parseAmountText('50k')).toBe(50000);
      expect(parseAmountText('50 nghìn')).toBe(50000);
      expect(parseAmountText('500k')).toBe(500000);
    });

    it('Nhận diện đúng dạng triệu / tr / slang', () => {
      expect(parseAmountText('1tr')).toBe(1000000);
      expect(parseAmountText('1.5tr')).toBe(1500000);
      expect(parseAmountText('1,5tr')).toBe(1500000);
      expect(parseAmountText('1tr5')).toBe(1500000);
      expect(parseAmountText('2 triệu')).toBe(2000000);
      expect(parseAmountText('2tr3')).toBe(2300000);
    });

    it('Nhận diện đúng dạng số có dấu phân cách nghìn hoặc số thuần', () => {
      expect(parseAmountText('161.828')).toBe(161828);
      expect(parseAmountText('161,828')).toBe(161828);
      expect(parseAmountText('170000')).toBe(170000);
      expect(parseAmountText('161828')).toBe(161828);
      expect(parseAmountText('1.031.000')).toBe(1031000);
    });

    it('Nhận diện số nhỏ < 1000 mặc định là nghìn', () => {
      expect(parseAmountText('161')).toBe(161000);
      expect(parseAmountText('200')).toBe(200000);
      expect(parseAmountText('50')).toBe(50000);
    });

    it('Xử lý được tiền tố và hậu tố thông dụng', () => {
      expect(parseAmountText('tiết kiệm 161k')).toBe(161000);
      expect(parseAmountText('tiet kiem 200k')).toBe(200000);
      expect(parseAmountText('bỏ 161k')).toBe(161000);
      expect(parseAmountText('bo heo 500k')).toBe(500000);
      expect(parseAmountText('nạp 1tr')).toBe(1000000);
      expect(parseAmountText('161k vnđ')).toBe(161000);
      expect(parseAmountText('+200k')).toBe(200000);
    });

    it('Bỏ qua lệnh và văn bản không phải tiền', () => {
      expect(parseAmountText('/status')).toBeNull();
      expect(parseAmountText('/paid')).toBeNull();
      expect(parseAmountText('xem nợ hiện tại')).toBeNull();
      expect(parseAmountText('xem quỹ hiện có')).toBeNull();
      expect(parseAmountText('xin chào')).toBeNull();
      expect(parseAmountText('')).toBeNull();
    });
  });

  describe('Interactive Message & Keyboard Builders', () => {
    const TODAY = '2026-11-06';
    const overview = generateSchedule(SEED_LOANS, 500000, TODAY);

    it('Tạo bàn phím chính thường trực với 5 nút', () => {
      const kb = buildMainReplyKeyboard();
      expect(kb.keyboard.length).toBe(3);
      expect(kb.keyboard[0][0].text).toContain('Tiết kiệm');
      expect(kb.keyboard[0][1].text).toContain('Xem quỹ');
      expect(kb.keyboard[1][0].text).toContain('Xem nợ');
      expect(kb.keyboard[1][1].text).toContain('sắp đến hạn');
      expect(kb.keyboard[2][0].text).toContain('Tick đã trả');
      expect(kb.resize_keyboard).toBe(true);
    });

    it('Tạo tin nhắn prompt tiết kiệm hôm nay kèm inline keyboard', () => {
      const { text, replyMarkup } = buildSavingPromptMessage(overview, TODAY);
      expect(text).toContain('TIẾT KIỆM HÔM NAY');
      expect(text).toContain('Chỉ tiêu hôm nay:');
      expect(replyMarkup.inline_keyboard.length).toBeGreaterThanOrEqual(2);
      expect(replyMarkup.inline_keyboard[0][0].callback_data).toContain('save:');
    });

    it('Tạo tin nhắn xác nhận tiết kiệm thành công và nạp thêm', () => {
      const { text, replyMarkup } = buildSavingSuccessMessage(161000, overview, 661000);
      expect(text).toContain('ĐÃ GHI NHẬN BỎ HEO HÔM NAY!');
      expect(text).toContain('161.000 đ');
      expect(text).toContain('Số dư quỹ trả nợ hiện có: 661.000 đ');
      expect(replyMarkup.inline_keyboard.length).toBeGreaterThan(0);

      // Thử nạp thêm
      const addRes = buildSavingSuccessMessage(211000, overview, 711000, true, 50000);
      expect(addRes.text).toContain('ĐÃ NẠP THÊM');
      expect(addRes.text).toContain('50.000 đ');
      expect(addRes.text).toContain('211.000 đ');
    });

    it('Tạo tin nhắn chi tiết Nợ hiện tại', () => {
      const text = buildDebtReportMessage(overview, SEED_LOANS);
      expect(text).toContain('TỔNG QUAN NỢ HIỆN TẠI');
      expect(text).toContain('Tổng nợ còn lại:');
      expect(text).toContain('Danh sách từng khoản vay:');
      expect(text).toContain('Khoản 371k');
    });

    it('Tạo tin nhắn chi tiết Quỹ hiện có', () => {
      const text = buildFundReportMessage(overview, 500000);
      expect(text).toContain('SỐ DƯ QUỸ TRẢ NỢ HIỆN CÓ');
      expect(text).toContain('500.000 đ');
    });

    it('Tạo tin nhắn các kỳ sắp đến hạn', () => {
      const text = buildUpcomingPaymentsMessage(overview);
      expect(text).toContain('CÁC KỲ ĐẾN HẠN TRONG 14 NGÀY TỚI');
    });
  });
});
