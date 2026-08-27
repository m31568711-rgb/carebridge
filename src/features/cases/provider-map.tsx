import type { Locale } from '@/src/i18n/config';
import type { ProviderSearchRecord } from './data';
import { localized } from './data';
import type { CaseDictionary } from './messages';

const zoom = 2;
const tileCount = 2 ** zoom;
const tileTemplate = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function markerPosition(latitude: number, longitude: number) {
  const lat = Math.max(-85.0511, Math.min(85.0511, latitude));
  const radians = lat * Math.PI / 180;
  return { left: `${((longitude + 180) / 360) * 100}%`, top: `${(1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2 * 100}%` };
}

export function ProviderMap({ locale, copy, rows }: { locale: Locale; copy: CaseDictionary; rows: ProviderSearchRecord[] }) {
  const mapped = rows.filter((row): row is ProviderSearchRecord & { latitude: number; longitude: number } => row.latitude != null && row.longitude != null);
  return <div className="relative mt-5 aspect-[16/10] min-h-[30rem] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" aria-label={copy.discovery.map}>
    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4" aria-hidden="true">{Array.from({ length: tileCount * tileCount }, (_, index) => { const x = index % tileCount; const y = Math.floor(index / tileCount); const url = tileTemplate.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y)); return <div className="bg-cover bg-center" key={`${x}-${y}`} style={{ backgroundImage: `url(${JSON.stringify(url)})` }} />; })}</div>
    <div className="absolute inset-0 bg-blue-950/5" aria-hidden="true" />
    {mapped.map((row) => <button className="group absolute z-10 -translate-x-1/2 -translate-y-full text-start" key={`${row.provider_type}-${row.provider_id}-${row.location_id}`} style={markerPosition(row.latitude, row.longitude)} title={localized(row.name_i18n, locale)} type="button"><span className="block size-5 rounded-full border-4 border-white bg-blue-700 shadow-lg transition group-hover:scale-125" /><span className="mt-1 hidden max-w-48 rounded-lg bg-white px-3 py-2 text-xs shadow-xl group-focus:block group-hover:block"><strong className="block">{localized(row.name_i18n, locale)}</strong><span className="text-slate-500">{copy.discovery.types[row.provider_type]}{row.distance_km != null ? ` · ${Number(row.distance_km).toFixed(1)} ${copy.discovery.distance}` : ''}</span></span></button>)}
    {mapped.length === 0 ? <p className="absolute inset-0 z-10 grid place-items-center bg-white/80 p-8 text-center text-sm text-slate-600">{copy.discovery.mapUnavailable}</p> : null}
    <a className="absolute bottom-1 end-1 z-20 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600" href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap contributors</a>
  </div>;
}
