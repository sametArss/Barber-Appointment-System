import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, MapPin, Phone, RefreshCw, Sparkles, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Skeleton } from '@/components/ui';
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { employeeService } from '@/services/employeeService';
import type { BranchServiceResponse, EmployeeWorkplace } from '@/types/booking';
import { useEmployeeData } from './useEmployeeData';

export const EmployeeWorkplacesPage: React.FC = () => {
  const { workplaces, loading, refresh } = useEmployeeData();
  const [selectedWorkplaceKey, setSelectedWorkplaceKey] = useState<string | null>(null);
  const [branchServices, setBranchServices] = useState<BranchServiceResponse[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [savingServices, setSavingServices] = useState(false);

  const selectedWorkplace = useMemo(() => {
    if (workplaces.length === 0) return null;
    if (selectedWorkplaceKey) {
      const found = workplaces.find(
        (w) => `${w.staffProfileId}-${w.branchId}` === selectedWorkplaceKey,
      );
      if (found) return found;
    }
    return workplaces[0];
  }, [workplaces, selectedWorkplaceKey]);

  const loadServicesForWorkplace = useCallback(async (workplace: EmployeeWorkplace | null) => {
    if (!workplace) {
      setBranchServices([]);
      setSelectedServiceIds([]);
      return;
    }
    setLoadingServices(true);
    try {
      const [branchSrvRes, mySrvRes] = await Promise.all([
        bookingService.getBranchServices(workplace.branchId),
        employeeService.getMyAssignedServices(workplace.staffProfileId, workplace.branchId),
      ]);
      const activeBranchServices = (branchSrvRes.data ?? []).filter((s) => s.isActive);
      setBranchServices(activeBranchServices);

      const assignedIds = (mySrvRes.data ?? []).map((s) => s.id);
      const branchServiceIdSet = new Set(activeBranchServices.map((s) => s.serviceId));
      setSelectedServiceIds(assignedIds.filter((id) => branchServiceIdSet.has(id)));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Seçili salonun hizmetleri yüklenemedi.'));
      setBranchServices([]);
      setSelectedServiceIds([]);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    void loadServicesForWorkplace(selectedWorkplace);
  }, [selectedWorkplace, loadServicesForWorkplace]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };

  const handleSaveMyServices = async () => {
    if (!selectedWorkplace) return;
    setSavingServices(true);
    try {
      const res = await employeeService.updateMyAssignedServices(
        selectedWorkplace.staffProfileId,
        selectedWorkplace.branchId,
        selectedServiceIds,
      );
      if (!res.success) {
        toast.error(res.message || 'Hizmetleriniz kaydedilemedi.');
        return;
      }
      toast.success(
        `${selectedWorkplace.branchName} şubesi için verdiğiniz hizmetler güncellendi!`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Hizmetleriniz kaydedilemedi.'));
    } finally {
      setSavingServices(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5]">
            Çalıştığım Yerler &amp; Hizmetlerim
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Önce bir salon seç; ardından o salonda verdiğin işlemleri çoklu olarak işaretle.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 rounded-[14px] border-slate-200/90 bg-white/80 dark:border-white/15 dark:bg-slate-900/60"
          onClick={() => {
            void refresh();
            void loadServicesForWorkplace(selectedWorkplace);
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </Button>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
            <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
              1. Çalıştığın Salonu Seç
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {workplaces.length} şube ataması
          </span>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-36 rounded-[18px]" />
            <Skeleton className="h-36 rounded-[18px]" />
          </div>
        ) : workplaces.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workplaces.map((workplace) => {
              const key = `${workplace.staffProfileId}-${workplace.branchId}`;
              const isSelected =
                selectedWorkplace &&
                `${selectedWorkplace.staffProfileId}-${selectedWorkplace.branchId}` === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedWorkplaceKey(key)}
                  className={cn(
                    'group cursor-pointer rounded-[18px] border p-5 text-left transition-all duration-200',
                    isSelected
                      ? 'border-[#D97706] bg-amber-50/75 shadow-[0_18px_45px_-22px_rgba(217,119,6,0.28)] ring-2 ring-amber-500/25 dark:border-amber-400 dark:bg-amber-500/12 dark:shadow-[0_0_28px_-8px_rgba(245,158,11,0.3)]'
                      : 'border-slate-200/80 bg-white/85 hover:-translate-y-0.5 hover:border-amber-400/60 dark:border-white/10 dark:bg-slate-900/65 dark:hover:border-amber-400/45',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-[#D97706] dark:bg-amber-500/15 dark:text-amber-400">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-serif text-lg font-bold text-slate-900 dark:text-white">
                        {workplace.businessName}
                      </h3>
                      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                        {workplace.branchName}
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#D97706] px-2.5 py-0.5 text-[10px] font-bold text-white dark:bg-amber-500 dark:text-slate-950">
                        <Check className="h-3 w-3" />
                        Seçili
                      </span>
                    ) : (
                      <Badge variant={workplace.isBookable ? 'success' : 'outline'}>
                        {workplace.isBookable ? 'Açık' : 'Kapalı'}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
                      <span className="line-clamp-1">
                        {workplace.address}, {workplace.district}/{workplace.city}
                      </span>
                    </p>
                    {workplace.businessPhoneNumber && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
                        <span>{workplace.businessPhoneNumber}</span>
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] border border-slate-200/80 bg-white/80 p-10 text-center dark:border-white/10 dark:bg-slate-900/60">
            <Store className="mx-auto h-9 w-9 text-[#D97706] dark:text-amber-400" />
            <h2 className="mt-3 font-serif text-xl font-semibold text-slate-900 dark:text-white">
              Henüz şube ataması yok
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Salon yöneticinden şube ataması yapmasını isteyebilirsin.
            </p>
          </div>
        )}
      </section>

      {selectedWorkplace && (
        <section className="rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-white/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-[#D97706] dark:bg-amber-500/15 dark:text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97706] dark:text-amber-400">
                  {selectedWorkplace.businessName} · {selectedWorkplace.branchName}
                </p>
                <h2 className="mt-0.5 font-serif text-xl font-bold text-slate-900 dark:text-white">
                  2. Bu Salonda Verdiğin Hizmetler ({selectedServiceIds.length}/
                  {branchServices.length})
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Yalnızca burada işaretlediğin işlemlerde müşteriler seni seçip randevu alabilir.
                </p>
              </div>
            </div>

            {branchServices.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedServiceIds(
                    selectedServiceIds.length === branchServices.length
                      ? []
                      : branchServices.map((s) => s.serviceId),
                  )
                }
                className="cursor-pointer rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-[#B45309] transition-colors hover:bg-amber-500/20 dark:text-amber-300"
              >
                {selectedServiceIds.length === branchServices.length
                  ? 'Tümünü Temizle'
                  : 'Tümünü Seç'}
              </button>
            )}
          </div>

          <div className="mt-5">
            {loadingServices ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-20 rounded-[16px]" />
                <Skeleton className="h-20 rounded-[16px]" />
                <Skeleton className="h-20 rounded-[16px]" />
              </div>
            ) : branchServices.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                <strong>{selectedWorkplace.businessName}</strong> ({selectedWorkplace.branchName})
                şubesinde henüz tanımlanmış aktif bir hizmet bulunmuyor.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {branchServices.map((srv) => {
                  const isSelected = selectedServiceIds.includes(srv.serviceId);
                  return (
                    <button
                      key={srv.serviceId}
                      type="button"
                      onClick={() => toggleService(srv.serviceId)}
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-[16px] border p-4 text-left transition-all duration-200',
                        isSelected
                          ? 'border-[#D97706] bg-amber-50/80 ring-1 ring-amber-500/30 dark:border-amber-400 dark:bg-amber-500/12'
                          : 'border-slate-200/90 bg-slate-50/60 hover:border-amber-400/50 dark:border-white/10 dark:bg-slate-950/50',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {srv.serviceName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {srv.finalDurationMinutes} dk •{' '}
                          <span className="font-semibold text-[#D97706] dark:text-amber-400">
                            {formatCurrency(srv.finalPrice)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                          isSelected
                            ? 'border-[#D97706] bg-[#D97706] text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950'
                            : 'border-slate-300 bg-white dark:border-white/20 dark:bg-slate-900',
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {branchServices.length > 0 && (
            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4 dark:border-white/10">
              <Button
                onClick={() => void handleSaveMyServices()}
                isLoading={savingServices}
                className="h-11 rounded-[14px] bg-[#D97706] px-6 text-sm font-semibold text-white shadow-md shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
              >
                Bu Salon İçin Kaydet
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
