-- Schema cho Sổ Trả Nợ
-- Chạy trên Supabase SQL Editor

-- Bảng loans: thông tin các khoản vay / trả góp
create table if not exists loans (
  id text primary key,
  name text not null,
  amount bigint not null,
  total_installments int not null,
  paid_installments int not null default 0,
  base_paid int not null default 0,
  anchor_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bảng settings: cài đặt ứng dụng và quỹ tiền
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  fund_balance bigint not null default 0,
  telegram_chat_id text default '',
  telegram_remind_enabled boolean default true,
  remind_days_before int[] default array[0, 1, 2],
  updated_at timestamptz not null default now()
);

-- Bảng payments_log: lịch sử tick đã trả để hỗ trợ hoàn tác
create table if not exists payments_log (
  id uuid primary key default gen_random_uuid(),
  loan_id text not null references loans(id) on delete cascade,
  installment_number int not null,
  amount bigint not null,
  due_date date not null,
  fund_deducted bigint not null default 0,
  paid_at timestamptz not null default now()
);

-- Row Level Security (RLS)
-- Ứng dụng kết nối bằng SUPABASE_SERVICE_ROLE_KEY trên server Next.js
alter table loans enable row level security;
alter table settings enable row level security;
alter table payments_log enable row level security;

-- Cho phép service role toàn quyền truy cập
create policy "Service role has full access to loans" on loans for all using (true) with check (true);
create policy "Service role has full access to settings" on settings for all using (true) with check (true);
create policy "Service role has full access to payments_log" on payments_log for all using (true) with check (true);
