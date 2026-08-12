'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DriverLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [kickedNotice, setKickedNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get('kicked') === '1') setKickedNotice(true);
  }, [searchParams]);

  const findAmbulance = async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/driver/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Login failed.');
      return;
    }
    const data = await res.json();
    localStorage.setItem('driverToken', data.token);
    localStorage.setItem('driverAmbulanceId', data.ambulanceId);
    router.push(`/driver/${data.ambulanceId}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Driver Login</h1>
        {kickedNotice && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            You were signed out because this ambulance was logged in on another device. Only one device can be active at a time.
          </p>
        )}
        <p className="text-sm text-gray-600">Enter your phone number and PIN.</p>
        <input
          className="w-full border border-gray-300 rounded-lg p-3"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="w-full border border-gray-300 rounded-lg p-3"
          placeholder="PIN (if you've been given one)"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && findAmbulance()}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          className="w-full bg-gray-900 text-white rounded-lg p-3 font-semibold disabled:opacity-50"
          onClick={findAmbulance}
          disabled={loading || !phone}
        >
          {loading ? 'Logging in…' : 'Continue'}
        </button>
      </div>
    </main>
  );
}

export default function DriverLogin() {
  return (
    <Suspense fallback={null}>
      <DriverLoginInner />
    </Suspense>
  );
}
