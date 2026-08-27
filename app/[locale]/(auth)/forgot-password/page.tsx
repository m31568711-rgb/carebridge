import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthForm } from '@/src/features/auth/auth-form';
import { AuthShell } from '@/src/features/auth/auth-shell';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const dictionary = getDictionary(value);

  return (
    <AuthShell
      description={dictionary.auth.forgot.description}
      dictionary={dictionary}
      footer={<Link className="font-semibold text-blue-700" href={`/${value}/login`}>{dictionary.auth.forgot.backToLogin}</Link>}
      locale={value}
      title={dictionary.auth.forgot.title}
    >
      <AuthForm dictionary={dictionary} locale={value} mode="forgot" />
    </AuthShell>
  );
}
