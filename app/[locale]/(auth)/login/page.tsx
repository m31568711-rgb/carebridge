import { notFound } from 'next/navigation';
import { AuthForm } from '@/src/features/auth/auth-form';
import { AuthShell } from '@/src/features/auth/auth-shell';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const dictionary = getDictionary(value);
  const accountNotice = value === 'ar'
    ? 'تُنشئ إدارة كيربريدج الحسابات الجديدة وتفعّل صلاحياتها.'
    : value === 'fr'
      ? 'Les nouveaux comptes et leurs accès sont créés par l’administration CareBridge.'
      : 'New accounts and access are created by CareBridge administration.';

  return (
    <AuthShell
      description={dictionary.auth.login.description}
      dictionary={dictionary}
      footer={accountNotice}
      locale={value}
      title={dictionary.auth.login.title}
    >
      <AuthForm dictionary={dictionary} locale={value} mode="login" />
    </AuthShell>
  );
}
