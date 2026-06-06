import { useState, useCallback } from 'react';

export function useReverseGeocode() {
  const [loading, setLoading] = useState(false);

  const geocode = useCallback(async (
    lat: number,
    lng: number
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`,
        { headers: { 'User-Agent': 'PasifikWasteApp/1.0' } }
      );
      if (!res.ok) return null;
      const data = await res.json();

      // Build a readable Indonesian address
      const addr = data.address ?? {};
      const parts = [
        addr.road,
        addr.neighbourhood || addr.suburb,
        addr.city_district || addr.village,
        addr.city || addr.town || addr.county,
        addr.state,
      ].filter(Boolean);

      return parts.length > 0 ? parts.join(', ') : data.display_name ?? null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { geocode, loading };
}