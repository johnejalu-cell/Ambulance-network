'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const LiveMap = dynamic(() => import('@/app/components/LiveMap'), { ssr: false });
const OFFER_WINDOW_SECONDS = 25;

const PLANS = [
  { key: 'daily', label: 'Daily', amount: 5000 },
  { key: 'weekly', label: 'Weekly', amount: 31500 },
  { key: 'monthly', label: 'Monthly', amount: 120000 },
];

export default function DriverDashboard({ ambulanceId }: { ambulanceId: string }) {
  const [trip, setTrip] = useState<any>(null);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(OFFER_WINDOW_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  const enablePush = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch('/api/driver/subscribe-push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambulanceId, subscription: sub }),
      });
      setPushEnabled(true);
    } catch (err) {
      console.error('push subscribe failed', err);
    }
  };

  const [momoCode, setMomoCode] = useState('');
  const [momoName, setMomoName] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [paying, setPaying] = useState(false);
  const [paidNotice, setPaidNotice] = useState(false);

  const enableSound = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    setSoundEnabled(true);
  };

  const playBeep = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  };

  const startAlertLoop = () => {
    if (!soundEnabled) return;
    playBeep();
    if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
    alertIntervalRef.current = setInterval(playBeep, 3000);
  };

  const stopAlertLoop = () => {
    if (alertIntervalRef.current) { clearInterval(alertIntervalRef.current); alertIntervalRef.current = null; }
  };

  useEffect(() => {
    (async () => {
      const { data: settings } = await supabase.from('platform_settings').select('momo_merchant_code, momo_merchant_name').eq('id', 1).single();
      if (settings) { setMomoCode(settings.momo_merchant_code || ''); setMomoName(settings.momo_merchant_name || ''); }
      loadSubscription();
    })();
  }, [ambulanceId]);

  const loadSubscription = async () => {
    const { data } = await supabase.from('ambulance_subscriptions').select('*').eq('ambulance_id', ambulanceId).order('period_end', { ascending: false }).limit(1).single();
    setSubscription(data || null);
  };

  const isActive = subscription && subscription.payment_status === 'paid' && subscription.period_end >= new Date().toISOString().slice(0, 10);
  const isPending = subscription && subscription.payment_status === 'pending';

  const reportPayment = async () => {
    setPaying(true);
    await fetch('/api/driver/request-subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId, plan: selectedPlan }),
    });
    setPaying(false);
    setPaidNotice(true);
    loadSubscription();
    setTimeout(() => setPaidNotice(false), 4000);
  };

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setMyPos([lat, lng]);
      fetch('/api/driver/location', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambulanceId, lat, lng }),
      });
    }, undefined, { enableHighAccuracy: true, maximumAge: 5000 });

    const channel = supabase
      .channel('driver-trips')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_requests', filter: `ambulance_id=eq.${ambulanceId}` },
        (payload) => handleIncoming(payload.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_requests', filter: `ambulance_id=eq.${ambulanceId}` },
        (payload) => handleIncoming(payload.new))
      .subscribe();

    return () => { navigator.geolocation.clearWatch(watchId); supabase.removeChannel(channel); if (timerRef.current) clearInterval(timerRef.current); stopAlertLoop(); };
  }, [ambulanceId]);

  const handleIncoming = (row: any) => {
    if (row.status === 'offered') {
      setTrip(row);
      setCountdown(OFFER_WINDOW_SECONDS);
      startAlertLoop();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timerRef.current!); stopAlertLoop(); setTrip(null); return OFFER_WINDOW_SECONDS; }
          return c - 1;
        });
      }, 1000);
    } else if (row.status === 'accepted') {
      setTrip(row);
      stopAlertLoop();
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setTrip(null);
      stopAlertLoop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const respond = async (response: 'accept' | 'decline') => {
    if (!trip) return;
    setBusy(true);
    if (timerRef.current) clearInterval(timerRef.current);
    stopAlertLoop();
    await fetch('/api/driver/respond', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: trip.id, ambulanceId, response }),
    });
    setBusy(false);
    if (response === 'decline') setTrip(null); else setTrip({ ...trip, status: 'accepted' });
  };

  const completeTrip = async () => {
    if (!trip) return;
    setBusy(true);
    const res = await fetch('/api/driver/complete-trip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: trip.id, ambulanceId }),
    });
    setBusy(false);
    if (res.ok) setTrip(null);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>

      {!soundEnabled && (
        <button
          className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl p-4 font-semibold shadow-md"
          onClick={enableSound}
        >
          🔔 Tap to Enable Sound Alerts
        </button>
      )}
      {soundEnabled && (
        <p className="text-xs text-gray-500 text-center">🔔 Sound alerts on — keep this tab open to hear new requests</p>
      )}

      {!pushEnabled && (
        <button
          className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl p-4 font-semibold shadow-md"
          onClick={enablePush}
        >
          📲 Enable Notifications (works even with app closed)
        </button>
      )}
      {pushEnabled && (
        <p className="text-xs text-gray-500 text-center">📲 Notifications on — you'll be alerted even if this tab is closed</p>
      )}

      {/* Subscription status banner */}
      <div className={`border rounded-xl p-4 shadow-sm ${isActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        {isActive && <p className="text-green-800 font-medium">Subscription active until {subscription.period_end}</p>}
        {isPending && <p className="text-amber-700 font-medium">Payment reported — waiting for admin to confirm</p>}
        {!isActive && !isPending && <p className="text-red-700 font-medium">No active subscription — you won't receive trip requests until paid</p>}
      </div>

      {!trip && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-gray-600">🟢 Online — broadcasting location. Waiting for requests…</p>
        </div>
      )}

      {trip && trip.status === 'offered' && (
        <div className="bg-white border-2 border-amber-400 rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-lg font-semibold text-gray-900">New trip request</p>
          <p className="text-sm text-gray-600">Rider: <span className="font-medium">{trip.rider_phone}</span></p>
          {trip.payment_method !== 'cash' ? (
            <p className="text-sm font-medium text-blue-700 bg-blue-50 rounded-lg p-2">No cash — billed to {trip.payer_label}</p>
          ) : (
            <p className="text-sm text-gray-500">Collect cash payment on arrival</p>
          )}
          <p className="text-sm font-mono text-amber-600">Respond within {countdown}s or it goes to the next ambulance</p>
          <div className="flex gap-3">
            <button className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg p-3 font-semibold disabled:opacity-50" onClick={() => respond('accept')} disabled={busy}>Accept</button>
            <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg p-3 font-semibold disabled:opacity-50" onClick={() => respond('decline')} disabled={busy}>Decline</button>
          </div>
        </div>
      )}

      {trip && trip.status === 'accepted' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-lg font-semibold text-gray-900">Trip in progress</p>
          <p className="text-sm text-gray-600">Rider: <span className="font-medium">{trip.rider_phone}</span></p>
          {trip.payment_method !== 'cash' ? (
            <p className="text-sm font-medium text-blue-700 bg-blue-50 rounded-lg p-2">No cash — billed to {trip.payer_label}</p>
          ) : (
            <p className="text-sm text-gray-500">Collect cash payment on arrival</p>
          )}
          <button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg p-3 font-semibold disabled:opacity-50" onClick={completeTrip} disabled={busy}>
            {busy ? 'Completing…' : 'Mark Completed'}
          </button>
        </div>
      )}

      {myPos && (
        <LiveMap
          center={myPos}
          markers={[
            { position: myPos, label: 'You (ambulance)' },
            ...(trip ? [{ position: [trip.pickup_lat, trip.pickup_lng] as [number, number], label: 'Pickup' }] : []),
          ]}
        />
      )}

      {/* Subscription / tariff panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-900">Platform Fee</h2>
        <table className="w-full text-sm">
          <tbody>
            {PLANS.map((p) => (
              <tr key={p.key} className="border-b last:border-0">
                <td className="py-1.5 text-gray-600">{p.label}</td>
                <td className="py-1.5 text-right font-medium">UGX {p.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p className="text-gray-500">Pay via MTN Mobile Money:</p>
          <p className="font-mono font-semibold text-gray-900 text-base">{momoCode || 'Not set yet'}</p>
          <p className="text-gray-500">{momoName}</p>
          <p className="text-gray-500 pt-1">Dial <span className="font-mono">*165*3#</span>, choose "Pay Merchant," enter the code above.</p>
        </div>
        <div className="flex gap-2">
          <select className="flex-1 border border-gray-300 rounded-lg p-2 text-sm" value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
            {PLANS.map((p) => <option key={p.key} value={p.key}>{p.label} — {p.amount.toLocaleString()}</option>)}
          </select>
          <button className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50" onClick={reportPayment} disabled={paying}>
            {paying ? 'Sending…' : "I've Paid"}
          </button>
        </div>
        {paidNotice && <p className="text-green-700 text-sm">Reported — admin will confirm shortly.</p>}
      </div>
    </main>
  );
}
