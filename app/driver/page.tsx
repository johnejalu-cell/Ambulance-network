'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DriverLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const findAmbulance = async () => {
    setLoading(true);
    setError('');
    const { data, error: dbError } = await supabase.from('ambulances').select('id').eq('driver_phone', phone.trim()).maybeSingle();
    setLoading(false);
    if (dbError || !data) {
      setError('No ambulance found for that phone number. Contact admin if you believe this is a mistake.');
      return;
    }
    router.push(`/driver/${data.id}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Driver Login</h1>
        <p className="text-sm text-gray-600">Enter the phone number registered with your ambulance.</p>
        <input
          className="w-full border border-gray-300 rounded-lg p-3"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && findAmbulance()}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          className="w-full bg-gray-900 text-white rounded-lg p-3 font-semibold disabled:opacity-50"
          onClick={findAmbulance}
          disabled={loading || !phone}
        >
          {loading ? 'Looking up…' : 'Continue'}
        </button>
      </div>
    </main>
  );
}
