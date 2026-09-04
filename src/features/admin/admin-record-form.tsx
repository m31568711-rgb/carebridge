'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from '@/src/react-app/compat/navigation';
import Link from '@/src/react-app/compat/link';
import { Save } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { FormField } from '@/src/components/ui/form-field';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import type { Locale } from '@/src/i18n/config';
import { saveAdminRecord, type AdminActionState } from './actions';
import type { AdminModuleDefinition } from './config';
import type { LookupMap } from './data';
import { formatEnum } from './format';
import type { AdminDictionary } from './messages';
import { getInitialFieldValue } from './validation';
import { SecureStorageUpload } from './secure-storage-upload';
import { AddressLocationPicker } from '@/src/components/location/address-location-picker';

interface Props { copy: AdminDictionary; definition: AdminModuleDefinition; locale: Locale; lookups: LookupMap; record: Record<string, unknown> | null; }

export function AdminRecordForm({ copy, definition, locale, lookups, record }: Props) {
  const initialAdminActionState: AdminActionState = { status: 'idle' };
  const [state, action, pending] = useActionState(saveAdminRecord, initialAdminActionState);
  const router = useRouter();
  useEffect(() => { if (state.status === 'success') router.refresh(); }, [router, state.status]);
  const recordId = definition.idFields.length === 1 ? String(record?.[definition.idFields[0]] ?? '') : '';
  const [countryId, setCountryId] = useState(String(record?.country_id ?? ''));
  const [cityId, setCityId] = useState(String(record?.city_id ?? ''));

  return (
    <Card className="mb-7" variant="form">
      <CardHeader>
        <h2 className="type-h3 text-[var(--foreground)]">{record ? copy.common.editTitle : copy.common.createTitle}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{copy.common.formDescription}</p>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-5 sm:grid-cols-2">
          <input name="module" type="hidden" value={definition.key} />
          <input name="locale" type="hidden" value={locale} />
          {recordId ? <input name="record_id" type="hidden" value={recordId} /> : null}
          {definition.fields.map((field) => {
            const initial = getInitialFieldValue(record, field);
            const defaultValue = typeof initial === 'string' && initial ? initial : field.type === 'select' && field.options ? field.options[0] ?? '' : '';
            const error = state.fieldErrors?.[field.name] ? copy.common.failed : undefined;
            const fullWidth = field.type === 'textarea' || field.type === 'json' || field.type === 'storage';
            if (field.name === 'address_en') return <AddressLocationPicker address={String(initial)} addressLabel={copy.fields.addressEn} addressName="address_en" key={field.name} latitude={record?.latitude as string | number | null} longitude={record?.longitude as string | number | null} placeId={record?.google_place_id as string | null} />;
            if (['address_fr','address_ar'].includes(field.name)) return <input key={field.name} name={field.name} type="hidden" value={String(initial)} />;
            if (['google_place_id','latitude','longitude'].includes(field.name)) return null;
            return (
              <FormField className={fullWidth ? 'sm:col-span-2' : undefined} error={error} id={field.name} key={field.name} label={copy.fields[field.label]} required={field.required}>
                {field.type === 'textarea' || field.type === 'json' ? (
                  <Textarea aria-invalid={Boolean(error)} defaultValue={String(initial)} dir={field.name.endsWith('_ar') ? 'rtl' : undefined} id={field.name} name={field.name} required={field.required} />
                ) : field.type === 'select' ? (
                  <Select aria-invalid={Boolean(error)} defaultValue={field.name==='country_id'||field.name==='city_id'?undefined:defaultValue} disabled={field.name==='city_id'&&!countryId} id={field.name} name={field.name} onChange={field.name==='country_id'?(event)=>{setCountryId(event.target.value);setCityId('');}:field.name==='city_id'?(event)=>setCityId(event.target.value):undefined} required={field.required} value={field.name==='country_id'?countryId:field.name==='city_id'?cityId:undefined}>
                    {!field.required ? <option value="">—</option> : null}
                    {(field.lookup ? lookups[field.lookup] ?? [] : field.options?.map((value) => ({ value, label: formatEnum(value, locale) })) ?? []).filter((option)=>field.lookup!=='cities'||!countryId||('countryId' in option&&option.countryId===countryId)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                ) : field.type === 'boolean' ? (
                  <label className="flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[#f7fafc] px-3.5 text-sm text-[var(--foreground)]">
                    <input defaultChecked={Boolean(initial)} name={field.name} type="checkbox" value="true" /><span>{copy.fields[field.label]}</span>
                  </label>
                ) : field.type === 'storage' && field.bucket ? (
                  <SecureStorageUpload accept={field.accept} bucket={field.bucket} copy={copy.common} existingValue={String(initial)} fieldName={field.name} module={definition.key} recordId={recordId || undefined} />
                ) : (
                  <Input aria-invalid={Boolean(error)} defaultValue={String(initial)} id={field.name} max={field.max} min={field.min} name={field.name} required={field.required} step={field.step} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'} />
                )}
              </FormField>
            );
          })}
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5 sm:col-span-2">
            <Button loading={pending} type="submit"><Save aria-hidden="true" className="size-4" />{pending ? copy.common.saving : copy.common.save}</Button>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-semibold text-[#53697b] transition hover:bg-[#edf3f7] hover:text-[var(--foreground)]" href={`/${locale}/admin/${definition.key}`}>{copy.common.cancel}</Link>
            {state.status === 'success' ? <p className="text-sm font-medium text-[#217a5b]" role="status">{copy.common.saved}</p> : null}
            {state.status === 'error' && !Object.keys(state.fieldErrors ?? {}).length ? <p className="text-sm text-[#a43547]" role="alert">{copy.common.failed}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
