'use client';

import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface Props {
  lat: number;
  lng: number;
  address?: string | null;
}

export function ReportMap({ lat, lng, address }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // inisialisasi dan update peta saat lat/lng berubah
  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true;
    let map: any = null;

    async function initMap() {
      const L = (await import('leaflet')).default;
      
      if (!isMounted) return;

      if (!instanceRef.current) {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        map = L.map(mapRef.current!, {
          center:          [lat, lng],
          zoom:            15,
          zoomControl:     true,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([lat, lng]).addTo(map);
        if (address) marker.bindPopup(address).openPopup();

        instanceRef.current = map;
        markerRef.current = marker;
      } else {
        instanceRef.current.setView([lat, lng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          if (address) markerRef.current.bindPopup(address).openPopup();
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng, address]);

  useEffect(() => {
    const linkId = 'leaflet-css-bundle';
    if (document.getElementById(linkId)) return;

    const link = document.createElement('link');
    link.id    = linkId;
    link.rel   = 'stylesheet';
    link.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    
    return () => {
      const el = document.getElementById(linkId);
      if (el) document.head.removeChild(el);
    };
  }, []);

  return (
    <div className="rounded-xl overflow-hidden border border-surface-border">
      <div
        ref={mapRef}
        style={{ height: '220px', width: '100%' }}
        className="z-0"
      />
      {address && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-surface-overlay border-t border-surface-border">
          <MapPin size={12} className="text-brand mt-0.5 flex-shrink-0" />
          <p className="text-xs text-ink-muted leading-relaxed">{address}</p>
        </div>
      )}
    </div>
  );
}