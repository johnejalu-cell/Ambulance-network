'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LiveMapProps {
  center: [number, number];
  markers: { position: [number, number]; label: string }[];
}

export default function LiveMap({ center, markers }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRefs = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    leafletMap.current = L.map(mapRef.current).setView(center, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(leafletMap.current);
  }, []);

  useEffect(() => {
    if (!leafletMap.current) return;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = markers.map((m) =>
      L.marker(m.position).addTo(leafletMap.current!).bindPopup(m.label)
    );
    if (markers.length) {
      const bounds = L.latLngBounds(markers.map((m) => m.position));
      leafletMap.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [markers]);

  return <div ref={mapRef} style={{ height: '320px', width: '100%', borderRadius: '12px', overflow: 'hidden' }} />;
}
