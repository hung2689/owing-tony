import fs from 'fs';
import path from 'path';

// Luôn ưu tiên đọc chính xác token trong file .env.local
const envPath = path.resolve('.env.local');
let TOKEN = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('TELEGRAM_BOT_TOKEN=')) {
      TOKEN = trimmed.replace('TELEGRAM_BOT_TOKEN=', '').trim();
    }
  }
}

if (!TOKEN) {
  TOKEN = process.env.TELEGRAM_BOT_TOKEN;
}

const LOCAL_WEBHOOK_URL = 'http://localhost:3000/api/telegram';

if (!TOKEN) {
  console.error('Thiếu TELEGRAM_BOT_TOKEN trong .env.local');
  process.exit(1);
}

console.log('🤖 Telegram Local Poller đang chạy...');
console.log(`📡 Chuyển tiếp tin nhắn từ Telegram -> ${LOCAL_WEBHOOK_URL}`);

let offset = 0;

async function poll() {
  while (true) {
    try {
      const url = `https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${offset}&timeout=20`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          console.log(`[Update #${update.update_id}] Nhận tin từ Telegram -> chuyển tiếp tới server local...`);

          try {
            await fetch(LOCAL_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update),
            });
          } catch (postErr) {
            console.error('Lỗi chuyển tiếp tới local server:', postErr.message);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi lấy update từ Telegram:', err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

poll();
