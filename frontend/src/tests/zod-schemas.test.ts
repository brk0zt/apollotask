import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declaring the schemas to run modular tests on Zod schemas
const loginSchema = z.object({
  email: z.string().min(1, 'E-posta adresi gereklidir.').email('Geçersiz e-posta adresi formatı.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'İsim en az 2 karakter olmalıdır.').max(128, 'İsim en fazla 128 karakter olabilir.'),
    email: z.string().min(1, 'E-posta adresi gereklidir.').email('Geçersiz e-posta adresi formatı.'),
    password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
    password_confirmation: z.string().min(1, 'Şifre tekrarı gereklidir.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Şifreler eşleşmiyor.',
    path: ['password_confirmation'],
  });

describe('Zod Authentication Boundary Schemas', () => {
  describe('Login Schema Validation', () => {
    it('should validate correct credentials successfully', () => {
      const validData = {
        email: 'developer@apollo.com',
        password: 'securepassword123',
      };
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should fail validation on invalid email structure', () => {
      const invalidData = {
        email: 'invalid-email-format',
        password: 'securepassword123',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Geçersiz e-posta adresi formatı.');
      }
    });

    it('should fail validation on short password length', () => {
      const invalidData = {
        email: 'developer@apollo.com',
        password: 'short',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Şifre en az 8 karakter olmalıdır.');
      }
    });
  });

  describe('Register Schema Validation', () => {
    it('should validate valid registration inputs successfully', () => {
      const validData = {
        name: 'Burak Ozturk',
        email: 'burak@apollo.com',
        password: 'password123',
        password_confirmation: 'password123',
      };
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should fail registration when passwords do not match', () => {
      const invalidData = {
        name: 'Burak Ozturk',
        email: 'burak@apollo.com',
        password: 'password123',
        password_confirmation: 'different_password',
      };
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Şifreler eşleşmiyor.');
      }
    });
  });
});
