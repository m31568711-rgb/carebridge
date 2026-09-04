'use client';

import { useRouter, useSearchParams } from '@/src/react-app/compat/navigation';
import { useState } from 'react';
import { LocateFixed, Map, Rows3 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { Locale } from '@/src/i18n/config';
import type { ProviderSearchRecord, SelectOption } from './data';
import { localized } from './data';
import type { CaseDictionary } from './messages';
import { ProviderMap } from './provider-map';

export function ProviderDiscovery({ locale, copy, rows, options, total }: { locale: Locale; copy: CaseDictionary; rows: ProviderSearchRecord[]; options: { specialties: SelectOption[]; countries: SelectOption[]; cities: SelectOption[] }; total: number }) {
  const router = useRouter(); const params = useSearchParams(); const [view, setView] = useState<'list' | 'map'>('list'); const [locationMessage, setLocationMessage] = useState('');
  function useLocation() { if (!navigator.geolocation) return setLocationMessage(copy.discovery.locationDenied); navigator.geolocation.getCurrentPosition(({ coords }) => { const next = new URLSearchParams(params); next.set('lat', String(coords.latitude)); next.set('lng', String(coords.longitude)); router.push(`?${next}`); setLocationMessage(copy.discovery.locationReady); }, () => setLocationMessage(copy.discovery.locationDenied)); }
  return <div>
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3 xl:grid-cols-7">
      <input className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm xl:col-span-2" defaultValue={params.get('q') ?? ''} name="q" placeholder={copy.discovery.query} />
      <select className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" defaultValue={params.get('type') ?? ''} name="type"><option value="">{copy.discovery.allTypes}</option>{Object.entries(copy.discovery.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" defaultValue={params.get('country') ?? ''} name="country"><option value="">{copy.discovery.country}</option>{options.countries.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <select className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" defaultValue={params.get('city') ?? ''} name="city"><option value="">{copy.discovery.city}</option>{options.cities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <select className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" defaultValue={params.get('specialty') ?? ''} name="specialty"><option value="">{copy.discovery.specialty}</option>{options.specialties.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <Button type="submit">{copy.discovery.apply}</Button>
    </form>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-700">{total} {copy.discovery.results}</p><div className="flex gap-2"><Button onClick={useLocation} type="button" variant="outline"><LocateFixed className="size-4" />{copy.discovery.useLocation}</Button><Button onClick={() => setView('list')} type="button" variant={view === 'list' ? 'primary' : 'outline'}><Rows3 className="size-4" />{copy.discovery.list}</Button><Button onClick={() => setView('map')} type="button" variant={view === 'map' ? 'primary' : 'outline'}><Map className="size-4" />{copy.discovery.map}</Button></div></div>{locationMessage ? <p className="mt-3 text-sm text-slate-600" role="status">{locationMessage}</p> : null}
    {view === 'list' ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={`${row.provider_type}-${row.provider_id}-${row.location_id}`}><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{copy.discovery.types[row.provider_type]}</span><span className="text-xs font-semibold text-emerald-700">{copy.discovery.verified}</span></div><h2 className="mt-4 text-lg font-semibold">{localized(row.name_i18n, locale)}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{localized(row.description_i18n, locale)}</p>{row.distance_km != null ? <p className="mt-4 text-sm font-semibold text-blue-700">{Number(row.distance_km).toFixed(1)} {copy.discovery.distance}</p> : null}</article>)}{rows.length === 0 ? <p className="rounded-2xl bg-white p-8 text-sm text-slate-600 md:col-span-2">{copy.discovery.noResults}</p> : null}</div> : <ProviderMap copy={copy} locale={locale} rows={rows} />}
  </div>;
}
