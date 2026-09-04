import { useSyncExternalStore } from 'react';

let revision = 0;
const listeners = new Set<() => void>();

function emit() {
  revision += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

export function navigate(href: string, replace = false) {
  const target = new URL(href, window.location.href);
  if (target.origin !== window.location.origin) {
    window.location.assign(target.href);
    return;
  }
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', `${target.pathname}${target.search}${target.hash}`);
  emit();
  if (!target.hash) window.scrollTo({ top: 0, behavior: 'auto' });
}

export function refreshNavigation() {
  emit();
}

export function useLocationSnapshot() {
  return useSyncExternalStore(
    subscribe,
    () => `${window.location.pathname}${window.location.search}|${revision}`,
    () => '/',
  );
}

export function currentPathname() {
  return window.location.pathname;
}
