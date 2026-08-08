'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const PickMap = dynamic(() => import('@/app/components/PickMap'), { ssr: false });
const LiveMap = dynamic(() => import('@/app/components/LiveMap'), { ssr: false });
const DISPATCH_OFFER_WINDOW = 60;

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
  const [applications, setApplications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [newAmb, setNewAmb] = useState({ mp_name: '', constituency: '', plate: '', driver_name: '', driver_phone: '' });
  const [subPlan, setSubPlan] = useState<Record<string, string>>({});
  const [newPayer, setNewPayer] = useState({ name: '', type: 'insurer', contracted_rate_ugx: '' });
  const [rosterPayerId, setRosterPayerId] = useState('');
  const [rosterText, setRosterText] = useState('');
  const [rosterMsg, setRosterMsg] = useState('');

  // --- Dispatch by Phone state ---
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [dispatchNote, setDispatchNote] = useState('');
  const [dispatchPickup, setDispatchPickup] = useState<[number, number] | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'creating' | 'active' | 'none' | 'unmatched'>('idle');
  const [dispatchTripId, setDispatchTripId] = useState<string | null>(null);
  const dispatchTripIdRef = useRef<string | null>(null);
  const [dispatchTripStatus, setDispatchTripStatus] = useState('offered');
  const [dispatchDriverPhone, setDispatchDriverPhone] = useState('');
  const [dispatchFare, setDispatchFare] = useState<number | null>(null);
  const [dispatchPayerLabel, setDispatchPayerLabel] = useState<string | null>(null);
  const [dispatchAmbulanceId, setDispatchAmbulanceId] = useState<string | null>(null);
  const [dispatchAmbulancePos, setDispatchAmbulancePos] = useState<[number, number] | null>(null);
  const [dispatchCountdown, setDispatchCountdown] = useState(DISPATCH_OFFER_WINDOW);
  const dispatchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dispatchReassigningRef = useRef(false);
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [landmarkSearch, setLandmarkSearch] = useState('');
  const [newLandmark, setNewLandmark] = useState({ name: '', constituency: '', lat: '', lng: '' });
  const [flyToPos, setFlyToPos] = useState<[number, number] | null>(null);

  const login = async () => {
    setLoginError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (res.ok) { setAuthed(true); loadData(); } else setLoginError('Incorrect password');
  };

  const adminLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
  };

  const loadData = async () => {
    setRefreshing(true);
    const { data: settings } = await supabase.from('platform_settings').select('rider_fare_ugx, momo_merchant_code, momo_merchant_name, membership_monthly_ugx, membership_annual_ugx').eq('id', 1).single();
    if (settings) {
      setFare(settings.rider_fare_ugx); setMomoCode(settings.momo_merchant_code || ''); setMomoName(settings.momo_merchant_name || '');
      setMembershipMonthly(settings.membership_monthly_ugx); setMembershipAnnual(settings.membership_annual_ugx);
    }

    const { data: ambs, error: ambsError } = await supabase.from('ambulances').select('*').order('updated_at', { ascending: false });
    if (ambsError) console.error('ambulances load error', ambsError);
    setAmbulances(ambs || []);

    const { data: subscriptions, error: subsError } = await supabase.from('ambulance_subscriptions').select('*').order('period_end', { ascending: false });
    if (subsError) console.error('subscriptions load error', subsError);
    setSubs(subscriptions || []);

    const { data: tripRows } = await supabase.from('trip_requests').select('*').order('created_at', { ascending: false }).limit(20);
    setTrips(tripRows || []);

    const { data: memberRows } = await supabase.from('memberships').select('*').order('created_at', { ascending: false });
    setMemberships(memberRows || []);

    const { data: payerRows } = await supabase.from('payer_accounts').select('*').order('created_at', { ascending: false });
    setPayers(payerRows || []);

    const appsRes = await fetch('/api/admin/applications');
    if (appsRes.ok) { const appsData = await appsRes.json(); setApplications(appsData.applications || []); }

    const { data: lmRows } = await supabase.from('landmarks').select('*').order('name', { ascending: true });
    setLandmarks(lmRows || []);

    setRefreshing(false);
  };

  useEffect(() => { if (authed) loadData(); }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [authed]);

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

  const approveApplication = async (applicationId: string) => {
    await fetch('/api/admin/applications/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId }) });
    loadData();
  };

  const setAmbulanceStatus = async (ambulanceId: string, status: string) => {
    await fetch('/api/admin/ambulances/set-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ambulanceId, status }) });
    loadData();
  };

  const setPin = async (ambulanceId: string, pin: string) => {
    await fetch('/api/admin/ambulances/set-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ambulanceId, pin }) });
    loadData();
  };

  const rejectApplication = async (applicationId: string) => {
    await fetch('/api/admin/applications/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId }) });
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

  // --- Dispatch by Phone logic ---
  const createPhoneDispatch = async () => {
    if (!dispatchPickup) return;
    setDispatchStatus('creating');
    const res = await fetch('/api/request-ambulance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderPhone: dispatchPhone, lat: dispatchPickup[0], lng: dispatchPickup[1], dropoffNote: dispatchNote || undefined }),
    });
    if (res.status === 404) { setDispatchStatus('none'); return; }
    const data = await res.json();
    setDispatchTripId(data.trip.id);
    dispatchTripIdRef.current = data.trip.id;
    setDispatchAmbulanceId(data.trip.ambulance_id);
    setDispatchTripStatus(data.trip.status);
    setDispatchFare(data.trip.fare_charged_ugx);
    setDispatchPayerLabel(data.trip.payer_label);
    setDispatchDriverPhone(data.driverPhone);
    setDispatchStatus('active');
    startDispatchTimer();
  };

  const startDispatchTimer = () => {
    setDispatchCountdown(DISPATCH_OFFER_WINDOW);
    if (dispatchTimerRef.current) clearInterval(dispatchTimerRef.current);
    dispatchTimerRef.current = setInterval(() => {
      setDispatchCountdown((c) => {
        if (c <= 1) { clearInterval(dispatchTimerRef.current!); triggerDispatchReassign(); return DISPATCH_OFFER_WINDOW; }
        return c - 1;
      });
    }, 1000);
  };

  const triggerDispatchReassign = async () => {
    const currentTripId = dispatchTripIdRef.current;
    if (dispatchReassigningRef.current || !currentTripId) return;
    dispatchReassigningRef.current = true;
    const res = await fetch('/api/reassign-ambulance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: currentTripId }),
    });
    const data = await res.json();
    dispatchReassigningRef.current = false;
    if (data.matched) {
      setDispatchDriverPhone(data.driverPhone);
      setDispatchFare(data.fareChargedUgx);
      setDispatchPayerLabel(data.payerLabel);
      setDispatchTripStatus('offered');
      startDispatchTimer();
    } else {
      setDispatchStatus('unmatched');
      if (dispatchTimerRef.current) clearInterval(dispatchTimerRef.current);
    }
  };

  useEffect(() => {
    if (!dispatchTripId) return;
    const channel = supabase
      .channel(`admin-dispatch-trip-${dispatchTripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_requests', filter: `id=eq.${dispatchTripId}` },
        (payload: any) => {
          const newRow = payload.new;
          setDispatchTripStatus(newRow.status);
          setDispatchAmbulanceId(newRow.ambulance_id);
          setDispatchFare(newRow.fare_charged_ugx);
          setDispatchPayerLabel(newRow.payer_label);
          if (newRow.status === 'accepted' && dispatchTimerRef.current) clearInterval(dispatchTimerRef.current);
          if (newRow.status === 'declined') triggerDispatchReassign();
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dispatchTripId]);

  useEffect(() => {
    if (!dispatchAmbulanceId) return;
    const channel = supabase
      .channel(`admin-dispatch-ambulance-${dispatchAmbulanceId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ambulances', filter: `id=eq.${dispatchAmbulanceId}` },
        (payload: any) => {
          const loc = payload.new.location;
          if (loc?.coordinates) setDispatchAmbulancePos([loc.coordinates[1], loc.coordinates[0]]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dispatchAmbulanceId]);

  const resetDispatch = () => {
    setDispatchStatus('idle'); setDispatchTripId(null); dispatchTripIdRef.current = null;
    setDispatchAmbulanceId(null); setDispatchAmbulancePos(null); setDispatchDriverPhone('');
    setDispatchPayerLabel(null); setDispatchPhone(''); setDispatchNote(''); setDispatchPickup(null);
    setLandmarkSearch(''); setFlyToPos(null);
    if (dispatchTimerRef.current) clearInterval(dispatchTimerRef.current);
  };

  const addLandmark = async () => {
    if (!newLandmark.name || !newLandmark.lat || !newLandmark.lng) return;
    const res = await fetch('/api/admin/landmarks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLandmark),
    });
    if (res.ok) { setNewLandmark({ name: '', constituency: '', lat: '', lng: '' }); loadData(); }
  };

  const selectLandmark = (lm: any) => {
    const pos: [number, number] = [lm.lat, lm.lng];
    setDispatchPickup(pos);
    setFlyToPos(pos);
    setLandmarkSearch(lm.name);
  };

  const filteredLandmarks = landmarkSearch
    ? landmarks.filter((lm) =>
        lm.name.toLowerCase().includes(landmarkSearch.toLowerCase()) ||
        (lm.constituency || '').toLowerCase().includes(landmarkSearch.toLowerCase())
      )
    : [];

  const dispatchStatusLabel: Record<string, string> = {
    offered: `Waiting for driver to accept… (${dispatchCountdown}s)`,
    accepted: 'Ambulance is on the way',
    en_route: 'Ambulance is on the way',
    completed: 'Trip completed',
    cancelled: 'Request cancelled',
  };

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50" onClick={loadData} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={adminLogout}>
            Log Out
          </button>
        </div>
      </div>

      {/* Dispatch by Phone */}
      <section className="bg-white border-2 border-red-200 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-lg text-gray-900">📞 Dispatch by Phone</h2>
        <p className="text-sm text-gray-500">For callers without the app — creates a real request exactly like the app does, including driver notifications and live tracking.</p>

        {dispatchStatus !== 'active' && (
          <>
            <input className="w-full border border-gray-300 rounded-lg p-3" placeholder="Caller's phone number"
              value={dispatchPhone} onChange={(e) => setDispatchPhone(e.target.value)} />
            <input className="w-full border border-gray-300 rounded-lg p-3" placeholder="Situation note (optional)"
              value={dispatchNote} onChange={(e) => setDispatchNote(e.target.value)} />
            <p className="text-xs text-gray-500">
              Click the map, or search a known landmark below, to set the caller's location
              {dispatchPickup ? ` — set at ${dispatchPickup[0].toFixed(4)}, ${dispatchPickup[1].toFixed(4)}` : ''}
            </p>
            <div className="relative">
              <input
                className="w-full border border-gray-300 rounded-lg p-3"
                placeholder="Search landmark (hospital, town center…)"
                value={landmarkSearch}
                onChange={(e) => setLandmarkSearch(e.target.value)}
              />
              {filteredLandmarks.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-md mt-1 max-h-40 overflow-y-auto">
                  {filteredLandmarks.map((lm) => (
                    <button
                      key={lm.id}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => selectLandmark(lm)}
                    >
                      {lm.name}{lm.constituency ? ` — ${lm.constituency}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <PickMap center={dispatchPickup || [0.3476, 32.5825]} onPick={setDispatchPickup} flyToPosition={flyToPos} />
            <button
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-3 font-semibold disabled:opacity-50"
              onClick={createPhoneDispatch}
              disabled={!dispatchPhone || !dispatchPickup || dispatchStatus === 'creating'}
            >
              {dispatchStatus === 'creating' ? 'Dispatching…' : 'Dispatch Ambulance'}
            </button>
            {dispatchStatus === 'none' && (
              <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">No ambulance currently available nearby.</p>
            )}
            {dispatchStatus === 'unmatched' && (
              <div className="space-y-2">
                <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">No ambulance responded. Advise the caller to call emergency services directly.</p>
                <button className="w-full bg-gray-900 text-white rounded-lg p-3 font-semibold" onClick={resetDispatch}>New Phone Dispatch</button>
              </div>
            )}
          </>
        )}

        {dispatchStatus === 'active' && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-gray-900">{dispatchStatusLabel[dispatchTripStatus] || dispatchTripStatus}</p>
              <p className="text-sm text-gray-600">Caller: <span className="font-medium">{dispatchPhone}</span></p>
              <p className="text-sm text-gray-600">Driver: <span className="font-medium">{dispatchDriverPhone}</span></p>
              {dispatchFare !== null && (
                <p className="text-sm text-gray-600">
                  {dispatchPayerLabel ? <>Covered by <span className="font-medium">{dispatchPayerLabel}</span></> : <>Fare: <span className="font-medium">UGX {dispatchFare.toLocaleString()}</span> — caller pays driver directly</>}
                </p>
              )}
            </div>

            {dispatchPickup && (
              <LiveMap
                center={dispatchAmbulancePos || dispatchPickup}
                markers={[
                  { position: dispatchPickup, label: 'Caller' },
                  ...(dispatchAmbulancePos ? [{ position: dispatchAmbulancePos, label: 'Ambulance' }] : []),
                ]}
              />
            )}

            {(dispatchTripStatus === 'completed' || dispatchTripStatus === 'cancelled') && (
              <button className="w-full bg-gray-900 text-white rounded-lg p-3 font-semibold" onClick={resetDispatch}>New Phone Dispatch</button>
            )}
          </div>
        )}
      </section>

      {/* Landmarks for phone dispatch */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-lg text-gray-900">Landmarks (for Phone Dispatch)</h2>
        <p className="text-sm text-gray-500">Add known locations — hospitals, town centers — so operators can pick them instantly instead of guessing on the map when a caller can't describe their exact location.</p>
        <div className="grid grid-cols-2 gap-3">
          <input className="border border-gray-300 rounded-lg p-2 text-sm" placeholder="Name (e.g. Mulago Hospital)" value={newLandmark.name} onChange={(e) => setNewLandmark({ ...newLandmark, name: e.target.value })} />
          <input className="border border-gray-300 rounded-lg p-2 text-sm" placeholder="Constituency (optional)" value={newLandmark.constituency} onChange={(e) => setNewLandmark({ ...newLandmark, constituency: e.target.value })} />
          <input className="border border-gray-300 rounded-lg p-2 text-sm" placeholder="Latitude" value={newLandmark.lat} onChange={(e) => setNewLandmark({ ...newLandmark, lat: e.target.value })} />
          <input className="border border-gray-300 rounded-lg p-2 text-sm" placeholder="Longitude" value={newLandmark.lng} onChange={(e) => setNewLandmark({ ...newLandmark, lng: e.target.value })} />
        </div>
        <p className="text-xs text-gray-400">Tip: right-click a spot in Google Maps and tap the coordinates to copy them.</p>
        <button className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold" onClick={addLandmark}>Add Landmark</button>
        <div className="border-t pt-3 space-y-1">
          {landmarks.map((lm) => (
            <p key={lm.id} className="text-sm text-gray-600">{lm.name}{lm.constituency ? ` — ${lm.constituency}` : ''}</p>
          ))}
          {landmarks.length === 0 && <p className="text-sm text-gray-400">No landmarks added yet.</p>}
        </div>
      </section>

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

      {/* New ambulance applications */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-lg text-gray-900">New Applications</h2>
        {applications.filter((a) => a.status === 'pending').length === 0 && (
          <p className="text-sm text-gray-500">No pending applications.</p>
        )}
        {applications.filter((a) => a.status === 'pending').map((a) => (
          <div key={a.id} className="border-b last:border-0 py-3 text-sm space-y-2">
            <p className="font-medium text-gray-900">{a.mp_name} — {a.constituency}</p>
            <p className="text-gray-600">Driver: {a.driver_name} ({a.driver_phone}) — Plate: {a.plate}</p>
            {(a.sponsor_phone || a.sponsor_email) && (
              <p className="text-gray-500">Sponsor contact: {a.sponsor_phone}{a.sponsor_phone && a.sponsor_email ? ' — ' : ''}{a.sponsor_email}</p>
            )}
            <div className="flex gap-2">
              <button className="bg-green-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => approveApplication(a.id)}>Approve</button>
              <button className="bg-gray-200 text-gray-800 rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => rejectApplication(a.id)}>Reject</button>
            </div>
          </div>
        ))}
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
                <th className="py-2 pr-4">Driver Link</th>
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
                      <div className="flex gap-1 mt-1">
                        <button className="text-xs text-green-700 underline" onClick={() => setAmbulanceStatus(a.id, 'available')}>Set Available</button>
                        <button className="text-xs text-gray-500 underline" onClick={() => setAmbulanceStatus(a.id, 'offline')}>Set Offline</button>
                      </div>
                      <div className="flex gap-1 mt-1 items-center">
                        <input
                          className="border border-gray-300 rounded px-1.5 py-0.5 text-xs w-20"
                          placeholder={a.access_pin ? '••••' : 'Set PIN'}
                          defaultValue=""
                          id={`pin-${a.id}`}
                        />
                        <button
                          className="text-xs text-blue-700 underline"
                          onClick={() => {
                            const el = document.getElementById(`pin-${a.id}`) as HTMLInputElement;
                            setPin(a.id, el.value);
                            el.value = '';
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      {sub ? (
                        <span className={active ? 'text-green-700' : 'text-red-600'}>
                          {active ? 'Active' : 'Expired'} until {sub.period_end}
                        </span>
                      ) : <span className="text-red-600">No subscription</span>}
                    </td>
                    <td className="py-2 pr-4">
                      <button className="text-xs text-blue-700 font-medium" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/driver/${a.id}`)}>Copy Link</button>
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
