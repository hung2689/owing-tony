import { DailySavingRecord, parseDateString, formatDateString, formatDateVN, formatVND } from './schedule';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0: Thứ 2, ..., 6: Chủ Nhật
  amount: number;
  target: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  isFuture: boolean;
}

export interface HeatmapWeek {
  weekIndex: number;
  monthLabel?: string; // Ví dụ "T9", "T10", "T11" nếu là tuần đầu tháng
  days: (HeatmapDay | null)[]; // 7 phần tử ứng với Thứ 2 -> Chủ Nhật
}

export interface HeatmapStats {
  currentStreak: number;
  longestStreak: number;
  totalDaysSaved: number;
  totalDaysInPeriod: number;
  totalAmountSaved: number;
  disciplineRate: number; // phần trăm %
  maxSavingDay: {
    date: string;
    amount: number;
  } | null;
}

export interface HeatmapData {
  weeks: HeatmapWeek[];
  stats: HeatmapStats;
  months: { label: string; weekIndex: number }[];
}

/**
 * Tính thứ trong tuần theo chuẩn Việt Nam (0: Thứ Hai, ..., 6: Chủ Nhật)
 */
export function getVNWeekDay(date: Date): number {
  const day = date.getDay(); // 0 là Chủ Nhật, 1 là Thứ 2, ..., 6 là Thứ 7
  return day === 0 ? 6 : day - 1;
}

/**
 * Xác định cấp độ màu sắc (0 đến 4) dựa trên số tiền bỏ và chỉ tiêu
 */
export function calculateHeatmapLevel(amount: number, target: number): 0 | 1 | 2 | 3 | 4 {
  if (!amount || amount <= 0) return 0;
  if (target <= 0) return 2;

  // Cấp 1: Bỏ ít hơn chỉ tiêu (dưới 90% chỉ tiêu)
  if (amount < target * 0.9) return 1;

  // Cấp 2: Bỏ chuẩn chỉ tiêu (khoảng 90% đến 150% chỉ tiêu)
  if (amount <= target * 1.5) return 2;

  // Cấp 3: Bỏ nhiều hơn chỉ tiêu (1.5x đến 3x chỉ tiêu, ví dụ 300k - 500k)
  if (amount <= target * 3) return 3;

  // Cấp 4: Bỏ vượt trội (> 3x chỉ tiêu, ví dụ > 500k, 1 triệu+)
  return 4;
}

/**
 * Sinh ma trận biểu đồ nhiệt và tính toán các chỉ số thống kê
 * @param savingsHistory Danh sách các ngày đã để dành
 * @param dailyTarget Chỉ tiêu tiết kiệm mỗi ngày chuẩn
 * @param todayStr Ngày hôm nay (YYYY-MM-DD)
 * @param numDays Số ngày cần hiển thị (mặc định 91 ngày ~ 13 tuần ~ 3 tháng)
 */
export function generateSavingsHeatmap(
  savingsHistory: DailySavingRecord[],
  dailyTarget: number,
  todayStr: string,
  numDays = 91
): HeatmapData {
  const savingsMap = new Map<string, number>();
  for (const s of savingsHistory) {
    savingsMap.set(s.date, s.amount);
  }

  const dToday = parseDateString(todayStr);

  // Ngày bắt đầu: lùi lại (numDays - 1) ngày từ hôm nay
  const startDate = new Date(dToday);
  startDate.setDate(startDate.getDate() - (numDays - 1));

  // Căn về đầu tuần (Thứ Hai gần nhất) để các cột luôn thẳng hàng
  const startWeekDay = getVNWeekDay(startDate);
  startDate.setDate(startDate.getDate() - startWeekDay);

  const daysList: HeatmapDay[] = [];
  const curr = new Date(startDate);

  // Sinh đến hết Chủ Nhật của tuần chứa ngày hôm nay
  const todayWeekDay = getVNWeekDay(dToday);
  const endDate = new Date(dToday);
  endDate.setDate(endDate.getDate() + (6 - todayWeekDay));

  while (curr <= endDate) {
    const dStr = formatDateString(curr);
    const amount = savingsMap.get(dStr) || 0;
    const isToday = dStr === todayStr;
    const isFuture = curr > dToday;

    daysList.push({
      date: dStr,
      dayOfWeek: getVNWeekDay(curr),
      amount,
      target: dailyTarget,
      level: isFuture ? 0 : calculateHeatmapLevel(amount, dailyTarget),
      isToday,
      isFuture,
    });

    curr.setDate(curr.getDate() + 1);
  }

  // Gom các ngày thành các tuần (mỗi tuần 7 ngày từ T2 -> CN)
  const weeks: HeatmapWeek[] = [];
  const months: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  for (let i = 0; i < daysList.length; i += 7) {
    const weekIndex = Math.floor(i / 7);
    const weekDays = daysList.slice(i, i + 7);

    // Kiểm tra nhãn tháng
    const firstDayOfWeek = weekDays.find((d) => d && !d.isFuture) || weekDays[0];
    if (firstDayOfWeek) {
      const dObj = parseDateString(firstDayOfWeek.date);
      const m = dObj.getMonth() + 1;
      if (m !== lastMonth) {
        lastMonth = m;
        months.push({ label: `Th${m}`, weekIndex });
      }
    }

    weeks.push({
      weekIndex,
      days: weekDays,
    });
  }

  // TÍNH TOÁN CÁC CHỈ SỐ THỐNG KÊ (STREAKS & STATS)
  // Chỉ tính trong phạm vi từ startDate đến dToday
  const pastDays = daysList.filter((d) => !d.isFuture);
  let totalDaysSaved = 0;
  let totalAmountSaved = 0;
  let maxDay: { date: string; amount: number } | null = null;

  for (const d of pastDays) {
    if (d.amount > 0) {
      totalDaysSaved += 1;
      totalAmountSaved += d.amount;
      if (!maxDay || d.amount > maxDay.amount) {
        maxDay = { date: d.date, amount: d.amount };
      }
    }
  }

  // Tính Streak hiện tại (Current Streak)
  // Đếm ngược từ hôm nay hoặc từ hôm qua (nếu hôm nay chưa bỏ)
  let currentStreak = 0;
  let checkDate = new Date(dToday);

  // Nếu hôm nay đã bỏ tiền -> bắt đầu tính từ hôm nay
  // Nếu hôm nay chưa bỏ tiền -> kiểm tra từ hôm qua
  const todayAmount = savingsMap.get(todayStr) || 0;
  if (todayAmount <= 0) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const checkStr = formatDateString(checkDate);
    const amt = savingsMap.get(checkStr) || 0;
    if (amt > 0) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Tính Chuỗi dài nhất (Longest Streak)
  let longestStreak = 0;
  let tempStreak = 0;

  // Sắp xếp tăng dần theo ngày để tính chuỗi kỷ lục
  const sortedDates = Array.from(savingsMap.keys()).sort();
  if (sortedDates.length > 0) {
    let prevDate: Date | null = null;

    for (const dateKey of sortedDates) {
      const amt = savingsMap.get(dateKey) || 0;
      if (amt <= 0) continue;

      const currDate = parseDateString(dateKey);
      if (prevDate) {
        const diffMs = currDate.getTime() - prevDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak += 1;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }

      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      prevDate = currDate;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const totalDaysInPeriod = pastDays.length;
  const disciplineRate =
    totalDaysInPeriod > 0 ? Math.round((totalDaysSaved / totalDaysInPeriod) * 100) : 0;

  return {
    weeks,
    months,
    stats: {
      currentStreak,
      longestStreak,
      totalDaysSaved,
      totalDaysInPeriod,
      totalAmountSaved,
      disciplineRate,
      maxSavingDay: maxDay,
    },
  };
}
