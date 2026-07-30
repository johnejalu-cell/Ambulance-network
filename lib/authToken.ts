import crypto from 'crypto';

export function signToken(subject: string, days = 30): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * days;
  const payload = `${subject}.${exp}`;
  const sig = crypto.createHmac('sha256', process.env.APP_SECRET!).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyToken(token: string | undefined | null, expectedSubject: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [subject, exp, sig] = parts;
  if (subject !== expectedSubject) return false;
  const payload = `${subject}.${exp}`;
  const expected = crypto.createHmac('sha256', process.env.APP_SECRET!).update(payload).digest('hex');
  if (sig !== expected) return false;
  return Number(exp) > Date.now();
}
