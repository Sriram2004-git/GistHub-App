import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, FolderGit2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeSelector } from '@/components/common/ThemeSelector';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = (): boolean => {
    const errors: { username?: string; password?: string; confirmPassword?: string } = {};
    if (!username.trim()) {
      errors.username = 'Username is required';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ username: username.trim(), password });
      navigate('/login', {
        state: {
          successMessage: 'Account created successfully! Please sign in with your credentials.',
          registeredUsername: username.trim(),
        },
        replace: true,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 400 || err.response?.status === 409) {
          const detail = err.response.data?.detail;
          setErrorMessage(
            typeof detail === 'string'
              ? detail
              : 'Username is already taken. Please choose another.'
          );
        } else if (err.response?.data?.detail) {
          const detail = err.response.data.detail;
          setErrorMessage(typeof detail === 'string' ? detail : 'Registration failed.');
        } else if (err.code === 'ERR_NETWORK') {
          setErrorMessage('Unable to reach the server. Please check your network connection.');
        } else {
          setErrorMessage('An unexpected error occurred during registration. Please try again.');
        }
      } else {
        setErrorMessage('Failed to create account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0f19] px-4 py-12 transition-colors select-none">
      {/* Theme selector in top-right */}
      <div className="absolute top-4 right-4">
        <ThemeSelector variant="dropdown" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-sm mb-1">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create an account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Get started with your developer workspace on GistHub.
          </p>
        </div>

        {/* Server Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Registration Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e131f] shadow-card dark:shadow-card-dark">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Username"
              type="text"
              name="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }
              }}
              placeholder="e.g. dev_user"
              error={fieldErrors.username}
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              placeholder="••••••••"
              error={fieldErrors.password}
              autoComplete="new-password"
              disabled={isSubmitting}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 pointer-events-auto"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              placeholder="••••••••"
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
              disabled={isSubmitting}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 pointer-events-auto"
                  aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Create Account
            </Button>
          </form>
        </div>

        {/* Link to Login */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

