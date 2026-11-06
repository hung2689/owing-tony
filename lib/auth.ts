import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'so_tra_no_auth';

export function getExpectedPassword(): string {
  return process.env.APP_PASSWORD || 'admin123';
}

/**
 * Tạo auth token tương thích hoàn toàn cả Edge Runtime và Node.js bằng Web Crypto API
 */
export async function generateAuthToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${password}-so-tra-no-secure-salt-2026`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;

  const expectedToken = await generateAuthToken(getExpectedPassword());
  return token === expectedToken;
}
