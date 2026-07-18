import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }
  const exp = Date.now() + 1000 * 60 * 60 * 24;
  const sig = crypto.createHmac('sha256', process.env.ADMIN_PASSWORD!).update(String(exp)).digest('hex');
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_session', `${exp}.${sig}`, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24, path: '/' });
  return res;
}
