'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, CheckCheck } from 'lucide-react';
import type { Dictionary } from '@/src/i18n/messages/en';
import type { Locale } from '@/src/i18n/config';
import type { PortalKey } from '@/src/config/roles';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import type { NotificationRecord } from '@/src/types/domain';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/ui/empty-state';
import { notificationHref, notificationText } from './notification-copy';

export function NotificationCenter({ copy, locale, portal }: { copy: Dictionary['notifications']; locale: Locale; portal: PortalKey }) {
  const [records, setRecords] = useState<NotificationRecord[]>([]);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase.from('notifications').select('*').eq('recipient_id', userData.user.id).order('created_at', { ascending: false }).limit(50);
    setRecords((data ?? []) as NotificationRecord[]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function markAllRead() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const ids = records.filter((record) => !record.read_at).map((record) => record.id);
    if (ids.length > 0) await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    await load();
  }

  if (records.length === 0) return <EmptyState description={copy.emptyDescription} icon={BellRing} title={copy.emptyTitle} />;

  return (
    <Card>
      <CardContent>
        <div className="mb-5 flex justify-end"><Button onClick={markAllRead} type="button" variant="subtle"><CheckCheck aria-hidden="true" className="size-4" />{copy.markAllRead}</Button></div>
        <ul className="divide-y divide-slate-100">{records.map((record) => {const value=notificationText(record,locale,copy);return <li key={record.id}><Link className="flex gap-4 py-5 first:pt-0 last:pb-0" href={notificationHref(record,locale,portal)}><span className={`mt-2 size-2 shrink-0 rounded-full ${record.read_at ? 'bg-slate-200' : 'bg-blue-600'}`} /><div><p className="font-semibold text-slate-950">{value.title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{value.message}</p><p className="mt-2 text-xs text-slate-400">{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(record.created_at))}</p></div></Link></li>})}</ul>
      </CardContent>
    </Card>
  );
}
