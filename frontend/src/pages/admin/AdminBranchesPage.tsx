import React, { useEffect, useState } from 'react';
import { Building2, LocateFixed, MapPin, Pencil, Phone, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Input, Skeleton } from '@/components/ui';
import { cn, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import type { BranchResponse, BusinessSubscriptionDetails } from '@/types/subscription';

export const AdminBranchesPage: React.FC = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [locating, setLocating] = useState(false);
  const [subscription, setSubscription] = useState<BusinessSubscriptionDetails | null>(null);
  const [branchActive, setBranchActive] = useState(true);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const resetBranchForm = () => {
    setName('');
    setCity('');
    setDistrict('');
    setAddress('');
    setLatitude('');
    setLongitude('');
    setEditingBranch(null);
    setBranchActive(true);
  };

  const openCreateModal = () => {
    resetBranchForm();
    setOpenModal(true);
  };

  const openEditModal = (branch: BranchResponse) => {
    setEditingBranch(branch);
    setName(branch.name);
    setCity(branch.city);
    setDistrict(branch.district);
    setAddress(branch.address);
    setLatitude(String(branch.latitude));
    setLongitude(String(branch.longitude));
    setBranchActive(branch.isActive);
    setOpenModal(true);
  };

  const captureBranchLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tarayıcı konum almayı desteklemiyor.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
        setLocating(false);
        toast.success('Şube konumu alındı.');
      },
      () => {
        setLocating(false);
        toast.error('Konum alınamadı. Tarayıcı iznini kontrol edin.');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const [res, subRes] = await Promise.all([
        adminService.getMyBranches(),
        adminService.getMySubscription(),
      ]);
      if (res.success && res.data) {
        setBranches(res.data);
      }
      if (subRes.success && subRes.data) setSubscription(subRes.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Şubeler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      !latitude ||
      !longitude ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      toast.warning('Şube için geçerli konum bilgisi girin veya konumunuzu alın.');
      return;
    }
    setCreating(true);

    try {
      const payload = {
        name: name.trim(),
        city: city.trim(),
        district: district.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
      };
      const res = editingBranch
        ? await adminService.updateBranch({
            ...payload,
            id: editingBranch.id,
            isActive: branchActive,
          })
        : await adminService.createBranch(payload);

      if (!res.success) {
        toast.error(res.message || 'Şube eklenemedi.');
        return;
      }

      toast.success(
        editingBranch ? 'Şube bilgileri güncellendi.' : 'Yeni şubeniz başarıyla açıldı!',
      );
      setOpenModal(false);
      resetBranchForm();
      await fetchBranches();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Şube açılırken bir hata oluştu.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-7 py-2">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D97706] dark:text-amber-400">
            Salon Ağı
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
            Şube Yönetimi
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            İşletmenize bağlı tüm şubeleri görüntüleyin, adres ve konum ayarlarını yönetin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {subscription && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-[#B45309] dark:border-amber-400/30 dark:text-amber-300">
              <Building2 className="h-3.5 w-3.5" />
              Kota: {branches.length} / {subscription.maxBranchCount}
            </span>
          )}

          {subscription && branches.length >= subscription.maxBranchCount ? (
            <Button
              variant="outline"
              onClick={() => navigate('/admin/subscription')}
              className="h-11 rounded-[16px] px-5 text-sm font-semibold"
            >
              Şube Kotasını Yükselt
            </Button>
          ) : (
            <Button
              onClick={openCreateModal}
              className="h-11 gap-2 rounded-[16px] bg-[#D97706] px-5 text-sm font-semibold text-white shadow-md shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.3)] dark:hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Yeni Şube Ekle
            </Button>
          )}
        </div>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-[22px]" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-12 text-center shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
          <Building2 className="mx-auto h-10 w-10 text-[#D97706]/50 dark:text-amber-400/50" />
          <h3 className="mt-3 font-serif text-xl font-bold text-slate-900 dark:text-white">
            Henüz kayıtlı bir şubeniz bulunmuyor
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Yukarıdaki butona tıklayarak ilk şubenizi ekleyin ve randevuları kabul etmeye başlayın.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <article
              key={b.id}
              className={cn(
                'flex flex-col justify-between rounded-[22px] border bg-white/85 p-5.5 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/45 dark:bg-slate-900/65 dark:shadow-[0_24px_65px_-26px_rgba(0,0,0,0.8)]',
                b.isActive
                  ? 'border-slate-200/80 dark:border-amber-500/20'
                  : 'border-slate-200/60 opacity-80 dark:border-white/10',
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                      b.isActive
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300'
                        : 'border-slate-300 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        b.isActive ? 'bg-emerald-500' : 'bg-slate-400',
                      )}
                    />
                    {b.isActive ? 'Hizmete Açık' : 'Kapalı'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {b.district} / {b.city}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-[#D97706] dark:border-amber-400/30 dark:text-amber-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h2 className="truncate font-serif text-lg font-bold text-slate-900 dark:text-white">
                    {b.name}
                  </h2>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
                    <span className="line-clamp-2">{b.address}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
                    <span>{b.phoneNumber || 'Telefon belirtilmedi'}</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-3.5 dark:border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-full gap-2 rounded-[12px] text-xs font-semibold"
                  onClick={() => openEditModal(b)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Şubeyi Düzenle
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-amber-500/25 dark:bg-slate-900/95 sm:p-7">
            <div className="relative pr-8">
              <button
                type="button"
                onClick={() => {
                  setOpenModal(false);
                  resetBranchForm();
                }}
                className="absolute right-0 top-0 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                {editingBranch ? 'Şubeyi Düzenle' : 'Yeni Şube Oluştur'}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Adres ve konum bilgilerini güncel tutun. Salon telefonu işletme profilinizden
                yönetilir.
              </p>
            </div>

            <form onSubmit={handleCreateBranch} className="mt-5 space-y-4">
              <Input
                label="Şube Adı"
                placeholder="Örn: Beşiktaş Çarşı Şubesi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Şehir"
                  placeholder="İstanbul"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
                <Input
                  label="İlçe"
                  placeholder="Beşiktaş"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Açık Adres"
                placeholder="Cadde, Sokak, Kapı No"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />

              <div className="flex flex-col gap-3 rounded-[16px] border border-amber-500/25 bg-amber-50/70 p-3.5 dark:bg-amber-500/8 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706] dark:text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      Haritadaki Konum
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      En doğru sonuç için şubedeyken konumunu al.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={captureBranchLocation}
                  isLoading={locating}
                  className="gap-1.5 rounded-xl text-xs"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  Konumumu Al
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Enlem (Lat)"
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
                <Input
                  label="Boylam (Lng)"
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>

              {editingBranch && (
                <label className="flex cursor-pointer items-center gap-2.5 rounded-[14px] border border-slate-200 bg-slate-50/70 p-3 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={branchActive}
                    onChange={(e) => setBranchActive(e.target.checked)}
                    className="h-4 w-4 accent-[#D97706]"
                  />
                  Şube müşterilere açık ve randevu alabilir
                </label>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpenModal(false);
                    resetBranchForm();
                  }}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={creating}
                  className="h-10 rounded-[12px] bg-[#D97706] px-5 font-semibold text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
                >
                  {editingBranch ? 'Değişiklikleri Kaydet' : 'Şubeyi Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
