import { NextResponse } from 'next/server';
import { getLoans, saveLoan, deleteLoan } from '@/lib/db';
import { Loan } from '@/lib/schedule';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, amount, total_installments, paid_installments, anchor_date } = body;

    if (!name || !amount || !total_installments || !anchor_date) {
      return NextResponse.json({ error: 'Vui lòng điền đủ thông tin khoản vay.' }, { status: 400 });
    }

    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      name: String(name).trim(),
      amount: Math.round(Number(amount)),
      total_installments: Math.round(Number(total_installments)),
      paid_installments: Math.round(Number(paid_installments || 0)),
      base_paid: Math.round(Number(paid_installments || 0)),
      anchor_date: String(anchor_date).trim(),
    };

    await saveLoan(newLoan);
    return NextResponse.json({ success: true, loan: newLoan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, amount, total_installments, paid_installments, anchor_date } = body;

    if (!id || !name || !amount || !total_installments || !anchor_date) {
      return NextResponse.json({ error: 'Vui lòng điền đủ thông tin cập nhật.' }, { status: 400 });
    }

    const loans = await getLoans();
    const existing = loans.find((l) => l.id === id);

    const updatedLoan: Loan = {
      id,
      name: String(name).trim(),
      amount: Math.round(Number(amount)),
      total_installments: Math.round(Number(total_installments)),
      paid_installments: Math.round(Number(paid_installments || 0)),
      base_paid: Math.round(Number(paid_installments || 0)),
      anchor_date: String(anchor_date).trim(),
      created_at: existing?.created_at,
    };

    await saveLoan(updatedLoan);
    return NextResponse.json({ success: true, loan: updatedLoan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID khoản vay.' }, { status: 400 });
    }

    await deleteLoan(id);
    return NextResponse.json({ success: true, message: 'Đã xóa khoản vay thành công.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
