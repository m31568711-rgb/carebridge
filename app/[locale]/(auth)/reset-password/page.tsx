import { notFound } from '@/src/react-app/compat/navigation';
import { AuthForm } from '@/src/features/auth/auth-form';
import { AuthShell } from '@/src/features/auth/auth-shell';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';

export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const dictionary = getDictionary(value);

  return (
    <AuthShell description={dictionary.auth.reset.description} dictionary={dictionary} footer={dictionary.auth.shared.passwordHint} locale={value} title={dictionary.auth.reset.title}>
      <AuthForm dictionary={dictionary} locale={value} mode="reset" />
    </AuthShell>
  );
}
