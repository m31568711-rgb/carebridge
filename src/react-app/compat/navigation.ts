import { useMemo } from 'react';
import { currentPathname, navigate, refreshNavigation, useLocationSnapshot } from '../navigation-store';

export class NotFoundError extends Error {
  constructor() { super('CareBridge route not found'); }
}

export function notFound(): never {
  throw new NotFoundError();
}

export function redirect(href: string): never {
  navigate(href, true);
  return undefined as never;
}

export function usePathname() {
  useLocationSnapshot();
  return currentPathname();
}

export function useSearchParams() {
  const snapshot = useLocationSnapshot();
  return useMemo(() => new URLSearchParams(window.location.search), [snapshot]);
}

export function useRouter() {
  useLocationSnapshot();
  return useMemo(() => ({
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, true),
    refresh: refreshNavigation,
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    prefetch: async () => undefined,
  }), []);
}
