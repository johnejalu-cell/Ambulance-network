'use client';
import { useState } from 'react';

export default function SponsorPanel() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [token, setToken] = useState('');
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const login = async () => {
    setError('');
    const res = await fetch('/api/sponsor/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), pin }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Login failed.');
      return;
    }
    const data = await res.json();
    setAmbulances(data.ambulances);
    setToken(data.token);
    setLoggedIn(true);
  };

  const logout = () => {
    setLoggedIn(false);
    setAmbulances([]);
    setToken('');
    setPhone('');
    setPin('');
  };

  const updateField = (id: string, field: string, value: string) => {
    setAmbulances((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const save = async (amb: any) => {
    const res = await fetch('/api/sponsor/update-ambulance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ambulanceId: amb.id, sponsorPhone: phone.trim(), token,
        updates: {
          mp_name: amb.mp_name, constituency: amb.constituency, plate: amb.plate,
          driver_name: amb.driver_name, driver_phone: amb.driver_phone,
          sponsor_email: amb.sponsor_email,
          trip_rate_ugx: amb.trip_rate_ugx === '' || amb.trip_rate_ugx === null ? null : Number(amb.trip_rate_ugx),
        },
      }),
    });
    setSaved((s) => ({ ...s, [amb.id]: res.ok }));
    setTimeout(() => setSaved((s) => ({ ...s, [amb.id]: false })), 3000);
  };

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Sponsor Account</h1>
          <p className="text-sm text-gray-600">Enter the sponsor phone number used when you registered.</p>
          <input
            className="w-full border border-gray-300 rounded-lg p-3"
            placeholder="Sponsor phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="w-full border border-gray-300 rounded-lg p-3"
            placeholder="PIN (if you've been given one)"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-gray-900 text-white rounded-lg p-3 font-semibold disabled:opacity-50" onClick={login} disabled={!phone}>
            Continue
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sponsor Account</h1>
        <button className="text-sm text-gray-500 underline" onClick={logout}>Log Out</button>
      </div>
      <p className="text-gray-600">Manage your ambulance's details and set your own trip rate.</p>

      {ambulances.map((amb) => (
        <div key={amb.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-lg text-gray-900">{amb.mp_name} — {amb.constituency}</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">MP / Sponsor name</label>
              <input className="w-full border border-gray-300 rounded-lg p-2" value={amb.mp_name || ''} onChange={(e) => updateField(amb.id, 'mp_name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Constituency</label>
              <input className="w-full border border-gray-300 rounded-lg p-2" value={amb.constituency || ''} onChange={(e) => updateField(amb.id, 'constituency', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Vehicle plate</label>
              <input className="w-full border border-gray-300 rounded-lg p-2" value={amb.plate || ''} onChange={(e) => updateField(amb.id, 'plate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Driver name</label>
              <input className="w-full border border-gray-300 rounded-lg p-2" value={amb.driver_name || ''} onChange={(e) => updateField(amb.id, 'driver_name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Driver phone</label>
              <input className="w-full border border-gray-300 rounded-lg p-2" value={amb.driver_phone || ''} onChange={(e) => updateField(amb.id, 'driver_phone', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Sponsor email</label>
              <input className="w-full border border-gray-300 rounded-lg p-2" value={amb.sponsor_email || ''} onChange={(e) => updateField(amb.id, 'sponsor_email', e.target.value)} />
            </div>
          </div>

          <div className="border-t pt-3">
            <label className="text-xs text-gray-500">
              Your trip rate (UGX) — based on the distance to the nearest general hospital or recognised health facility serving your constituency. You decide the criteria.
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg p-2 mt-1"
              placeholder="e.g. 15000 — leave blank to use the platform default"
              value={amb.trip_rate_ugx ?? ''}
              onChange={(e) => updateField(amb.id, 'trip_rate_ugx', e.target.value)}
            />
          </div>

          <button className="bg-red-600 text-white rounded-lg px-4 py-2 font-semibold" onClick={() => save(amb)}>Save Changes</button>
          {saved[amb.id] && <p className="text-green-700 text-sm">Saved</p>}
        </div>
      ))}
    </main>
  );
}
