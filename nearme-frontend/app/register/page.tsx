'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { MapPin, Check, X } from 'lucide-react';
import { authApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Button, Input } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { useEffect } from 'react';

interface RegisterForm {
  display_name: string; handle: string; email: string; password: string; confirm_password: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>();
  const handle = watch('handle');
  const debouncedHandle = useDebounce(handle, 500);

  useEffect(() => {
    if (debouncedHandle && /^[a-z0-9_]{3,30}$/.test(debouncedHandle)) {
      usersApi.checkHandle(debouncedHandle).then((res) => setHandleAvailable(res.data.data.available)).catch(() => setHandleAvailable(null));
    } else {
      setHandleAvailable(null);
    }
  }, [debouncedHandle]);

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirm_password) { toast.error('Passwords do not match'); return; }
    try {
      const res = await authApi.register({
        uid: `web_${Date.now()}`,
        display_name: data.display_name,
        handle: data.handle.toLowerCase(),
        email: data.email,
        password: data.password,
        auth_provider: 'email',
        device_info: { platform: 'web' },
      });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Account created! Welcome to NearMe 🎉');
      router.push('/feed');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-800 text-2xl text-surface-900">NearMe</span>
          </Link>
          <h1 className="font-display font-700 text-2xl text-surface-900">Create your account</h1>
          <p className="text-surface-600 mt-1 text-sm">Start discovering amazing places around you</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Display Name" placeholder="Alex Johnson" error={errors.display_name?.message}
              {...register('display_name', { required: 'Name is required', minLength: { value: 1, message: 'Required' }, maxLength: { value: 50, message: 'Max 50 chars' } })} />

            <div>
              <label className="label">Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm">@</span>
                <input className="input pl-7 pr-9" placeholder="alexj" {...register('handle', {
                  required: 'Handle required',
                  pattern: { value: /^[a-z0-9_]{3,30}$/, message: '3-30 chars, lowercase letters, numbers, underscores only' }
                })} />
                {handleAvailable !== null && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {handleAvailable ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}
                  </div>
                )}
              </div>
              {errors.handle && <p className="mt-1.5 text-xs text-red-400">{errors.handle.message}</p>}
              {handleAvailable === false && <p className="mt-1.5 text-xs text-red-400">Handle is taken</p>}
              {handleAvailable === true && <p className="mt-1.5 text-xs text-green-400">Handle is available</p>}
            </div>

            <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message}
              {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} />
            <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message}
              {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })} />
            <Input label="Confirm Password" type="password" placeholder="••••••••" error={errors.confirm_password?.message}
              {...register('confirm_password', { required: 'Please confirm password' })} />
            <Button type="submit" loading={isSubmitting} className="w-full !mt-6" size="lg">Create account</Button>
          </form>
        </div>

        <p className="text-center text-surface-600 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-500">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
