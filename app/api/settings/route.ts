import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { telegram_chat_id, telegram_remind_enabled, remind_days_before } = body;

    const updated = await updateSettings({
      ...(typeof telegram_chat_id === 'string' && { telegram_chat_id: telegram_chat_id.trim() }),
      ...(typeof telegram_remind_enabled === 'boolean' && { telegram_remind_enabled }),
      ...(Array.isArray(remind_days_before) && { remind_days_before }),
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
