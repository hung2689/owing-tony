import { NextResponse } from 'next/server';
import { generateAuthToken, getExpectedPassword, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const expected = getExpectedPassword();

    if (password !== expected) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    const token = await generateAuthToken(password);
    const response = NextResponse.json({ success: true, message: 'Đăng nhập thành công.' });

    // Thiết lập cookie httpOnly trong 30 ngày
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
