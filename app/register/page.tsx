'use client';
import { useState } from 'react';

export default function Register() {
  const [form, setForm] = useState({ mp_name: '', constituency: '', plate: '', driver_name: '', driver_phone: '', contact_phone: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setStatus('sending');
    const res = await fetch('/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setStatus(res.ok ? 'sent' : 'error');
  };

  if (status === 'sent') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full max-w-md text-center space-y-2">
          <h1 className="text-xl font-bold text-gray-900">Application received</h1>
          <p className="text-gray-600">We'll review your details and contact you to confirm before your ambulance goes live on the network.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Register Your Ambulance</h1>
      <p className="text-gray-600">Join the network — riders across Uganda will be able to reach your ambulance the moment it's the nearest one available.</p>

      <input className="w-full border border-gray-300 rounded-lg p-3" placeholder="MP / sponsor name" value={form.mp_name} onChange={set('mp_name')} />
      <input className="w-full border border-gray-300 rounded-lg p-3" placeholder="Constituency" value={form.constituency} onChange={set('constituency')} />
      <input className="w-full border border-gray-300 rounded-lg p-3" placeholder="Vehicle plate number" value={form.plate} onChange={set('plate')} />
      <input className="w-full border border-gray-300 rounded-lg p-3" placeholder="Driver's name" value={form.driver_name} onChange={set('driver_name')} />
      <input className="w-full border border-gray-300 rounded-lg p-3" placeholder="Driver's phone number" value={form.driver_phone} onChange={set('driver_phone')} />
      <input className="w-full border border-gray-300 rounded-lg p-3" placeholder="Alternate contact (optional)" value={form.contact_phone} onChange={set('contact_phone')} />

      {status === 'error' && <p className="text-red-600 text-sm">Something went wrong — please try again.</p>}

      <button
        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 font-semibold disabled:opacity-50"
        onClick={submit}
        disabled={status === 'sending' || !form.mp_name || !form.driver_phone}
      >
        {status === 'sending' ? 'Submitting…' : 'Submit Application'}
      </button>
    </main>
  );
}
