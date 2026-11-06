"""Gửi nhắc nhở trả nợ qua Telegram.

Đọc lich.json (xuất từ trang Sổ Trả Nợ), tìm các khoản đến hạn hôm nay,
ngày mai và 2 ngày nữa, rồi gửi một tin nhắn tổng hợp.
Chỉ dùng thư viện chuẩn của Python, không cần cài thêm gì.
"""
import json
import os
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
REMIND_BEFORE = (0, 1, 2)  # nhắc vào đúng ngày, trước 1 ngày, trước 2 ngày

today = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()

with open(os.path.join(os.path.dirname(__file__), "lich.json"), encoding="utf-8") as f:
    schedule = json.load(f)


def money(n):
    return f"{n:,}".replace(",", ".") + " đ"


def when(d):
    delta = (d - today).days
    return {0: "HÔM NAY", 1: "ngày mai"}.get(delta, f"{delta} ngày nữa")


lines = []
total = 0
for k in REMIND_BEFORE:
    target = today + timedelta(days=k)
    for item in schedule:
        if date.fromisoformat(item["date"]) == target:
            lines.append(f"{target.strftime('%d/%m')} ({when(target)}): {money(item['amount'])} - {item['label']}")
            total += item["amount"]

if not lines:
    print("Không có khoản nào đến hạn trong 2 ngày tới.")
    raise SystemExit(0)

text = "Nhắc trả nợ\n\n" + "\n".join(lines) + f"\n\nTổng cần có: {money(total)}\nKiểm tra số dư quỹ trước khi đến hạn."

data = urllib.parse.urlencode({"chat_id": CHAT_ID, "text": text}).encode()
req = urllib.request.Request(f"https://api.telegram.org/bot{TOKEN}/sendMessage", data=data)
with urllib.request.urlopen(req, timeout=30) as resp:
    print("Đã gửi:", resp.status)
