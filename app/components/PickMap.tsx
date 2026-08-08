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

interface PickMapProps {
  center: [number, number];
  onPick: (pos: [number, number]) => void;
}

export default function PickMap({ center, onPick }: PickMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current).setView(center, 13);
    leafletMap.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.marker(e.latlng, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const ll = markerRef.current!.getLatLng();
          onPick([ll.lat, ll.lng]);
        });
      }
      onPick([e.latlng.lat, e.latlng.lng]);
    });
  }, []);

  return <div ref={mapRef} style={{ height: '280px', width: '100%', borderRadius: '12px', overflow: 'hidden' }} />;
}
