'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from '@/src/react-app/compat/navigation';
import type { Locale } from '@/src/i18n/config';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import { clearAuthContextCache } from '@/src/lib/auth/context';

export function SignOutButton({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();

  async function signOut() {
    await getSupabaseBrowserClient()?.auth.signOut();
    clearAuthContextCache();
    router.replace(`/${locale}/login`);
    router.refresh();
  }

  return <button className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" onClick={signOut} type="button"><LogOut aria-hidden="true" className="size-4" />{label}</button>;
}
