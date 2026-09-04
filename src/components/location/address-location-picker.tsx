'use client';

import { useEffect, useRef, useState } from 'react';

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: Record<string, unknown>) => { setCenter(value: { lat: number; lng: number }): void };
        Marker: new (options: Record<string, unknown>) => { setPosition(value: { lat: number; lng: number }): void };
        places: { Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => { addListener(event: string, listener: () => void): void; getPlace(): { formatted_address?: string; place_id?: string; geometry?: { location?: { lat(): number; lng(): number } } } } };
      };
    };
  }
}

let mapsLoader: Promise<void> | null = null;
function loadMaps(apiKey: string) {
  if (window.google?.maps?.places) return Promise.resolve();
  if (!mapsLoader) mapsLoader = new Promise((resolve, reject) => {
    const callback = `careBridgeMapsReady${Date.now()}`;
    (window as unknown as Record<string, unknown>)[callback] = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${callback}`;
    script.async = true; script.defer = true; script.onerror = () => reject(new Error('maps'));
    document.head.appendChild(script);
  });
  return mapsLoader;
}

interface Props {
  addressName: string;
  detailsName?: string;
  placeIdName?: string;
  latitudeName?: string;
  longitudeName?: string;
  addressLabel: string;
  detailsLabel?: string;
  address?: string | null;
  details?: string | null;
  placeId?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  disabled?: boolean;
  required?: boolean;
}

export function AddressLocationPicker(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [placeId, setPlaceId] = useState(String(props.placeId ?? ''));
  const [latitude, setLatitude] = useState(String(props.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(props.longitude ?? ''));
  const apiKey = (import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';

  useEffect(() => {
    if (!apiKey || props.disabled || !inputRef.current || !mapRef.current) return;
    let cancelled = false;
    void loadMaps(apiKey).then(() => {
      if (cancelled || !window.google || !inputRef.current || !mapRef.current) return;
      const center = { lat: Number(latitude) || 30.0444, lng: Number(longitude) || 31.2357 };
      const map = new window.google.maps.Map(mapRef.current, { center, zoom: latitude && longitude ? 15 : 6, mapTypeControl: false, streetViewControl: false });
      const marker = new window.google.maps.Marker({ map, position: latitude && longitude ? center : undefined });
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, { fields: ['formatted_address', 'geometry', 'place_id'] });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace(); const location = place.geometry?.location;
        if (!location) return;
        const next = { lat: location.lat(), lng: location.lng() };
        inputRef.current!.value = place.formatted_address ?? inputRef.current!.value;
        setPlaceId(place.place_id ?? ''); setLatitude(String(next.lat)); setLongitude(String(next.lng));
        map.setCenter(next); marker.setPosition(next);
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [apiKey, latitude, longitude, props.disabled]);

  return <div className="grid gap-4 sm:col-span-2">
    <label className="grid gap-2 text-sm font-semibold">{props.addressLabel}<input ref={inputRef} className={inputClass} defaultValue={props.address ?? ''} disabled={props.disabled} maxLength={500} name={props.addressName} required={props.required} /></label>
    <input name={props.placeIdName ?? 'google_place_id'} type="hidden" value={placeId} />
    <input name={props.latitudeName ?? 'latitude'} type="hidden" value={latitude} />
    <input name={props.longitudeName ?? 'longitude'} type="hidden" value={longitude} />
    {apiKey && !props.disabled ? <div aria-label={props.addressLabel} className="h-56 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" ref={mapRef} /> : null}
    {props.detailsName && props.detailsLabel ? <label className="grid gap-2 text-sm font-semibold">{props.detailsLabel}<input className={inputClass} defaultValue={props.details ?? ''} disabled={props.disabled} maxLength={500} name={props.detailsName} /></label> : null}
  </div>;
}
