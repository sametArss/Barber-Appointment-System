import React, { useEffect, useState } from 'react';
import { Building2, MapPin, Phone, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Skeleton } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import type { BusinessProfileResponse } from '@/types/subscription';

export const AdminBusinessProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BusinessProfileResponse | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService
      .getMyBusiness()
      .then((res) => {
        if (res.success && res.data) {
          setProfile(res.data);
          setName(res.data.name);
          setDescription(res.data.description ?? '');
          setPhoneNumber(res.data.phoneNumber);
        } else {
          toast.error(res.message || 'İşletme bilgileri alınamadı.');
        }
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'İşletme bilgileri alınamadı.')))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges =
    profile !== null &&
    (name.trim() !== profile.name ||
      description.trim() !== (profile.description ?? '') ||
      phoneNumber.trim() !== profile.phoneNumber);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.warning('İşletme adı boş bırakılamaz.');
      return;
    }
    setSaving(true);
    try {
      const res = await adminService.updateMyBusiness({
        name: name.trim(),
        description: description.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      if (!res.success || !res.data) {
        toast.error(res.message || 'Değişiklikler kaydedilemedi.');
        return;
      }
      setProfile((prev) => ({
        ...res.data!,
        branches: res.data!.branches?.length ? res.data!.branches : (prev?.branches ?? []),
      }));
      toast.success('İşletme profili güncellendi.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Değişiklikler kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  const branches = profile?.branches ?? [];
  const activeBranchCount = branches.filter((b) => b.isActive).length;
  const brandInitial = (name.trim() || profile?.name || 'S').charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-5xl space-y-7 py-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D97706] dark:text-amber-400">
            İşletme Ayarları
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
            İşletme Profili
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Müşterilerin keşfet ekranında göreceği marka adını, tanıtımını ve ortak iletişim
            numarasını düzenle.
          </p>
        </div>

        {profile && (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{profile.isActive ? 'Aktif İşletme' : 'Pasif İşletme'}</span>
            <span className="text-emerald-600/50 dark:text-emerald-400/50">•</span>
            <span>{activeBranchCount} Aktif Şube</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Skeleton className="h-[420px] rounded-[24px]" />
          <Skeleton className="h-[420px] rounded-[24px]" />
        </div>
      ) : !profile ? (
        <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-10 text-center shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            İşletme profili yüklenemedi. Sayfayı yenileyip tekrar deneyin.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <section className="rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8),0_0_32px_-14px_rgba(245,158,11,0.16)] sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 font-serif text-2xl font-bold text-[#D97706] shadow-sm dark:border-amber-400/35 dark:from-amber-500/25 dark:to-slate-900 dark:text-amber-300">
                {brandInitial}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-serif text-xl font-bold text-slate-900 dark:text-white">
                  Genel Marka Bilgileri
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  İletişim telefonu tüm şubelerde ortak numara olarak gösterilir.
                </p>
              </div>
            </div>

            <div className="my-6 h-px bg-slate-100 dark:bg-white/10" />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="biz-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  İşletme Adı
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="biz-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                    placeholder="Örn: Makas Sanat Berber & Salon"
                    className="h-12 w-full rounded-[16px] border border-slate-200/90 bg-slate-50/75 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#D97706] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:bg-slate-950"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="biz-phone"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  İletişim Telefonu
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="biz-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    autoComplete="tel"
                    placeholder="0212 333 44 55"
                    className="h-12 w-full rounded-[16px] border border-slate-200/90 bg-slate-50/75 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#D97706] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:bg-slate-950"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="biz-description"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Kısa Tanıtım &amp; Marka Hikayesi
                  </label>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {description.length}/600
                  </span>
                </div>
                <textarea
                  id="biz-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={600}
                  placeholder="Salonunuzun atmosferini, uzmanlıklarınızı ve müşterilere sunduğunuz deneyimi kısaca anlatın."
                  className="w-full resize-y rounded-[16px] border border-slate-200/90 bg-slate-50/75 p-4 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#D97706] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400 dark:focus:bg-slate-950"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-white/10">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {hasChanges ? 'Kaydedilmemiş değişiklikleriniz var.' : 'Tüm bilgiler güncel.'}
                </span>
                <Button
                  type="submit"
                  isLoading={saving}
                  className="h-11 rounded-[16px] bg-[#D97706] px-6 text-sm font-semibold text-white shadow-md shadow-amber-600/25 transition-all hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.35)] dark:hover:bg-amber-400"
                >
                  Değişiklikleri Kaydet
                </Button>
              </div>
            </form>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/85 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8)]">
              <div className="relative h-24 bg-gradient-to-br from-amber-500/25 via-orange-400/15 to-transparent p-5 dark:from-amber-500/25 dark:via-amber-600/10 dark:to-slate-900">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309] backdrop-blur-md dark:border-amber-400/30 dark:bg-slate-950/70 dark:text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  Müşteri Önizlemesi
                </span>
              </div>

              <div className="-mt-8 px-6 pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-[#D97706] to-amber-500 font-serif text-2xl font-bold text-white shadow-lg dark:border-slate-900">
                  {brandInitial}
                </div>

                <h3 className="mt-3 font-serif text-xl font-bold text-slate-900 dark:text-white">
                  {name.trim() || 'İşletme Adı'}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {description.trim() ||
                    'Kısa tanıtım metniniz burada müşterilere zarif bir şekilde gösterilir.'}
                </p>

                <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
                  <Phone className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
                  <span>{phoneNumber.trim() || 'Telefon belirtilmedi'}</span>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/10">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Bağlı Şubeler ({branches.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/branches')}
                      className="cursor-pointer text-[11px] font-semibold text-[#D97706] hover:underline dark:text-amber-400"
                    >
                      Şubeleri Yönet →
                    </button>
                  </div>

                  {branches.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Henüz tanımlı şube yok.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {branches.slice(0, 4).map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs dark:border-white/5 dark:bg-slate-950/50"
                        >
                          <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
                            <span className="truncate">{b.name}</span>
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {b.district}/{b.city}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
