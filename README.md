# Sổ Trả Nợ - Quản Lý Trả Góp Cá Nhân

Ứng dụng web cá nhân bằng tiếng Việt giúp theo dõi các khoản nợ trả góp hàng tháng, tính toán số tiền cần tiết kiệm mỗi ngày để không bao giờ bị trễ hạn, tick theo dõi lịch trả nợ và tự động nhận tin nhắn báo cáo qua Telegram Bot mỗi sáng lúc 08:00 (giờ Việt Nam).

---

## 🌟 Tính Năng Nổi Bật

1. **Tính tiền tiết kiệm mỗi ngày**: Tự động tính toán số tiền cần bỏ thêm mỗi ngày dựa trên số dư quỹ trả nợ hiện có và hạn thanh toán khắt khe nhất.
2. **Lịch trả nợ theo ngày & tháng**: Gom nhóm theo tháng, hiển thị trạng thái đủ/thiếu quỹ, tô nổi bật các hạn trong 3 ngày tới và hạn hôm nay.
3. **Tick đã trả & Hoàn tác**: Dễ dàng tick đã trả cho kỳ gần nhất của từng khoản và tự động trừ tiền khỏi quỹ. Có nút hoàn tác lần tick gần nhất.
4. **Quản lý các khoản vay**: Thêm, sửa, xóa khoản vay; theo dõi tiến độ thanh toán, dư nợ còn lại và tháng dự kiến trả xong.
5. **Nhắc nhở Telegram mỗi sáng 08:00**: Tự động gửi báo cáo ngắn gọn qua bot lúc 08:00 sáng (01:00 UTC) bằng Vercel Cron.
6. **2 Lệnh Bot Telegram thông minh**:
   - `/status`: Xem ngay báo cáo tổng quan nợ và tiền cần tiết kiệm hôm nay.
   - `/paid`: Hiển thị bàn phím inline các kỳ gần nhất để bấm nút xác nhận Đã Trả trực tiếp từ Telegram.
7. **Bảo mật & Tối ưu**:
   - Đăng nhập bảo vệ toàn bộ ứng dụng bằng `APP_PASSWORD` lưu cookie `httpOnly`.
   - Route Cron được bảo vệ bằng `CRON_SECRET`.
   - Giao diện Dark Mode theo hệ thống, hiển thị chuẩn xác trên điện thoại (tối ưu chiều rộng 390px, không tràn ngang).
   - Múi giờ chuẩn `Asia/Ho_Chi_Minh`, định dạng tiền tệ VNĐ `1.031.000 đ`.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend & Backend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Cơ sở dữ liệu**: Supabase (PostgreSQL)
- **Thông báo**: Telegram Bot API (gọi trực tiếp qua `fetch`, không dùng thư viện ngoài)
- **Lập lịch chạy**: Vercel Cron (`0 1 * * *` UTC = 08:00 VN)
- **Kiểm thử**: Vitest

---

## 🚀 Hướng Dẫn Cài Đặt Chi Tiết Cho Người Mới

### Bước 1: Tạo Telegram Bot và lấy Chat ID

1. **Tạo Bot**:
   - Mở ứng dụng Telegram, tìm kiếm bot **`@BotFather`**.
   - Gửi lệnh `/newbot`, đặt tên cho bot (ví dụ: `Sổ Trả Nợ`) và username cho bot (kết thúc bằng chữ `bot`, ví dụ: `sotrano_bot`).
   - `@BotFather` sẽ gửi lại cho bạn chuỗi **Bot Token** (dạng `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`). Hãy lưu lại.
2. **Lấy Chat ID cá nhân**:
   - Tìm bot **`@userinfobot`** trên Telegram và bấm `/start`.
   - Bot sẽ trả về **Id** của bạn (ví dụ: `987654321`). Lưu lại dãy số này làm `TELEGRAM_CHAT_ID`.
3. **Kích hoạt Bot**:
   - Mở khung chat với bot bạn vừa tạo và bấm `/start` một lần để cho phép bot gửi tin nhắn cho bạn.

---

### Bước 2: Tạo dự án Supabase & Chạy CSDL

1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập (gói Miễn phí - Free tier).
2. Bấm **New project**, đặt tên dự án (ví dụ: `so-tra-no`), đặt mật khẩu cơ sở dữ liệu và chọn vùng (Region: `Singapore` để có tốc độ nhanh nhất).
3. Sau khi dự án khởi tạo xong, vào menu bên trái chọn **SQL Editor**.
4. Mở file `supabase/schema.sql` trong mã nguồn, dán vào SQL Editor của Supabase và bấm **Run**.
5. Mở file `supabase/seed.sql` trong mã nguồn, dán tiếp vào SQL Editor và bấm **Run** để nạp 10 khoản vay mẫu và cài đặt ban đầu.
6. Lấy thông tin kết nối:
   - Vào **Project Settings** (biểu tượng bánh răng) -> **API**.
   - Copy **Project URL** (chính là `NEXT_PUBLIC_SUPABASE_URL`).
   - Trong mục **Project API keys**, copy khóa **`service_role` (secret)** (chính là `SUPABASE_SERVICE_ROLE_KEY`).

---

### Bước 3: Chạy thử ở máy cục bộ (Local Development)

1. Tạo file `.env.local` từ file mẫu:
   ```bash
   cp .env.example .env.local
   ```
2. Điền các giá trị vào `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJh......
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
   TELEGRAM_CHAT_ID=987654321
   APP_PASSWORD=matkhaucuaban
   CRON_SECRET=chuoi-bi-mat-cron-ngau-nhien-32-ky-tu
   ```
3. Chạy kiểm thử:
   ```bash
   npm test
   ```
4. Khởi động môi trường dev:
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) và đăng nhập bằng mật khẩu bạn đã đặt ở `APP_PASSWORD`.

---

### Bước 4: Deploy lên Vercel

1. Đẩy mã nguồn lên kho lưu trữ GitHub của bạn.
2. Truy cập [https://vercel.com](https://vercel.com), bấm **Add New** -> **Project** và chọn kho lưu trữ vừa tải lên.
3. Trong phần **Environment Variables**, thêm đủ 6 biến:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `APP_PASSWORD`
   - `CRON_SECRET`
4. Bấm **Deploy**. Sau 1-2 phút, bạn sẽ nhận được địa chỉ web production (ví dụ: `https://so-tra-no.vercel.app`).
5. Vercel sẽ tự động đọc cấu hình file `vercel.json` và thiết lập cron job gọi route `/api/cron/remind` mỗi ngày lúc 01:00 UTC (= 08:00 sáng giờ VN).

---

### Bước 5: Cài đặt Webhook cho Telegram Bot

Để bot Telegram có thể phản hồi các lệnh `/status` và `/paid`:
1. Mở trình duyệt và truy cập URL sau (thay thế token và domain Vercel của bạn):
   ```text
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://so-tra-no.vercel.app/api/telegram
   ```
2. Nếu trình duyệt trả về `{"ok":true,"result":true,"description":"Webhook was set"}`, bot đã sẵn sàng hoạt động!
3. Vào Telegram chat với bot:
   - Gõ `/status` để xem tổng quan nợ.
   - Gõ `/paid` để tick thanh toán bằng các nút bấm inline.

---

### Bước 6: Chạy thử Cron nhắc nhở

Bạn có thể chạy thử trực tiếp route Cron để kiểm tra xem tin nhắn Telegram có gửi về điện thoại không:
```bash
curl -X GET "https://so-tra-no.vercel.app/api/cron/remind?force=true" \
  -H "Authorization: Bearer <CRON_SECRET>"
```
Hoặc trong trang quản trị của web app, tab **Telegram**, bấm nút **"Gửi tin thử"**!

---

## 📊 Số Liệu Kiểm Tra Mẫu (Test Dataset từ 06/11/2026)

| # | Ngày trả kế tiếp | Mỗi kỳ | Đã trả / Tổng |
|---|---|---|---|
| 1 | 18/11/2026 | 371.000 đ | 2/3 |
| 2 | 19/11/2026 | 740.000 đ | 1/3 |
| 3 | 19/11/2026 | 370.000 đ | 0/3 |
| 4 | 22/11/2026 | 346.000 đ | 3/12 |
| 5 | 25/11/2026 | 725.000 đ | 5/9 |
| 6 | 01/12/2026 | 740.000 đ | 1/3 |
| 7 | 01/12/2026 | 370.000 đ | 0/3 |
| 8 | 05/12/2026 | 1.031.000 đ | 0/6 |
| 9 | 09/12/2026 | 370.000 đ | 1/3 |
| 10 | 14/12/2026 | 231.000 đ | 5/12 |

**Các số kiểm tra đã được xác thực 100% bằng Unit Tests:**
- ✅ Tổng còn phải trả: **20.108.000 đ**, tổng **39 kỳ**
- ✅ Tổng mỗi tháng khi đủ 10 khoản: **5.294.000 đ**
- ✅ Cần trả tháng 11/2026 (từ 06/11): **2.552.000 đ**
- ✅ Cần trả tháng 12/2026: **4.923.000 đ**
- ✅ Khoản cuối cùng trả xong: **tháng 07/2027** (ngày 22/07/2027)

---

## 📄 Bản Quyền
Dành riêng cho mục đích quản lý tài chính cá nhân.
