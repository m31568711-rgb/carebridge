import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, type Locale } from '@/src/i18n/config';
import { getSupabasePublicEnv } from '@/src/lib/env/public';

const PUBLIC_FILE = /\.[^/]+$/;

function preferredLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get('carebridge-locale')?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;

  const acceptedLanguage = request.headers.get('accept-language')?.toLowerCase() ?? '';
  if (acceptedLanguage.startsWith('ar')) return 'ar';
  if (acceptedLanguage.startsWith('fr')) return 'fr';
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (!firstSegment || !isLocale(firstSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLocale(request)}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-carebridge-locale', firstSegment);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const env = getSupabasePublicEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|og.png).*)'],
};
