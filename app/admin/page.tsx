'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [fare, setFare] = useState<number>(0);
  const [fareSaved, setFareSaved] = useState(false);

  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  const [newAmb, setNewAmb] = useState({ mp_name: '', constituency: '', plate: '', driver_name: '', driver_phone: '' });
  const [subPlan, setSubPlan] = useState<Record<string, string>>({});

  const login = async () => {
    setLoginError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (res.ok) { setAuthed(true); loadData(); } else setLoginError('Incorrect password');
  };

  const loadData = async () => {
    const { data: settings } = await supabase.from('platform_settings').select('rider_fare_ugx').eq('id', 1).single();
    if (settings) setFare(settings.rider_fare_ugx);

    const { data: ambs } = await supabase.from('ambulances').select('*').order('created_at', { ascending: false });
    setAmbulances(ambs || []);

    const { data: subscriptions } = await supabase.from('ambulance_subscriptions').select('*').order('period_end', { ascending: false });
    setSubs(subscriptions || []);

    const { data: tripRows } = await supabase.from('trip_requests').select('*').order('created_at', { ascending: false }).limit(20);
    setTrips(tripRows || []);
  };

  useEffect(() => { if (authed) loadData(); }, [authed]);

  const savePricing = async () => {
    await fetch('/api/admin/pricing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rider_fare_ugx: fare }) });
    setFareSaved(true);
    setTimeout(() => setFareSaved(false), 2000);
  };

  const addAmbulance = async () => {
    const res = await fetch('/api/admin/ambulances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAmb) });
    if (res.ok) { setNewAmb({ mp_name: '', constituency: '', plate: '', driver_name: '', driver_phone: '' }); loadData(); }
  };

  const recordPayment = async (ambulanceId: string) => {
    const plan = subPlan[ambulanceId] || 'monthly';
    await fetch('/api/admin/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ambulance_id: ambulanceId, plan }) });
    loadData();
  };

  const latestSubFor = (ambulanceId: string) => subs.filter((s) => s.ambulance_id === ambulanceId).sort((a, b) => b.period_end.localeCompare(a.period_end))[0];
  const isActive = (sub: any) => sub && sub.payment_status === 'paid' && sub.period_end >= new Date().toISOString().slice(0, 10);

  if (!authed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Admin Login</h1>
          <input type="password" className="w-full border border-gray-300 rounded-lg p-3" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
          {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
          <button className="w-full bg-gray-900 text-white rounded-lg p-3 font-semibold" onClick={login}>Log In</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Pricing */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-lg text-gray-900">Rider Pricing</h2>
        <div className="flex items-center gap-3">
          <span className="text-gray-600">UGX</span>
          <input type="number" className="border border-gray-300 rounded-lg p-2 w-40" value={fare} onChange={(e) => setFare(Number(e.target.value))} />
          <button className="bg-gray-900 text-white rounded-lg px-4 py-2 font-semibold" onClick={savePricing}>Save</button>
          {fareSaved && <span className="text-green-600 text-sm">Saved</span>}
        </div>
        <p className="text-sm text-gray-500">Flat fee charged per trip, paid to the driver. Applies to all new requests immediately.</p>
      </section>

      {/* Add Ambulance */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-lg text-gray-900">Add Ambulance</h2>
        <div className="grid grid-cols-2 gap-3">
          {(['mp_name', 'constituency', 'plate', 'driver_name', 'driver_phone'] as const).map((field) => (
            <input key={field} className="border border-gray-300 rounded-lg p-2" placeholder={field.replace('_', ' ')}
              value={(newAmb as any)[field]} onChange={(e) => setNewAmb({ ...newAmb, [field]: e.target.value })} />
          ))}
        </div>
        <button className="bg-red-600 text-white rounded-lg px-4 py-2 font-semibold" onClick={addAmbulance}>Add Ambulance</button>
      </section>

      {/* Fleet */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-lg text-gray-900">Fleet ({ambulances.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">MP / Constituency</th>
                <th className="py-2 pr-4">Driver</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Subscription</th>
                <th className="py-2 pr-4">Record Payment</th>
              </tr>
            </thead>
            <tbody>
              {ambulances.map((a) => {
                const sub = latestSubFor(a.id);
                const active = isActive(sub);
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{a.mp_name}<br /><span className="text-gray-400">{a.constituency}</span></td>
                    <td className="py-2 pr-4">{a.driver_name}<br /><span className="text-gray-400">{a.driver_phone}</span></td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'available' ? 'bg-green-100 text-green-700' : a.status === 'busy' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                    </td>
                    <td className="py-2 pr-4">
                      {sub ? (
                        <span className={active ? 'text-green-700' : 'text-red-600'}>
                          {active ? 'Active' : 'Expired'} until {sub.period_end}
                        </span>
                      ) : <span className="text-red-600">No subscription</span>}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2 items-center">
                        <select className="border border-gray-300 rounded-lg p-1.5 text-xs" value={subPlan[a.id] || 'monthly'}
                          onChange={(e) => setSubPlan({ ...subPlan, [a.id]: e.target.value })}>
                          <option value="daily">Daily — 5,000</option>
                          <option value="weekly">Weekly — 31,500</option>
                          <option value="monthly">Monthly — 120,000</option>
                        </select>
                        <button className="bg-gray-900 text-white rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => recordPayment(a.id)}>Mark Paid</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent trips */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-lg text-gray-900">Recent Trips</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Rider</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Fare</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{t.rider_phone}</td>
                  <td className="py-2 pr-4">{t.status}</td>
                  <td className="py-2 pr-4">{t.fare_charged_ugx ? `UGX ${Number(t.fare_charged_ugx).toLocaleString()}` : '—'}</td>
                  <td className="py-2 pr-4 text-gray-400">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
