import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declaring the schemas to run modular tests on Zod schemas
const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required.').email('Invalid email address format.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.').max(128, 'Name must be at most 128 characters.'),
    email: z.string().min(1, 'Email address is required.').email('Invalid email address format.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    password_confirmation: z.string().min(1, 'Confirm password is required.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match.',
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
        expect(result.error.errors[0].message).toBe('Invalid email address format.');
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
        expect(result.error.errors[0].message).toBe('Password must be at least 8 characters.');
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
        expect(result.error.errors[0].message).toBe('Passwords do not match.');
      }
    });
  });
});
