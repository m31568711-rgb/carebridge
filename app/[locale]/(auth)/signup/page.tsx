import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { isLocale } from '@/src/i18n/config';

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  redirect(`/${value}/login`);
}
