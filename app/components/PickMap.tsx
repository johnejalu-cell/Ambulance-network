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
  flyToPosition?: [number, number] | null;
}

export default function PickMap({ center, onPick, flyToPosition }: PickMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const placeMarker = (latlng: L.LatLng) => {
    if (!leafletMap.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      markerRef.current = L.marker(latlng, { draggable: true }).addTo(leafletMap.current);
      markerRef.current.on('dragend', () => {
        const ll = markerRef.current!.getLatLng();
        onPick([ll.lat, ll.lng]);
      });
    }
  };

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current).setView(center, 13);
    leafletMap.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng);
      onPick([e.latlng.lat, e.latlng.lng]);
    });
  }, []);

  useEffect(() => {
    if (!flyToPosition || !leafletMap.current) return;
    const latlng = L.latLng(flyToPosition[0], flyToPosition[1]);
    leafletMap.current.flyTo(latlng, 15);
    placeMarker(latlng);
  }, [flyToPosition]);

  return <div ref={mapRef} style={{ height: '280px', width: '100%', borderRadius: '12px', overflow: 'hidden' }} />;
}
