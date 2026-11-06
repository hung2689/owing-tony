'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/lib/db';
import { ScheduleOverview } from '@/lib/schedule';
import { buildDailyReportMessage } from '@/lib/telegram';
import {
  Send,
  Bell,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Check,
  ExternalLink,
} from 'lucide-react';

interface TelegramTabProps {
  settings: AppSettings;
  overview: ScheduleOverview;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export default function TelegramTab({
  settings,
  overview,
  onUpdateSettings,
}: TelegramTabProps) {
  const [chatId, setChatId] = useState(settings.telegram_chat_id || '');
  const [remindEnabled, setRemindEnabled] = useState(
    settings.telegram_remind_enabled !== false
  );
  const [remindDays, setRemindDays] = useState<number[]>(
    settings.remind_days_before || [0, 1, 2]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [webhookResult, setWebhookResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setChatId(settings.telegram_chat_id || '');
    setRemindEnabled(settings.telegram_remind_enabled !== false);
    setRemindDays(settings.remind_days_before || [0, 1, 2]);
  }, [settings]);

  // Toggle option ngày nhắc trước
  const toggleRemindDay = (day: number) => {
    if (remindDays.includes(day)) {
      setRemindDays(remindDays.filter((d) => d !== day));
    } else {
      setRemindDays([...remindDays, day].sort());
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      await onUpdateSettings({
        telegram_chat_id: chatId.trim(),
        telegram_remind_enabled: remindEnabled,
        remind_days_before: remindDays,
      });
      setTestResult({
        success: true,
        message: 'Đã lưu cài đặt Telegram thành công!',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Có lỗi khi lưu cài đặt.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTestResult({
          success: false,
          message: data.error || 'Gửi tin thất bại. Vui lòng kiểm tra Bot Token và Chat ID.',
        });
      } else {
        setTestResult({
          success: true,
          message: 'Đã gửi tin nhắn mẫu thành công đến Telegram của bạn!',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Lỗi kết nối tới máy chủ khi gửi tin thử.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSetupWebhook = async () => {
    setIsSettingWebhook(true);
    setWebhookResult(null);

    try {
      const origin = window.location.origin;
      const res = await fetch('/api/telegram/setup-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: origin }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setWebhookResult({
          success: false,
          message: data.error || 'Lỗi khi cài đặt Webhook.',
        });
      } else {
        setWebhookResult({
          success: true,
          message: data.message || 'Đã kết nối Webhook thành công!',
        });
      }
    } catch (err: any) {
      setWebhookResult({
        success: false,
        message: err?.message || 'Lỗi kết nối máy chủ.',
      });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  // Xem trước tin nhắn mẫu
  const { text: previewText } = buildDailyReportMessage(
    overview,
    undefined,
    remindDays
  );

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      {/* Cấu hình nhắc nhở */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Cài đặt nhắc nhở Telegram
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Nhận tin nhắn tự động mỗi sáng lúc 08:00 (giờ Việt Nam) qua Telegram Bot
          </p>
        </div>

        {/* Telegram Chat ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Telegram Chat ID của bạn
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="VD: 123456789"
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-base sm:text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              type="button"
              onClick={handleSendTestMessage}
              disabled={isTesting || !chatId.trim()}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              <Send className="w-4 h-4 text-[var(--accent)]" />
              <span>{isTesting ? 'Đang gửi...' : 'Gửi tin thử'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            Chat với bot <code className="px-1 py-0.5 rounded bg-[var(--surface-raised)]">@userinfobot</code> trên Telegram để lấy User Chat ID của bạn.
          </p>
        </div>

        {/* Công tắc Bật/Tắt nhắc nhở */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
          <div className="space-y-0.5">
            <span className="font-semibold text-sm">Bật nhắc nhở mỗi sáng 08:00</span>
            <p className="text-xs text-[var(--muted)]">
              Gửi tin nhắn lúc 01:00 UTC (= 08:00 giờ VN) qua Vercel Cron
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={remindEnabled}
              onChange={(e) => setRemindEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
          </label>
        </div>

        {/* Chọn mốc nhắc trước */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Các mốc nhắc trước hạn
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { day: 0, label: 'Đúng ngày đến hạn' },
              { day: 1, label: 'Trước 1 ngày' },
              { day: 2, label: 'Trước 2 ngày' },
            ].map(({ day, label }) => {
              const checked = remindDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleRemindDay(day)}
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                    checked
                      ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)] font-semibold'
                      : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <span>{label}</span>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      checked
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] bg-[var(--surface)]'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thông báo kết quả lưu hoặc test */}
        {testResult && (
          <div
            className={`text-xs p-3 rounded-xl flex items-center gap-2 border ${
              testResult.success
                ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20'
                : 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Đang lưu cài đặt...' : 'Lưu cài đặt Telegram'}
          </button>
        </div>
      </section>

      {/* Xem trước mẫu tin nhắn */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--accent)]" />
          <span>Mẫu tin nhắn Telegram bot gửi mỗi sáng:</span>
        </h3>
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-4 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap select-all text-[var(--foreground)]">
          {previewText.replace(/<[^>]+>/g, '')}
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          Lưu ý: Bot sẽ tự động không gửi nếu không có khoản nào đến hạn trong 2 ngày tới VÀ số dư quỹ đã đủ.
        </p>
      </section>

      {/* Hướng dẫn thiết lập Bot Telegram */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[var(--accent)]" />
              <span>Kích hoạt Webhook Telegram chạy Online 24/7</span>
            </h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Sau khi deploy lên Vercel, bấm nút bên dưới để kết nối bot chạy tự động vĩnh viễn trên đám mây.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSetupWebhook}
            disabled={isSettingWebhook}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{isSettingWebhook ? 'Đang kích hoạt...' : 'Kích hoạt Webhook (1-Chạm)'}</span>
          </button>
        </div>

        {webhookResult && (
          <div
            className={`text-xs p-3.5 rounded-xl flex items-start gap-2 border whitespace-pre-line ${
              webhookResult.success
                ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20'
                : 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/20'
            }`}
          >
            {webhookResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{webhookResult.message}</span>
          </div>
        )}

        <div className="text-xs text-[var(--muted)] space-y-2 leading-relaxed pt-2 border-t border-[var(--border)]">
          <p>
            • <strong>Khi chạy online trên Vercel:</strong> Bạn chỉ cần mở trang web trên link Vercel (https://...) và bấm nút <strong>&quot;Kích hoạt Webhook (1-Chạm)&quot;</strong> ở trên là xong!
          </p>
          <p>
            • <strong>Cách thủ công (tùy chọn):</strong> Bạn cũng có thể mở trình duyệt và truy cập đường dẫn sau một lần:
          </p>
          <div className="p-2.5 rounded-lg bg-[var(--surface-raised)] font-mono text-[11px] break-all border border-[var(--border)] text-[var(--foreground)]">
            https://api.telegram.org/bot{settings.telegram_chat_id ? '9067939554:AAF2ynoCEfotIwwvlNyBEk93GX5fxcZY90E' : '<BOT_TOKEN>'}/setWebhook?url=https://your-domain.vercel.app/api/telegram
          </div>
        </div>
      </section>
    </div>
  );
}
