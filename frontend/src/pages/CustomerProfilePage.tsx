import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import { customerService } from '@/services/customerService';
import { employeeService } from '@/services/employeeService';
import { useAuthStore } from '@/store/useAuthStore';
import type { CustomerPenaltyStatus } from '@/types/booking';

const ROLE_LABELS: Record<string, string> = {
  BusinessOwner: 'Salon Sahibi',
  BusinessManager: 'Salon Yöneticisi',
  Employee: 'Çalışan',
  Customer: 'Müşteri',
  SystemAdmin: 'Yönetici',
};

export const CustomerProfilePage: React.FC = () => {
  const { user, logout, hasRole, updateFullName, updatePhoneNumber } = useAuthStore();
  const navigate = useNavigate();

  const isOwnerOrManager = hasRole(['BusinessOwner', 'BusinessManager']);
  const isEmployeeOnly = hasRole('Employee') && !isOwnerOrManager;
  const isCustomer = hasRole('Customer') && !isOwnerOrManager && !isEmployeeOnly;

  const primaryRoleLabel = isOwnerOrManager
    ? hasRole('BusinessOwner')
      ? 'Salon Sahibi'
      : 'Salon Yöneticisi'
    : isEmployeeOnly
      ? 'Çalışan'
      : 'Müşteri';

  const [penaltyStatus, setPenaltyStatus] = useState<CustomerPenaltyStatus | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [biography, setBiography] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [penaltyLoading, setPenaltyLoading] = useState(true);

  const isEmployee = hasRole('Employee');

  useEffect(() => {
    customerService
      .getMyProfile()
      .then((res) => {
        if (res.success && res.data) {
          setFirstName(res.data.firstName ?? '');
          setLastName(res.data.lastName ?? '');
          setPhoneNumber(res.data.phoneNumber?.trim() || user?.phoneNumber?.trim() || '');
          updateFullName(`${res.data.firstName} ${res.data.lastName}`.trim());
        } else if (user?.fullName) {
          const [savedFirstName, ...savedLastName] = user.fullName.trim().split(/\s+/);
          setFirstName(savedFirstName ?? '');
          setLastName(savedLastName.join(' '));
          setPhoneNumber(user.phoneNumber?.trim() ?? '');
        }
      })
      .catch(() => {
        if (user?.fullName) {
          const [savedFirstName, ...savedLastName] = user.fullName.trim().split(/\s+/);
          setFirstName(savedFirstName ?? '');
          setLastName(savedLastName.join(' '));
        }
        setPhoneNumber(user?.phoneNumber?.trim() ?? '');
        toast.error('Profil bilgileri yüklenemedi.');
      })
      .finally(() => setProfileLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEmployee) return;
    employeeService
      .getMyWorkplaces()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setBiography(res.data[0].biography ?? '');
        }
      })
      .catch(() => {
        // Çalışan biyografisi opsiyonel
      });
  }, [isEmployee]);

  useEffect(() => {
    if (!isCustomer) {
      setPenaltyLoading(false);
      return;
    }

    const targetBusinessId = '00000000-0000-0000-0000-000000000000';
    adminService
      .getMyPenaltyStatus(targetBusinessId)
      .then((res) => {
        if (res.success && res.data) {
          setPenaltyStatus(res.data);
        }
      })
      .catch(() => {
        // Ceza kaydı yoksa sessiz geçilir
      })
      .finally(() => setPenaltyLoading(false));
  }, [isCustomer]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.warning('Ad ve soyad alanları boş bırakılamaz.');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await customerService.updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      if (!res.success) {
        toast.error(res.message || 'Profil güncellenemedi.');
        return;
      }
      if (isEmployee) {
        const bioRes = await employeeService.updateMyBiography(
          biography.trim() ? biography.trim() : null,
        );
        if (!bioRes.success) {
          toast.warning(bioRes.message || 'Uzmanlık alanı güncellenemedi.');
        }
      }
      updateFullName(`${firstName.trim()} ${lastName.trim()}`.trim());
      updatePhoneNumber(phoneNumber.trim());
      toast.success('Profil bilgileri güncellendi.');
    } catch {
      toast.error('Profil güncellenemedi. Lütfen tekrar dene.');
    } finally {
      setSavingProfile(false);
    }
  };

  const activeStrikes = penaltyStatus?.activePenaltyCount ?? 0;
  const isRestricted = penaltyStatus?.isRestricted ?? false;
  const progressPercent = Math.min(100, Math.round((activeStrikes / 3) * 100));

  const displayName = user?.fullName || `${firstName} ${lastName}`.trim() || 'Kullanıcı';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const secondaryAction = isOwnerOrManager
    ? { label: 'Randevu Takvimini Görüntüle', to: '/admin/calendar' }
    : isEmployeeOnly
      ? { label: 'Randevularımı Görüntüle', to: '/admin/appointments' }
      : { label: 'Randevularımı Görüntüle', to: '/my-appointments' };

  return (
    <div className="mx-auto max-w-[800px] space-y-7 py-4 sm:py-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
          {isCustomer
            ? 'Profilim & Güvenlik Durumum'
            : isOwnerOrManager
              ? 'Profilim & İşletme Hesabım'
              : 'Profilim & Çalışan Hesabım'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {isCustomer
            ? 'Hesap bilgilerin ve randevu güvenlik durumun.'
            : isOwnerOrManager
              ? 'Yönetici kişisel bilgilerin ve salon hesap güvenliğin.'
              : 'Kişisel bilgilerin ve çalışma portalı hesap güvenliğin.'}
        </p>
      </motion.div>

      {/* Card 1: Profile Info */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8),0_0_32px_-14px_rgba(245,158,11,0.16)] sm:p-8"
      >
        {/* Top Section: Avatar + Name/Contact + Role Pill Badge */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 font-serif text-2xl font-bold text-[#D97706] shadow-sm dark:border-amber-400/35 dark:from-amber-500/25 dark:via-amber-500/15 dark:to-slate-900 dark:text-amber-300 dark:shadow-[0_0_24px_rgba(245,158,11,0.22)]">
              {avatarInitial || <UserCircle2 className="h-8 w-8" />}
            </div>

            <div className="min-w-0">
              <h2 className="truncate font-serif text-2xl font-bold text-slate-900 dark:text-white">
                {displayName}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
                  {user?.email}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
                  {phoneNumber.trim() || user?.phoneNumber?.trim() || 'Telefon bilgisi eklenmemiş'}
                </span>
              </div>
            </div>
          </div>

          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-amber-500/30 bg-amber-500/12 px-3.5 py-1 text-xs font-semibold text-[#B45309] dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-300">
            {primaryRoleLabel}
          </span>
        </div>

        {/* Thin Divider */}
        <div className="my-6 h-px bg-slate-100 dark:bg-white/10" />

        {/* Subtle Roles Sub-Panel */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs dark:border-white/10 dark:bg-slate-950/60">
          <span className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="h-4 w-4 text-[#D97706] dark:text-amber-400" />
            Hesap Rolleri:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(user?.roles ?? []).map((role) => (
              <span
                key={role}
                className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              >
                {ROLE_LABELS[role] ?? role}
              </span>
            ))}
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="profile-first-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Ad
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="profile-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={profileLoading}
                  required
                  autoComplete="given-name"
                  className="h-12 w-full rounded-[16px] border border-slate-200/90 bg-slate-50/75 pl-11 pr-4 text-sm text-slate-900 transition-all focus:border-[#D97706] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:bg-slate-950"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-last-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Soyad
              </label>
              <input
                id="profile-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={profileLoading}
                required
                autoComplete="family-name"
                className="h-12 w-full rounded-[16px] border border-slate-200/90 bg-slate-50/75 px-4 text-sm text-slate-900 transition-all focus:border-[#D97706] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:bg-slate-950"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-phone"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Telefon
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                id="profile-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={profileLoading}
                required
                autoComplete="tel"
                placeholder="0555 123 45 67"
                className="h-12 w-full rounded-[16px] border border-slate-200/90 bg-slate-50/75 pl-11 pr-4 text-sm text-slate-900 transition-all focus:border-[#D97706] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:bg-slate-950"
              />
            </div>
          </div>

          {isEmployee && (
            <div className="space-y-1.5">
              <label
                htmlFor="profile-biography"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Uzmanlık Alanı / Biyografi
              </label>
              <input
                id="profile-biography"
                type="text"
                maxLength={400}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                disabled={profileLoading}
                placeholder="Örn: Modern Saç Kesimi, Fade & Sakal Tasarımı"
                className="h-12 w-full rounded-[16px] border border-slate-200/90 bg-slate-50/75 px-4 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#D97706] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400 dark:focus:bg-slate-950"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              isLoading={savingProfile}
              disabled={profileLoading}
              className="h-11 rounded-[16px] bg-[#D97706] px-6 text-sm font-semibold text-white shadow-md shadow-amber-600/25 transition-all hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.35)] dark:hover:bg-amber-400"
            >
              Bilgileri Kaydet
            </Button>
          </div>
        </form>
      </motion.section>

      {/* Card 2: Security Status (Customer No-Show Meter OR Owner/Employee Security Card) */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.06, ease: 'easeOut' }}
        className="rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8),0_0_32px_-14px_rgba(245,158,11,0.16)] sm:p-8"
      >
        {isCustomer ? (
          <>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/12 text-[#D97706] dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  Randevu Güvenlik Durumu
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Salonların ve diğer müşterilerin hakkını korumak için randevulara katılımınız
                  puanlanır.
                </p>
              </div>
            </div>

            {/* Highlighted Strike Meter Sub-Panel */}
            <div className="mt-6 space-y-4 rounded-[18px] border border-slate-200/80 bg-slate-50/85 p-5 dark:border-white/10 dark:bg-slate-950/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-300">
                  GELMEME / NO-SHOW İHLAL SAYACI
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                    penaltyLoading
                      ? 'border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400'
                      : activeStrikes === 0
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : activeStrikes < 3
                          ? 'border-amber-500/35 bg-amber-500/15 text-[#B45309] dark:text-amber-300'
                          : 'border-red-500/35 bg-red-500/15 text-red-600 dark:text-red-400',
                  )}
                >
                  {penaltyLoading
                    ? 'Durum yükleniyor...'
                    : activeStrikes === 0
                      ? '0/3 İhlal • Güvenilir Hesap'
                      : `${activeStrikes}/3 İhlal • ${activeStrikes >= 3 ? 'Kısıtlı' : 'Dikkat'}`}
                </span>
              </div>

              {/* Smooth Horizontal Progress Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    activeStrikes >= 3
                      ? 'bg-gradient-to-r from-red-500 to-rose-600'
                      : activeStrikes > 0
                        ? 'bg-gradient-to-r from-amber-500 to-[#D97706]'
                        : 'bg-emerald-500',
                  )}
                  style={{ width: `${activeStrikes === 0 ? 0 : progressPercent}%` }}
                />
              </div>

              {/* Status Warning / Info Text */}
              <div className="pt-0.5 text-xs">
                {penaltyLoading ? (
                  <p className="text-slate-500 dark:text-slate-400">
                    Randevu güvenlik durumunuz kontrol ediliyor…
                  </p>
                ) : activeStrikes === 0 ? (
                  <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Harika! Tüm randevularınıza zamanında katıldınız. Hiçbir kısıtlamanız bulunmuyor.
                  </p>
                ) : isRestricted ? (
                  <p className="flex items-center gap-2 font-semibold text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {penaltyStatus?.restrictionMessage ||
                      '3 kez randevuya gelmediğiniz için geçici olarak yeni randevu alımınız sınırlandırılmıştır.'}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 font-medium text-[#B45309] dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Randevunuzu katılamayacağınız durumlarda lütfen en az 2 saat öncesinden iptal
                    ediniz.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Muted Info Row */}
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
                Ceza puanları 30 gün sonra otomatik olarak sıfırlanır.
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Zamanında yapılan iptaller ceza puanına yol açmaz.
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/12 text-[#D97706] dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  {isOwnerOrManager ? 'İşletme & Yetki Güvenliği' : 'Çalışan Portalı Güvenliği'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {isOwnerOrManager
                    ? 'Salon yönetimi, şube ayarları ve personel yetkilendirmeleriniz aktif olarak korunmaktadır.'
                    : 'Atandığınız şube ve günlük randevu akışınıza güvenli oturum üzerinden erişiyorsunuz.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col justify-between gap-4 rounded-[18px] border border-slate-200/80 bg-slate-50/85 p-5 dark:border-white/10 dark:bg-slate-950/70 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706] dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isOwnerOrManager ? 'Aktif İşletme Yetkisi' : 'Aktif Çalışan Profili'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {isOwnerOrManager
                      ? 'İşletme bilgilerini, şubeleri ve abonelik paketini yönetim menüsünden düzenleyebilirsin.'
                      : 'Çalıştığın şubeleri ve günlük müşteri randevularını sol menüden takip edebilirsin.'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(isOwnerOrManager ? '/admin/business' : '/admin/workplaces')}
                className="shrink-0 rounded-xl dark:border-amber-500/30 dark:text-amber-300"
              >
                {isOwnerOrManager ? 'İşletme Profili' : 'Çalıştığım Yerler'}
              </Button>
            </div>
          </>
        )}
      </motion.section>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          variant="outline"
          onClick={() => navigate(secondaryAction.to)}
          className="h-11 rounded-[16px] border-slate-200/90 bg-white/80 px-5 text-sm font-semibold text-slate-700 hover:border-amber-500/50 hover:text-[#D97706] dark:border-white/15 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-amber-400/50 dark:hover:text-amber-300"
        >
          {secondaryAction.label}
        </Button>

        <Button
          variant="danger"
          onClick={() => {
            logout();
            toast.success('Başarıyla çıkış yapıldı.');
            navigate('/login', { replace: true, state: null });
          }}
          className="h-11 gap-2 rounded-[16px] bg-red-600 px-5 text-sm font-semibold text-white shadow-md shadow-red-600/20 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
        >
          <LogOut className="h-4 w-4" />
          Oturumu Kapat
        </Button>
      </div>
    </div>
  );
};
