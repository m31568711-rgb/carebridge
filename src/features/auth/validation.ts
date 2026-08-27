import { z } from 'zod';

export const emailSchema = z.string().trim().email();
export const passwordSchema = z.string().min(8);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = loginSchema.extend({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});
