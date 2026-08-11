import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

// Driver sessions additionally require the token to match the ambulance's
// currently-active session — the most recent login wins, and any earlier
// device's token stops working the moment a new one logs in.
export async function verifyDriverSession(ambulanceId: string, token: string | undefined | null): Promise<boolean> {
  if (!verifyToken(token, ambulanceId)) return false;
  const { data } = await supabaseAdmin.from('ambulances').select('active_session_token').eq('id', ambulanceId).single();
  return data?.active_session_token === token;
}
