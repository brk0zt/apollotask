import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';

// Define strict runtime validation schema using Zod
const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required.').email('Invalid email address format.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onNavigateToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onNavigateToRegister }) => {
  const { login, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    clearError();
    try {
      await login(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Login submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-300">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Apollo Energy</h2>
        <p className="text-white/60">Please enter your credentials.</p>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-200 text-sm transition-all duration-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="email">
            Email Address
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            placeholder="example@apollo.com"
            className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
              errors.email ? 'border-rose-500/50' : 'border-white/10'
            } text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200`}
          />
          {errors.email && (
            <p className="mt-2 text-sm text-rose-400 font-medium">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="password">
            Password
          </label>
          <input
            {...register('password')}
            id="password"
            type="password"
            placeholder="••••••••"
            className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
              errors.password ? 'border-rose-500/50' : 'border-white/10'
            } text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200`}
          />
          {errors.password && (
            <p className="mt-2 text-sm text-rose-400 font-medium">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="relative w-full py-3.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold tracking-wide shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Logging In...</span>
            </div>
          ) : (
            'Log In'
          )}
        </button>
      </form>

      {onNavigateToRegister && (
        <div className="mt-6 text-center text-sm">
          <span className="text-white/60">Don't have an account? </span>
          <button
            onClick={onNavigateToRegister}
            className="font-medium text-amber-400 hover:text-amber-300 transition-colors duration-200 focus:outline-none"
          >
            Create a new account
          </button>
        </div>
      )}
    </div>
  );
};
export default LoginForm;
