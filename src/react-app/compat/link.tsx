import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { navigate } from '../navigation-store';

type LinkHref = string | { pathname?: string; query?: Record<string, string | number | undefined> };
type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: LinkHref;
  replace?: boolean;
  prefetch?: boolean;
};

function stringifyHref(href: LinkHref) {
  if (typeof href === 'string') return href;
  const path = href.pathname ?? '/';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(href.query ?? {})) {
    if (value !== undefined) query.set(key, String(value));
  }
  return `${path}${query.size ? `?${query}` : ''}`;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, replace = false, onClick, target, ...props },
  ref,
) {
  const resolved = stringifyHref(href);
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || target === '_blank' || resolved.startsWith('#')
    ) return;
    const destination = new URL(resolved, window.location.href);
    if (destination.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(resolved, replace);
  }
  return <a {...props} href={resolved} onClick={handleClick} ref={ref} target={target} />;
});

export default Link;
