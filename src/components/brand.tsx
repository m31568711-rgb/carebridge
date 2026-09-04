import Link from '@/src/react-app/compat/link';
import { cn } from '@/src/lib/utils/cn';

interface BrandProps {
  href: string;
  name: string;
  compact?: boolean;
  inverse?: boolean;
}

export function Brand({ href, name, compact = false, inverse = false }: BrandProps) {
  return (
    <Link className={cn('inline-flex items-center gap-3 font-semibold tracking-tight', inverse ? 'text-white' : 'text-slate-950')} href={href}>
      <span className={cn('grid size-10 place-items-center rounded-xl text-lg font-bold shadow-lg', inverse ? 'bg-white text-blue-700 shadow-blue-950/20' : 'bg-blue-600 text-white shadow-blue-600/20')} aria-hidden="true">+</span>
      {compact ? null : <span className="text-lg">{name}</span>}
    </Link>
  );
}
