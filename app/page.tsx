import Link from 'next/link';

const nodes = [
  { x: 60, y: 40, label: 'Kampala Central' },
  { x: 320, y: 30, label: 'Jinja' },
  { x: 40, y: 220, label: 'Mbarara' },
  { x: 330, y: 230, label: 'Gulu' },
  { x: 190, y: 15, label: 'Mukono' },
  { x: 20, y: 130, label: 'Fort Portal' },
  { x: 350, y: 130, label: 'Soroti' },
  { x: 180, y: 250, label: 'Masaka' },
];

export default function Home() {
  return (
    <main className="bg-paper text-midnight font-body">
      {/* NAV */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <span className="font-display font-bold text-lg tracking-tight">Ambulance Network</span>
        <Link
          href="/request"
          className="bg-signal text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-signal/90 transition"
        >
          Request Ambulance
        </Link>
      </nav>

      {/* HERO */}
      <section className="bg-midnight text-paper relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <p className="font-mono text-amber text-xs tracking-widest uppercase mb-5">Uganda &middot; Emergency Dispatch</p>
            <h1 className="font-display font-bold text-4xl md:text-5xl leading-[1.08] tracking-tight">
              One call.<br />Every ambulance.<br />All of Uganda.
            </h1>
            <p className="text-paper/70 text-lg mt-6 max-w-md leading-relaxed">
              Uganda has ambulances — hundreds of them, bought by MPs for their constituencies.
              What it never had was a way to find the nearest one in an emergency. Now it does.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/request"
                className="bg-signal text-white font-semibold px-6 py-3.5 rounded-full hover:bg-signal/90 transition shadow-lg shadow-signal/20"
              >
                Request an Ambulance Now
              </Link>
              <span className="font-mono text-sm text-paper/50">no login &middot; no app download required</span>
            </div>
          </div>

          {/* SIGNATURE: radial network — many ambulances, one hub */}
          <div className="relative h-[300px] flex items-center justify-center" aria-hidden="true">
            <svg viewBox="0 0 380 280" className="w-full h-full">
              {nodes.map((n, i) => (
                <line
                  key={i}
                  x1={n.x}
                  y1={n.y}
                  x2="190"
                  y2="135"
                  stroke="#F2B705"
                  strokeOpacity="0.25"
                  strokeWidth="1"
                />
              ))}
              {nodes.map((n, i) => (
                <g key={i}>
                  <circle cx={n.x} cy={n.y} r="4" fill="#F2B705" className="animate-dotGlow" style={{ animationDelay: `${i * 0.2}s` }} />
                  <text x={n.x} y={n.y - 10} fontSize="9" fill="#FBFAF8" fillOpacity="0.45" fontFamily="var(--font-mono)" textAnchor="middle">
                    {n.label}
                  </text>
                </g>
              ))}
              <circle cx="190" cy="135" r="26" fill="none" stroke="#E23744" strokeWidth="1.5" className="animate-pulseRing" />
              <circle cx="190" cy="135" r="26" fill="none" stroke="#E23744" strokeWidth="1.5" className="animate-pulseRing" style={{ animationDelay: '1.2s' }} />
              <circle cx="190" cy="135" r="10" fill="#E23744" />
            </svg>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-4">The problem</p>
        <h2 className="font-display font-bold text-3xl md:text-4xl leading-tight max-w-2xl">
          In an emergency, most people don't have an ambulance number to call.
        </h2>
        <p className="text-slate text-lg mt-5 max-w-2xl leading-relaxed">
          Ambulances exist — but each one belongs to a different health center or constituency office,
          reachable only if you already happen to know its number, and only if it's free when you call.
          There has never been one number that reaches all of them.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-midnight text-paper">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <p className="font-mono text-amber text-xs tracking-widest uppercase mb-4">How it works</p>
          <div className="grid md:grid-cols-3 gap-10 mt-8">
            {[
              { n: '01', t: 'Request', d: 'Open the app, share your location and phone number. No account needed.' },
              { n: '02', t: 'Dispatch', d: 'The nearest available ambulance on the network — from any participating MP — is notified instantly.' },
              { n: '03', t: 'Track', d: 'Watch the ambulance approach in real time until it arrives.' },
            ].map((s) => (
              <div key={s.n}>
                <p className="font-mono text-signal text-2xl mb-3">{s.n}</p>
                <h3 className="font-display font-bold text-xl mb-2">{s.t}</h3>
                <p className="text-paper/60 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY MP AMBULANCES / TRUST */}
      <section className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-start">
        <div>
          <p className="font-mono text-signal text-xs tracking-widest uppercase mb-4">Built on what already exists</p>
          <h2 className="font-display font-bold text-3xl leading-tight">
            Every ambulance already belongs to someone who wants it used.
          </h2>
          <p className="text-slate text-lg mt-5 leading-relaxed">
            Members of Parliament across Uganda have bought ambulances for their constituents.
            Instead of each one sitting idle waiting for a local call, the network puts every
            participating ambulance on one map — so the closest one responds, no matter which
            constituency it belongs to.
          </p>
        </div>
        <div className="bg-paper border border-midnight/10 rounded-2xl p-8">
          <p className="font-mono text-xs tracking-widest uppercase text-slate mb-2">Flat, transparent fee</p>
          <p className="font-display font-bold text-3xl">No surge pricing. Ever.</p>
          <p className="text-slate mt-3 leading-relaxed">
            One fixed fee, paid directly to the driver. The price never changes because you're
            in an emergency — that would defeat the point.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-signal text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2 className="font-display font-bold text-3xl md:text-4xl">Know where your nearest ambulance is.</h2>
          <p className="text-white/80 mt-3 text-lg">Before you need one.</p>
          <Link
            href="/request"
            className="inline-block mt-8 bg-white text-signal font-semibold px-8 py-4 rounded-full hover:bg-white/90 transition"
          >
            Request an Ambulance Now
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center text-sm text-slate">
        <span>Ambulance Network — Uganda</span>
        <div className="flex gap-4">
          <Link href="/membership" className="hover:text-midnight transition">Priority Membership</Link>
          <Link href="/driver" className="hover:text-midnight transition">Driver login</Link>
          <Link href="/admin" className="hover:text-midnight transition">Admin</Link>
        </div>
      </footer>
    </main>
  );
}
