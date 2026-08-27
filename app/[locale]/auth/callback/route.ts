import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@/src/i18n/config';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';

function safeNextPath(value: string | null, locale: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return `/${locale}/portal`;
  return value;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return NextResponse.redirect(new URL('/en/login', request.url));

  const code = request.nextUrl.searchParams.get('code');
  const next = safeNextPath(request.nextUrl.searchParams.get('next'), locale);
  const supabase = await getSupabaseServerClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL(`/${locale}/auth-error`, request.url));
}
