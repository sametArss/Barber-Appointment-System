import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Phone,
  RefreshCw,
  Scissors,
  Sparkles,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Skeleton } from '@/components/ui';
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { employeeService } from '@/services/employeeService';
import {
  AppointmentStatus,
  type AppointmentResponse,
  type BranchServiceResponse,
  type EmployeeWorkplace,
} from '@/types/booking';

const formatAppointmentDate = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const useEmployeeData = () => {
  const [workplaces, setWorkplaces] = useState<EmployeeWorkplace[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [workplacesRes, appointmentsRes] = await Promise.all([
        employeeService.getMyWorkplaces(),
        bookingService.getMyWorkAppointments(),
      ]);
      if (!workplacesRes.success) {
        throw new Error(workplacesRes.message || 'Çalışma yerleri alınamadı.');
      }
      if (!appointmentsRes.success) {
        throw new Error(appointmentsRes.message || 'Randevular alınamadı.');
      }
      setWorkplaces(workplacesRes.data ?? []);
      setAppointments(appointmentsRes.data ?? []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Çalışan bilgileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateStatus = async (appointment: AppointmentResponse, newStatus: number) => {
    setUpdatingId(appointment.id);
    try {
      const result = await bookingService.updateMyWorkAppointmentStatus({
        appointmentId: appointment.id,
        newStatus,
      });
      if (!result.success) {
        toast.error(result.message || 'Randevu güncellenemedi.');
        return;
      }
      const nextStatus = newStatus as AppointmentResponse['status'];
      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id ? { ...item, status: nextStatus } : item,
        ),
      );
      toast.success(
        newStatus === AppointmentStatus.Confirmed
          ? 'Randevu onaylandı.'
          : newStatus === AppointmentStatus.Completed
            ? 'Randevu tamamlandı olarak işaretlendi.'
            : 'Randevu iptal edildi.',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Randevu güncellenemedi.'));
    } finally {
      setUpdatingId(null);
    }
  };

  return { workplaces, appointments, loading, updatingId, refresh, updateStatus };
};

const WorkplaceCard: React.FC<{ workplace: EmployeeWorkplace }> = ({ workplace }) => (
  <div className="rounded-[18px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_14px_38px_-22px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all hover:border-amber-500/40 dark:border-amber-500/15 dark:bg-slate-900/65 dark:shadow-[0_16px_45px_-22px_rgba(0,0,0,0.75)]">
    <div className="flex items-start gap-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-[#D97706] dark:bg-amber-500/15 dark:text-amber-400">
        <Store className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-lg font-bold text-slate-900 dark:text-white">
          {workplace.businessName}
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {workplace.branchName}
        </p>
      </div>
      <Badge variant={workplace.isBookable ? 'success' : 'outline'}>
        {workplace.isBookable ? 'Randevu alıyor' : 'Kapalı'}
      </Badge>
    </div>

    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
      <p className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
        <span>
          {workplace.address}, {workplace.district}, {workplace.city}
        </span>
      </p>
      {workplace.businessPhoneNumber && (
        <a
          className="inline-flex items-center gap-2 font-medium hover:text-[#D97706] dark:hover:text-amber-400"
          href={`tel:${workplace.businessPhoneNumber}`}
        >
          <Phone className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
          {workplace.businessPhoneNumber}
        </a>
      )}
      {workplace.biography && (
        <p className="pt-1 text-slate-500 dark:text-slate-400">{workplace.biography}</p>
      )}
    </div>
  </div>
);

const AppointmentCard: React.FC<{
  appointment: AppointmentResponse;
  updating: boolean;
  onUpdate: (status: number) => void;
}> = ({ appointment, updating, onUpdate }) => {
  const isPending = appointment.status === AppointmentStatus.Pending;
  const isConfirmed = appointment.status === AppointmentStatus.Confirmed;
  const statusLabel = isPending
    ? 'Onay bekliyor'
    : isConfirmed
      ? 'Onaylandı'
      : appointment.status === AppointmentStatus.Completed
        ? 'Tamamlandı'
        : appointment.status === AppointmentStatus.Cancelled
          ? 'İptal edildi'
          : 'Gelmedi';

  const statusClasses = isPending
    ? 'border-amber-500/35 bg-amber-500/12 text-[#B45309] dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-300'
    : isConfirmed
      ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-300'
      : appointment.status === AppointmentStatus.Cancelled
        ? 'border-red-500/35 bg-red-500/10 text-red-600 dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-300'
        : 'border-slate-300/80 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-200';

  const hasActions = isPending || isConfirmed;

  return (
    <div className="group rounded-[16px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_14px_38px_-22px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-200 hover:border-amber-500/45 hover:shadow-[0_18px_44px_-22px_rgba(217,119,6,0.2)] dark:border-amber-500/15 dark:bg-slate-900/65 dark:shadow-[0_16px_45px_-22px_rgba(0,0,0,0.75)] dark:hover:border-amber-400/50">
      <div
        className={cn(
          'grid items-center gap-4',
          hasActions
            ? 'lg:grid-cols-[minmax(180px,0.9fr)_minmax(0,2fr)_auto]'
            : 'lg:grid-cols-[minmax(190px,0.9fr)_minmax(0,2.2fr)]',
        )}
      >
        {/* Left Section: Customer Name (Bold Playfair) + Status Pill */}
        <div className="space-y-2">
          <h3 className="font-serif text-lg font-bold leading-snug text-slate-900 dark:text-white">
            {appointment.customerFullName}
          </h3>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold',
              statusClasses,
            )}
          >
            {statusLabel}
          </span>
        </div>

        {/* Middle Section: Compact 2-Column Service Details with Thin Left Divider */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 border-t border-slate-100 pt-3.5 text-xs sm:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 dark:border-white/10">
          <p className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
            <Scissors className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
            <span className="truncate">
              {appointment.serviceName} •{' '}
              <span className="text-[#D97706] dark:text-amber-400">
                {formatCurrency(appointment.priceSnapshot)}
              </span>
            </span>
          </p>

          <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
            <span className="truncate">
              {formatAppointmentDate(appointment.startAt)} • {appointment.durationSnapshot} dk
            </span>
          </p>

          <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="truncate">{appointment.branchName}</span>
          </p>

          {appointment.customerPhoneNumber ? (
            <a
              href={`tel:${appointment.customerPhoneNumber}`}
              className="inline-flex items-center gap-2 font-medium text-slate-700 transition-colors hover:text-[#D97706] dark:text-slate-300 dark:hover:text-amber-400"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
              <span>{appointment.customerPhoneNumber}</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              Telefon yok
            </span>
          )}
        </div>

        {/* Right Section: Subtle Action Buttons (when actionable) */}
        {hasActions && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 lg:justify-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 dark:border-white/10">
            {isPending && (
              <>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl bg-[#D97706] text-xs font-semibold text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
                  disabled={updating}
                  isLoading={updating}
                  onClick={() => onUpdate(AppointmentStatus.Confirmed)}
                >
                  <Check className="h-3.5 w-3.5" />
                  Onayla
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 rounded-xl border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/15"
                  disabled={updating}
                  onClick={() => onUpdate(AppointmentStatus.Cancelled)}
                >
                  <X className="h-3.5 w-3.5" />
                  İptal Et
                </Button>
              </>
            )}
            {isConfirmed && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 rounded-xl border-emerald-500/40 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/35 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                  disabled={updating}
                  onClick={() => onUpdate(AppointmentStatus.Completed)}
                >
                  <Check className="h-3.5 w-3.5" />
                  Tamamlandı
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 gap-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15"
                  disabled={updating}
                  onClick={() => onUpdate(AppointmentStatus.Cancelled)}
                >
                  İptal Et
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const EmployeeDashboardPage: React.FC = () => {
  const { workplaces, appointments, loading, updatingId, refresh, updateStatus } =
    useEmployeeData();
  const upcoming = appointments
    .filter(
      (appointment) =>
        (appointment.status === AppointmentStatus.Pending ||
          appointment.status === AppointmentStatus.Confirmed) &&
        new Date(appointment.startAt) >= new Date(),
    )
    .slice(0, 4);
  const pendingCount = appointments.filter(
    (appointment) => appointment.status === AppointmentStatus.Pending,
  ).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D97706] dark:text-amber-400">
            Çalışan Paneli
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5]">
            Merhaba, kolay gelsin
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Çalışma yerlerini ve sana ait randevuları buradan takip et.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 rounded-[14px] border-slate-200/90 bg-white/80 dark:border-white/15 dark:bg-slate-900/60"
          onClick={() => void refresh()}
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </Button>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-[18px]" />
          <Skeleton className="h-28 rounded-[18px]" />
          <Skeleton className="h-28 rounded-[18px]" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[18px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Çalıştığım Şubeler
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-slate-900 dark:text-white">
              {workplaces.length}
            </p>
          </div>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Onay Bekleyen
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-[#D97706] dark:text-amber-400">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Yaklaşan Randevular
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-slate-900 dark:text-white">
              {upcoming.length}
            </p>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Çalıştığım Yerler
          </h2>
        </div>
        {loading ? (
          <Skeleton className="h-40 rounded-[18px]" />
        ) : workplaces.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {workplaces.map((workplace) => (
              <WorkplaceCard
                key={`${workplace.staffProfileId}-${workplace.branchId}`}
                workplace={workplace}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
            Hesabına henüz bir çalışma yeri atanmamış. Salon yöneticinle iletişime geç.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Yaklaşan Randevular
          </h2>
        </div>
        {loading ? (
          <Skeleton className="h-36 rounded-[18px]" />
        ) : upcoming.length ? (
          <div className="space-y-3.5">
            {upcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                updating={updatingId === appointment.id}
                onUpdate={(status) => void updateStatus(appointment, status)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
            Yaklaşan randevun bulunmuyor.
          </div>
        )}
      </section>
    </div>
  );
};

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
        employeeService.getMyAssignedServices(workplace.staffProfileId),
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
        selectedServiceIds,
      );
      if (!res.success) {
        toast.error(res.message || 'Hizmetleriniz kaydedilemedi.');
        return;
      }
      toast.success(`${selectedWorkplace.businessName} için verdiğiniz hizmetler güncellendi!`);
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

      {/* 1. Salon / Şube Seçimi */}
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

      {/* 2. Seçili Salondaki Hizmetlerin */}
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

export const EmployeeAppointmentsPage: React.FC = () => {
  const { appointments, loading, updatingId, refresh, updateStatus } = useEmployeeData();
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'past'>('all');

  const counts = useMemo(
    () => ({
      all: appointments.length,
      pending: appointments.filter((a) => a.status === AppointmentStatus.Pending).length,
      confirmed: appointments.filter((a) => a.status === AppointmentStatus.Confirmed).length,
      past: appointments.filter((a) =>
        [
          AppointmentStatus.Completed,
          AppointmentStatus.Cancelled,
          AppointmentStatus.NoShow,
        ].includes(a.status as 3 | 4 | 5),
      ).length,
    }),
    [appointments],
  );

  const filtered = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (filter === 'pending') return appointment.status === AppointmentStatus.Pending;
        if (filter === 'confirmed') return appointment.status === AppointmentStatus.Confirmed;
        if (filter === 'past') {
          return [
            AppointmentStatus.Completed,
            AppointmentStatus.Cancelled,
            AppointmentStatus.NoShow,
          ].includes(appointment.status as 3 | 4 | 5);
        }
        return true;
      }),
    [appointments, filter],
  );

  const tabs: Array<{ value: 'all' | 'pending' | 'confirmed' | 'past'; label: string; count: number }> = [
    { value: 'all', label: 'Tümü', count: counts.all },
    { value: 'pending', label: 'Onay bekleyen', count: counts.pending },
    { value: 'confirmed', label: 'Onaylanan', count: counts.confirmed },
    { value: 'past', label: 'Geçmiş', count: counts.past },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5]">
            Randevularım
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Yalnızca sana atanmış müşteri randevuları.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 rounded-[14px] border-slate-200/90 bg-white/80 px-4 text-xs font-semibold dark:border-white/15 dark:bg-slate-900/60"
          onClick={() => void refresh()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Yenile
        </Button>
      </header>

      {/* Segmented Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = filter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-[14px] border px-4 py-2 text-xs font-semibold transition-all duration-200',
                isActive
                  ? 'border-[#D97706] bg-[#D97706] text-white shadow-md shadow-amber-600/25 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'border-slate-200/90 bg-transparent text-slate-600 hover:border-amber-500/40 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/40 dark:hover:text-white',
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isActive
                    ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horizontal Grid Cards List */}
      {loading ? (
        <div className="space-y-3.5">
          <Skeleton className="h-28 rounded-[16px]" />
          <Skeleton className="h-28 rounded-[16px]" />
        </div>
      ) : filtered.length ? (
        <div className="space-y-3.5">
          {filtered.map((appointment, idx) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(idx * 0.03, 0.15) }}
            >
              <AppointmentCard
                appointment={appointment}
                updating={updatingId === appointment.id}
                onUpdate={(status) => void updateStatus(appointment, status)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-slate-200/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/60">
          <UserRound className="mx-auto h-9 w-9 text-slate-400 dark:text-slate-500" />
          <h2 className="mt-3 font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Bu filtrede randevu yok
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Filtreyi değiştirerek diğer randevularını görüntüleyebilirsin.
          </p>
        </div>
      )}
    </div>
  );
};
