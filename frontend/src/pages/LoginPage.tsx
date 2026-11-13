import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Scissors, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/ui';
import { getApiErrorMessage } from '@/lib/utils';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';

interface LocationState {
  from?: { pathname: string };
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

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

      // Akıllı rota belirleme: Önceki yönlendirme (state.from) kullanıcının rolüne uygun mu?
      const fromPath = state?.from?.pathname;
      let targetRoute: string;

      if (isBusinessUser) {
        // İşletme kullanıcısı: admin rotasına veya varsa güvenli hedefe yönlendir
        if (fromPath && (fromPath.startsWith('/admin') || fromPath.startsWith('/branch'))) {
          targetRoute = fromPath;
        } else {
          targetRoute = '/admin/dashboard';
        }
      } else {
        // Müşteri kullanıcısı: ASLA /admin rotasına gitmemeli!
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
    if (!email.trim() || !password) {
      toast.warning('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }
    await submitCredentials(email, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-[#09090B] transition-colors duration-250">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="mb-4 flex items-center gap-2.5 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-500 dark:text-amber-400 shadow-md group-hover:scale-105 transition-transform">
              <Scissors className="h-6 w-6" />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">
            Hesabınıza Giriş Yapın
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
            Randevularınızı yönetin veya salonunuzu kontrol edin
          </p>
        </div>

        <Card accent>
          <CardHeader>
            <CardTitle>Oturum Aç</CardTitle>
            <CardDescription>
              Kişiselleştirilmiş salon ve randevu panelinize erişin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="E-posta Adresi"
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                autoComplete="email"
                required
              />
              <Input
                label="Şifre"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                autoComplete="current-password"
                required
              />
              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Giriş Yap
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>

            {/* Quick Demo Fillers */}
            <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-950/60">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Hızlı Deneme Girişleri
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setEmail('samet@musteri.com');
                    setPassword('123456');
                  }}
                >
                  Müşteri Hesabı
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setEmail('ahmet@makas.com');
                    setPassword('123456');
                  }}
                >
                  Salon Sahibi
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-4 text-xs text-slate-500 dark:text-zinc-400">
            <span>Henüz hesabınız yok mu?</span>
            <Link to="/register" className="font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300">
              Hemen Kayıt Olun →
            </Link>
          </CardFooter>
        </Card>

        <div className="text-center">
          <Link
            to="/explore"
            className="text-xs font-semibold text-slate-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors"
          >
            Üye olmadan salonları inceleyin →
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
