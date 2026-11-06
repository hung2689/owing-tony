-- Seed data ban đầu cho Sổ Trả Nợ (tính từ 06/11/2026)

-- Khởi tạo cài đặt mặc định
insert into settings (id, fund_balance, telegram_chat_id, telegram_remind_enabled, remind_days_before)
values (1, 0, '', true, array[0, 1, 2])
on conflict (id) do nothing;

-- 10 khoản vay mẫu
insert into loans (id, name, amount, total_installments, paid_installments, base_paid, anchor_date)
values
  ('loan-1', 'Khoản 371k, ngày 18', 371000, 3, 2, 2, '2026-11-18'),
  ('loan-2', 'Khoản 740k, ngày 19', 740000, 3, 1, 1, '2026-11-19'),
  ('loan-3', 'Khoản 370k, ngày 19', 370000, 3, 0, 0, '2026-11-19'),
  ('loan-4', 'Khoản 346k, ngày 22', 346000, 12, 3, 3, '2026-11-22'),
  ('loan-5', 'Khoản 725k, ngày 25', 725000, 9, 5, 5, '2026-11-25'),
  ('loan-6', 'Khoản 740k, ngày 1', 740000, 3, 1, 1, '2026-12-01'),
  ('loan-7', 'Khoản 370k, ngày 1', 370000, 3, 0, 0, '2026-12-01'),
  ('loan-8', 'Khoản 1031k, ngày 5', 1031000, 6, 0, 0, '2026-12-05'),
  ('loan-9', 'Khoản 370k, ngày 9', 370000, 3, 1, 1, '2026-12-09'),
  ('loan-10', 'Khoản 231k, ngày 14', 231000, 12, 5, 5, '2026-12-14')
on conflict (id) do update set
  name = excluded.name,
  amount = excluded.amount,
  total_installments = excluded.total_installments,
  paid_installments = excluded.paid_installments,
  base_paid = excluded.base_paid,
  anchor_date = excluded.anchor_date;
