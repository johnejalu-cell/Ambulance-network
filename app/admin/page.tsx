'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [fare, setFare] = useState<number>(0);
  const [momoCode, setMomoCode] = useState('');
  const [momoName, setMomoName] = useState('');
  const [membershipMonthly, setMembershipMonthly] = useState<number>(0);
  const [membershipAnnual, setMembershipAnnual] = useState<number>(0);
  const [fareSaved, setFareSaved] = useState(false);

  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);

  const [newAmb, setNewAmb] = useState({ mp_name: '', constituency: '', plate: '', driver_name: '', driver_phone: '' });
  const [subPlan, setSubPlan] = useState<Record<string, string>>({});
  const [newPayer, setNewPayer] = useState({ name: '', type: 'insurer', contracted_rate_ugx: '' });
  const [rosterPayerId, setRosterPayerId] = useState('');
  const [rosterText, setRosterText] = useState('');
  const [rosterMsg, setRosterMsg] = useState('');

  const login = async () => {
    setLoginError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (res.ok) { setAuthed(true); loadData(); } else setLoginError('Incorrect password');
  };

  const loadData = async () => {
    const { data: settings } = await supabase.from('platform_settings').select('rider_fare_ugx, momo_merchant_code, momo_merchant_name, membership_monthly_ugx, membership_annual_ugx').eq('id', 1).single();
    if (settings) {
      setFare(settings.rider_fare_ugx); setMomoCode(settings.momo_merchant_code || ''); setMomoName(settings.momo_merchant_name || '');
      setMembershipMonthly(settings.membership_monthly_ugx); setMembershipAnnual(settings.membership_annual_ugx);
    }

    const { data: ambs } = await supabase.from('ambulances').select('*').order('created_at', { ascending: false });
    setAmbulances(ambs || []);

    const { data: subscriptions } = await supabase.from('ambulance_subscriptions').select('*').order('period_end', { ascending: false });
    setSubs(subscriptions || []);

    const { data: tripRows } = await supabase.from('trip_requests').select('*').order('created_at', { ascending: false }).limit(20);
    setTrips(tripRows || []);

    const { data: memberRows } = await supabase.from('memberships').select('*').order('created_at', { ascending: false });
    setMemberships(memberRows || []);

    const { data: payerRows } = await supabase.from('payer_accounts').select('*').order('created_at', { ascending: false });
    setPayers(payerRows || []);
  };

  useEffect(() => { if (authed) loadData(); }, [authed]);

  const savePricing = async () => {
    await fetch('/api/admin/pricing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rider_fare_ugx: fare, momo_merchant_code: momoCode, momo_merchant_name: momoName }) });
    await fetch('/api/admin/membership-pricing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ membership_monthly_ugx: membershipMonthly, membership_annual_ugx: membershipAnnual }) });
    setFareSaved(true);
    setTimeout(() => setFareSaved(false), 2000);
  };

  const confirmMembership = async (membershipId: string) => {
    await fetch('/api/admin/memberships/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ membershipId }) });
    loadData();
  };

  const addPayer = async () => {
    const res = await fetch('/api/admin/payers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newPayer, contracted_rate_ugx: Number(newPayer.contracted_rate_ugx) }) });
    if (res.ok) { setNewPayer({ name: '', type: 'insurer', contracted_rate_ugx: '' }); loadData(); }
  };

  const uploadRoster = async () => {
    const rows = rosterText.trim().split('\n').filter(Boolean).map((line) => {
      const [phoneVal, code, exp] = line.split(',').map((s) => s.trim());
      return { phone: phoneVal, member_code: code || null, expires_at: exp || null };
    });
    const res = await fetch('/api/admin/payers/roster', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payerAccountId: rosterPayerId, rows }) });
    const data = await res.json();
    setRosterMsg(res.ok ? `Uploaded ${data.count} members` : data.error);
    setRosterText('');
  };

  const exportPayerTrips = (payerId: string, payerName: string) => {
    const rows = trips.filter((t) => t.payer_account_id === payerId && t.status === 'completed');
    const csv = ['rider_phone,fare_ugx,completed_at', ...rows.map((t) => `${t.rider_phone},${t.fare_charged_ugx},${t.completed_at}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${payerName}-trips.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const confirmPayment = async (subscriptionId: string) => {
    await fetch('/api/admin/subscriptions/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId }) });
    loadData();
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

        <div className="border-t pt-3 space-y-2">
          <h3 className="font-medium text-gray-900 text-sm">Mobile Money Merchant (for driver subscription payments)</h3>
          <input className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="Merchant code / number"
            value={momoCode} onChange={(e) => setMomoCode(e.target.value)} />
          <input className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="Merchant / business name shown to drivers"
            value={momoName} onChange={(e) => setMomoName(e.target.value)} />
        </div>

        <div className="border-t pt-3 space-y-2">
          <h3 className="font-medium text-gray-900 text-sm">Priority Membership Pricing</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Monthly (UGX)</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={membershipMonthly} onChange={(e) => setMembershipMonthly(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Annual (UGX)</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={membershipAnnual} onChange={(e) => setMembershipAnnual(Number(e.target.value))} />
            </div>
          </div>
        </div>
      </section>

      {/* Pending membership confirmations */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-lg text-gray-900">Pending Membership Payments</h2>
        {memberships.filter((m) => m.payment_status === 'pending').length === 0 && (
          <p className="text-sm text-gray-500">None pending.</p>
        )}
        {memberships.filter((m) => m.payment_status === 'pending').map((m) => (
          <div key={m.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
            <div>
              <p className="font-medium text-gray-900">{m.rider_phone}</p>
              <p className="text-gray-500">{m.plan} — UGX {Number(m.amount_ugx).toLocaleString()}</p>
            </div>
            <button className="bg-green-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => confirmMembership(m.id)}>Confirm Paid</button>
          </div>
        ))}
      </section>

      {/* Payers (insurers / corporates) */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-lg text-gray-900">Insurers &amp; Corporate Payers</h2>

        <div className="grid grid-cols-3 gap-3">
          <input className="border border-gray-300 rounded-lg p-2 text-sm" placeholder="Payer name" value={newPayer.name} onChange={(e) => setNewPayer({ ...newPayer, name: e.target.value })} />
          <select className="border border-gray-300 rounded-lg p-2 text-sm" value={newPayer.type} onChange={(e) => setNewPayer({ ...newPayer, type: e.target.value })}>
            <option value="insurer">Insurer</option>
            <option value="corporate">Corporate</option>
          </select>
          <input className="border border-gray-300 rounded-lg p-2 text-sm" placeholder="Rate per trip (UGX)" value={newPayer.contracted_rate_ugx} onChange={(e) => setNewPayer({ ...newPayer, contracted_rate_ugx: e.target.value })} />
        </div>
        <button className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold" onClick={addPayer}>Add Payer</button>

        <div className="border-t pt-3 space-y-2">
          {payers.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
              <span>{p.name} ({p.type}) — UGX {Number(p.contracted_rate_ugx).toLocaleString()}/trip</span>
              <button className="text-xs text-blue-700 font-medium" onClick={() => exportPayerTrips(p.id, p.name)}>Export Trips CSV</button>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-2">
          <h3 className="font-medium text-gray-900 text-sm">Upload Member Roster</h3>
          <select className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={rosterPayerId} onChange={(e) => setRosterPayerId(e.target.value)}>
            <option value="">Select payer…</option>
            {payers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <textarea className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono" rows={4}
            placeholder="phone,member_code,expires_at (one per line)&#10;0779123456,JB-0012,2027-01-01"
            value={rosterText} onChange={(e) => setRosterText(e.target.value)} />
          <button className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold" onClick={uploadRoster} disabled={!rosterPayerId || !rosterText}>Upload</button>
          {rosterMsg && <p className="text-sm text-gray-600">{rosterMsg}</p>}
        </div>
      </section>

      {/* Pending payment confirmations */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-lg text-gray-900">Pending Payment Confirmations</h2>
        {subs.filter((s) => s.payment_status === 'pending').length === 0 && (
          <p className="text-sm text-gray-500">No pending self-reported payments right now.</p>
        )}
        {subs.filter((s) => s.payment_status === 'pending').map((s) => {
          const amb = ambulances.find((a) => a.id === s.ambulance_id);
          return (
            <div key={s.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
              <div>
                <p className="font-medium text-gray-900">{amb ? `${amb.mp_name} — ${amb.driver_name}` : s.ambulance_id}</p>
                <p className="text-gray-500">{s.plan} — UGX {Number(s.amount_ugx).toLocaleString()} — reported {new Date(s.created_at).toLocaleString()}</p>
              </div>
              <button className="bg-green-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => confirmPayment(s.id)}>Confirm Paid</button>
            </div>
          );
        })}
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
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2 pr-4">Fare</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{t.rider_phone}</td>
                  <td className="py-2 pr-4">{t.status}</td>
                  <td className="py-2 pr-4">{t.payment_method === 'cash' ? 'Cash' : `${t.payment_method} — ${t.payer_label}`}</td>
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
