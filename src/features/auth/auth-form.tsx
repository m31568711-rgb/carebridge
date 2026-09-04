'use client';

import { useState, type FormEvent } from 'react';
import Link from '@/src/react-app/compat/link';
import { useRouter } from '@/src/react-app/compat/navigation';
import { CheckCircle2 } from 'lucide-react';
import type { Locale } from '@/src/i18n/config';
import type { Dictionary } from '@/src/i18n/messages/en';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import { clearAuthContextCache } from '@/src/lib/auth/context';
import { Button } from '@/src/components/ui/button';
import { FormField } from '@/src/components/ui/form-field';
import { Input } from '@/src/components/ui/input';
import { loginSchema } from './validation';

type Mode = 'login' | 'forgot' | 'reset';

interface AuthFormProps {
  mode: Mode;
  locale: Locale;
  dictionary: Dictionary;
}

export function AuthForm({ mode, locale, dictionary }: AuthFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const shared = dictionary.auth.shared;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const email = String(formData.get('email') ?? '');
      const password = String(formData.get('password') ?? '');

      if (mode === 'login') {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) throw new Error(shared.unexpectedError);
        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error(shared.unexpectedError);
        const result = await supabase.auth.signInWithPassword(parsed.data);
        if (result.error || !result.data.user) throw new Error(result.error?.message ?? shared.unexpectedError);
        clearAuthContextCache();
        router.replace(`/${locale}/portal`);
        router.refresh();
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error(shared.unexpectedError);

      if (mode === 'forgot') {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/${locale}/auth/callback?next=/${locale}/reset-password`,
        });
        if (result.error) throw result.error;
        setSuccess(true);
      }

      if (mode === 'reset') {
        const confirmation = String(formData.get('confirmPassword') ?? '');
        if (password !== confirmation) throw new Error(dictionary.auth.reset.mismatch);
        if (password.length < 8) throw new Error(shared.passwordHint);
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setSuccess(true);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : shared.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const title = mode === 'forgot'
        ? dictionary.auth.forgot.successTitle
        : dictionary.auth.reset.successTitle;
    const description = mode === 'reset' ? dictionary.auth.reset.successDescription : shared.checkEmail;

    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-emerald-600" />
        <h2 className="mt-4 font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <Link className="mt-5 inline-flex text-sm font-semibold text-blue-700" href={`/${locale}/login`}>
          {dictionary.auth.forgot.backToLogin}
        </Link>
      </div>
    );
  }

  const actionLabel = mode === 'login'
    ? dictionary.auth.login.action
    : mode === 'forgot'
        ? dictionary.auth.forgot.action
        : dictionary.auth.reset.action;

  return (
    <form className="space-y-5" noValidate onSubmit={onSubmit}>
      {mode !== 'reset' ? (
        <FormField id="email" label={shared.emailLabel} required>
          <Input autoComplete="email" id="email" name="email" placeholder={shared.emailPlaceholder} required type="email" />
        </FormField>
      ) : null}

      {mode === 'login' || mode === 'reset' ? (
        <FormField id="password" hint={mode === 'reset' ? shared.passwordHint : undefined} label={mode === 'reset' ? dictionary.auth.reset.newPasswordLabel : shared.passwordLabel} required>
          <Input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} id="password" minLength={8} name="password" placeholder={shared.passwordPlaceholder} required type="password" />
        </FormField>
      ) : null}

      {mode === 'reset' ? (
        <FormField id="confirmPassword" label={dictionary.auth.reset.confirmPasswordLabel} required>
          <Input autoComplete="new-password" id="confirmPassword" minLength={8} name="confirmPassword" required type="password" />
        </FormField>
      ) : null}

      {mode === 'login' ? (
        <div className="flex justify-end">
          <Link className="text-sm font-semibold text-blue-700 hover:text-blue-800" href={`/${locale}/forgot-password`}>{dictionary.auth.login.forgotPassword}</Link>
        </div>
      ) : null}

      {error ? <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p> : null}

      <Button className="w-full" loading={loading} size="lg" type="submit">
        {loading ? shared.submitting : actionLabel}
      </Button>

    </form>
  );
}
