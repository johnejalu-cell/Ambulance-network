import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-6 max-w-md mx-auto space-y-4 text-center">
      <h1 className="text-2xl font-bold">Ambulance Network</h1>
      <p className="text-gray-600">Uganda's shared MP ambulance dispatch platform.</p>
      <Link href="/request" className="block w-full bg-red-600 text-white rounded p-4 text-lg font-semibold">
        Request an Ambulance
      </Link>
    </main>
  );
}
