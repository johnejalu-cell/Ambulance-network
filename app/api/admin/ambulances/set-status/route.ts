import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/verifyAdmin';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  if (!verifyAdmin(cookies().get('admin_session')?.value)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ambulanceId, status } = await req.json();
  if (!['available', 'offline', 'busy'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  const { error } = await supabaseAdmin.from('ambulances').update({ status }).eq('id', ambulanceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
