import { NextResponse, type NextRequest } from 'next/server';
import { loginSchema } from '@/src/features/auth/validation';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503 });
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? 'Invalid login credentials.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
