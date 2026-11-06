import { describe, it, expect } from 'vitest';
import {
  calculateHeatmapLevel,
  getVNWeekDay,
  generateSavingsHeatmap,
} from '../heatmap';
import { DailySavingRecord } from '../schedule';

describe('Biểu đồ nhiệt tiết kiệm kiểu GitHub (Savings Heatmap)', () => {
  const TARGET = 162000;
  const TODAY = '2026-11-06'; // Thứ Sáu

  it('1. Phân cấp màu sắc chính xác theo số tiền bỏ so với chỉ tiêu', () => {
    expect(calculateHeatmapLevel(0, TARGET)).toBe(0);
    expect(calculateHeatmapLevel(50000, TARGET)).toBe(1); // < 90% (bỏ ít)
    expect(calculateHeatmapLevel(100000, TARGET)).toBe(1); // < 90%
    expect(calculateHeatmapLevel(162000, TARGET)).toBe(2); // chuẩn chỉ tiêu
    expect(calculateHeatmapLevel(200000, TARGET)).toBe(2); // ~ chuẩn
    expect(calculateHeatmapLevel(300000, TARGET)).toBe(3); // > 1.5x (bỏ nhiều)
    expect(calculateHeatmapLevel(500000, TARGET)).toBe(4); // > 3x (vượt trội)
    expect(calculateHeatmapLevel(1000000, TARGET)).toBe(4); // vượt trội
  });

  it('2. getVNWeekDay căn Thứ 2 là 0 và Chủ Nhật là 6', () => {
    // 2026-11-02 là Thứ 2
    expect(getVNWeekDay(new Date(2026, 10, 2))).toBe(0);
    // 2026-11-06 là Thứ 6
    expect(getVNWeekDay(new Date(2026, 10, 6))).toBe(4);
    // 2026-11-08 là Chủ Nhật
    expect(getVNWeekDay(new Date(2026, 10, 8))).toBe(6);
  });

  it('3. Tính toán chuỗi ngày liên tiếp (Streak 🔥) chính xác', () => {
    const history: DailySavingRecord[] = [
      { date: '2026-11-04', amount: 162000 },
      { date: '2026-11-05', amount: 162000 },
      { date: '2026-11-06', amount: 200000 },
    ];

    const data = generateSavingsHeatmap(history, TARGET, TODAY, 14);

    expect(data.stats.currentStreak).toBe(3);
    expect(data.stats.totalDaysSaved).toBe(3);
    expect(data.stats.totalAmountSaved).toBe(524000);
    expect(data.stats.maxSavingDay?.date).toBe('2026-11-06');
    expect(data.stats.maxSavingDay?.amount).toBe(200000);
  });

  it('4. Nếu hôm nay chưa bỏ nhưng hôm qua và hôm kia đã bỏ thì streak vẫn được duy trì', () => {
    const history: DailySavingRecord[] = [
      { date: '2026-11-04', amount: 162000 },
      { date: '2026-11-05', amount: 162000 },
      // 2026-11-06 chưa bỏ
    ];

    const data = generateSavingsHeatmap(history, TARGET, TODAY, 14);

    // Vẫn tính chuỗi 2 ngày của hôm trước (chưa kết thúc ngày hôm nay)
    expect(data.stats.currentStreak).toBe(2);
  });

  it('5. Sinh đầy đủ các tuần và phân chia tháng rõ ràng', () => {
    const data = generateSavingsHeatmap([], TARGET, TODAY, 91); // 3 tháng
    expect(data.weeks.length).toBeGreaterThanOrEqual(13);
    expect(data.weeks[0].days.length).toBe(7);
    expect(data.months.length).toBeGreaterThan(0);
  });
});
