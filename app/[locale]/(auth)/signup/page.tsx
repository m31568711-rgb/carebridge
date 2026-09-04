import { notFound } from '@/src/react-app/compat/navigation';
import { redirect } from '@/src/react-app/compat/navigation';
import { isLocale } from '@/src/i18n/config';

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  redirect(`/${value}/login`);
}
