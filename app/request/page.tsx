'use client';
import { useState } from 'react';

export default function RequestAmbulance() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'none'>('idle');
  const [phone, setPhone] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  const requestAmbulance = () => {
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const res = await fetch('/api/request-ambulance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderPhone: phone,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      });
      if (res.status === 404) return setStatus('none');
      const data = await res.json();
      setDriverPhone(data.driverPhone);
      setStatus('sent');
    }, () => setStatus('none'));
  };

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Request an Ambulance</h1>
      <input
        className="w-full border rounded p-3"
        placeholder="Your phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button
        className="w-full bg-red-600 text-white rounded p-4 text-lg font-semibold"
        onClick={requestAmbulance}
        disabled={status === 'loading' || !phone}
      >
        {status === 'loading' ? 'Finding nearest ambulance…' : 'Request Ambulance Now'}
      </button>
      {status === 'sent' && (
        <p className="text-green-700">Ambulance dispatched. Driver will call you: <b>{driverPhone}</b></p>
      )}
      {status === 'none' && (
        <p className="text-red-700">No ambulance available nearby right now. Please call emergency services directly.</p>
      )}
    </main>
  );
}
