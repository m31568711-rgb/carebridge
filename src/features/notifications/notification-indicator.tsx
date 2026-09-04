'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '@/src/react-app/compat/link';
import { Bell, CheckCheck } from 'lucide-react';
import type { Locale } from '@/src/i18n/config';
import type { PortalKey } from '@/src/config/roles';
import type { Dictionary } from '@/src/i18n/messages/en';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import type { NotificationRecord } from '@/src/types/domain';
import { EmptyState } from '@/src/components/ui/empty-state';
import { notificationHref, notificationText } from './notification-copy';

interface NotificationIndicatorProps {
  locale: Locale;
  copy: Dictionary['notifications'];
  portal: PortalKey;
}
export function NotificationIndicator({ locale, copy, portal }: NotificationIndicatorProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('notifications')
      .select('id, recipient_id, type, title_key, message_key, data, related_entity_type, related_entity_id, read_at, created_at')
      .eq('recipient_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setNotifications((data ?? []) as NotificationRecord[]);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    if (!supabase) return () => window.clearTimeout(initialLoad);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      channel = supabase
        .channel(`notifications:${data.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${data.user.id}` }, () => void loadNotifications())
        .subscribe();
    });

    return () => {
      window.clearTimeout(initialLoad);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  async function markAllRead() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
    await loadNotifications();
  }

  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="relative" ref={containerRef}>
      <button aria-expanded={open} aria-label={copy.open} className="relative grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" onClick={() => setOpen((value) => !value)} type="button">
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 ? <span className="absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white" title={`${unread} ${copy.unreadCount}`}>{unread}</span> : null}
      </button>
      {open ? (
        <div className="fixed inset-x-4 top-20 z-40 max-h-[min(36rem,calc(100vh-6rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-14 sm:w-[24rem]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">{copy.title}</h2><button className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700" onClick={markAllRead} type="button"><CheckCheck aria-hidden="true" className="size-4" />{copy.markAllRead}</button></div>
          {notifications.length === 0 ? <div className="p-4"><EmptyState description={copy.emptyDescription} title={copy.emptyTitle} /></div> : (
            <ul className="divide-y divide-slate-100">{notifications.map((record) => { const value = notificationText(record, locale, copy); return <li key={record.id}><Link className="block p-5 hover:bg-slate-50" href={notificationHref(record,locale,portal)} onClick={()=>setOpen(false)}><div className="flex gap-3"><span className={`mt-1 size-2 shrink-0 rounded-full ${record.read_at ? 'bg-slate-200' : 'bg-blue-600'}`} /><div><p className="text-sm font-semibold text-slate-900">{value.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{value.message}</p><p className="mt-2 text-[11px] text-slate-400">{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(record.created_at))}</p></div></div></Link></li>; })}</ul>
          )}
          <Link className="block border-t border-slate-100 px-5 py-4 text-center text-sm font-semibold text-blue-700" href={`/${locale}/notifications`} onClick={() => setOpen(false)}>{copy.viewCenter}</Link>
        </div>
      ) : null}
    </div>
  );
}
