import { describe, expect, it } from 'vitest';
import { loginSchema } from '@/src/features/auth/validation';

describe('authentication validation', () => {
  it('accepts a valid login payload', () => {
    expect(loginSchema.safeParse({ email: 'patient@example.com', password: 'secure-password' }).success).toBe(true);
  });

  it('rejects weak passwords and invalid emails', () => {
    expect(loginSchema.safeParse({ email: 'invalid', password: 'short' }).success).toBe(false);
  });
});
