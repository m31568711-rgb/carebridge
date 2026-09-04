import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { defaultLocale, getLocaleDirection, isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';
import { ServiceWorkerRegistrar } from '@/src/features/pwa/service-worker-registrar';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import { NotFoundError } from './compat/navigation';
import { navigate, useLocationSnapshot } from './navigation-store';

type PageModule = { default: (props: Record<string, unknown>) => ReactNode | Promise<ReactNode> };
type LayoutModule = { default: (props: { children: ReactNode; params: Promise<Record<string, string>> }) => ReactNode | Promise<ReactNode> };
type Importer<T> = () => Promise<T>;

const pageModules = import.meta.glob('/app/**/page.tsx') as Record<string, Importer<PageModule>>;
const layoutModules = import.meta.glob('/app/**/layout.tsx') as Record<string, Importer<LayoutModule>>;

interface RouteDefinition {
  importer: Importer<PageModule>;
  pattern: RegExp;
  parameterNames: string[];
  score: number;
}

function routeFromFile(file: string): RouteDefinition | null {
  if (file === '/app/page.tsx') return null;
  const segments = file.replace(/^\/app\//, '').replace(/\/page\.tsx$/, '').split('/')
    .filter((segment) => !/^\(.+\)$/.test(segment));
  const parameterNames: string[] = [];
  let score = 0;
  const parts = segments.map((segment) => {
    const dynamic = segment.match(/^\[([^\]]+)\]$/);
    if (dynamic) {
      parameterNames.push(dynamic[1]);
      score += 1;
      return '([^/]+)';
    }
    score += 10;
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return { importer: pageModules[file], pattern: new RegExp(`^/${parts.join('/')}/?$`), parameterNames, score };
}

const routes = Object.keys(pageModules).map(routeFromFile).filter((route): route is RouteDefinition => Boolean(route))
  .sort((a, b) => b.score - a.score);

function matchRoute(pathname: string) {
  for (const route of routes) {
    const match = pathname.match(route.pattern);
    if (!match) continue;
    return {
      route,
      params: Object.fromEntries(route.parameterNames.map((name, index) => [name, decodeURIComponent(match[index + 1])])),
    };
  }
  return null;
}

function roleLayoutPath(portal?: string) {
  if (!portal || !['patient', 'doctor', 'provider', 'admin'].includes(portal)) return null;
  return `/app/[locale]/(portals)/${portal}/layout.tsx`;
}

async function renderCurrentRoute() {
  const url = new URL(window.location.href);
  const first = url.pathname.split('/').filter(Boolean)[0];
  if (!first || !isLocale(first)) {
    const preferred = localStorage.getItem('carebridge-locale') || document.cookie.match(/(?:^|; )carebridge-locale=([^;]+)/)?.[1];
    const locale = preferred && isLocale(preferred) ? preferred : (navigator.language.startsWith('ar') ? 'ar' : navigator.language.startsWith('fr') ? 'fr' : defaultLocale);
    navigate(`/${locale}${url.pathname === '/' ? '' : url.pathname}${url.search}`, true);
    return null;
  }

  if (url.pathname === `/${first}/auth/callback`) {
    const supabase = getSupabaseBrowserClient();
    const code = url.searchParams.get('code');
    if (supabase && code) await supabase.auth.exchangeCodeForSession(code);
    navigate(url.searchParams.get('next') || `/${first}/portal`, true);
    return null;
  }

  const match = matchRoute(url.pathname);
  if (!match) throw new NotFoundError();
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const page = await match.route.importer();
  let node = await page.default({ params: Promise.resolve(match.params), searchParams: Promise.resolve(searchParams) });
  const portal = url.pathname.split('/').filter(Boolean)[1];
  const layoutPath = roleLayoutPath(portal);
  if (layoutPath && layoutModules[layoutPath]) {
    const layout = await layoutModules[layoutPath]();
    node = await layout.default({ children: node, params: Promise.resolve(match.params) });
  }
  return node;
}

function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="text-center text-slate-600"><LoaderCircle className="mx-auto size-8 animate-spin text-blue-700" /><p className="mt-3 text-sm">CareBridge</p></div></div>;
}

function ErrorScreen({ notFound }: { notFound: boolean }) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-5"><div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><AlertTriangle className="mx-auto size-9 text-amber-600" /><h1 className="mt-4 text-xl font-semibold text-slate-950">{notFound ? 'Page not found' : 'This page could not load'}</h1><button className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white" onClick={() => navigate(`/${isLocale(location.pathname.split('/')[1]) ? location.pathname.split('/')[1] : 'en'}`)} type="button">CareBridge home</button></div></main>;
}

export function AppRouter() {
  const snapshot = useLocationSnapshot();
  const [view, setView] = useState<ReactNode>(<LoadingScreen />);
  const [error, setError] = useState<Error | null>(null);
  const pathname = snapshot.split('|')[0].split('?')[0];
  const locale = useMemo(() => {
    const value = pathname.split('/').filter(Boolean)[0];
    return isLocale(value) ? value : defaultLocale;
  }, [pathname]);

  useEffect(() => {
    let current = true;
    setError(null);
    setView(<LoadingScreen />);
    document.documentElement.lang = locale;
    document.documentElement.dir = getLocaleDirection(locale);
    document.title = 'CareBridge | International care, thoughtfully coordinated';
    void renderCurrentRoute().then((next) => { if (current && next) setView(next); }).catch((caught: unknown) => {
      if (current) setError(caught instanceof Error ? caught : new Error('Route failed'));
    });
    return () => { current = false; };
  }, [snapshot, locale]);

  if (error) return <ErrorScreen notFound={error instanceof NotFoundError} />;
  const dictionary = getDictionary(locale);
  return <div dir={getLocaleDirection(locale)} lang={locale}><a className="skip-link" href="#main-content">{dictionary.common.skipToContent}</a>{view}<ServiceWorkerRegistrar /></div>;
}
