import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LocateFixed,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Scissors,
  Store,
  User,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui';
import { cn, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';

type RegisterMode = 'customer' | 'owner';
type OwnerStep = 1 | 2 | 3;

interface RegisterErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
  businessName?: string;
  branchName?: string;
  city?: string;
  district?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

const OWNER_STEPS: { step: OwnerStep; label: string }[] = [
  { step: 1, label: 'Kişisel Bilgiler' },
  { step: 2, label: 'Salon Bilgileri' },
  { step: 3, label: 'Ön İzleme' },
];

export const RegisterPage: React.FC = () => {
  const [mode, setMode] = useState<RegisterMode>('customer');
  const [ownerStep, setOwnerStep] = useState<OwnerStep>(1);

  // Kişisel Bilgiler
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Salon Sahibi Bilgileri
  const [businessName, setBusinessName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locating, setLocating] = useState(false);

  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  // Canlı şifre kuralları kontrolü
  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-ZÇĞİÖŞÜ]/.test(password);
  const hasLowerCase = /[a-zçğıöşü]/.test(password);

  const clearError = (field: keyof RegisterErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Bu tarayıcı konum almayı desteklemiyor.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
        setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
        setLocating(false);
        toast.success('Konum koordinatları dolduruldu.');
      },
      () => {
        setLocating(false);
        toast.error('Konum alınamadı. Tarayıcı iznini kontrol edip tekrar deneyin.');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const validatePersonalStep = (): boolean => {
    const next: RegisterErrors = {};

    if (!firstName.trim()) next.firstName = 'Ad zorunludur.';
    if (!lastName.trim()) next.lastName = 'Soyad zorunludur.';

    if (!email.trim()) {
      next.email = 'E-posta adresi zorunludur.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Geçerli bir e-posta adresi giriniz.';
    }

    if (!phoneNumber.trim()) {
      next.phoneNumber = 'Telefon numarası zorunludur.';
    } else if (phoneNumber.replace(/\D/g, '').length < 10) {
      next.phoneNumber = 'Geçerli bir telefon numarası giriniz.';
    }

    if (!password) {
      next.password = 'Şifre zorunludur.';
    } else if (!hasMinLength) {
      next.password = 'Şifre en az 6 karakter olmalıdır.';
    } else if (!hasUpperCase || !hasLowerCase) {
      next.password = 'Şifre en az bir büyük ve bir küçük harf içermelidir.';
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Şifre tekrarı zorunludur.';
    } else if (password !== confirmPassword) {
      next.confirmPassword = 'Şifreler birbiriyle eşleşmiyor.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateSalonStep = (): boolean => {
    const next: RegisterErrors = {};

    if (!businessName.trim()) next.businessName = 'Salon / İşletme adı zorunludur.';
    if (!branchName.trim()) next.branchName = 'Merkez şube adı zorunludur.';
    if (!city.trim()) next.city = 'Şehir zorunludur.';
    if (!district.trim()) next.district = 'İlçe zorunludur.';
    if (!address.trim()) next.address = 'Açık adres zorunludur.';

    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (!latitude.trim() || Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
      next.latitude = 'Geçerli bir enlem giriniz.';
    }
    if (!longitude.trim() || Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      next.longitude = 'Geçerli bir boylam giriniz.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNextStep = () => {
    if (ownerStep === 1 && validatePersonalStep()) {
      setOwnerStep(2);
    } else if (ownerStep === 2 && validateSalonStep()) {
      setOwnerStep(3);
    }
  };

  const executeRegistration = async () => {
    setIsLoading(true);
    try {
      const currentAuth = useAuthStore.getState();
      const alreadyAuthenticatedSameUser =
        currentAuth.isAuthenticated &&
        currentAuth.user?.email.toLowerCase() === email.trim().toLowerCase();

      if (!alreadyAuthenticatedSameUser) {
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
      }

      if (mode === 'owner') {
        toast.loading('Salon profiliniz ve şubeniz oluşturuluyor...', { id: 'setup-biz' });

        try {
          const businessRes = await adminService.createBusiness({
            name: businessName.trim() || `${firstName}'s Studio`,
            branchName: branchName.trim() || 'Merkez Şube',
            phoneNumber: phoneNumber.trim(),
            city: city.trim(),
            district: district.trim(),
            address: address.trim(),
            latitude: Number(latitude),
            longitude: Number(longitude),
          });
          if (!businessRes.success || !businessRes.data) {
            toast.error(
              businessRes.message || 'Salon oluşturulamadı. Lütfen salon bilgilerini kontrol edip tekrar deneyin.',
              { id: 'setup-biz' },
            );
            return;
          }

          const refreshedLogin = await authService.login({
            email: email.trim(),
            password,
          });

          if (!refreshedLogin.success || !refreshedLogin.data) {
            toast.error('Salon kuruldu ancak yetkiler yenilenemedi. Tekrar giriş yaparak devam et.', {
              id: 'setup-biz',
            });
            navigate('/login', { replace: true });
            return;
          }
          setAuth(refreshedLogin.data);

          toast.success('Salonunuz başarıyla kuruldu!', { id: 'setup-biz' });
          navigate('/admin/dashboard', { replace: true });
          return;
        } catch (bizErr) {
          toast.error(getApiErrorMessage(bizErr, 'İşletme kurulurken bir hata oluştu.'), {
            id: 'setup-biz',
          });
          return;
        }
      }

      toast.success('Aramıza hoş geldiniz! En yakın salonları keşfedebilirsiniz.');
      navigate('/explore', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Kayıt sırasında hata oluştu.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'customer') {
      if (!validatePersonalStep()) return;
      await executeRegistration();
      return;
    }

    if (ownerStep < 3) {
      handleNextStep();
      return;
    }

    await executeRegistration();
  };

  const inputBaseClass = (hasError?: string, withLeftIcon = false, withRightIcon = false) =>
    cn(
      'h-12 w-full rounded-[16px] border bg-slate-50/75 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-950',
      withLeftIcon ? 'pl-11' : 'pl-4',
      withRightIcon ? 'pr-11' : 'pr-4',
      hasError
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
        : 'border-slate-200/90 focus:border-[#D97706] focus:ring-amber-500/20 dark:border-white/10 dark:focus:border-amber-400',
    );

  const renderPersonalFields = () => (
    <div className="space-y-4">
      {mode === 'owner' && (
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:border-white/10 dark:text-amber-400">
          <User className="h-4 w-4" />
          <span>Adım 1 · Kişisel Bilgiler</span>
        </div>
      )}

      {/* Ad & Soyad Side-by-Side */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="reg-first-name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Ad
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="reg-first-name"
              type="text"
              placeholder="Ahmet"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                clearError('firstName');
              }}
              className={inputBaseClass(errors.firstName, true)}
            />
          </div>
          {errors.firstName && (
            <p className="text-xs font-medium text-red-500">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="reg-last-name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Soyad
          </label>
          <input
            id="reg-last-name"
            type="text"
            placeholder="Yılmaz"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clearError('lastName');
            }}
            className={inputBaseClass(errors.lastName)}
          />
          {errors.lastName && <p className="text-xs font-medium text-red-500">{errors.lastName}</p>}
        </div>
      </div>

      {/* E-posta */}
      <div className="space-y-1.5">
        <label
          htmlFor="reg-email"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          E-posta
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            id="reg-email"
            type="email"
            placeholder="ornek@mail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError('email');
            }}
            autoComplete="email"
            className={inputBaseClass(errors.email, true)}
          />
        </div>
        {errors.email && <p className="text-xs font-medium text-red-500">{errors.email}</p>}
      </div>

      {/* Telefon Numarası */}
      <div className="space-y-1.5">
        <label
          htmlFor="reg-phone"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          Telefon Numarası
        </label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            id="reg-phone"
            type="tel"
            placeholder="0555 123 45 67"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              clearError('phoneNumber');
            }}
            autoComplete="tel"
            className={inputBaseClass(errors.phoneNumber, true)}
          />
        </div>
        {errors.phoneNumber && (
          <p className="text-xs font-medium text-red-500">{errors.phoneNumber}</p>
        )}
      </div>

      {/* Şifre & Şifre Tekrar */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="reg-password"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Şifre
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Örn: Berber123"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError('password');
                clearError('confirmPassword');
              }}
              autoComplete="new-password"
              className={inputBaseClass(errors.password, true, true)}
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
          {errors.password && <p className="text-xs font-medium text-red-500">{errors.password}</p>}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="reg-confirm-password"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Şifre Tekrar
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Şifrenizi tekrar girin"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearError('confirmPassword');
              }}
              autoComplete="new-password"
              className={inputBaseClass(errors.confirmPassword, true, true)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs font-medium text-red-500">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      {/* Canlı Şifre Kural Göstergeleri */}
      <div className="flex flex-wrap gap-2 pt-0.5 text-[11px]">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium transition-colors',
            hasMinLength
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400',
          )}
        >
          <Check className="h-3 w-3" />
          En az 6 karakter
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium transition-colors',
            hasUpperCase
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400',
          )}
        >
          <Check className="h-3 w-3" />
          1 Büyük Harf
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium transition-colors',
            hasLowerCase
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400',
          )}
        >
          <Check className="h-3 w-3" />
          1 Küçük Harf
        </span>
      </div>
    </div>
  );

  const renderSalonFields = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:border-white/10 dark:text-amber-400">
        <Store className="h-4 w-4" />
        <span>Adım 2 · Salon ve İşletme Bilgileri</span>
      </div>

      {/* Salon Adı & Merkez Şube Adı */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="reg-business-name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Salon / İşletme Adı
          </label>
          <input
            id="reg-business-name"
            type="text"
            placeholder="Örn: Elit Makas Stüdyo"
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              clearError('businessName');
            }}
            className={inputBaseClass(errors.businessName)}
          />
          {errors.businessName && (
            <p className="text-xs font-medium text-red-500">{errors.businessName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="reg-branch-name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Merkez Şube Adı
          </label>
          <input
            id="reg-branch-name"
            type="text"
            placeholder="Örn: Moda Merkez Şubesi"
            value={branchName}
            onChange={(e) => {
              setBranchName(e.target.value);
              clearError('branchName');
            }}
            className={inputBaseClass(errors.branchName)}
          />
          {errors.branchName && (
            <p className="text-xs font-medium text-red-500">{errors.branchName}</p>
          )}
        </div>
      </div>

      {/* Şehir & İlçe */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label
            htmlFor="reg-city"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Şehir
          </label>
          <input
            id="reg-city"
            type="text"
            placeholder="İstanbul"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              clearError('city');
            }}
            className={inputBaseClass(errors.city)}
          />
          {errors.city && <p className="text-xs font-medium text-red-500">{errors.city}</p>}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="reg-district"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            İlçe
          </label>
          <input
            id="reg-district"
            type="text"
            placeholder="Kadıköy"
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              clearError('district');
            }}
            className={inputBaseClass(errors.district)}
          />
          {errors.district && <p className="text-xs font-medium text-red-500">{errors.district}</p>}
        </div>
      </div>

      {/* Açık Adres */}
      <div className="space-y-1.5">
        <label
          htmlFor="reg-address"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          Açık Adres
        </label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            id="reg-address"
            type="text"
            placeholder="Cadde, Sokak ve Bina No"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              clearError('address');
            }}
            className={inputBaseClass(errors.address, true)}
          />
        </div>
        {errors.address && <p className="text-xs font-medium text-red-500">{errors.address}</p>}
      </div>

      {/* Highlighted Amber Dashed Sub-Panel for Geolocation & Coordinates */}
      <div className="space-y-3.5 rounded-[18px] border border-dashed border-amber-500/50 bg-amber-50/70 p-4 dark:border-amber-400/35 dark:bg-amber-500/[0.07]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Salon Harita Konumu
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Konumunuzu koordinat ile de belirleyebilirsiniz.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={captureLocation}
            isLoading={locating}
            className="shrink-0 gap-1.5 rounded-xl border-amber-500/40 bg-white/90 text-amber-800 hover:bg-amber-100/70 dark:border-amber-400/40 dark:bg-slate-900/80 dark:text-amber-300 dark:hover:bg-amber-500/15"
          >
            <LocateFixed className="h-4 w-4" />
            Konumumu Al
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="reg-lat"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
            >
              Enlem (LAT)
            </label>
            <input
              id="reg-lat"
              type="number"
              step="0.000001"
              placeholder="40.9909"
              value={latitude}
              onChange={(e) => {
                setLatitude(e.target.value);
                clearError('latitude');
              }}
              className={inputBaseClass(errors.latitude)}
            />
            {errors.latitude && (
              <p className="text-xs font-medium text-red-500">{errors.latitude}</p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="reg-lng"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
            >
              Boylam (LNG)
            </label>
            <input
              id="reg-lng"
              type="number"
              step="0.000001"
              placeholder="29.0292"
              value={longitude}
              onChange={(e) => {
                setLongitude(e.target.value);
                clearError('longitude');
              }}
              className={inputBaseClass(errors.longitude)}
            />
            {errors.longitude && (
              <p className="text-xs font-medium text-red-500">{errors.longitude}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:border-white/10 dark:text-amber-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>Adım 3 · Bilgilerin Ön İzlemesi</span>
      </div>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Salonunuzu oluşturmadan önce girdiğiniz bilgileri son kez kontrol edin. Dilerseniz ilgili
        bölümü hemen düzenleyebilirsiniz.
      </p>

      {/* Yetkili Bilgileri Özet Kartı */}
      <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-slate-950/60">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Yetkili Bilgileri
          </span>
          <button
            type="button"
            onClick={() => setOwnerStep(1)}
            className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline dark:text-amber-400"
          >
            <Pencil className="h-3 w-3" />
            Düzenle
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-slate-400 dark:text-slate-500">Ad Soyad</dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">
              {firstName.trim()} {lastName.trim()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400 dark:text-slate-500">Telefon</dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">{phoneNumber.trim()}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400 dark:text-slate-500">E-posta</dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">{email.trim()}</dd>
          </div>
        </dl>
      </div>

      {/* Salon & Şube Bilgileri Özet Kartı */}
      <div className="rounded-[18px] border border-amber-500/25 bg-amber-50/60 p-4 dark:border-amber-400/25 dark:bg-amber-500/[0.06]">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Store className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Salon &amp; Merkez Şube
          </span>
          <button
            type="button"
            onClick={() => setOwnerStep(2)}
            className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline dark:text-amber-400"
          >
            <Pencil className="h-3 w-3" />
            Düzenle
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Salon Adı</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">{businessName.trim()}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Merkez Şube</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">{branchName.trim()}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Şehir / İlçe</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">
              {district.trim()}, {city.trim()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Koordinatlar</dt>
            <dd className="font-mono text-[11px] font-semibold text-slate-800 dark:text-amber-200">
              {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500 dark:text-slate-400">Açık Adres</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">{address.trim()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAFAFA] px-4 py-12 text-slate-900 transition-colors duration-300 dark:bg-[#0B1120] dark:text-slate-100">
      {/* Ambient Background Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_45%_at_50%_-10%,rgba(217,119,6,0.12),transparent_65%)] dark:bg-[radial-gradient(ellipse_60%_45%_at_50%_-10%,rgba(245,158,11,0.16),transparent_65%)]" />

      {/* Top-Right Theme Switcher */}
      <div className="fixed right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <div
        className={cn(
          'w-full space-y-6 transition-all duration-300',
          mode === 'customer' ? 'max-w-[500px]' : 'max-w-[600px]',
        )}
      >
        {/* Top Brand & Playfair Display Heading */}
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="group mb-4 inline-flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-white/60 text-amber-600 shadow-[0_14px_34px_-12px_rgba(217,119,6,0.4)] backdrop-blur-xl transition-transform duration-200 group-hover:scale-105 dark:border-amber-400/40 dark:from-amber-500/25 dark:to-slate-900/70 dark:text-amber-400 dark:shadow-[0_0_28px_rgba(245,158,11,0.3)]">
              <Scissors className="h-6 w-6" strokeWidth={1.75} />
            </div>
          </Link>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-[2.2rem]">
            Hesap Oluşturun
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {mode === 'customer'
              ? 'Saniyeler içinde hesabınızı açın ve favori berberinizden yerinizi ayırtın.'
              : 'Salonunuzu 2 kolay adımda tanımlayın, ön izleyin ve hemen başlayın.'}
          </p>
        </div>

        {/* Modern Segmented Control (Tabs) */}
        <div className="flex rounded-[18px] border border-slate-200/80 bg-white/75 p-1.5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
          <button
            type="button"
            onClick={() => {
              setMode('customer');
              setOwnerStep(1);
              setErrors({});
            }}
            className={cn(
              'relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[14px] py-2.5 text-xs font-semibold transition-colors',
              mode === 'customer'
                ? 'text-white dark:text-slate-950'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
            )}
          >
            {mode === 'customer' && (
              <motion.div
                layoutId="register-mode-pill"
                className="absolute inset-0 rounded-[14px] bg-[#D97706] shadow-md shadow-amber-600/25 dark:bg-amber-500 dark:shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Müşteriyim
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('owner');
              setOwnerStep(1);
              setErrors({});
            }}
            className={cn(
              'relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[14px] py-2.5 text-xs font-semibold transition-colors',
              mode === 'owner'
                ? 'text-white dark:text-slate-950'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
            )}
          >
            {mode === 'owner' && (
              <motion.div
                layoutId="register-mode-pill"
                className="absolute inset-0 rounded-[14px] bg-[#D97706] shadow-md shadow-amber-600/25 dark:bg-amber-500 dark:shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              Salon Sahibiyim
            </span>
          </button>
        </div>

        {/* Floating Glassmorphic Form Panel with SlideDown Animation */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-[24px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_24px_65px_-25px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8),0_0_32px_-12px_rgba(245,158,11,0.18)] sm:p-8"
        >
          {/* Owner 3-Step Indicator */}
          {mode === 'owner' && (
            <div className="mb-6 flex items-center justify-between gap-2">
              {OWNER_STEPS.map((item, idx) => {
                const isCompleted = ownerStep > item.step;
                const isActive = ownerStep === item.step;
                return (
                  <div key={item.step} className="flex flex-1 items-center gap-2">
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all',
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isActive
                            ? 'bg-[#D97706] text-white shadow-md shadow-amber-600/30 dark:bg-amber-500 dark:text-slate-950'
                            : 'border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-500',
                      )}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : item.step}
                    </div>
                    <span
                      className={cn(
                        'hidden text-xs font-semibold sm:inline',
                        isActive
                          ? 'text-slate-900 dark:text-white'
                          : isCompleted
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500',
                      )}
                    >
                      {item.label}
                    </span>
                    {idx < OWNER_STEPS.length - 1 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1 rounded-full transition-colors',
                          ownerStep > item.step
                            ? 'bg-emerald-500'
                            : 'bg-slate-200 dark:bg-white/10',
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {mode === 'customer' ? (
              renderPersonalFields()
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={ownerStep}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                >
                  {ownerStep === 1 && renderPersonalFields()}
                  {ownerStep === 2 && renderSalonFields()}
                  {ownerStep === 3 && renderPreviewStep()}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Action Buttons */}
            {mode === 'customer' ? (
              <Button
                type="submit"
                isLoading={isLoading}
                className="h-12 w-full gap-2 rounded-[16px] bg-[#D97706] text-sm font-semibold text-white shadow-lg shadow-amber-600/25 transition-all hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_24px_rgba(245,158,11,0.4)] dark:hover:bg-amber-400"
              >
                Hesabımı Oluştur
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                {ownerStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setErrors({});
                      setOwnerStep((prev) => (prev - 1) as OwnerStep);
                    }}
                    disabled={isLoading}
                    className="h-12 gap-1.5 rounded-[16px] px-5 dark:border-white/15"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Geri
                  </Button>
                )}

                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="h-12 flex-1 gap-2 rounded-[16px] bg-[#D97706] text-sm font-semibold text-white shadow-lg shadow-amber-600/25 transition-all hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_24px_rgba(245,158,11,0.4)] dark:hover:bg-amber-400"
                >
                  {ownerStep === 1 && (
                    <>
                      Devam Et · Salon Bilgileri
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                  {ownerStep === 2 && (
                    <>
                      Ön İzlemeye Geç
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                  {ownerStep === 3 && (
                    <>
                      Onayla ve Salonumu Kur
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </motion.div>

        {/* Below Card Login Link */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          Zaten bir hesabınız var mı?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#D97706] transition-colors hover:text-[#B45309] dark:text-amber-400 dark:hover:text-amber-300"
          >
            Giriş Yapın →
          </Link>
        </div>
      </div>
    </div>
  );
};
