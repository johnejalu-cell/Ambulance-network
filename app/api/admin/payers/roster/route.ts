import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/verifyAdmin';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  if (!verifyAdmin(cookies().get('admin_session')?.value)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { payerAccountId, rows } = await req.json(); // rows: [{ phone, member_code, expires_at }]
  const records = rows.map((r: any) => ({ payer_account_id: payerAccountId, phone: r.phone.trim(), member_code: r.member_code?.trim() || null, expires_at: r.expires_at || null }));
  const { error } = await supabaseAdmin.from('payer_members').insert(records);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: records.length });
}
