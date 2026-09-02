import { z } from 'zod';

export const emailSchema = z.string().trim().email();
export const passwordSchema = z.string().min(8);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
