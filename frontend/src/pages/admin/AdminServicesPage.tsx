import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Clock, Pencil, Plus, Search, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Skeleton } from '@/components/ui';
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import type { BusinessServiceItem } from '@/types/admin';
import type { BranchResponse } from '@/types/subscription';

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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [basePrice, setBasePrice] = useState(350);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [branchOverridesMap, setBranchOverridesMap] = useState<
    Record<string, { price: string; duration: string }>
  >({});

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredServices = useMemo(
    () =>
      services.filter((service) => {
        const matchesQuery = `${service.name} ${service.description ?? ''}`
          .toLocaleLowerCase('tr')
          .includes(serviceQuery.trim().toLocaleLowerCase('tr'));
        const matchesStatus =
          serviceStatus === 'all' || service.isActive === (serviceStatus === 'active');
        const matchesBranch =
          serviceBranchId === 'all' || service.assignedBranchIds?.includes(serviceBranchId);
        return matchesQuery && matchesStatus && matchesBranch;
      }),
    [services, serviceQuery, serviceStatus, serviceBranchId],
  );

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
      const branchOverrides = selectedBranchIds.map((branchId) => {
        const entry = branchOverridesMap[branchId];
        const parsedPrice =
          entry && entry.price.trim() !== '' ? Number(entry.price) : null;
        const parsedDuration =
          entry && entry.duration.trim() !== '' ? Number(entry.duration) : null;
        return {
          branchId,
          priceOverride:
            parsedPrice !== null && Number.isFinite(parsedPrice) && parsedPrice >= 0
              ? parsedPrice
              : null,
          durationOverride:
            parsedDuration !== null && Number.isFinite(parsedDuration) && parsedDuration > 0
              ? Math.round(parsedDuration)
              : null,
        };
      });

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        durationMinutes,
        basePrice,
        assignToBranchIds: selectedBranchIds,
        branchOverrides,
      };
      const res = editingService
        ? await adminService.updateService({
            ...payload,
            id: editingService.id,
            isActive: editingService.isActive,
          })
        : await adminService.createService(payload);

      if (!res.success) {
        toast.error(res.message || 'Hizmet oluşturulamadı.');
        return;
      }

      toast.success(
        editingService
          ? 'Hizmet bilgileri ve şube atamaları güncellendi.'
          : 'Hizmet eklendi ve seçili şubelere atandı.',
      );
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
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        basePrice: service.basePrice,
        isActive: !service.isActive,
      });
      if (!res.success) {
        toast.error(res.message || 'Hizmet durumu değiştirilemedi.');
        return;
      }
      setServices((current) =>
        current.map((item) =>
          item.id === service.id ? { ...item, isActive: !service.isActive } : item,
        ),
      );
      toast.success(
        service.isActive ? 'Hizmet randevuya kapatıldı.' : 'Hizmet yeniden randevuya açıldı.',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Hizmet durumu değiştirilemedi.'));
    } finally {
      setUpdatingServiceId(null);
    }
  };

  return (
    <div className="space-y-7 py-2">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D97706] dark:text-amber-400">
            Bakım Menüsü
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
            Hizmet Kataloğu &amp; Fiyatlar
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Salonunuzda sunulan saç, sakal ve bakım hizmetlerini, sürelerini ve geçerli şubelerini
            yönetin.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingService(null);
            setName('');
            setDescription('');
            setBasePrice(350);
            setDurationMinutes(45);
            setSelectedBranchIds(branches.length > 0 ? [branches[0].id] : []);
            setBranchOverridesMap({});
            setOpenModal(true);
          }}
          className="h-11 gap-2 rounded-[16px] bg-[#D97706] px-5 text-sm font-semibold text-white shadow-md shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.3)] dark:hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Yeni Hizmet Ekle
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-[22px]" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-12 text-center shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
          <Sparkles className="mx-auto h-10 w-10 text-[#D97706]/50 dark:text-amber-400/50" />
          <h3 className="mt-3 font-serif text-xl font-bold text-slate-900 dark:text-white">
            Henüz tanımlı hizmet bulunmuyor
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Hizmetlerinizi oluşturarak müşterilerinizin randevu almasını sağlayın.
          </p>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-[20px] border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Hizmet ara"
                placeholder="Hizmet adı veya açıklama ara..."
                value={serviceQuery}
                onChange={(event) => setServiceQuery(event.target.value)}
                className="h-10 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
              />
            </div>
            <select
              aria-label="Hizmet durumu"
              value={serviceStatus}
              onChange={(event) => setServiceStatus(event.target.value as typeof serviceStatus)}
              className="h-10 rounded-[14px] border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold text-slate-700 focus:border-[#D97706] focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200"
            >
              <option value="all">Tüm durumlar</option>
              <option value="active">Randevuya açık</option>
              <option value="inactive">Pasif</option>
            </select>
            <select
              aria-label="Şubeye göre filtrele"
              value={serviceBranchId}
              onChange={(event) => setServiceBranchId(event.target.value)}
              className="h-10 rounded-[14px] border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold text-slate-700 focus:border-[#D97706] focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200"
            >
              <option value="all">Tüm şubeler</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {filteredServices.length === 0 ? (
            <div className="rounded-[22px] border border-slate-200/80 bg-white/85 p-10 text-center backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
              <p className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                Bu filtrelerle eşleşen hizmet yok
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Arama kelimesini veya filtreleri değiştirebilirsin.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((srv) => (
                <article
                  key={srv.id}
                  className={cn(
                    'flex flex-col justify-between rounded-[22px] border bg-white/85 p-5.5 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/45 dark:bg-slate-900/65 dark:shadow-[0_24px_65px_-26px_rgba(0,0,0,0.8)]',
                    srv.isActive
                      ? 'border-slate-200/80 dark:border-amber-500/20'
                      : 'border-slate-200/60 opacity-80 dark:border-white/10',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif text-2xl font-bold text-[#D97706] dark:text-amber-400">
                        {formatCurrency(srv.basePrice)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                        <Clock className="h-3 w-3 text-[#D97706] dark:text-amber-400" />
                        {srv.durationMinutes} dk
                      </span>
                    </div>

                    <h2 className="mt-3 font-serif text-lg font-bold text-slate-900 dark:text-white">
                      {srv.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {srv.description || 'Açıklama eklenmemiş.'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {srv.branchOverrides && srv.branchOverrides.length > 0 ? (
                        srv.branchOverrides.map((ov) => (
                          <span
                            key={ov.branchId}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#B45309] dark:border-amber-400/25 dark:text-amber-300"
                          >
                            <Building2 className="h-2.5 w-2.5" />
                            <span>{ov.branchName || 'Şube'}</span>
                            {ov.priceOverride != null && (
                              <span className="font-bold">· {formatCurrency(ov.priceOverride)}</span>
                            )}
                            {ov.durationOverride != null && (
                              <span>· {ov.durationOverride} dk</span>
                            )}
                          </span>
                        ))
                      ) : srv.assignedBranchNames && srv.assignedBranchNames.length > 0 ? (
                        srv.assignedBranchNames.map((bName) => (
                          <span
                            key={bName}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#B45309] dark:border-amber-400/25 dark:text-amber-300"
                          >
                            <Building2 className="h-2.5 w-2.5" />
                            {bName}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] italic text-slate-400">Şube atanmadı</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-3.5 dark:border-white/10">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 dark:text-slate-500">Durum</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 font-semibold',
                          srv.isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            srv.isActive ? 'bg-emerald-500' : 'bg-slate-400',
                          )}
                        />
                        {srv.isActive ? 'Randevuya açık' : 'Pasif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 rounded-[12px] text-xs font-semibold"
                        onClick={() => {
                          setEditingService(srv);
                          setName(srv.name);
                          setDescription(srv.description ?? '');
                          setBasePrice(srv.basePrice);
                          setDurationMinutes(srv.durationMinutes);
                          setSelectedBranchIds(srv.assignedBranchIds ?? []);
                          const initialMap: Record<string, { price: string; duration: string }> = {};
                          (srv.branchOverrides ?? []).forEach((ov) => {
                            initialMap[ov.branchId] = {
                              price: ov.priceOverride != null ? String(ov.priceOverride) : '',
                              duration:
                                ov.durationOverride != null ? String(ov.durationOverride) : '',
                            };
                          });
                          setBranchOverridesMap(initialMap);
                          setOpenModal(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-[12px] text-xs font-semibold"
                        disabled={updatingServiceId === srv.id}
                        isLoading={updatingServiceId === srv.id}
                        onClick={() => toggleServiceStatus(srv)}
                      >
                        {srv.isActive ? 'Pasife Al' : 'Yayına Al'}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-amber-500/25 dark:bg-slate-900/95 sm:p-7">
            <div className="relative pr-8">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="absolute right-0 top-0 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                {editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Tanımla'}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Hizmet adını, süresini, fiyatını ve geçerli şubelerini belirleyin.
              </p>
            </div>

            <form onSubmit={handleCreateService} className="mt-5 space-y-4">
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

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Hizmetin Sunulacağı Şubeler ({selectedBranchIds.length}/{branches.length})
                  </label>
                  {branches.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedBranchIds(
                          selectedBranchIds.length === branches.length
                            ? []
                            : branches.map((b) => b.id),
                        )
                      }
                      className="cursor-pointer text-[11px] font-semibold text-[#D97706] hover:underline dark:text-amber-400"
                    >
                      {selectedBranchIds.length === branches.length
                        ? 'Tümünü Kaldır'
                        : 'Tüm Şubeleri Seç'}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 rounded-[16px] border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-slate-950/60">
                  {branches.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Henüz kayıtlı şube bulunmuyor.
                    </p>
                  ) : (
                    branches.map((b) => {
                      const checked = selectedBranchIds.includes(b.id);
                      const overrideEntry = branchOverridesMap[b.id] ?? { price: '', duration: '' };
                      return (
                        <div
                          key={b.id}
                          className={cn(
                            'rounded-xl px-2.5 py-2 transition-colors',
                            checked
                              ? 'bg-white/90 shadow-xs dark:bg-slate-900/80'
                              : 'hover:bg-white/60 dark:hover:bg-white/5',
                          )}
                        >
                          <label className="flex cursor-pointer items-center justify-between gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                            <span className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBranchSelection(b.id)}
                                className="h-4 w-4 accent-[#D97706]"
                              />
                              <span>
                                {b.name} <span className="text-slate-400">({b.district})</span>
                              </span>
                            </span>
                            <span
                              className={
                                checked
                                  ? 'text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'
                                  : 'text-[10px] text-slate-400'
                              }
                            >
                              {checked ? 'Atalı' : 'Atalı değil'}
                            </span>
                          </label>

                          {checked && (
                            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 dark:border-white/10">
                              <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                Özel Fiyat (TL)
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder={`Varsayılan: ${basePrice}`}
                                  value={overrideEntry.price}
                                  onChange={(e) =>
                                    setBranchOverridesMap((prev) => ({
                                      ...prev,
                                      [b.id]: { ...overrideEntry, price: e.target.value },
                                    }))
                                  }
                                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100"
                                />
                              </label>
                              <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                Özel Süre (dk)
                                <input
                                  type="number"
                                  min="5"
                                  step="5"
                                  placeholder={`Varsayılan: ${durationMinutes}`}
                                  value={overrideEntry.duration}
                                  onChange={(e) =>
                                    setBranchOverridesMap((prev) => ({
                                      ...prev,
                                      [b.id]: { ...overrideEntry, duration: e.target.value },
                                    }))
                                  }
                                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {editingService && selectedBranchIds.length === 0 && (
                  <p className="text-[11px] text-[#D97706] dark:text-amber-400">
                    Hiç şube seçilmezse bu hizmet hiçbir şubede müşterilere listelenmez.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpenModal(false);
                    setEditingService(null);
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
                  {editingService ? 'Değişiklikleri Kaydet' : 'Hizmeti Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
