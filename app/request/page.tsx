'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const LiveMap = dynamic(() => import('@/app/components/LiveMap'), { ssr: false });
const OFFER_WINDOW_SECONDS = 25;

type Status = 'idle' | 'loading' | 'active' | 'none' | 'unmatched';

export default function RequestAmbulance() {
  const [status, setStatus] = useState<Status>('idle');
  const [phone, setPhone] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripStatus, setTripStatus] = useState<string>('offered');
  const [fare, setFare] = useState<number | null>(null);
  const [ambulanceId, setAmbulanceId] = useState<string | null>(null);
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);
  const [ambulancePos, setAmbulancePos] = useState<[number, number] | null>(null);
  const [countdown, setCountdown] = useState(OFFER_WINDOW_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reassigningRef = useRef(false);

  const requestAmbulance = () => {
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setRiderPos([lat, lng]);

      const res = await fetch('/api/request-ambulance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderPhone: phone, lat, lng }),
      });
      if (res.status === 404) return setStatus('none');
      const data = await res.json();
      setDriverPhone(data.driverPhone);
      setTripId(data.trip.id);
      setAmbulanceId(data.trip.ambulance_id);
      setTripStatus(data.trip.status);
      setFare(data.trip.fare_charged_ugx);
      setStatus('active');
      startOfferTimer();
    }, () => setStatus('none'));
  };

  const startOfferTimer = () => {
    setCountdown(OFFER_WINDOW_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); triggerReassign(); return OFFER_WINDOW_SECONDS; }
        return c - 1;
      });
    }, 1000);
  };

  const triggerReassign = async () => {
    if (reassigningRef.current || !tripId) return;
    reassigningRef.current = true;
    const res = await fetch('/api/reassign-ambulance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId }),
    });
    const data = await res.json();
    reassigningRef.current = false;
    if (data.matched) {
      setDriverPhone(data.driverPhone);
      setTripStatus('offered');
      startOfferTimer();
    } else {
      setStatus('unmatched');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_requests', filter: `id=eq.${tripId}` },
        (payload: any) => {
          const newRow = payload.new;
          setTripStatus(newRow.status);
          setAmbulanceId(newRow.ambulance_id);
          if (newRow.status === 'accepted' && timerRef.current) clearInterval(timerRef.current);
          if (newRow.status === 'declined') triggerReassign();
        })
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
    setStatus('idle'); setTripId(null); setAmbulanceId(null); setAmbulancePos(null); setDriverPhone('');
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const statusLabel: Record<string, string> = {
    offered: `Waiting for driver to accept… (${countdown}s)`,
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
            placeholder="Your phone number" value={phone} onChange={(e) => setPhone(e.target.value)}
          />
          <button
            className="w-full bg-red-600 hover:bg-red-700 transition text-white rounded-lg p-4 text-lg font-semibold shadow-md disabled:opacity-50"
            onClick={requestAmbulance} disabled={status === 'loading' || !phone}
          >
            {status === 'loading' ? 'Finding nearest ambulance…' : 'Request Ambulance Now'}
          </button>
          {status === 'none' && (
            <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">No ambulance currently available nearby. Please call emergency services directly.</p>
          )}
          {status === 'unmatched' && (
            <div className="space-y-3">
              <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">No ambulance responded. Please call emergency services directly.</p>
              <button className="w-full bg-gray-900 text-white rounded-lg p-3 font-semibold" onClick={reset}>Try Again</button>
            </div>
          )}
        </>
      )}

      {status === 'active' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-1">
            <p className="text-lg font-semibold text-gray-900">{statusLabel[tripStatus] || tripStatus}</p>
            <p className="text-sm text-gray-600">Driver: <span className="font-medium">{driverPhone}</span></p>
            {fare !== null && <p className="text-sm text-gray-600">Fare: <span className="font-medium">UGX {fare.toLocaleString()}</span> (pay driver directly)</p>}
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
            <button className="w-full bg-gray-900 text-white rounded-lg p-3 font-semibold" onClick={reset}>Request Another Ambulance</button>
          )}
        </div>
      )}
    </main>
  );
}
