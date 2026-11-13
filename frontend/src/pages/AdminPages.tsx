import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  MapPin,
  LocateFixed,
  Phone,
  Pencil,
  Plus,
  Sparkles,
  Search,
  RefreshCw,
  User,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
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
import { formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import { bookingService } from '@/services/bookingService';
import type { BusinessServiceItem } from '@/types/admin';
import type { StaffResponse } from '@/types/booking';
import type { DashboardSummaryResponse } from '@/types/dashboard';
import type {
  BranchResponse,
  BusinessProfileResponse,
  BusinessSubscriptionDetails,
  SubscriptionPlan,
} from '@/types/subscription';

export const AdminBusinessProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<BusinessProfileResponse | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService.getMyBusiness().then((res) => {
      if (res.success && res.data) {
        setProfile(res.data); setName(res.data.name); setDescription(res.data.description ?? ''); setPhoneNumber(res.data.phoneNumber);
      } else toast.error(res.message || 'İşletme bilgileri alınamadı.');
    }).catch((error) => toast.error(getApiErrorMessage(error, 'İşletme bilgileri alınamadı.')))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const res = await adminService.updateMyBusiness({ name: name.trim(), description: description.trim(), phoneNumber: phoneNumber.trim() });
      if (!res.success || !res.data) { toast.error(res.message || 'Değişiklikler kaydedilemedi.'); return; }
      setProfile(res.data); toast.success('İşletme profili güncellendi.');
    } catch (error) { toast.error(getApiErrorMessage(error, 'Değişiklikler kaydedilemedi.')); }
    finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">İşletme ayarları</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">İşletme profili</h1><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Müşterilerin göreceği işletme adını, açıklamayı ve iletişim telefonunu düzenle.</p></div>
      <Card>
        <CardHeader><CardTitle>Genel bilgiler</CardTitle><CardDescription>Telefon numarası tüm şubelerde ortak iletişim numarası olarak gösterilir.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="space-y-3"><Skeleton className="h-12"/><Skeleton className="h-24"/><Skeleton className="h-12"/></div> : !profile ? <p className="text-sm text-slate-500">İşletme profili yüklenemedi. Sayfayı yenileyip tekrar dene.</p> : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="İşletme adı" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120}/>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Kısa tanıtım</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={600} placeholder="Salonunuzu ve sunduğunuz deneyimi kısaca anlatın." className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"/><span className="block text-right text-[11px] text-slate-400">{description.length}/600</span></label>
              <Input label="İletişim telefonu" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required autoComplete="tel"/>
              <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-zinc-800"><Button type="submit" isLoading={saving}>Değişiklikleri kaydet</Button></div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* =========================================================================
   1. ŞUBELERİM (BRANCHES) YÖNETİM SAYFASI
   ========================================================================= */
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

  // Form states
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const resetBranchForm = () => {
    setName(''); setCity(''); setDistrict(''); setAddress(''); setLatitude(''); setLongitude(''); setEditingBranch(null); setBranchActive(true);
  };
  const openCreateModal = () => { resetBranchForm(); setOpenModal(true); };
  const openEditModal = (branch: BranchResponse) => {
    setEditingBranch(branch); setName(branch.name); setCity(branch.city); setDistrict(branch.district);
    setAddress(branch.address); setLatitude(String(branch.latitude)); setLongitude(String(branch.longitude)); setBranchActive(branch.isActive); setOpenModal(true);
  };
  const captureBranchLocation = () => {
    if (!navigator.geolocation) { toast.error('Tarayıcı konum almayı desteklemiyor.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLatitude(coords.latitude.toFixed(6)); setLongitude(coords.longitude.toFixed(6)); setLocating(false);
      toast.success('Şube konumu alındı.');
    }, () => { setLocating(false); toast.error('Konum alınamadı. Tarayıcı iznini kontrol edin.'); }, { enableHighAccuracy: true, timeout: 12000 });
  };

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const [res, subRes] = await Promise.all([adminService.getMyBranches(), adminService.getMySubscription()]);
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
    const lat = Number(latitude); const lng = Number(longitude);
    if (!latitude || !longitude || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.warning('Şube için geçerli konum bilgisi girin veya konumunuzu alın.'); return;
    }
    setCreating(true);

    try {
      const payload = { name: name.trim(), city: city.trim(), district: district.trim(), address: address.trim(), latitude: lat, longitude: lng };
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
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Şube açılırken bir hata oluştu.');
      toast.error(msg);
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
          {subscription && <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">Şube kotası: <strong className="text-slate-800 dark:text-zinc-200">{branches.length} / {subscription.maxBranchCount}</strong></p>}
        </div>

        {subscription && branches.length >= subscription.maxBranchCount ? <Button variant="outline" onClick={() => navigate('/admin/subscription')}>Şube kotasını yükselt</Button> : <Button onClick={openCreateModal} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Yeni Şube Ekle
        </Button>}
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

      {/* New Branch Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card accent className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl">
            <CardHeader className="relative">
              <button
                type="button"
                  onClick={() => { setOpenModal(false); resetBranchForm(); }}
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
                    <div><p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">Haritadaki konum</p><p className="text-xs text-slate-500">En doğru sonuç için şubedeyken konumunu al.</p></div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={captureBranchLocation} isLoading={locating} className="gap-2"><LocateFixed className="h-4 w-4" /> Konumumu al</Button>
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
                {editingBranch && <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 dark:border-zinc-800 dark:text-zinc-200"><input type="checkbox" checked={branchActive} onChange={(e) => setBranchActive(e.target.checked)} className="h-4 w-4 accent-amber-600"/> Şube müşterilere açık ve randevu alabilir</label>}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button variant="ghost" size="sm" onClick={() => { setOpenModal(false); resetBranchForm(); }}>
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

/* =========================================================================
   2. PERSONEL & MESAİ YÖNETİM SAYFASI
   ========================================================================= */
export const AdminStaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openHoursModal, setOpenHoursModal] = useState(false);
  const [createdStaffLogin, setCreatedStaffLogin] = useState<{ fullName: string; email: string; temporaryPassword: string | null; accountAlreadyExisted: boolean } | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffResponse | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffResponse | null>(null);
  const [editingBiography, setEditingBiography] = useState('');
  const [editingBookable, setEditingBookable] = useState(true);
  const [savingStaffProfile, setSavingStaffProfile] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [biography, setBiography] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedStaffBranchIds, setSelectedStaffBranchIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [workingHours, setWorkingHours] = useState<Array<{ dayOfWeek: number; active: boolean; start: string; end: string; hasBreak: boolean; breakStart: string; breakEnd: string }>>(
    Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, active: dayOfWeek !== 0, start: '09:00', end: '19:00', hasBreak: true, breakStart: '13:00', breakEnd: '14:00' })),
  );
  const [loadingWorkingHours, setLoadingWorkingHours] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, branchRes] = await Promise.all([
        adminService.getBusinessStaff(),
        adminService.getMyBranches(),
      ]);

      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data);
      }
      if (branchRes.success && branchRes.data) {
        setBranches(branchRes.data);
        if (branchRes.data.length > 0) {
          setSelectedBranchId(branchRes.data[0].id);
          setSelectedStaffBranchIds((current) => current.length ? current : [branchRes.data![0].id]);
        }
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Personel verileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaffBranchIds.length === 0) {
      toast.warning('Lütfen personelin atanacağı en az 1 şube seçin.');
      return;
    }
    setSaving(true);

    try {
      const res = await adminService.createStaff({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        biography: biography.trim() || 'Uzman Berber',
        isBookable: true,
        branchIds: selectedStaffBranchIds,
      });

      if (!res.success) {
        toast.error(res.message || 'Personel eklenemedi.');
        return;
      }

      toast.success('Yeni berber kadroya eklendi!');
      setCreatedStaffLogin({ fullName: res.data?.fullName ?? `${firstName.trim()} ${lastName.trim()}`.trim(), email: res.data?.email ?? email.trim(), temporaryPassword: res.data?.temporaryPassword ?? null, accountAlreadyExisted: res.data?.accountAlreadyExisted ?? false });
      setOpenAddModal(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setBiography('');
      setSelectedStaffBranchIds(branches[0]?.id ? [branches[0].id] : []);
      await fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Personel eklenirken hata oluştu.'));
    } finally {
      setSaving(false);
    }
  };

  const loadWorkingHours = async (staffId: string, branchId: string) => {
    setLoadingWorkingHours(true);
    try {
      const res = await bookingService.getStaffWorkingHours(staffId, branchId);
      const defaults = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, active: false, start: '09:00', end: '19:00', hasBreak: true, breakStart: '13:00', breakEnd: '14:00' }));
      for (const hour of res.data ?? []) {
        const row = defaults[hour.dayOfWeek];
        if (row) {
          row.active = true;
          row.start = hour.startTime.slice(0, 5);
          row.end = hour.endTime.slice(0, 5);
          row.hasBreak = hour.breaks.length > 0;
          if (hour.breaks[0]) { row.breakStart = hour.breaks[0].startTime.slice(0, 5); row.breakEnd = hour.breaks[0].endTime.slice(0, 5); }
        }
      }
      setWorkingHours(defaults);
    } catch (error) {
      setWorkingHours(Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, active: false, start: '09:00', end: '19:00', hasBreak: true, breakStart: '13:00', breakEnd: '14:00' })));
      toast.error(getApiErrorMessage(error, 'Mevcut çalışma saatleri yüklenemedi.'));
    } finally { setLoadingWorkingHours(false); }
  };

  const openWorkingHours = (staff: StaffResponse) => {
    const branchId = staff.assignedBranchIds[0] ?? branches[0]?.id ?? '';
    setSelectedStaff(staff); setSelectedBranchId(branchId); setOpenHoursModal(true);
    if (branchId) loadWorkingHours(staff.id, branchId);
  };

  const saveStaffProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingStaff) return;
    setSavingStaffProfile(true);
    try {
      const res = await adminService.updateStaffProfile({ staffProfileId: editingStaff.id, biography: editingBiography.trim(), isBookable: editingBookable });
      if (!res.success) { toast.error(res.message || 'Personel profili güncellenemedi.'); return; }
      setStaffList((current) => current.map((staff) => staff.id === editingStaff.id ? { ...staff, biography: editingBiography.trim(), isBookable: editingBookable } : staff));
      setEditingStaff(null); toast.success('Personel profili güncellendi.');
    } catch (error) { toast.error(getApiErrorMessage(error, 'Personel profili güncellenemedi.')); }
    finally { setSavingStaffProfile(false); }
  };

  const handleSaveWorkingHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedBranchId) return;
    if (!workingHours.some((day) => day.active)) { toast.warning('En az bir çalışma günü seçin.'); return; }
    setSaving(true);

    try {
      const toApiTime = (value: string) => value.length === 5 ? `${value}:00` : value;
      const days = workingHours.filter((day) => day.active).map((day) => ({
        dayOfWeek: day.dayOfWeek,
        startTime: toApiTime(day.start),
        endTime: toApiTime(day.end),
        breaks: day.hasBreak ? [{ startTime: toApiTime(day.breakStart), endTime: toApiTime(day.breakEnd) }] : [],
      }));

      const res = await adminService.setStaffWorkingHours({
        staffProfileId: selectedStaff.id,
        branchId: selectedBranchId,
        workingHours: days,
      });

      if (!res.success) {
        toast.error(res.message || 'Çalışma saatleri güncellenemedi.');
        return;
      }

      toast.success('Çalışma günleri ve saatleri güncellendi.');
      setOpenHoursModal(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Mesai saatleri kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Personel &amp; Çalışma Saatleri
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Berber kadrosunu yönetin, şube atamalarını ve mesai/mola aralıklarını belirleyin.
          </p>
        </div>

        <Button onClick={() => { setSelectedStaffBranchIds(branches[0]?.id ? [branches[0].id] : []); setOpenAddModal(true); }} className="gap-2 shadow-sm" disabled={branches.length === 0}>
          <Plus className="h-4 w-4" />
          Yeni Personel Ekle
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Users className="h-10 w-10 text-amber-500/40 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-200">
              Henüz personel kaydınız bulunmuyor
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              Salonunuzdaki uzmanları sisteme ekleyin ve randevu takvimini aktif edin.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffList.map((s) => (
            <Card key={s.id} accent={s.isBookable}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-sm font-bold text-amber-600 dark:text-amber-400 shadow-sm">
                    {s.fullName.charAt(0).toUpperCase()}
                  </div>
                  <Badge variant={s.isBookable ? 'success' : 'default'} className="text-[10px]">
                    {s.isBookable ? 'Randevuya Açık' : 'Pasif'}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{s.fullName}</CardTitle>
                <CardDescription className="line-clamp-1">{s.biography || 'Uzman Berber'}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-2 text-xs">
                <div className="text-slate-500 dark:text-zinc-400 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-amber-500" />
                    {s.email}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-amber-500" />
                    {s.phoneNumber || 'Telefon yok'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 dark:border-zinc-800">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => { setEditingStaff(s); setEditingBiography(s.biography ?? ''); setEditingBookable(s.isBookable); }}><Pencil className="h-3.5 w-3.5"/> Profili düzenle</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => openWorkingHours(s)}
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Mesai &amp; Mola Ayarla
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingStaff && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
          <CardHeader className="relative"><button type="button" onClick={() => setEditingStaff(null)} className="absolute right-5 top-5 text-slate-400" aria-label="Kapat"><X className="h-5 w-5"/></button><CardTitle>{editingStaff.fullName} · Profil</CardTitle><CardDescription>Tanıtım metnini ve müşterilerin bu personelden randevu alıp alamayacağını düzenle.</CardDescription></CardHeader>
          <CardContent><form onSubmit={saveStaffProfile} className="space-y-4"><Input label="Uzmanlık / Biyografi" value={editingBiography} onChange={(e) => setEditingBiography(e.target.value)} maxLength={400} placeholder="Uzmanlık alanı ve deneyim"/><label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 dark:border-zinc-800 dark:text-zinc-200"><input type="checkbox" checked={editingBookable} onChange={(e) => setEditingBookable(e.target.checked)} className="h-4 w-4 accent-amber-600"/> Müşteriler randevu alabilsin</label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-zinc-800"><Button type="button" variant="ghost" onClick={() => setEditingStaff(null)}>İptal</Button><Button type="submit" isLoading={savingStaffProfile}>Değişiklikleri kaydet</Button></div></form></CardContent>
        </Card>
      </div>}

      {/* Add Staff Modal */}
      {openAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card accent className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl">
            <CardHeader className="relative">
              <button
                type="button"
                onClick={() => setOpenAddModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
              <CardTitle>Yeni Personel Ekle</CardTitle>
              <CardDescription>
                Berber kadronuza yeni bir çalışan tanımlayın ve şubesini seçin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStaff} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ad"
                    placeholder="Samet"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <Input
                    label="Soyad"
                    placeholder="Demir"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <Input
                  label="E-posta"
                  type="email"
                  placeholder="samet@makas.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Telefon"
                  placeholder="0555 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
                <Input
                  label="Uzmanlık / Biyografi"
                  placeholder="Saç & Sakal Tasarım Uzmanı"
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                />
                <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Bu e-posta zaten kayıtlıysa mevcut hesap kullanılır; çalışanın adı ve parolası değişmez. Yeni hesap için giriş parolası kayıt sonrasında yalnızca bir kez gösterilir.</p>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Çalışacağı şubeler</label>
                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    {branches.map((branch) => <label key={branch.id} className="flex cursor-pointer items-center gap-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200"><input type="checkbox" checked={selectedStaffBranchIds.includes(branch.id)} onChange={() => setSelectedStaffBranchIds((current) => current.includes(branch.id) ? current.filter((id) => id !== branch.id) : [...current, branch.id])} className="h-4 w-4 accent-amber-600"/>{branch.name} <span className="text-slate-400">({branch.district})</span></label>)}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button variant="ghost" size="sm" onClick={() => setOpenAddModal(false)}>
                    İptal
                  </Button>
                  <Button type="submit" size="sm" isLoading={saving}>
                    Personeli Kaydet
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {createdStaffLogin && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-md shadow-2xl"><CardHeader><CardTitle>Çalışan hesabı hazır</CardTitle><CardDescription>{createdStaffLogin.fullName} · {createdStaffLogin.email}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {createdStaffLogin.temporaryPassword ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"><p className="text-xs font-semibold text-amber-900 dark:text-amber-200">İlk giriş parolası · çalışana güvenli şekilde ilet</p><code className="mt-2 block select-all text-lg font-bold tracking-wider text-slate-900 dark:text-zinc-100">{createdStaffLogin.temporaryPassword}</code></div> : <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">Bu e-posta mevcut bir hesaba ait. Çalışan kendi mevcut parolasıyla giriş yapabilir; hesabına çalışan erişimi eklendi.</p>}
            <p className="text-xs text-slate-500 dark:text-zinc-400">Giriş yaptıktan sonra çalışan, kendisine atanan salon paneline yönlendirilir.</p>
            <div className="flex justify-end"><Button onClick={() => setCreatedStaffLogin(null)}>Tamam</Button></div>
          </CardContent>
        </Card>
      </div>}

      {/* Set Working Hours Modal */}
      {openHoursModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card accent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-2xl">
            <CardHeader className="relative">
              <button
                type="button"
                onClick={() => setOpenHoursModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
              <CardTitle>{selectedStaff.fullName} • Çalışma Saatleri</CardTitle>
              <CardDescription>
                Haftalık mesai ve slot motoru tarafından kapatılacak öğle molasını belirleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveWorkingHours} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Geçerli Şube
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => { setSelectedBranchId(e.target.value); loadWorkingHours(selectedStaff.id, e.target.value); }}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-zinc-800 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100"
                  >
                    {branches.filter((b) => selectedStaff.assignedBranchIds.includes(b.id)).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {loadingWorkingHours ? <div className="space-y-2"><Skeleton className="h-16"/><Skeleton className="h-16"/></div> : <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                  {['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'].map((label, dayOfWeek) => {
                    const day = workingHours[dayOfWeek];
                    if (!day) return null;
                    const updateDay = (patch: Partial<typeof day>) => setWorkingHours((current) => current.map((item) => item.dayOfWeek === dayOfWeek ? { ...item, ...patch } : item));
                    return <div key={label} className={`rounded-xl border p-3 ${day.active ? 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5' : 'border-slate-200 dark:border-zinc-800'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-zinc-200"><input type="checkbox" checked={day.active} onChange={(e) => updateDay({ active: e.target.checked })} className="h-4 w-4 accent-amber-600"/>{label}</label>
                        {day.active && <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Çalışıyor</span>}
                      </div>
                      {day.active && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <label className="text-[10px] text-slate-500">Başlangıç<input type="time" value={day.start} onChange={(e) => updateDay({ start: e.target.value })} required className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"/></label>
                        <label className="text-[10px] text-slate-500">Bitiş<input type="time" value={day.end} onChange={(e) => updateDay({ end: e.target.value })} required className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"/></label>
                        <label className="text-[10px] text-slate-500">Mola başlangıcı<input type="time" value={day.breakStart} disabled={!day.hasBreak} onChange={(e) => updateDay({ breakStart: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"/></label>
                        <label className="text-[10px] text-slate-500">Mola bitişi<input type="time" value={day.breakEnd} disabled={!day.hasBreak} onChange={(e) => updateDay({ breakEnd: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"/></label>
                        <label className="col-span-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-zinc-400 sm:col-span-4"><input type="checkbox" checked={day.hasBreak} onChange={(e) => updateDay({ hasBreak: e.target.checked })} className="h-3.5 w-3.5 accent-amber-600"/>Mola kullan</label>
                      </div>}
                    </div>;
                  })}
                </div>}

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">Çalışma saatleri seçilen şube ve personel için kaydedilir. Kapalı günler randevu saatlerinde görünmez.</div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button variant="ghost" size="sm" onClick={() => setOpenHoursModal(false)}>
                    Kapat
                  </Button>
                  <Button type="submit" size="sm" isLoading={saving}>
                    Saatleri Tanımla
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

/* =========================================================================
   3. HİZMET KATALOĞU (SERVICES) YÖNETİM SAYFASI
   ========================================================================= */
export const AdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<BusinessServiceItem[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editingService, setEditingService] = useState<BusinessServiceItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatingServiceId, setUpdatingServiceId] = useState<string | null>(null);
  const [serviceQuery, setServiceQuery] = useState('');
  const [serviceStatus, setServiceStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [serviceBranchId, setServiceBranchId] = useState('all');

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [basePrice, setBasePrice] = useState(350);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [svcRes, bRes] = await Promise.all([
        adminService.getBusinessServices(),
        adminService.getMyBranches(),
      ]);

      if (svcRes.success && svcRes.data) {
        setServices(svcRes.data);
      }
      if (bRes.success && bRes.data) {
        setBranches(bRes.data);
        if (bRes.data.length > 0 && selectedBranchIds.length === 0) {
          setSelectedBranchIds([bRes.data[0].id]);
        }
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Hizmetler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredServices = useMemo(() => services.filter((service) => {
    const matchesQuery = `${service.name} ${service.description ?? ''}`.toLocaleLowerCase('tr').includes(serviceQuery.trim().toLocaleLowerCase('tr'));
    const matchesStatus = serviceStatus === 'all' || service.isActive === (serviceStatus === 'active');
    const matchesBranch = serviceBranchId === 'all' || service.assignedBranchIds?.includes(serviceBranchId);
    return matchesQuery && matchesStatus && matchesBranch;
  }), [services, serviceQuery, serviceStatus, serviceBranchId]);

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    );
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService && selectedBranchIds.length === 0) {
      toast.warning('Lütfen hizmetin sunulacağı en az 1 şube seçin.');
      return;
    }
    setCreating(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        durationMinutes,
        basePrice,
        assignToBranchIds: selectedBranchIds,
      };
      const res = editingService
        ? await adminService.updateService({ ...payload, id: editingService.id, isActive: editingService.isActive })
        : await adminService.createService(payload);

      if (!res.success) {
        toast.error(res.message || 'Hizmet oluşturulamadı.');
        return;
      }

      toast.success(editingService ? 'Hizmet bilgileri güncellendi.' : 'Hizmet eklendi ve seçili şubelere atandı.');
      setOpenModal(false);
      setEditingService(null);
      setName('');
      setDescription('');
      await fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Hizmet eklenirken hata oluştu.'));
    } finally {
      setCreating(false);
    }
  };

  const toggleServiceStatus = async (service: BusinessServiceItem) => {
    setUpdatingServiceId(service.id);
    try {
      const res = await adminService.updateService({
        id: service.id, name: service.name, description: service.description,
        durationMinutes: service.durationMinutes, basePrice: service.basePrice, isActive: !service.isActive,
      });
      if (!res.success) { toast.error(res.message || 'Hizmet durumu değiştirilemedi.'); return; }
      setServices((current) => current.map((item) => item.id === service.id ? { ...item, isActive: !service.isActive } : item));
      toast.success(service.isActive ? 'Hizmet randevuya kapatıldı.' : 'Hizmet yeniden randevuya açıldı.');
    } catch (error) { toast.error(getApiErrorMessage(error, 'Hizmet durumu değiştirilemedi.')); }
    finally { setUpdatingServiceId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Hizmet Kataloğu &amp; Fiyatlar
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Salonunuzda sunulan saç, sakal, bakım hizmetlerini ve geçerli şubelerini belirleyin.
          </p>
        </div>

        <Button onClick={() => { setEditingService(null); setName(''); setDescription(''); setBasePrice(350); setDurationMinutes(45); setOpenModal(true); }} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Yeni Hizmet Ekle
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-amber-500/40 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-200">
              Henüz tanımlı hizmet bulunmuyor
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              Hizmetlerinizi oluşturarak müşterilerinizin randevu almasını sağlayın.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
        <Card><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input aria-label="Hizmet ara" placeholder="Hizmet adı veya açıklama ara" value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} className="pl-9"/></div>
          <select aria-label="Hizmet durumu" value={serviceStatus} onChange={(event) => setServiceStatus(event.target.value as typeof serviceStatus)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"><option value="all">Tüm durumlar</option><option value="active">Randevuya açık</option><option value="inactive">Pasif</option></select>
          <select aria-label="Şubeye göre filtrele" value={serviceBranchId} onChange={(event) => setServiceBranchId(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"><option value="all">Tüm şubeler</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        </CardContent></Card>
        {filteredServices.length === 0 ? <Card><CardContent className="p-10 text-center"><p className="font-semibold text-slate-700 dark:text-zinc-200">Bu filtrelerle eşleşen hizmet yok</p><p className="mt-1 text-sm text-slate-500">Arama kelimesini veya filtreleri değiştirebilirsin.</p></CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((srv) => (
            <Card key={srv.id} accent={srv.isActive}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                    {formatCurrency(srv.basePrice)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    <Clock className="h-3 w-3 text-amber-500" />
                    {srv.durationMinutes} dk
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{srv.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {srv.description || 'Açıklama eklenmemiş.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {srv.assignedBranchNames && srv.assignedBranchNames.length > 0 ? (
                    srv.assignedBranchNames.map((bName) => (
                      <Badge key={bName} variant="amber" className="text-[10px]">
                        <Building2 className="h-2.5 w-2.5" />
                        {bName}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400">Şube atanmadı</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                  <span>Şube Bazlı İzole</span>
                  <span className={srv.isActive ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-slate-500'}>
                    {srv.isActive ? 'Randevuya açık' : 'Pasif'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                  setEditingService(srv); setName(srv.name); setDescription(srv.description ?? ''); setBasePrice(srv.basePrice); setDurationMinutes(srv.durationMinutes); setOpenModal(true);
                }}><Pencil className="h-3.5 w-3.5"/> Hizmeti düzenle</Button>
                <Button variant="outline" size="sm" disabled={updatingServiceId === srv.id} isLoading={updatingServiceId === srv.id} onClick={() => toggleServiceStatus(srv)}>{srv.isActive ? 'Pasife al' : 'Yayına al'}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        }
        </>
      )}

      {/* Add Service Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card accent className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl">
            <CardHeader className="relative">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
              <CardTitle>{editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Tanımla'}</CardTitle>
              <CardDescription>
                Hizmet adını, süresini ve müşteriye gösterilecek fiyatı belirleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateService} className="space-y-3.5">
                <Input
                  label="Hizmet Adı"
                  placeholder="Örn: Keratin Saç Bakımı"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Açıklama"
                  placeholder="Örn: Sıcak havlu masajı, yıkama ve özel şekillendirme"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Fiyat (TL)"
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <Input
                    label="Süre (Dakika)"
                    type="number"
                    step="5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                    required
                  />
                </div>

                {/* Branch assignment is selected only when creating a new service. */}
                {!editingService && <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Hizmetin Sunulacağı Şubeler
                  </label>
                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    {branches.map((b) => {
                      const checked = selectedBranchIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className="flex items-center gap-2.5 text-xs font-medium text-slate-800 dark:text-zinc-200 cursor-pointer py-1"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBranchSelection(b.id)}
                            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span>
                            {b.name} <span className="text-slate-400">({b.district})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button variant="ghost" size="sm" onClick={() => { setOpenModal(false); setEditingService(null); }}>
                    İptal
                  </Button>
                  <Button type="submit" size="sm" isLoading={creating}>
                    {editingService ? 'Değişiklikleri kaydet' : 'Hizmeti kaydet'}
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

/* =========================================================================
   4. ABONELİK & KOTA (SUBSCRIPTION) SAYFASI
   ========================================================================= */
export const AdminSubscriptionPage: React.FC = () => {
  const [sub, setSub] = useState<BusinessSubscriptionDetails | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [plansError, setPlansError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setPlansError('');
    try {
      const [subResult, plansResult] = await Promise.allSettled([
        adminService.getMySubscription(),
        adminService.getSubscriptionPlans(),
      ]);

      if (subResult.status === 'fulfilled' && subResult.value.success && subResult.value.data) {
        setSub(subResult.value.data);
      } else {
        // Aktif abonelik bulunmaması yeni hesaplarda normaldir; planları göstermeyi engellemez.
        setSub(null);
      }
      if (plansResult.status === 'fulfilled' && plansResult.value.success && plansResult.value.data) {
        setPlans(plansResult.value.data);
      } else {
        setPlans([]);
        setPlansError(plansResult.status === 'rejected' ? getApiErrorMessage(plansResult.reason, 'Paket seçenekleri alınamadı.') : plansResult.value.message || 'Paket seçenekleri şu anda alınamıyor.');
      }
    } catch (err) {
      const message = getApiErrorMessage(err, 'Paket seçenekleri alınamadı.');
      setPlansError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setUpgradingPlanId(planId);
    try {
      const res = await adminService.subscribe({
        planId,
        billingCycle: 1, // Monthly
      });

      if (!res.success) {
        toast.error(res.message || 'Paket geçişi başarısız oldu.');
        return;
      }

      toast.success('Abonelik paketiniz başarıyla güncellendi!');
      await fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Paket güncellenirken hata oluştu.'));
    } finally {
      setUpgradingPlanId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
          Paket ve Kullanım
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Aktif abonelik durumunuzu, şube/personel kotalarınızı ve plan yükseltme seçeneklerini inceleyin.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-44 w-full rounded-2xl" />
      ) : sub ? (
        <Card accent>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-extrabold">{sub.planName} Planı</CardTitle>
                    <Badge variant="success">Aktif Abonelik</Badge>
                  </div>
                  <CardDescription>
                    Yenilenme Tarihi:{' '}
                    {new Date(sub.endDate).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </CardDescription>
                </div>
              </div>

              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                Otomatik Yenileme: {sub.autoRenew ? 'Açık' : 'Kapalı'}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Branch Quota */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-zinc-400">Şube Kullanımı</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {sub.currentBranchCount} / {sub.maxBranchCount}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (sub.currentBranchCount / sub.maxBranchCount) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Staff Quota */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-zinc-400">Personel Kapasitesi</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {sub.currentStaffCount} / {sub.maxStaffPerBranch * sub.maxBranchCount}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (sub.currentStaffCount / (sub.maxStaffPerBranch * sub.maxBranchCount || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Monthly Appt Quota */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-zinc-400">Aylık Randevu Kotası</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {sub.maxMonthlyAppointments} Randevu/Ay
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Aylık dönem için üst sınır.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Available Plans Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
          Mevcut Paket Seçenekleri
        </h3>

        {loading ? <div className="grid gap-6 md:grid-cols-2">{[0, 1].map((item) => <Skeleton key={item} className="h-72 w-full rounded-2xl" />)}</div> : plansError ? <Card><CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="font-semibold text-slate-900 dark:text-zinc-100">Paketler yüklenemedi</h4><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{plansError}</p></div><Button variant="outline" onClick={fetchData} className="gap-2"><RefreshCw className="h-4 w-4"/> Yeniden dene</Button></CardContent></Card> : plans.length === 0 ? <Card><CardContent className="p-8 text-center"><Crown className="mx-auto h-8 w-8 text-amber-500"/><h4 className="mt-3 font-semibold text-slate-900 dark:text-zinc-100">Henüz sunulan paket yok</h4><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Paketler sisteme eklendiğinde burada görünecek.</p><Button variant="outline" onClick={fetchData} className="mt-4 gap-2"><RefreshCw className="h-4 w-4"/> Yenile</Button></CardContent></Card> : <div className="grid gap-6 md:grid-cols-2">
          {plans.map((p) => {
            const isCurrent = sub?.planId === p.id;
            return (
              <Card key={p.id} accent={isCurrent} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    {isCurrent && <Badge variant="success">Mevcut Paketiniz</Badge>}
                  </div>
                  <CardDescription>{p.description}</CardDescription>
                  <div className="pt-3">
                    <span className="text-2xl font-black text-slate-900 dark:text-zinc-50">
                      {formatCurrency(p.monthlyPrice)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400"> / ay</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Maksimum {p.maxBranchCount} Şube Tanımlama</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Şube Başına {p.maxStaffPerBranch} Personel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Aylık {p.maxMonthlyAppointments} Randevu Kapasitesi</span>
                  </div>
                  {p.hasAdvancedReporting && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Gelişmiş Ciro &amp; Personel Performans Raporları</span>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      variant={isCurrent ? 'outline' : 'primary'}
                      className="w-full font-bold"
                      disabled={isCurrent || upgradingPlanId !== null}
                      isLoading={upgradingPlanId === p.id}
                      onClick={() => handleSubscribe(p.id)}
                    >
                      {isCurrent ? 'Kullanımda' : `${p.name} Paketine Geç`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>}
      </div>
    </div>
  );
};

/* =========================================================================
   5. FİNANSAL RAPORLAR (REPORTS) SAYFASI
   ========================================================================= */
export const AdminReportsPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getDashboardSummary()
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        }
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, 'Raporlar alınamadı.'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
          Gelir &amp; Finansal Analitik
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Salon cironuz, randevu tamamlama oranlarınız ve en çok tercih edilen hizmetleriniz.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card accent>
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Toplam Ciro
                </span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {formatCurrency(data.totalRevenue)}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Tamamlanan randevulardan
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Tamamlanan Randevular
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-zinc-50">
                  {data.completedAppointments}
                </p>
                <span className="text-[10px] text-slate-500">
                  Toplam {data.totalAppointments} rezervasyon arasından
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  İptal &amp; Gelmeme Oranı
                </span>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  %{data.cancellationRate}
                </p>
                <span className="text-[10px] text-rose-500">
                  {data.cancelledAppointments} iptal • {data.noShowAppointments} No-Show
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Müşteri Memnuniyeti
                </span>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {data.averageRating > 0 ? `${data.averageRating.toFixed(1)} / 5.0` : '—'}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Müşteri değerlendirmeleri</span>
              </CardContent>
            </Card>
          </div>

          {/* Top Services & Staff Performance */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">En Çok Tercih Edilen Hizmetler</CardTitle>
                <CardDescription>Gelir getiren popüler bakımlar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topServices.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Veri bulunamadı.</p>
                ) : (
                  data.topServices.map((srv) => (
                    <div
                      key={srv.serviceName}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 text-xs"
                    >
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {srv.serviceName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{srv.appointmentCount} Adet</span>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">
                          {formatCurrency(srv.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personel Ciro Dağılımı</CardTitle>
                <CardDescription>Berber bazlı hizmet performansları.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.staffPerformances.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Veri bulunamadı.</p>
                ) : (
                  data.staffPerformances.map((st) => (
                    <div
                      key={st.staffProfileId}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 text-xs"
                    >
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {st.staffFullName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{st.completedAppointments} Randevu</span>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">
                          {formatCurrency(st.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
};
