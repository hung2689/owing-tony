import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/cron/remind/route';

describe('/api/cron/remind Route', () => {
  const CRON_SECRET = 'test-secret-12345';
  const TELEGRAM_TOKEN = '123456:fake-token';
  const CHAT_ID = '987654321';

  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.TELEGRAM_BOT_TOKEN = TELEGRAM_TOKEN;
    process.env.TELEGRAM_CHAT_ID = CHAT_ID;
    vi.restoreAllMocks();
  });

  it('1. Từ chối yêu cầu không có header Authorization hợp lệ (401)', async () => {
    const req = new Request('http://localhost:3000/api/cron/remind', {
      headers: {
        Authorization: 'Bearer wrong-secret',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Truy cập bị từ chối');
  });

  it('2. Chấp nhận yêu cầu có header Authorization: Bearer CRON_SECRET và gửi tin đúng mẫu', async () => {
    // Mock fetch để chặn gửi thật đến api.telegram.org trong unit test
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 100 } }),
    });
    global.fetch = fetchMock;

    const req = new Request('http://localhost:3000/api/cron/remind?force=true', {
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.sent).toBe(true);

    // Kiểm tra tin nhắn Telegram được tạo đúng mẫu
    expect(json.detail).toContain('Báo cáo trả nợ');
    expect(json.detail).toContain('Hôm nay cần tiết kiệm:');
    expect(json.detail).toContain('Sắp đến hạn:');
    expect(json.detail).toContain('Tổng cần có trước hạn gần nhất:');
    expect(json.detail).toContain('Quỹ đang thiếu:');

    // Kiểm tra fetch đã được gọi tới api.telegram.org với đúng chat_id và token
    expect(fetchMock).toHaveBeenCalled();
    const [callUrl, callInit] = fetchMock.mock.calls[0];
    expect(callUrl).toContain(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`);
    const sentBody = JSON.parse(callInit.body);
    expect(sentBody.chat_id).toBe(CHAT_ID);
    expect(sentBody.parse_mode).toBe('HTML');
  });
});
