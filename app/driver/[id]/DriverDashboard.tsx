'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const LiveMap = dynamic(() => import('@/app/components/LiveMap'), { ssr: false });
const OFFER_WINDOW_SECONDS = 25;

export default function DriverDashboard({ ambulanceId }: { ambulanceId: string }) {
  const [trip, setTrip] = useState<any>(null);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(OFFER_WINDOW_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setMyPos([lat, lng]);
      fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    return () => { navigator.geolocation.clearWatch(watchId); supabase.removeChannel(channel); if (timerRef.current) clearInterval(timerRef.current); };
  }, [ambulanceId]);

  const handleIncoming = (row: any) => {
    if (row.status === 'offered') {
      setTrip(row);
      setCountdown(OFFER_WINDOW_SECONDS);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timerRef.current!); setTrip(null); return OFFER_WINDOW_SECONDS; }
          return c - 1;
        });
      }, 1000);
    } else if (row.status === 'accepted') {
      setTrip(row);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setTrip(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const respond = async (response: 'accept' | 'decline') => {
    if (!trip) return;
    setBusy(true);
    if (timerRef.current) clearInterval(timerRef.current);
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

      {!trip && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-gray-600">🟢 Online — broadcasting location. Waiting for requests…</p>
        </div>
      )}

      {trip && trip.status === 'offered' && (
        <div className="bg-white border-2 border-amber-400 rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-lg font-semibold text-gray-900">New trip request</p>
          <p className="text-sm text-gray-600">Rider: <span className="font-medium">{trip.rider_phone}</span></p>
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
    </main>
  );
}
