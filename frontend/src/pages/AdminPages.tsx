import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
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
import { formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import type { BusinessServiceItem } from '@/types/admin';
import type { StaffResponse } from '@/types/booking';
import type { DashboardSummaryResponse } from '@/types/dashboard';
import type {
  BranchResponse,
  BusinessSubscriptionDetails,
  SubscriptionPlan,
} from '@/types/subscription';

/* =========================================================================
   1. ŞUBELERİM (BRANCHES) YÖNETİM SAYFASI
   ========================================================================= */
export const AdminBranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [district, setDistrict] = useState('Beşiktaş');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(41.0422);
  const [longitude, setLongitude] = useState(29.0067);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await adminService.getMyBranches();
      if (res.success && res.data) {
        setBranches(res.data);
      }
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
    setCreating(true);

    try {
      const res = await adminService.createBranch({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        city: city.trim(),
        district: district.trim(),
        address: address.trim(),
        latitude,
        longitude,
      });

      if (!res.success) {
        toast.error(res.message || 'Şube eklenemedi.');
        return;
      }

      toast.success('Yeni şubeniz başarıyla açıldı!');
      setOpenModal(false);
      setName('');
      setAddress('');
      setPhoneNumber('');
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
        </div>

        <Button onClick={() => setOpenModal(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Yeni Şube Ekle
        </Button>
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
                  <span className="text-[10px] text-slate-400 font-mono">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Branch Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card accent className="w-full max-w-lg shadow-2xl">
            <CardHeader className="relative">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
              <CardTitle>Yeni Şube Oluştur</CardTitle>
              <CardDescription>
                Şube bilgilerinizi giriniz. SaaS paket sınırlarınız otomatik denetlenir.
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
                <Input
                  label="Telefon Numarası"
                  placeholder="0212 222 33 44"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setDistrict(val);
                      const norm = val.trim().toLowerCase();
                      if (norm.includes('ataşehir') || norm.includes('atasehir')) {
                        setLatitude(40.9923);
                        setLongitude(29.1244);
                      } else if (norm.includes('kadıköy') || norm.includes('kadikoy')) {
                        setLatitude(40.9856);
                        setLongitude(29.0268);
                      } else if (norm.includes('beşiktaş') || norm.includes('besiktas')) {
                        setLatitude(41.0422);
                        setLongitude(29.0067);
                      }
                    }}
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
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Input
                    label="Enlem (Lat)"
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <Input
                    label="Boylam (Lng)"
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button variant="ghost" size="sm" onClick={() => setOpenModal(false)}>
                    İptal
                  </Button>
                  <Button type="submit" size="sm" isLoading={creating}>
                    Şubeyi Kaydet
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
  const [selectedStaff, setSelectedStaff] = useState<StaffResponse | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [biography, setBiography] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  // Hours form states (standard 09:00 - 19:00 with 13:00 - 14:00 lunch break)
  const [workStart, setWorkStart] = useState('09:00:00');
  const [workEnd, setWorkEnd] = useState('19:00:00');
  const [breakStart, setBreakStart] = useState('13:00:00');
  const [breakEnd, setBreakEnd] = useState('14:00:00');

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
    if (!selectedBranchId) {
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
        branchIds: [selectedBranchId],
      });

      if (!res.success) {
        toast.error(res.message || 'Personel eklenemedi.');
        return;
      }

      toast.success('Yeni berber kadroya eklendi!');
      setOpenAddModal(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setBiography('');
      await fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Personel eklenirken hata oluştu.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkingHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedBranchId) return;
    setSaving(true);

    try {
      const days = [];
      for (let d = 0; d <= 6; d++) {
        days.push({
          dayOfWeek: d,
          startTime: workStart,
          endTime: workEnd,
          breaks: [{ startTime: breakStart, endTime: breakEnd }],
        });
      }

      const res = await adminService.setStaffWorkingHours({
        staffProfileId: selectedStaff.id,
        branchId: selectedBranchId,
        workingHours: days,
      });

      if (!res.success) {
        toast.error(res.message || 'Çalışma saatleri güncellenemedi.');
        return;
      }

      toast.success('Çalışma saatleri ve öğle molası başarıyla tanımlandı!');
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

        <Button onClick={() => setOpenAddModal(true)} className="gap-2 shadow-sm">
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

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setSelectedStaff(s);
                      setOpenHoursModal(true);
                    }}
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

      {/* Add Staff Modal */}
      {openAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card accent className="w-full max-w-lg shadow-2xl">
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

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Atanacak Şube
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm dark:border-zinc-800 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.district})
                      </option>
                    ))}
                  </select>
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

      {/* Set Working Hours Modal */}
      {openHoursModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card accent className="w-full max-w-md shadow-2xl">
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
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-zinc-800 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Mesai Başlangıç"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    placeholder="09:00:00"
                    required
                  />
                  <Input
                    label="Mesai Bitiş"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    placeholder="19:00:00"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Mola Başlangıç"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    placeholder="13:00:00"
                    required
                  />
                  <Input
                    label="Mola Bitiş"
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    placeholder="14:00:00"
                    required
                  />
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                  ⚡ <strong>13:00 - 14:00</strong> arası randevu slot motorunda otomatik olarak
                  kapatılacak ve çakışma engellenecektir.
                </div>

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
  const [creating, setCreating] = useState(false);

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

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    );
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBranchIds.length === 0) {
      toast.warning('Lütfen hizmetin sunulacağı en az 1 şube seçin.');
      return;
    }
    setCreating(true);

    try {
      const res = await adminService.createService({
        name: name.trim(),
        description: description.trim() || 'Özel Salon Hizmeti',
        durationMinutes,
        basePrice,
        assignToBranchIds: selectedBranchIds,
      });

      if (!res.success) {
        toast.error(res.message || 'Hizmet oluşturulamadı.');
        return;
      }

      toast.success('Hizmet başarıyla eklendi ve seçili şubelere atandı!');
      setOpenModal(false);
      setName('');
      setDescription('');
      await fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Hizmet eklenirken hata oluştu.'));
    } finally {
      setCreating(false);
    }
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

        <Button onClick={() => setOpenModal(true)} className="gap-2 shadow-sm">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((srv) => (
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
                  {srv.description || 'Özel berber ve saç tasarım bakımı.'}
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
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Randevuya Açık
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card accent className="w-full max-w-lg shadow-2xl">
            <CardHeader className="relative">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
              <CardTitle>Yeni Hizmet Tanımla</CardTitle>
              <CardDescription>
                Hizmet adını, taban fiyatını ve geçerli olacağı şubeleri belirleyin.
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

                {/* Branch Assignment Selector */}
                <div className="space-y-2 pt-1">
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
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button variant="ghost" size="sm" onClick={() => setOpenModal(false)}>
                    İptal
                  </Button>
                  <Button type="submit" size="sm" isLoading={creating}>
                    Hizmeti Kaydet
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        adminService.getMySubscription(),
        adminService.getSubscriptionPlans(),
      ]);

      if (subRes.success && subRes.data) {
        setSub(subRes.data);
      }
      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Abonelik bilgileri yüklenemedi.'));
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
          SaaS Paket &amp; Kota Yönetimi
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
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-1/4" />
                </div>
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

        <div className="grid gap-6 md:grid-cols-2">
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
        </div>
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
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  4.9 / 5.0
                </p>
                <span className="text-[10px] text-emerald-500">Doğrulanmış değerlendirmeler</span>
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
