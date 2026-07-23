import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:admin@ambulance-network.vercel.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function notifyAmbulance(ambulanceId: string, payload: { title: string; body: string; url?: string }) {
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*').eq('ambulance_id', ambulanceId);
  if (!subs?.length) return;

  await Promise.all(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify(payload));
      } catch (err: any) {
        // 410 = subscription expired/revoked — clean it up so it stops being retried
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', row.id);
        } else {
          console.error('push send error', err);
        }
      }
    })
  );
}
