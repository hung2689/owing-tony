'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  DailySavingRecord,
  formatVND,
  formatDateVN,
} from '@/lib/schedule';
import {
  generateSavingsHeatmap,
  HeatmapDay,
} from '@/lib/heatmap';
import {
  Flame,
  Trophy,
  Activity,
  Award,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';

interface SavingsHeatmapProps {
  savingsHistory: DailySavingRecord[];
  dailyTarget: number;
  todayStr: string;
}

export default function SavingsHeatmap({
  savingsHistory,
  dailyTarget,
  todayStr,
}: SavingsHeatmapProps) {
  // Khoảng thời gian: 91 ngày (3 tháng) hoặc 182 ngày (6 tháng)
  const [periodDays, setPeriodDays] = useState<number>(91);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const heatmapData = useMemo(() => {
    return generateSavingsHeatmap(savingsHistory, dailyTarget, todayStr, periodDays);
  }, [savingsHistory, dailyTarget, todayStr, periodDays]);

  const { weeks, months, stats } = heatmapData;

  // Tự động cuộn sang phải trên điện thoại để luôn thấy ngày hiện tại
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [periodDays, weeks]);

  // Lấy màu sắc cho từng cấp độ
  const getCellColorClass = (day: HeatmapDay | null) => {
    if (!day || day.isFuture) {
      return 'bg-transparent border-transparent opacity-0 pointer-events-none';
    }

    switch (day.level) {
      case 0:
        return 'bg-[var(--surface-raised)] border border-[var(--border)] hover:border-[var(--accent)]/50';
      case 1:
        return 'bg-emerald-200 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 hover:brightness-110';
      case 2:
        return 'bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600 hover:brightness-110';
      case 3:
        return 'bg-emerald-600 dark:bg-emerald-500 border border-emerald-700 dark:border-emerald-400 hover:brightness-110';
      case 4:
        return 'bg-emerald-700 dark:bg-emerald-400 border border-emerald-800 dark:border-emerald-300 shadow-sm ring-1 ring-emerald-300/30 hover:brightness-110';
      default:
        return 'bg-[var(--surface-raised)]';
    }
  };

  const getDayNameVN = (dayIndex: number) => {
    const names = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    return names[dayIndex] || '';
  };

  return (
    <div className="space-y-5">
      {/* 4 Thống kê Streak & Động lực */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Stat 1: Current Streak */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
              Chuỗi hiện tại
            </span>
            <span className="text-xl font-extrabold tabular-nums text-[var(--foreground)]">
              {stats.currentStreak}{' '}
              <span className="text-xs font-normal text-[var(--muted)]">ngày 🔥</span>
            </span>
          </div>
        </div>

        {/* Stat 2: Longest Streak */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
              Kỷ lục chuỗi
            </span>
            <span className="text-xl font-extrabold tabular-nums text-[var(--foreground)]">
              {stats.longestStreak}{' '}
              <span className="text-xs font-normal text-[var(--muted)]">ngày</span>
            </span>
          </div>
        </div>

        {/* Stat 3: Discipline Rate */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
              Tỷ lệ kiên trì
            </span>
            <span className="text-xl font-extrabold tabular-nums text-[var(--foreground)]">
              {stats.disciplineRate}%
            </span>
          </div>
        </div>

        {/* Stat 4: Max single day */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
              Kỷ lục 1 ngày
            </span>
            <span className="text-base sm:text-lg font-extrabold tabular-nums text-[var(--foreground)] truncate block">
              {stats.maxSavingDay ? formatVND(stats.maxSavingDay.amount) : '0 đ'}
            </span>
          </div>
        </div>
      </div>

      {/* KHỐI BIỂU ĐỒ NHIỆT (HEATMAP GRAPH) */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        {/* Header của biểu đồ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              <span>Biểu đồ nhiệt bỏ heo mỗi ngày</span>
            </h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Tổng cộng {stats.totalDaysSaved} ngày đã để dành &middot; Tổng số tiền:{' '}
              <strong className="text-[var(--foreground)] font-bold">
                {formatVND(stats.totalAmountSaved)}
              </strong>
            </p>
          </div>

          {/* Chọn 3 tháng hoặc 6 tháng */}
          <div className="flex items-center gap-1 bg-[var(--surface-raised)] p-1 rounded-xl self-start sm:self-auto border border-[var(--border)]">
            <button
              onClick={() => setPeriodDays(91)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                periodDays === 91
                  ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              3 tháng
            </button>
            <button
              onClick={() => setPeriodDays(182)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                periodDays === 182
                  ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              6 tháng
            </button>
          </div>
        </div>

        {/* Lưới ô vuông Heatmap cuộn ngang mượt mà */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--muted)] sm:hidden px-1">
            <span>👈 Vuốt để xem tuần cũ</span>
            <span className="font-semibold text-[var(--foreground)]">Gần đây 👉</span>
          </div>

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-2 pt-1 w-full scroll-smooth"
          >
          <div className="inline-flex flex-col gap-1 min-w-max select-none">
            {/* Nhãn tháng ở trên */}
            <div className="flex text-[11px] font-semibold text-[var(--muted)] h-5 pl-7">
              {weeks.map((w, idx) => {
                const month = months.find((m) => m.weekIndex === idx);
                return (
                  <div key={idx} className="w-[15px] sm:w-[17px] mr-[3px] text-left">
                    {month ? month.label : ''}
                  </div>
                );
              })}
            </div>

            {/* Thân biểu đồ: 7 hàng (T2 -> CN) */}
            <div className="flex">
              {/* Cột nhãn thứ bên trái */}
              <div className="flex flex-col justify-between pr-2 text-[10px] font-medium text-[var(--muted)] h-[126px] sm:h-[140px] select-none">
                <span>T2</span>
                <span>T4</span>
                <span>T6</span>
                <span>CN</span>
              </div>

              {/* Các cột tuần */}
              <div className="flex gap-[3px]">
                {weeks.map((week) => (
                  <div key={week.weekIndex} className="flex flex-col gap-[3px]">
                    {week.days.map((day, dIdx) => {
                      if (!day) return <div key={dIdx} className="w-[15px] h-[15px] sm:w-[17px] sm:h-[17px]" />;

                      const isSelected = selectedDay?.date === day.date;

                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          title={`${formatDateVN(day.date)}: ${
                            day.amount > 0 ? formatVND(day.amount) : 'Không bỏ tiền'
                          }`}
                          className={`w-[15px] h-[15px] sm:w-[17px] sm:h-[17px] rounded-[3px] transition-all relative ${getCellColorClass(
                            day
                          )} ${
                            day.isToday
                              ? 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface)]'
                              : ''
                          } ${
                            isSelected ? 'scale-125 z-10 ring-2 ring-emerald-500' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Chú thích màu (Legend) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
          <div className="flex items-center gap-1.5">
            <span>Ít</span>
            <div className="w-3.5 h-3.5 rounded-[3px] bg-[var(--surface-raised)] border border-[var(--border)]" />
            <div className="w-3.5 h-3.5 rounded-[3px] bg-emerald-200 dark:bg-emerald-950/80 border border-emerald-300" />
            <div className="w-3.5 h-3.5 rounded-[3px] bg-emerald-400 dark:bg-emerald-700 border border-emerald-500" />
            <div className="w-3.5 h-3.5 rounded-[3px] bg-emerald-600 dark:bg-emerald-500 border border-emerald-700" />
            <div className="w-3.5 h-3.5 rounded-[3px] bg-emerald-700 dark:bg-emerald-400 border border-emerald-800" />
            <span>Nhiều</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--accent)]" />
              <span>Hôm nay</span>
            </span>
          </div>
        </div>

        {/* Khung chi tiết ngày được chọn khi bấm vào ô */}
        {selectedDay && (
          <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="space-y-0.5">
              <div className="font-bold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                <span>{getDayNameVN(selectedDay.dayOfWeek)}, {formatDateVN(selectedDay.date, true)}</span>
                {selectedDay.isToday && (
                  <span className="px-1.5 py-0.2 rounded bg-[var(--accent-light)] text-[var(--accent)] text-[10px] font-bold">
                    Hôm nay
                  </span>
                )}
              </div>
              <div className="text-[var(--muted)]">
                {selectedDay.amount > 0 ? (
                  <>
                    Đã để dành: <strong className="text-[var(--foreground)] font-bold">{formatVND(selectedDay.amount)}</strong>
                    {selectedDay.amount < selectedDay.target && (
                      <span className="text-[var(--warning)] ml-1">
                        (thiếu {formatVND(selectedDay.target - selectedDay.amount)})
                      </span>
                    )}
                    {selectedDay.amount > selectedDay.target && (
                      <span className="text-[var(--success)] ml-1">
                        (vượt chỉ tiêu +{formatVND(selectedDay.amount - selectedDay.target)} 🎉)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[var(--muted)]">Ngày này không để dành tiền ($0$ đ)</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedDay(null)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
