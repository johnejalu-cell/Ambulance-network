'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const LiveMap = dynamic(() => import('@/app/components/LiveMap'), { ssr: false });

export default function DriverDashboard({ ambulanceId }: { ambulanceId: string }) {
  const [trip, setTrip] = useState<any>(null);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [completing, setCompleting] = useState(false);

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
        (payload) => setTrip(payload.new))
      .subscribe();

    return () => { navigator.geolocation.clearWatch(watchId); supabase.removeChannel(channel); };
  }, [ambulanceId]);

  const completeTrip = async () => {
    if (!trip) return;
    setCompleting(true);
    const res = await fetch('/api/driver/complete-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: trip.id, ambulanceId }),
    });
    setCompleting(false);
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

      {trip && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-lg font-semibold text-gray-900">New trip request</p>
          <p className="text-sm text-gray-600">Rider: <span className="font-medium">{trip.rider_phone}</span></p>
          <button
            className="w-full bg-green-600 hover:bg-green-700 transition text-white rounded-lg p-3 font-semibold disabled:opacity-50"
            onClick={completeTrip}
            disabled={completing}
          >
            {completing ? 'Completing…' : 'Mark Completed'}
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
