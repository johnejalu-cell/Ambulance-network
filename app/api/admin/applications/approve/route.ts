import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/verifyAdmin';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  if (!verifyAdmin(cookies().get('admin_session')?.value)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { applicationId } = await req.json();

  const { data: app } = await supabaseAdmin.from('ambulance_applications').select('*').eq('id', applicationId).single();
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: ambulance, error } = await supabaseAdmin.from('ambulances').insert({
    mp_name: app.mp_name, constituency: app.constituency, plate: app.plate,
    driver_name: app.driver_name, driver_phone: app.driver_phone, status: 'offline',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('ambulance_applications').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', applicationId);

  return NextResponse.json({ ok: true, ambulanceId: ambulance.id });
}
