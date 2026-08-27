import Link from 'next/link';
import type { ReactNode } from 'react';
import { Menu, UserRound } from 'lucide-react';
import type { PortalKey } from '@/src/config/roles';
import type { Locale } from '@/src/i18n/config';
import type { Dictionary } from '@/src/i18n/messages/en';
import type { AuthContext } from '@/src/types/domain';
import { Brand } from '@/src/components/brand';
import { LanguageSelector } from '@/src/components/language-selector';
import { Badge } from '@/src/components/ui/badge';
import { SignOutButton } from '@/src/features/auth/sign-out-button';
import { NotificationIndicator } from '@/src/features/notifications/notification-indicator';
import { getPortalConfig } from './config';

interface DashboardShellProps {
  portal: PortalKey;
  locale: Locale;
  dictionary: Dictionary;
  context: AuthContext;
  children: ReactNode;
}

export function DashboardShell({ portal, locale, dictionary, context, children }: DashboardShellProps) {
  const config = getPortalConfig(portal, dictionary);
  const displayName = context.profile?.displayName
    || [context.profile?.firstName, context.profile?.lastName].filter(Boolean).join(' ')
    || context.email
    || dictionary.common.profile;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col border-e border-slate-200 bg-white p-5 lg:flex">
        <div className="px-2 py-2"><Brand href={`/${locale}`} name={dictionary.common.brand} /></div>
        <div className="mt-8 rounded-2xl bg-blue-50 p-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white"><config.icon aria-hidden="true" className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{config.title}</p><Badge className="mt-1" variant="green">{dictionary.common.statuses.active}</Badge></div></div></div>
        <nav aria-label={dictionary.common.dashboard} className="mt-7 flex-1 space-y-1">
          {config.navigation.map((item) => {
            const active = 'active' in item && item.active;
            return <span aria-current={active ? 'page' : undefined} aria-disabled={!active} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' : 'cursor-default text-slate-500'}`} key={item.label}><item.icon aria-hidden="true" className="size-5" />{item.label}{!active ? <span className="ms-auto size-1.5 rounded-full bg-slate-200" /> : null}</span>;
          })}
        </nav>
        <div className="border-t border-slate-100 pt-5"><Link className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100" href={`/${locale}`}><Menu aria-hidden="true" className="size-4" />{dictionary.auth.shared.returnHome}</Link></div>
      </aside>

      <div className="lg:ps-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
            <div className="lg:hidden"><Brand compact href={`/${locale}`} name={dictionary.common.brand} /></div>
            <div className="hidden lg:block"><p className="text-sm font-semibold text-slate-950">{dictionary.dashboard.greeting}</p><p className="mt-0.5 text-xs text-slate-500">{dictionary.dashboard.lastUpdated}</p></div>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSelector compact locale={locale} labels={dictionary.language} />
              <NotificationIndicator copy={dictionary.notifications} locale={locale} />
              <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex"><span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><UserRound aria-hidden="true" className="size-4" /></span><div className="max-w-36"><p className="truncate text-xs font-semibold text-slate-900">{displayName}</p><p className="truncate text-[11px] text-slate-500">{context.email}</p></div></div>
              <div className="hidden xl:block"><SignOutButton label={dictionary.common.signOut} locale={locale} /></div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto border-t border-slate-200 px-5 py-3 lg:hidden">
            {config.navigation.map((item) => <span className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${'active' in item && item.active ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`} key={item.label}><item.icon aria-hidden="true" className="size-4" />{item.label}</span>)}
          </div>
        </header>
        <main className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10" id="main-content">{children}</main>
      </div>
    </div>
  );
}
