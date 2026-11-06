import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Chưa cấu hình biến môi trường TELEGRAM_BOT_TOKEN' }, { status: 400 });
  }

  try {
    const { url } = await req.json();
    if (!url || !url.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Telegram yêu cầu webhook URL phải có giao thức bảo mật https:// (ví dụ trên Vercel).' },
        { status: 400 }
      );
    }

    const webhookUrl = `${url.replace(/\/+$/, '')}/api/telegram`;
    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    const data = await tgRes.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: `Telegram Bot API báo lỗi: ${data.description || 'Không thể thiết lập Webhook'}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã kích hoạt Webhook 24/7 thành công cho bot với URL:\n${webhookUrl}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
