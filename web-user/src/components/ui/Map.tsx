'use client';

import { useEffect, useRef } from 'react';

interface Props {
  lat:      number | null;
  lng:      number | null;
  onChange:  (lat: number, lng: number) => void;
}

export function Map({ lat, lng, onChange }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const markerRef   = useRef<any>(null);
  const isInitializingRef = useRef<boolean>(false); // Pengunci agar tidak double-init

  const onChangeRef = useRef(onChange); 
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 1. Load Leaflet CSS secara dinamis
  useEffect(() => {
    if (document.querySelector('link[data-leaflet]')) return;
    const link       = document.createElement('link');
    link.rel         = 'stylesheet';
    link.href        = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', '1');
    document.head.appendChild(link);
  }, []);

  // 2. Inisialisasi Peta
  useEffect(() => {
    if (!mapRef.current || instanceRef.current || isInitializingRef.current) return;

    isInitializingRef.current = true;

    import('leaflet').then((L) => {
      // Pastikan elemen wadah peta masih ada saat library selesai di-load
      if (!mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const defaultCenter: [number, number] = [-6.3901, 106.8217]; // Depok default
      const initialCenter: [number, number] = lat !== null && lng !== null ? [lat, lng] : defaultCenter;

      const map = L.map(mapRef.current, {
        center:          initialCenter,
        zoom:            14,
        zoomControl:     true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      // Jika koordinat awal sudah ada dari props
      if (lat !== null && lng !== null) {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          onChangeRef.current(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }

      // Event klik peta untuk memindahkan / membuat marker baru
      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          const newMarker = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
          newMarker.on('dragend', (ev: any) => {
            const pos = ev.target.getLatLng();
            onChangeRef.current(pos.lat, pos.lng);
          });
          markerRef.current = newMarker;
        }

        onChangeRef.current(clickLat, clickLng);
      });

      instanceRef.current = map;
    }).catch(err => {
      console.error("Gagal memuat Leaflet:", err);
    }).finally(() => {
      isInitializingRef.current = false;
    });

    // Cleanup yang aman dari tumpang tindih async
    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
        markerRef.current   = null;
      }
    };
  }, []);

  // 3. Sinkronisasi perubahan koordinat dari luar (misal tombol "Gunakan Lokasi Saat Ini")
  useEffect(() => {
    if (!instanceRef.current || lat === null || lng === null) return;

    const currentCenter = instanceRef.current.getCenter();
    const isDifferent = Math.abs(currentCenter.lat - lat) > 0.0001 || Math.abs(currentCenter.lng - lng) > 0.0001;

    if (isDifferent) {
      instanceRef.current.setView([lat, lng], 15);
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      import('leaflet').then((L) => {
        if (!instanceRef.current) return; // Guard jika map diclose saat load
        const newMarker = L.marker([lat, lng], { draggable: true }).addTo(instanceRef.current);
        newMarker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          onChangeRef.current(pos.lat, pos.lng);
        });
        markerRef.current = newMarker;
      });
    }
  }, [lat, lng]);

  return (
    <div
      ref={mapRef}
      style={{ height: '220px', width: '100%', borderRadius: '12px' }}
      className="border border-surface-border overflow-hidden z-0"
    />
  );
} 