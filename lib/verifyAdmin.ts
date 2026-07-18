import crypto from 'crypto';

export function verifyAdmin(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const [payload, sig] = cookieValue.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', process.env.ADMIN_PASSWORD!).update(payload).digest('hex');
  if (sig !== expected) return false;
  return Number(payload) > Date.now();
}
