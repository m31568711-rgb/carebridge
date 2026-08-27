import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthForm } from '@/src/features/auth/auth-form';
import { AuthShell } from '@/src/features/auth/auth-shell';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const dictionary = getDictionary(value);

  return (
    <AuthShell
      description={dictionary.auth.signup.description}
      dictionary={dictionary}
      footer={<>{dictionary.auth.signup.hasAccount} <Link className="font-semibold text-blue-700" href={`/${value}/login`}>{dictionary.auth.signup.signIn}</Link></>}
      locale={value}
      title={dictionary.auth.signup.title}
    >
      <AuthForm dictionary={dictionary} locale={value} mode="signup" />
    </AuthShell>
  );
}
