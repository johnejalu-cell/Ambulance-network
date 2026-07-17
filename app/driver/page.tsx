'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DriverDashboard({ ambulanceId }: { ambulanceId: string }) {
  const [trip, setTrip] = useState<any>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition((pos) => {
      fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambulanceId, lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
    await supabase.from('trip_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', trip.id);
    await supabase.from('ambulances').update({ status: 'available' }).eq('id', ambulanceId);
    setTrip(null);
  };

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Driver Dashboard</h1>
      {!trip && <p className="text-gray-600">Online. Broadcasting location. Waiting for requests…</p>}
      {trip && (
        <div className="border rounded p-4 space-y-2">
          <p>New trip from rider: <b>{trip.rider_phone}</b></p>
          <p>Pickup: {trip.pickup_lat}, {trip.pickup_lng}</p>
          <button className="w-full bg-green-600 text-white rounded p-3" onClick={completeTrip}>Mark Completed</button>
        </div>
      )}
    </main>
  );
}
