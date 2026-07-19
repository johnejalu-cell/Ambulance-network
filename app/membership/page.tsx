'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MembershipSignup() {
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [prices, setPrices] = useState<{ monthly: number; annual: number; fare: number } | null>(null);
  const [momo, setMomo] = useState<{ code: string; name: string }>({ code: '', name: '' });
  const [status, setStatus] = useState<'idle' | 'sent'>('idle');
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    supabase.from('platform_settings').select('membership_monthly_ugx, membership_annual_ugx, rider_fare_ugx, momo_merchant_code, momo_merchant_name').eq('id', 1).single()
      .then(({ data }) => {
        if (data) {
          setPrices({ monthly: data.membership_monthly_ugx, annual: data.membership_annual_ugx, fare: data.rider_fare_ugx });
          setMomo({ code: data.momo_merchant_code || '', name: data.momo_merchant_name || '' });
        }
      });
  }, []);

  const signUp = async () => {
    const res = await fetch('/api/membership/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderPhone: phone, plan }),
    });
    const data = await res.json();
    setAmount(data.amount);
    setStatus('sent');
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Priority Membership</h1>
      <p className="text-gray-600">Lock in today's fare and get priority handling on every request — no change to how you pay the driver.</p>

      {status === 'idle' && prices && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPlan('monthly')} className={`border rounded-xl p-4 text-left ${plan === 'monthly' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <p className="font-semibold">Monthly</p>
              <p className="text-sm text-gray-600">UGX {prices.monthly.toLocaleString()}</p>
            </button>
            <button onClick={() => setPlan('annual')} className={`border rounded-xl p-4 text-left ${plan === 'annual' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <p className="font-semibold">Annual</p>
              <p className="text-sm text-gray-600">UGX {prices.annual.toLocaleString()}</p>
            </button>
          </div>
          <p className="text-sm text-gray-500">Your fare will be locked at UGX {prices.fare.toLocaleString()} per trip, even if it rises later.</p>
          <input className="w-full border border-gray-300 rounded-lg p-3" placeholder="Your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="w-full bg-red-600 text-white rounded-lg p-4 font-semibold disabled:opacity-50" onClick={signUp} disabled={!phone}>
            Continue
          </button>
        </>
      )}

      {status === 'sent' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <p className="font-semibold text-gray-900">Pay UGX {amount.toLocaleString()} via MTN Mobile Money</p>
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-mono font-semibold text-gray-900 text-base">{momo.code || 'Not set yet'}</p>
            <p className="text-gray-500">{momo.name}</p>
            <p className="text-gray-500 pt-1">Dial <span className="font-mono">*165*3#</span>, choose "Pay Merchant," enter the code above.</p>
          </div>
          <p className="text-sm text-gray-600">Once paid, your membership activates after admin confirms — usually same day.</p>
        </div>
      )}
    </main>
  );
}
