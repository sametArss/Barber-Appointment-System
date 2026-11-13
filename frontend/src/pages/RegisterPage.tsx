import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Scissors,
  Store,
  User,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
import { adminService } from '@/services/adminService';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';

type RegisterMode = 'customer' | 'owner';

export const RegisterPage: React.FC = () => {
  const [mode, setMode] = useState<RegisterMode>('customer');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  // Salon Sahibi alanları
  const [businessName, setBusinessName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [district, setDistrict] = useState('Kadıköy');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(40.9856);
  const [longitude, setLongitude] = useState(29.0268);

  const handleDistrictChange = (val: string) => {
    setDistrict(val);
    const norm = val.trim().toLowerCase();
    if (norm.includes('beşiktaş') || norm.includes('besiktas')) {
      setLatitude(41.0422);
      setLongitude(29.0067);
    } else if (norm.includes('ataşehir') || norm.includes('atasehir')) {
      setLatitude(40.9923);
      setLongitude(29.1244);
    } else if (norm.includes('kadıköy') || norm.includes('kadikoy')) {
      setLatitude(40.9856);
      setLongitude(29.0268);
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Kullanıcı kaydı oluştur
      const regRes = await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
      });

      if (!regRes.success || !regRes.data) {
        toast.error(regRes.message || 'Kayıt işlemi başarısız oldu.');
        return;
      }

      // 2. İlk oturum açma
      const loginRes = await authService.login({
        email: email.trim(),
        password,
      });

      if (!loginRes.success || !loginRes.data) {
        toast.error('Oturum açılamadı. Lütfen giriş yapınız.');
        navigate('/login');
        return;
      }

      setAuth(loginRes.data);

      // 3. Salon Sahibi ise İşletmeyi kur
      if (mode === 'owner') {
        toast.loading('Salon profiliniz ve şubeniz oluşturuluyor...', { id: 'setup-biz' });

        try {
          await adminService.createBusiness({
            name: businessName.trim() || `${firstName}'s Studio`,
            branchName: branchName.trim() || 'Merkez Şube',
            phoneNumber: phoneNumber.trim(),
            city: city.trim() || 'İstanbul',
            district: district.trim() || 'Kadıköy',
            address: address.trim() || `${district}, ${city}`,
            latitude,
            longitude,
          });

          // Rol ve BusinessId claim'lerinin yenilenmesi için tekrar login
          const refreshedLogin = await authService.login({
            email: email.trim(),
            password,
          });

          if (refreshedLogin.success && refreshedLogin.data) {
            setAuth(refreshedLogin.data);
          }

          toast.success('Salonunuz başarıyla kuruldu!', { id: 'setup-biz' });
          navigate('/admin/dashboard', { replace: true });
          return;
        } catch (bizErr) {
          toast.error(getApiErrorMessage(bizErr, 'İşletme kurulurken bir hata oluştu.'), {
            id: 'setup-biz',
          });
          navigate('/admin/dashboard', { replace: true });
          return;
        }
      }

      // Müşteri ise
      toast.success('Aramıza hoş geldiniz! En yakın salonları keşfedebilirsiniz.');
      navigate('/explore', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Kayıt sırasında hata oluştu.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-[#09090B] transition-colors duration-250">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg space-y-6"
      >
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="mb-4 flex items-center gap-2.5 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-500 dark:text-amber-400 shadow-md group-hover:scale-105 transition-transform">
              <Scissors className="h-6 w-6" />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">
            Hesap Oluşturun
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {mode === 'customer'
              ? 'Randevularınızı tek tıkla planlayın ve takip edin'
              : 'Salonunuzu dijitalleştirin, randevuları ve ekibinizi yönetin'}
          </p>
        </div>

        {/* Segmented Control */}
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
          <button
            type="button"
            onClick={() => setMode('customer')}
            className={`relative flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-colors cursor-pointer ${
              mode === 'customer'
                ? 'text-slate-950 dark:text-zinc-950'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            {mode === 'customer' && (
              <motion.div
                layoutId="register-mode-active"
                className="absolute inset-0 rounded-xl bg-amber-500 shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Müşteriyim
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode('owner')}
            className={`relative flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-colors cursor-pointer ${
              mode === 'owner'
                ? 'text-slate-950 dark:text-zinc-950'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            {mode === 'owner' && (
              <motion.div
                layoutId="register-mode-active"
                className="absolute inset-0 rounded-xl bg-amber-500 shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              Salon Sahibiyim
            </span>
          </button>
        </div>

        <Card accent>
          <CardHeader>
            <CardTitle>
              {mode === 'customer' ? 'Müşteri Kaydı' : 'Salon Sahibi & İşletme Kaydı'}
            </CardTitle>
            <CardDescription>
              {mode === 'customer'
                ? 'Kişisel bilgilerinizi girerek hemen randevu almaya başlayın.'
                : 'Salon ve yetkili bilgilerinizi girerek dijital salonunuzu açın.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal Details */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Ad"
                  placeholder="Ahmet"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  leftIcon={<User className="h-4 w-4" />}
                  required
                />
                <Input
                  label="Soyad"
                  placeholder="Yılmaz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="E-posta"
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                required
              />

              <Input
                label="Telefon Numarası"
                type="tel"
                placeholder="05551234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                leftIcon={<Phone className="h-4 w-4" />}
                required
              />

              <Input
                label="Şifre"
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                required
              />

              {/* Extra fields for Salon Owner */}
              <AnimatePresence>
                {mode === 'owner' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3.5 pt-3 border-t border-slate-200/80 dark:border-zinc-800/80 overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <Building2 className="h-3.5 w-3.5" />
                      Salon &amp; İlk Şube Bilgileri
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Salon / İşletme Adı"
                        placeholder="Örn: Elit Makas Stüdyo"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required={mode === 'owner'}
                      />
                      <Input
                        label="Merkez Şube Adı"
                        placeholder="Örn: Moda Merkez Şubesi"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        required={mode === 'owner'}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Şehir"
                        placeholder="İstanbul"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required={mode === 'owner'}
                      />
                      <Input
                        label="İlçe"
                        placeholder="Kadıköy"
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        required={mode === 'owner'}
                      />
                    </div>

                    <Input
                      label="Açık Adres"
                      placeholder="Cadde, Sokak ve Bina No"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      leftIcon={<MapPin className="h-4 w-4" />}
                      required={mode === 'owner'}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Enlem (Lat)"
                        type="number"
                        step="0.0001"
                        value={latitude}
                        onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                        required={mode === 'owner'}
                      />
                      <Input
                        label="Boylam (Lng)"
                        type="number"
                        step="0.0001"
                        value={longitude}
                        onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                        required={mode === 'owner'}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoading}>
                {mode === 'customer' ? 'Hesabımı Oluştur' : 'Salonumu Kur ve Başla'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-4 text-xs text-slate-500 dark:text-zinc-400">
            <span>Zaten bir hesabınız var mı?</span>
            <Link to="/login" className="font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300">
              Giriş Yapın →
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};
