import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Scissors } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui';
import { cn, getApiErrorMessage } from '@/lib/utils';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';

interface LocationState {
  from?: { pathname: string };
}

interface LoginErrors {
  email?: string;
  password?: string;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const validate = (): boolean => {
    const nextErrors: LoginErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      nextErrors.email = 'E-posta adresi zorunludur.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Geçerli bir e-posta adresi giriniz.';
    }
    if (!password) {
      nextErrors.password = 'Şifre alanı boş bırakılamaz.';
    } else if (password.length < 6) {
      nextErrors.password = 'Şifre en az 6 karakter olmalıdır.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitCredentials = async (loginEmail: string, loginPassword: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (!response.success || !response.data) {
        toast.error(response.message || 'Giriş yapılamadı.');
        return;
      }

      setAuth(response.data);
      toast.success(`Hoş geldiniz, ${response.data.fullName}`);

      const roles = response.data.roles || [];
      const isBusinessUser = roles.some((r) =>
        ['BusinessOwner', 'BusinessManager', 'Employee'].includes(r),
      );

      const fromPath = state?.from?.pathname;
      let targetRoute: string;

      if (isBusinessUser) {
        if (fromPath && (fromPath.startsWith('/admin') || fromPath.startsWith('/branch'))) {
          targetRoute = fromPath;
        } else {
          targetRoute = '/admin/dashboard';
        }
      } else {
        if (fromPath && !fromPath.startsWith('/admin') && fromPath !== '/403' && fromPath !== '/login') {
          targetRoute = fromPath;
        } else {
          targetRoute = '/explore';
        }
      }

      navigate(targetRoute, { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'E-posta veya şifre hatalı.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await submitCredentials(email, password);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAFAFA] px-4 py-12 text-slate-900 transition-colors duration-300 dark:bg-[#0B1120] dark:text-slate-100">
      {/* Ambient Background Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_45%_at_50%_-10%,rgba(217,119,6,0.12),transparent_65%)] dark:bg-[radial-gradient(ellipse_60%_45%_at_50%_-10%,rgba(245,158,11,0.16),transparent_65%)]" />

      {/* Top-Right Theme Switcher */}
      <div className="fixed right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[450px] space-y-6">
        {/* Top Brand & Playfair Heading */}
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="group mb-4 inline-flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-white/60 text-amber-600 shadow-[0_14px_34px_-12px_rgba(217,119,6,0.4)] backdrop-blur-xl transition-transform duration-200 group-hover:scale-105 dark:border-amber-400/40 dark:from-amber-500/25 dark:to-slate-900/70 dark:text-amber-400 dark:shadow-[0_0_28px_rgba(245,158,11,0.3)]">
              <Scissors className="h-6 w-6" strokeWidth={1.75} />
            </div>
          </Link>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-[2.1rem]">
            Hesabınıza Giriş Yapın
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Randevularınızı yönetin veya salonunuzu kontrol edin
          </p>
        </div>

        {/* Main Glassmorphic Card with SlideDown Animation */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-[24px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_24px_65px_-25px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8),0_0_32px_-12px_rgba(245,158,11,0.18)] sm:p-8"
        >
          <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
            Oturum Aç
          </h2>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="ornek@mail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  autoComplete="email"
                  className={cn(
                    'h-12 w-full rounded-[16px] border bg-slate-50/75 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-950',
                    errors.email
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200/90 focus:border-[#D97706] focus:ring-amber-500/20 dark:border-white/10 dark:focus:border-amber-400',
                  )}
                />
              </div>
              {errors.email && <p className="text-xs font-medium text-red-500">{errors.email}</p>}
            </div>

            {/* Password with Eye Toggle */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Şifre
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  autoComplete="current-password"
                  className={cn(
                    'h-12 w-full rounded-[16px] border bg-slate-50/75 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-950',
                    errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200/90 focus:border-[#D97706] focus:ring-amber-500/20 dark:border-white/10 dark:focus:border-amber-400',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-red-500">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="mt-2 h-12 w-full gap-2 rounded-[16px] bg-[#D97706] text-sm font-semibold text-white shadow-lg shadow-amber-600/25 transition-all hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_24px_rgba(245,158,11,0.4)] dark:hover:bg-amber-400"
            >
              Giriş Yap
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {import.meta.env.DEV && (
            <>
              {/* Divider: Hızlı Deneme Girişleri (Yalnızca DEV ortamı) */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="h-px flex-1 bg-slate-200/90 dark:bg-white/10" />
                <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Hızlı Deneme Girişleri
                </span>
                <div className="h-px flex-1 bg-slate-200/90 dark:bg-white/10" />
              </div>

              {/* Pill-Shaped Outlined Demo Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('samet@musteri.com');
                    setPassword('123456');
                    setErrors({});
                  }}
                  className="h-10 cursor-pointer rounded-full border border-slate-200/90 bg-white/70 px-4 text-xs font-semibold text-slate-700 transition-all hover:border-amber-500/60 hover:bg-amber-50/70 hover:text-amber-800 dark:border-white/15 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                >
                  Müşteri Hesabı
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('ahmet@makas.com');
                    setPassword('123456');
                    setErrors({});
                  }}
                  className="h-10 cursor-pointer rounded-full border border-slate-200/90 bg-white/70 px-4 text-xs font-semibold text-slate-700 transition-all hover:border-amber-500/60 hover:bg-amber-50/70 hover:text-amber-800 dark:border-white/15 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                >
                  Salon Sahibi
                </button>
              </div>
            </>
          )}

          {/* Bottom Card Footer Link */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            <span>Henüz hesabınız yok mu?</span>
            <Link
              to="/register"
              className="font-semibold text-[#D97706] transition-colors hover:text-[#B45309] dark:text-amber-400 dark:hover:text-amber-300"
            >
              Hemen Kayıt Olun →
            </Link>
          </div>
        </motion.div>

        {/* Below Card Guest Explore Link */}
        <div className="text-center">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-[#D97706] dark:text-slate-400 dark:hover:text-amber-400"
          >
            Üye olmadan salonları inceleyin →
          </Link>
        </div>
      </div>
    </div>
  );
};
