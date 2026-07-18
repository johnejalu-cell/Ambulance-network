'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const LiveMap = dynamic(() => import('@/app/components/LiveMap'), { ssr: false });

type Status = 'idle' | 'loading' | 'active' | 'none';

export default function RequestAmbulance() {
  const [status, setStatus] = useState<Status>('idle');
  const [phone, setPhone] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripStatus, setTripStatus] = useState<string>('pending');
  const [ambulanceId, setAmbulanceId] = useState<string | null>(null);
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);
  const [ambulancePos, setAmbulancePos] = useState<[number, number] | null>(null);

  const requestAmbulance = () => {
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setRiderPos([lat, lng]);

      const res = await fetch('/api/request-ambulance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderPhone: phone, lat, lng }),
      });
      if (res.status === 404) return setStatus('none');
      const data = await res.json();
      setDriverPhone(data.driverPhone);
      setTripId(data.trip.id);
      setAmbulanceId(data.trip.ambulance_id);
      setTripStatus(data.trip.status);
      setStatus('active');
    }, () => setStatus('none'));
  };

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_requests', filter: `id=eq.${tripId}` },
        (payload: any) => setTripStatus(payload.new.status))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  useEffect(() => {
    if (!ambulanceId) return;
    const channel = supabase
      .channel(`ambulance-${ambulanceId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ambulances', filter: `id=eq.${ambulanceId}` },
        (payload: any) => {
          const loc = payload.new.location;
          if (loc?.coordinates) setAmbulancePos([loc.coordinates[1], loc.coordinates[0]]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ambulanceId]);

  const reset = () => {
    setStatus('idle');
    setTripId(null);
    setAmbulanceId(null);
    setAmbulancePos(null);
    setDriverPhone('');
  };

  const statusLabel: Record<string, string> = {
    pending: 'Dispatching ambulance…',
    accepted: 'Ambulance is on the way',
    en_route: 'Ambulance is on the way',
    completed: 'Trip completed',
    cancelled: 'Request cancelled',
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Request an Ambulance</h1>

      {status !== 'active' && (
        <>
          <input
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
            placeholder="Your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            className="w-full bg-red-600 hover:bg-red-700 transition text-white rounded-lg p-4 text-lg font-semibold shadow-md disabled:opacity-50"
            onClick={requestAmbulance}
            disabled={status === 'loading' || !phone}
          >
            {status === 'loading' ? 'Finding nearest ambulance…' : 'Request Ambulance Now'}
          </button>
          {status === 'none' && (
            <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              No ambulance currently available nearby. Please call emergency services directly.
            </p>
          )}
        </>
      )}

      {status === 'active' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
            <p className="text-lg font-semibold text-gray-900">{statusLabel[tripStatus] || tripStatus}</p>
            <p className="text-sm text-gray-600">Driver: <span className="font-medium">{driverPhone}</span></p>
          </div>

          {riderPos && (
            <LiveMap
              center={ambulancePos || riderPos}
              markers={[
                { position: riderPos, label: 'You' },
                ...(ambulancePos ? [{ position: ambulancePos, label: 'Ambulance' }] : []),
              ]}
            />
          )}

          {(tripStatus === 'completed' || tripStatus === 'cancelled') && (
            <button className="w-full bg-gray-900 text-white rounded-lg p-3 font-semibold" onClick={reset}>
              Request Another Ambulance
            </button>
          )}
        </div>
      )}
    </main>
  );
}
