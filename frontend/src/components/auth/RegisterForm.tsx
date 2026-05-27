import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';

// Define strict runtime validation schema using Zod with refinement check for passwords
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

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess?: () => void;
  onNavigateToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onNavigateToLogin }) => {
  const { register: registerUser, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    clearError();
    try {
      await registerUser(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Registration submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-300">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Create Account</h2>
        <p className="text-white/60">Fill out the form to join the control panel.</p>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-200 text-sm transition-all duration-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5" htmlFor="name">
            Full Name
          </label>
          <input
            {...register('name')}
            id="name"
            type="text"
            placeholder="John Doe"
            className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
              errors.name ? 'border-rose-500/50' : 'border-white/10'
            } text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-rose-400 font-medium">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5" htmlFor="email">
            Email Address
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            placeholder="example@apollo.com"
            className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
              errors.email ? 'border-rose-500/50' : 'border-white/10'
            } text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-rose-400 font-medium">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            {...register('password')}
            id="password"
            type="password"
            placeholder="••••••••"
            className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
              errors.password ? 'border-rose-500/50' : 'border-white/10'
            } text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200`}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-rose-400 font-medium">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5" htmlFor="password_confirmation">
            Confirm Password
          </label>
          <input
            {...register('password_confirmation')}
            id="password_confirmation"
            type="password"
            placeholder="••••••••"
            className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
              errors.password_confirmation ? 'border-rose-500/50' : 'border-white/10'
            } text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200`}
          />
          {errors.password_confirmation && (
            <p className="mt-1 text-sm text-rose-400 font-medium">{errors.password_confirmation.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="relative w-full py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold tracking-wide shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Registering...</span>
            </div>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {onNavigateToLogin && (
        <div className="mt-6 text-center text-sm">
          <span className="text-white/60">Already have an account? </span>
          <button
            onClick={onNavigateToLogin}
            className="font-medium text-amber-400 hover:text-amber-300 transition-colors duration-200 focus:outline-none"
          >
            Log In
          </button>
        </div>
      )}
    </div>
  );
};
export default RegisterForm;
