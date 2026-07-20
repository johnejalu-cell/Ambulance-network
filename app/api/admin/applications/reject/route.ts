import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/verifyAdmin';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  if (!verifyAdmin(cookies().get('admin_session')?.value)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { applicationId } = await req.json();
  const { error } = await supabaseAdmin.from('ambulance_applications').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', applicationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
