import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Clock, Pencil, Plus, Search, Sparkles, X } from 'lucide-react';
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
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        durationMinutes,
        basePrice,
        assignToBranchIds: selectedBranchIds,
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
        current.map((item) => (item.id === service.id ? { ...item, isActive: !service.isActive } : item)),
      );
      toast.success(service.isActive ? 'Hizmet randevuya kapatıldı.' : 'Hizmet yeniden randevuya açıldı.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Hizmet durumu değiştirilemedi.'));
    } finally {
      setUpdatingServiceId(null);
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

        <Button
          onClick={() => {
            setEditingService(null);
            setName('');
            setDescription('');
            setBasePrice(350);
            setDurationMinutes(45);
            setSelectedBranchIds(branches.length > 0 ? [branches[0].id] : []);
            setOpenModal(true);
          }}
          className="gap-2 shadow-sm"
        >
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
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="Hizmet ara"
                  placeholder="Hizmet adı veya açıklama ara"
                  value={serviceQuery}
                  onChange={(event) => setServiceQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                aria-label="Hizmet durumu"
                value={serviceStatus}
                onChange={(event) => setServiceStatus(event.target.value as typeof serviceStatus)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <option value="all">Tüm durumlar</option>
                <option value="active">Randevuya açık</option>
                <option value="inactive">Pasif</option>
              </select>
              <select
                aria-label="Şubeye göre filtrele"
                value={serviceBranchId}
                onChange={(event) => setServiceBranchId(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <option value="all">Tüm şubeler</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {filteredServices.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <p className="font-semibold text-slate-700 dark:text-zinc-200">
                  Bu filtrelerle eşleşen hizmet yok
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Arama kelimesini veya filtreleri değiştirebilirsin.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      <span
                        className={
                          srv.isActive
                            ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                            : 'font-semibold text-slate-500'
                        }
                      >
                        {srv.isActive ? 'Randevuya açık' : 'Pasif'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setEditingService(srv);
                          setName(srv.name);
                          setDescription(srv.description ?? '');
                          setBasePrice(srv.basePrice);
                          setDurationMinutes(srv.durationMinutes);
                          setSelectedBranchIds(srv.assignedBranchIds ?? []);
                          setOpenModal(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Hizmeti düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingServiceId === srv.id}
                        isLoading={updatingServiceId === srv.id}
                        onClick={() => toggleServiceStatus(srv)}
                      >
                        {srv.isActive ? 'Pasife al' : 'Yayına al'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

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

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
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
                        className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        {selectedBranchIds.length === branches.length
                          ? 'Tümünü Kaldır'
                          : 'Tüm Şubeleri Seç'}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    {branches.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Henüz kayıtlı şube bulunmuyor.
                      </p>
                    ) : (
                      branches.map((b) => {
                        const checked = selectedBranchIds.includes(b.id);
                        return (
                          <label
                            key={b.id}
                            className="flex items-center justify-between gap-2.5 text-xs font-medium text-slate-800 dark:text-zinc-200 cursor-pointer py-1"
                          >
                            <span className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBranchSelection(b.id)}
                                className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
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
                        );
                      })
                    )}
                  </div>
                  {editingService && selectedBranchIds.length === 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Hiç şube seçilmezse bu hizmet hiçbir şubede müşterilere listelenmez.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOpenModal(false);
                      setEditingService(null);
                    }}
                  >
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
