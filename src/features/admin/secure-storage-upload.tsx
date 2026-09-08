'use client';

import { useRef, useState } from 'react';
import { FileCheck2, UploadCloud } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import type { AdminModuleKey } from './config';
import type { AdminDictionary } from './messages';

interface SecureStorageUploadProps {
  accept?: string;
  bucket: 'provider-public' | 'provider-private';
  existingValue: string;
  fieldName: string;
  module: AdminModuleKey;
  recordId?: string;
  copy: AdminDictionary['common'];
}

const moduleKinds: Partial<Record<AdminModuleKey, string>> = { hospitals: 'hospital', doctors: 'doctor', pharmacies: 'pharmacy' };

function safeFilename(name: string) {
  const parts = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').split('.');
  const extension = parts.length > 1 ? `.${parts.pop()}` : '';
  return `${parts.join('.').slice(0, 60) || 'file'}${extension}`;
}

export function SecureStorageUpload({ accept, bucket, copy, existingValue, fieldName, module, recordId }: SecureStorageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(existingValue);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function upload(file: File) {
    setStatus('uploading');
    setMessage('');
    const maxBytes = bucket === 'provider-private' ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    const allowed = (accept ?? '').split(',').filter(Boolean);
    if (file.size > maxBytes || (allowed.length && !allowed.includes(file.type))) {
      setStatus('error'); setMessage(copy.uploadInvalid); return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setStatus('error'); setMessage(copy.uploadUnavailable); return; }

    const form = inputRef.current?.closest('form');
    const providerType = moduleKinds[module] ?? String((form?.elements.namedItem('provider_type') as HTMLSelectElement | null)?.value ?? '').toLowerCase();
    const providerId = recordId ?? String((form?.elements.namedItem('provider_id') as HTMLInputElement | null)?.value ?? '');
    if (!providerType || !providerId) { setStatus('error'); setMessage(copy.uploadProviderFirst); return; }

    const objectPath = `${providerType}/${providerId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    const { error } = await supabase.storage.from(bucket).upload(objectPath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (error) { setStatus('error'); setMessage(copy.uploadFailed); return; }
    setPath(objectPath); setStatus('success'); setMessage(file.name);
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[#bfd3df] bg-[#f7fafc] p-3">
      <input name={fieldName} type="hidden" value={path} />
      <input accept={accept} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} ref={inputRef} type="file" />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={status === 'uploading'} onClick={() => inputRef.current?.click()} size="sm" type="button" variant="outline">
          <UploadCloud aria-hidden="true" className="size-4" />{status === 'uploading' ? copy.uploading : copy.chooseFile}
        </Button>
        {path ? <span className="inline-flex min-w-0 items-center gap-2 text-xs text-[#53697b]"><FileCheck2 className="size-4 shrink-0 text-[#217a5b]" /><span className="truncate">{message || copy.fileAttached}</span></span> : null}
      </div>
      {status === 'error' ? <p className="mt-2 text-xs text-[#a43547]" role="alert">{message}</p> : null}
    </div>
  );
}
