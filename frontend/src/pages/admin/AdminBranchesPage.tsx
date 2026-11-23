import React, { useEffect, useState } from 'react';
import { Building2, LocateFixed, MapPin, Pencil, Phone, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from '@/components/ui';
import { getApiErrorMessage } from '@/lib/utils';
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
        ? await adminService.updateBranch({ ...payload, id: editingBranch.id, isActive: branchActive })
        : await adminService.createBranch(payload);

      if (!res.success) {
        toast.error(res.message || 'Şube eklenemedi.');
        return;
      }

      toast.success(editingBranch ? 'Şube bilgileri güncellendi.' : 'Yeni şubeniz başarıyla açıldı!');
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Şube Yönetimi
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            İşletmenize bağlı tüm şubeleri görüntüleyin, yeni şube tanımlayın.
          </p>
          {subscription && (
            <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
              Şube kotası:{' '}
              <strong className="text-slate-800 dark:text-zinc-200">
                {branches.length} / {subscription.maxBranchCount}
              </strong>
            </p>
          )}
        </div>

        {subscription && branches.length >= subscription.maxBranchCount ? (
          <Button variant="outline" onClick={() => navigate('/admin/subscription')}>
            Şube kotasını yükselt
          </Button>
        ) : (
          <Button onClick={openCreateModal} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Yeni Şube Ekle
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Building2 className="h-10 w-10 text-amber-500/40 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-200">
              Henüz kayıtlı bir şubeniz bulunmuyor
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              Yukarıdaki butona tıklayarak ilk şubenizi ekleyin ve randevuları kabul etmeye başlayın.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <Card key={b.id} accent={b.isActive}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={b.isActive ? 'success' : 'default'} className="text-[10px]">
                    {b.isActive ? 'Hizmete Açık' : 'Kapalı'}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    {b.city} / {b.district}
                  </span>
                </div>
                <CardTitle className="text-base mt-1">{b.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
                <p className="flex items-start gap-1.5 line-clamp-2">
                  <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{b.address}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>{b.phoneNumber || 'Telefon belirtilmedi'}</span>
                </p>
                <Button variant="outline" size="sm" className="mt-2 w-full gap-2" onClick={() => openEditModal(b)}>
                  <Pencil className="h-3.5 w-3.5" /> Şubeyi düzenle
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card accent className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl">
            <CardHeader className="relative">
              <button
                type="button"
                onClick={() => {
                  setOpenModal(false);
                  resetBranchForm();
                }}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
              <CardTitle>{editingBranch ? 'Şubeyi Düzenle' : 'Yeni Şube Oluştur'}</CardTitle>
              <CardDescription>
                Adres ve konum bilgilerini güncel tutun. Salon telefonu işletme profilinizden yönetilir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBranch} className="space-y-3.5">
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
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-50/70 p-3 dark:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">
                        Haritadaki konum
                      </p>
                      <p className="text-xs text-slate-500">
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
                    className="gap-2"
                  >
                    <LocateFixed className="h-4 w-4" /> Konumumu al
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
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
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 dark:border-zinc-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={branchActive}
                      onChange={(e) => setBranchActive(e.target.checked)}
                      className="h-4 w-4 accent-amber-600"
                    />{' '}
                    Şube müşterilere açık ve randevu alabilir
                  </label>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOpenModal(false);
                      resetBranchForm();
                    }}
                  >
                    İptal
                  </Button>
                  <Button type="submit" size="sm" isLoading={creating}>
                    {editingBranch ? 'Değişiklikleri kaydet' : 'Şubeyi kaydet'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
