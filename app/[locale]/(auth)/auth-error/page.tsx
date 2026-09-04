import Link from '@/src/react-app/compat/link';
import { AlertTriangle } from 'lucide-react';
import { notFound } from '@/src/react-app/compat/navigation';
import { AuthShell } from '@/src/features/auth/auth-shell';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';

export default async function AuthErrorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const dictionary = getDictionary(value);

  return (
    <AuthShell description={dictionary.auth.callback.errorDescription} dictionary={dictionary} footer={<Link className="font-semibold text-blue-700" href={`/${value}`}>{dictionary.auth.shared.returnHome}</Link>} locale={value} title={dictionary.auth.callback.errorTitle}>
      <div className="text-center"><AlertTriangle aria-hidden="true" className="mx-auto size-10 text-amber-500" /><Link className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white" href={`/${value}/login`}>{dictionary.auth.forgot.backToLogin}</Link></div>
    </AuthShell>
  );
}
