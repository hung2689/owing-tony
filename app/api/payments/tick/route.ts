import { NextResponse } from 'next/server';
import { recordPayment } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const { loan_id } = await req.json();
    if (!loan_id) {
      return NextResponse.json({ error: 'Thiếu loan_id' }, { status: 400 });
    }

    const result = await recordPayment(loan_id);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
