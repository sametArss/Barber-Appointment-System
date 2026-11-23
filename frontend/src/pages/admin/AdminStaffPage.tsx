import React, { useEffect, useState } from 'react';
import {
  Building2,
  Clock,
  Pencil,
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
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import { bookingService } from '@/services/bookingService';
import type { BusinessServiceItem } from '@/types/admin';
import type { StaffResponse } from '@/types/booking';
import type { BranchResponse } from '@/types/subscription';

export const AdminStaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [businessServices, setBusinessServices] = useState<BusinessServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openHoursModal, setOpenHoursModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffResponse | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffResponse | null>(null);
  const [editingBiography, setEditingBiography] = useState('');
  const [editingBookable, setEditingBookable] = useState(true);
  const [editingBranchIds, setEditingBranchIds] = useState<string[]>([]);
  const [editingServiceIds, setEditingServiceIds] = useState<string[]>([]);
  const [savingStaffProfile, setSavingStaffProfile] = useState(false);

  const [email, setEmail] = useState('');
  const [biography, setBiography] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedStaffBranchIds, setSelectedStaffBranchIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [workingHours, setWorkingHours] = useState<
    Array<{
      dayOfWeek: number;
      active: boolean;
      start: string;
      end: string;
      hasBreak: boolean;
      breakStart: string;
      breakEnd: string;
    }>
  >(
    Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      active: dayOfWeek !== 0,
      start: '09:00',
      end: '19:00',
      hasBreak: true,
      breakStart: '13:00',
      breakEnd: '14:00',
    })),
  );
  const [loadingWorkingHours, setLoadingWorkingHours] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, branchRes, servicesRes] = await Promise.all([
        adminService.getBusinessStaff(),
        adminService.getMyBranches(),
        adminService.getBusinessServices(),
      ]);

      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data);
      }
      if (branchRes.success && branchRes.data) {
        setBranches(branchRes.data);
        if (branchRes.data.length > 0) {
          setSelectedBranchId(branchRes.data[0].id);
          setSelectedStaffBranchIds((current) =>
            current.length ? current : [branchRes.data![0].id],
          );
        }
      }
      if (servicesRes.success && servicesRes.data) {
        setBusinessServices(servicesRes.data.filter((s) => s.isActive));
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
        email: email.trim(),
        biography: biography.trim() ? biography.trim() : null,
        isBookable: true,
        branchIds: selectedStaffBranchIds,
      });

      if (!res.success) {
        toast.error(res.message || 'Personel eklenemedi.');
        return;
      }

      toast.success(`${res.data?.fullName ?? 'Personel'} kadroya eklendi!`);
      setOpenAddModal(false);
      setEmail('');
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
      const defaults = Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        active: false,
        start: '09:00',
        end: '19:00',
        hasBreak: true,
        breakStart: '13:00',
        breakEnd: '14:00',
      }));
      for (const hour of res.data ?? []) {
        const row = defaults[hour.dayOfWeek];
        if (row) {
          row.active = true;
          row.start = hour.startTime.slice(0, 5);
          row.end = hour.endTime.slice(0, 5);
          row.hasBreak = hour.breaks.length > 0;
          if (hour.breaks[0]) {
            row.breakStart = hour.breaks[0].startTime.slice(0, 5);
            row.breakEnd = hour.breaks[0].endTime.slice(0, 5);
          }
        }
      }
      setWorkingHours(defaults);
    } catch (error) {
      setWorkingHours(
        Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          active: false,
          start: '09:00',
          end: '19:00',
          hasBreak: true,
          breakStart: '13:00',
          breakEnd: '14:00',
        })),
      );
      toast.error(getApiErrorMessage(error, 'Mevcut çalışma saatleri yüklenemedi.'));
    } finally {
      setLoadingWorkingHours(false);
    }
  };

  const openWorkingHours = (staff: StaffResponse) => {
    const branchId = staff.assignedBranchIds[0] ?? branches[0]?.id ?? '';
    setSelectedStaff(staff);
    setSelectedBranchId(branchId);
    setOpenHoursModal(true);
    if (branchId) loadWorkingHours(staff.id, branchId);
  };

  const saveStaffProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingStaff) return;
    setSavingStaffProfile(true);
    try {
      const [profileRes, branchRes, serviceRes] = await Promise.all([
        adminService.updateStaffProfile({
          staffProfileId: editingStaff.id,
          biography: editingBiography.trim(),
          isBookable: editingBookable,
        }),
        adminService.assignStaffBranches({
          staffProfileId: editingStaff.id,
          branchIds: editingBranchIds,
        }),
        adminService.assignServicesToStaff({
          staffProfileId: editingStaff.id,
          serviceIds: editingServiceIds,
        }),
      ]);
      if (!profileRes.success) {
        toast.error(profileRes.message || 'Personel profili güncellenemedi.');
        return;
      }
      if (!branchRes.success) {
        toast.error(branchRes.message || 'Şube atamaları güncellenemedi.');
        return;
      }
      if (!serviceRes.success) {
        toast.error(serviceRes.message || 'Hizmet atamaları güncellenemedi.');
        return;
      }
      const nextServiceNames = businessServices
        .filter((srv) => editingServiceIds.includes(srv.id))
        .map((srv) => srv.name);
      setStaffList((current) =>
        current.map((staff) =>
          staff.id === editingStaff.id
            ? {
                ...staff,
                biography: editingBiography.trim() || null,
                isBookable: editingBookable,
                assignedBranchIds: editingBranchIds,
                assignedServiceIds: editingServiceIds,
                assignedServiceNames: nextServiceNames,
              }
            : staff,
        ),
      );
      setEditingStaff(null);
      toast.success(
        editingBookable
          ? 'Personel profili, şubeleri ve verdiği hizmetler güncellendi.'
          : 'Personel pasife alındı ve değişiklikler kaydedildi.',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Personel profili güncellenemedi.'));
    } finally {
      setSavingStaffProfile(false);
    }
  };

  const handleSaveWorkingHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedBranchId) return;
    if (!workingHours.some((day) => day.active)) {
      toast.warning('En az bir çalışma günü seçin.');
      return;
    }
    setSaving(true);

    try {
      const toApiTime = (value: string) => (value.length === 5 ? `${value}:00` : value);
      const days = workingHours
        .filter((day) => day.active)
        .map((day) => ({
          dayOfWeek: day.dayOfWeek,
          startTime: toApiTime(day.start),
          endTime: toApiTime(day.end),
          breaks: day.hasBreak
            ? [{ startTime: toApiTime(day.breakStart), endTime: toApiTime(day.breakEnd) }]
            : [],
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

        <Button
          onClick={() => {
            setSelectedStaffBranchIds(branches[0]?.id ? [branches[0].id] : []);
            setOpenAddModal(true);
          }}
          className="gap-2 shadow-sm"
          disabled={branches.length === 0}
        >
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
                <CardDescription className="line-clamp-1">
                  {s.biography || 'Uzman Berber'}
                </CardDescription>
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

                <div className="flex flex-wrap gap-1.5">
                  {s.assignedBranchIds.length > 0 ? (
                    s.assignedBranchIds.map((bId) => {
                      const br = branches.find((b) => b.id === bId);
                      return (
                        <span
                          key={bId}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300"
                        >
                          <Building2 className="h-2.5 w-2.5" />
                          {br?.name ?? 'Şube'}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] italic text-slate-400">Şube atanmamış</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(s.assignedServiceNames ?? []).length > 0 ? (
                    (s.assignedServiceNames ?? []).map((srvName) => (
                      <span
                        key={srvName}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200"
                      >
                        <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                        {srvName}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] italic text-amber-600/80 dark:text-amber-400/80">
                      Henüz hizmet atanmamış
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 dark:border-zinc-800">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setEditingStaff(s);
                      setEditingBiography(s.biography ?? '');
                      setEditingBookable(s.isBookable);
                      setEditingBranchIds(s.assignedBranchIds ?? []);
                      setEditingServiceIds(s.assignedServiceIds ?? []);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Profili düzenle
                  </Button>
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

      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px]">
            <CardHeader className="relative">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
              <CardTitle className="font-serif text-xl">
                {editingStaff.fullName} · Profil &amp; Şubeler
              </CardTitle>
              <CardDescription>
                Personelin aktif/pasif durumunu, uzmanlık alanını ve işletmenizde çalıştığı şubeleri yönetin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveStaffProfile} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Çalışma Durumu
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingBookable(true)}
                      className={cn(
                        'cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all',
                        editingBookable
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400',
                      )}
                    >
                      Aktif (Randevuya Açık)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBookable(false)}
                      className={cn(
                        'cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all',
                        !editingBookable
                          ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400',
                      )}
                    >
                      Pasife Al (Randevuya Kapalı)
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Geçmiş randevu kayıtlarını korumak için personel silinmez; pasife alındığında yeni randevu almaz.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Çalıştığı Şubeler (Dükkanlarınız)
                  </label>
                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    {branches.length === 0 ? (
                      <p className="text-xs text-slate-500">Kayıtlı şubeniz bulunmuyor.</p>
                    ) : (
                      branches.map((branch) => {
                        const checked = editingBranchIds.includes(branch.id);
                        return (
                          <label
                            key={branch.id}
                            className="flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 hover:bg-white/70 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                          >
                            <span className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setEditingBranchIds((current) =>
                                    current.includes(branch.id)
                                      ? current.filter((id) => id !== branch.id)
                                      : [...current, branch.id],
                                  )
                                }
                                className="h-4 w-4 accent-amber-600"
                              />
                              <span>{branch.name}</span>
                              <span className="text-slate-400">({branch.district})</span>
                            </span>
                            {checked && (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                Atandı
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                      Verdiği Hizmetler ({editingServiceIds.length}/{businessServices.length})
                    </label>
                    {businessServices.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingServiceIds(
                            editingServiceIds.length === businessServices.length
                              ? []
                              : businessServices.map((srv) => srv.id),
                          )
                        }
                        className="cursor-pointer text-[11px] font-semibold text-amber-700 hover:underline dark:text-amber-400"
                      >
                        {editingServiceIds.length === businessServices.length
                          ? 'Tümünü Temizle'
                          : 'Tümünü Seç'}
                      </button>
                    )}
                  </div>
                  <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    {businessServices.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Henüz işletmeye eklenmiş aktif hizmet yok.
                      </p>
                    ) : (
                      businessServices.map((srv) => {
                        const checked = editingServiceIds.includes(srv.id);
                        return (
                          <label
                            key={srv.id}
                            className="flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 hover:bg-white/70 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setEditingServiceIds((current) =>
                                    current.includes(srv.id)
                                      ? current.filter((id) => id !== srv.id)
                                      : [...current, srv.id],
                                  )
                                }
                                className="h-4 w-4 shrink-0 accent-amber-600"
                              />
                              <span className="truncate">{srv.name}</span>
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {srv.durationMinutes} dk · {formatCurrency(srv.basePrice)}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Müşteriler randevu alırken bu personeli yalnızca burada seçili olan hizmetlerde
                    görür.
                  </p>
                </div>

                <Input
                  label="Uzmanlık / Biyografi (Opsiyonel)"
                  value={editingBiography}
                  onChange={(e) => setEditingBiography(e.target.value)}
                  maxLength={400}
                  placeholder="Uzmanlık alanı ve deneyim"
                />

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-zinc-800">
                  <Button type="button" variant="ghost" onClick={() => setEditingStaff(null)}>
                    İptal
                  </Button>
                  <Button type="submit" isLoading={savingStaffProfile}>
                    Değişiklikleri Kaydet
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

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
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <Input
                  label="Kayıtlı Personel E-postası"
                  type="email"
                  placeholder="ornek@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Uzmanlık Alanı / Biyografi (Opsiyonel)"
                  placeholder="Örn: Saç & Sakal Tasarım Uzmanı (boş bırakılabilir)"
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                />
                <p className="rounded-xl border border-amber-500/20 bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Personelin sisteme kayıtlı e-posta adresini girin. Ad, soyad ve telefon bilgileri
                  hesabından otomatik alınır; uzmanlık alanını çalışan kendi profilinden de dilediği
                  zaman düzenleyebilir.
                </p>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Çalışacağı şubeler
                  </label>
                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    {branches.map((branch) => (
                      <label
                        key={branch.id}
                        className="flex cursor-pointer items-center gap-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStaffBranchIds.includes(branch.id)}
                          onChange={() =>
                            setSelectedStaffBranchIds((current) =>
                              current.includes(branch.id)
                                ? current.filter((id) => id !== branch.id)
                                : [...current, branch.id],
                            )
                          }
                          className="h-4 w-4 accent-amber-600"
                        />
                        {branch.name} <span className="text-slate-400">({branch.district})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button variant="ghost" size="sm" onClick={() => setOpenAddModal(false)}>
                    İptal
                  </Button>
                  <Button type="submit" size="sm" isLoading={saving}>
                    Personeli Kadroya Ekle
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

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
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      loadWorkingHours(selectedStaff.id, e.target.value);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-zinc-800 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100"
                  >
                    {branches
                      .filter((b) => selectedStaff.assignedBranchIds.includes(b.id))
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>

                {loadingWorkingHours ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                ) : (
                  <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                    {['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'].map(
                      (label, dayOfWeek) => {
                        const day = workingHours[dayOfWeek];
                        if (!day) return null;
                        const updateDay = (patch: Partial<typeof day>) =>
                          setWorkingHours((current) =>
                            current.map((item) =>
                              item.dayOfWeek === dayOfWeek ? { ...item, ...patch } : item,
                            ),
                          );
                        return (
                          <div
                            key={label}
                            className={`rounded-xl border p-3 ${
                              day.active
                                ? 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5'
                                : 'border-slate-200 dark:border-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-zinc-200">
                                <input
                                  type="checkbox"
                                  checked={day.active}
                                  onChange={(e) => updateDay({ active: e.target.checked })}
                                  className="h-4 w-4 accent-amber-600"
                                />
                                {label}
                              </label>
                              {day.active && (
                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                  Çalışıyor
                                </span>
                              )}
                            </div>
                            {day.active && (
                              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <label className="text-[10px] text-slate-500">
                                  Başlangıç
                                  <input
                                    type="time"
                                    value={day.start}
                                    onChange={(e) => updateDay({ start: e.target.value })}
                                    required
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                  />
                                </label>
                                <label className="text-[10px] text-slate-500">
                                  Bitiş
                                  <input
                                    type="time"
                                    value={day.end}
                                    onChange={(e) => updateDay({ end: e.target.value })}
                                    required
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                  />
                                </label>
                                <label className="text-[10px] text-slate-500">
                                  Mola başlangıcı
                                  <input
                                    type="time"
                                    value={day.breakStart}
                                    disabled={!day.hasBreak}
                                    onChange={(e) => updateDay({ breakStart: e.target.value })}
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                  />
                                </label>
                                <label className="text-[10px] text-slate-500">
                                  Mola bitişi
                                  <input
                                    type="time"
                                    value={day.breakEnd}
                                    disabled={!day.hasBreak}
                                    onChange={(e) => updateDay({ breakEnd: e.target.value })}
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                  />
                                </label>
                                <label className="col-span-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-zinc-400 sm:col-span-4">
                                  <input
                                    type="checkbox"
                                    checked={day.hasBreak}
                                    onChange={(e) => updateDay({ hasBreak: e.target.checked })}
                                    className="h-3.5 w-3.5 accent-amber-600"
                                  />
                                  Mola kullan
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                  Çalışma saatleri seçilen şube ve personel için kaydedilir. Kapalı günler randevu
                  saatlerinde görünmez.
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
