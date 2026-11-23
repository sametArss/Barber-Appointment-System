import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  MapPin,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Skeleton } from '@/components/ui';
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import type {
  AppointmentResponse,
  AvailableSlot,
  BranchSearchResponse,
  BranchServiceResponse,
  CustomerPenaltyStatus,
  StaffResponse,
  WorkingHourResponse,
} from '@/types/booking';

interface BookingLocationState {
  branch?: BranchSearchResponse;
  preselectedServiceId?: string;
}

type GridSlotItem =
  | { kind: 'available'; startLabel: string; endLabel: string; slot: AvailableSlot }
  | { kind: 'break'; startLabel: string; endLabel: string }
  | { kind: 'busy'; startLabel: string; endLabel: string };

const toMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const formatMinutes = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const getNext14Days = (): Array<{
  value: string;
  dayName: string;
  dayNum: string;
  month: string;
}> => {
  const days: Array<{ value: string; dayName: string; dayNum: string; month: string }> = [];
  const base = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push({
      value: `${yyyy}-${mm}-${dd}`,
      dayName:
        i === 0
          ? 'Bugün'
          : i === 1
            ? 'Yarın'
            : d.toLocaleDateString('tr-TR', { weekday: 'short' }),
      dayNum: dd,
      month: d.toLocaleDateString('tr-TR', { month: 'short' }),
    });
  }
  return days;
};

const formatReadableDate = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });
};

const buildSlotGrid = (
  dateStr: string,
  durationMinutes: number,
  availableSlots: AvailableSlot[],
  workingHours: WorkingHourResponse[],
): { isClosedDay: boolean; items: GridSlotItem[] } => {
  const availableMap = new Map<string, AvailableSlot>();
  availableSlots.forEach((slot) => {
    availableMap.set(slot.startTime.slice(0, 5), slot);
  });

  const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();
  const dayConfig = workingHours.find((w) => w.dayOfWeek === dayOfWeek);

  if (!dayConfig && workingHours.length > 0 && availableSlots.length === 0) {
    return { isClosedDay: true, items: [] };
  }

  if (!dayConfig) {
    return {
      isClosedDay: false,
      items: availableSlots.map((slot) => ({
        kind: 'available',
        startLabel: slot.startTime.slice(0, 5),
        endLabel: slot.endTime.slice(0, 5),
        slot,
      })),
    };
  }

  const startMin = toMinutes(dayConfig.startTime);
  const endMin = toMinutes(dayConfig.endTime);
  const breaks = dayConfig.breaks.map((b) => ({
    start: toMinutes(b.startTime),
    end: toMinutes(b.endTime),
  }));

  const items: GridSlotItem[] = [];
  for (let cursor = startMin; cursor + durationMinutes <= endMin; cursor += 15) {
    const slotEnd = cursor + durationMinutes;
    const startLabel = formatMinutes(cursor);
    const endLabel = formatMinutes(slotEnd);

    const matched = availableMap.get(startLabel);
    if (matched) {
      items.push({ kind: 'available', startLabel, endLabel, slot: matched });
      continue;
    }

    const overlapsBreak = breaks.some((b) => cursor < b.end && slotEnd > b.start);
    if (overlapsBreak) {
      items.push({ kind: 'break', startLabel, endLabel });
    } else {
      items.push({ kind: 'busy', startLabel, endLabel });
    }
  }

  return { isClosedDay: false, items };
};

const STEPS = [
  { id: 1, title: 'Hizmet Seçimi' },
  { id: 2, title: 'Berber Seçimi' },
  { id: 3, title: 'Tarih & Saat' },
  { id: 4, title: 'Özet & Onay' },
] as const;

export const BookingPage: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as BookingLocationState | null;

  const [step, setStep] = useState<number>(1);
  const [services, setServices] = useState<BranchServiceResponse[]>([]);
  const [staffList, setStaffList] = useState<StaffResponse[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [selectedService, setSelectedService] = useState<BranchServiceResponse | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffResponse | null>(null);

  const dateOptions = useMemo(() => getNext14Days(), []);
  const [selectedDate, setSelectedDate] = useState<string>(
    dateOptions[1]?.value ?? dateOptions[0].value,
  );
  const [workingHours, setWorkingHours] = useState<WorkingHourResponse[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const [penaltyStatus, setPenaltyStatus] = useState<CustomerPenaltyStatus | null>(null);
  const [loadingPenalty, setLoadingPenalty] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [createdAppointment, setCreatedAppointment] = useState<AppointmentResponse | null>(null);

  const businessId = selectedStaff?.businessId ?? routeState?.branch?.businessId ?? null;

  useEffect(() => {
    if (!branchId) return;

    let cancelled = false;
    setLoadingInit(true);

    Promise.all([
      bookingService.getBranchServices(branchId),
      bookingService.getBranchStaff(branchId),
    ])
      .then(([srvRes, staffRes]) => {
        if (cancelled) return;
        const activeServices = (srvRes.data ?? []).filter((s) => s.isActive);
        const bookableStaff = (staffRes.data ?? []).filter((s) => s.isBookable);

        setServices(activeServices);
        setStaffList(bookableStaff);

        if (routeState?.preselectedServiceId) {
          const found = activeServices.find(
            (s) => s.serviceId === routeState.preselectedServiceId,
          );
          if (found) setSelectedService(found);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, 'Şube hizmet ve personel bilgileri yüklenemedi.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInit(false);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId, routeState?.preselectedServiceId]);

  const fetchSlotsAndSchedule = useCallback(async () => {
    if (!branchId || !selectedStaff || !selectedService || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const [slotsRes, whRes] = await Promise.all([
        bookingService.getAvailableSlots({
          branchId,
          staffProfileId: selectedStaff.id,
          serviceId: selectedService.serviceId,
          date: selectedDate,
        }),
        bookingService.getStaffWorkingHours(selectedStaff.id, branchId),
      ]);

      setAvailableSlots(slotsRes.data ?? []);
      setWorkingHours(whRes.data ?? []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Müsait saatler alınamadı.'));
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [branchId, selectedDate, selectedService, selectedStaff]);

  useEffect(() => {
    if (step >= 3 && selectedStaff && selectedService) {
      fetchSlotsAndSchedule();
    }
  }, [step, selectedDate, selectedStaff, selectedService, fetchSlotsAndSchedule]);

  useEffect(() => {
    if (step !== 4 || !businessId) return;

    let cancelled = false;
    setLoadingPenalty(true);
    bookingService
      .getMyPenaltyStatus(businessId)
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setPenaltyStatus(res.data);
        }
      })
      .catch(() => {
        // Ceza bilgisi alınamazsa varsayılan akışı engelleme
      })
      .finally(() => {
        if (!cancelled) setLoadingPenalty(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, businessId]);

  const eligibleStaffList = useMemo(() => {
    if (!selectedService) return staffList;
    return staffList.filter((member) =>
      (member.assignedServiceIds ?? []).includes(selectedService.serviceId),
    );
  }, [staffList, selectedService]);

  const slotGrid = useMemo(() => {
    if (!selectedService) return { isClosedDay: false, items: [] as GridSlotItem[] };
    return buildSlotGrid(
      selectedDate,
      selectedService.finalDurationMinutes,
      availableSlots,
      workingHours,
    );
  }, [availableSlots, selectedDate, selectedService, workingHours]);

  const handleConfirmBooking = async () => {
    if (!branchId || !selectedService || !selectedStaff || !selectedSlot) return;

    setSubmitting(true);
    setConflictMessage(null);

    try {
      const res = await bookingService.createAppointment({
        branchId,
        staffProfileId: selectedStaff.id,
        serviceId: selectedService.serviceId,
        startAt: selectedSlot.startAtUtc,
      });

      if (res.success && res.data) {
        setCreatedAppointment(res.data);
        toast.success('Randevunuz başarıyla oluşturuldu!');
      } else {
        toast.error(res.message || 'Randevu oluşturulamadı.');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const msg =
          getApiErrorMessage(error) ||
          'Seçilen zaman diliminde personel doludur. Lütfen başka bir slot seçiniz.';
        setConflictMessage(msg);
        setSelectedSlot(null);
        toast.error(msg);
        await fetchSlotsAndSchedule();
      } else {
        toast.error(getApiErrorMessage(error, 'Randevu oluşturulamadı.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!branchId) {
    return (
      <div className="mx-auto max-w-lg rounded-[24px] border border-slate-200/80 bg-white/85 p-10 text-center shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Geçersiz şube seçimi.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 py-2 sm:py-4">
      {/* Editorial Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-amber-500/40 hover:text-[#D97706] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-amber-400/40 dark:hover:text-amber-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Geri Dön
          </button>

          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
            {routeState?.branch?.branchName ?? 'Randevu Oluştur'}
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            {routeState?.branch ? (
              <>
                <MapPin className="h-4 w-4 text-[#D97706] dark:text-amber-400" />
                <span>
                  {routeState.branch.businessName} • {routeState.branch.district}/
                  {routeState.branch.city}
                </span>
              </>
            ) : (
              <span>Hizmet, usta ve sana en uygun saati seçerek yerini ayırt.</span>
            )}
          </p>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-amber-500/30 bg-amber-500/12 px-4 py-1.5 text-xs font-semibold text-[#B45309] dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-300">
          Adım {step} / 4
        </span>
      </div>

      {/* Modern Glassmorphic Stepper */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {STEPS.map((item) => {
          const isCompleted = step > item.id;
          const isCurrent = step === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.id > step}
              onClick={() => item.id < step && setStep(item.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-[16px] border px-3.5 py-3 text-left transition-all duration-200',
                isCurrent &&
                  'border-[#D97706] bg-[#D97706] text-white shadow-md shadow-amber-600/25 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_22px_rgba(245,158,11,0.3)]',
                isCompleted &&
                  'cursor-pointer border-emerald-500/35 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:border-emerald-400/30 dark:text-emerald-300',
                !isCurrent &&
                  !isCompleted &&
                  'cursor-not-allowed border-slate-200/80 bg-white/60 text-slate-400 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-500',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isCurrent && 'bg-white/25 text-white dark:bg-slate-950/20 dark:text-slate-950',
                  isCompleted && 'bg-emerald-500 text-white',
                  !isCurrent &&
                    !isCompleted &&
                    'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : item.id}
              </span>
              <span className="truncate text-xs font-semibold">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* Conflict Alert */}
      {conflictMessage && (
        <div className="flex flex-col gap-3 rounded-[18px] border border-red-500/35 bg-red-50/90 p-4 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-200">
                Seçilen Saat Az Önce Doldu
              </p>
              <p className="text-xs text-red-600/90 dark:text-red-300/90">{conflictMessage}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="danger"
            className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              setConflictMessage(null);
              setStep(3);
            }}
          >
            Başka Saat Seç
          </Button>
        </div>
      )}

      {/* Main Two-Column Layout: Step Content (Left) + Sticky Summary Receipt (Right) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Left: Wizard Step Card */}
        <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8),0_0_32px_-14px_rgba(245,158,11,0.16)] sm:p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Service Selection */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                    <Sparkles className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
                    Hizmet Seçimi
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Almak istediğiniz bakım veya tıraş hizmetini seçin.
                  </p>
                </div>

                {loadingInit ? (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <Skeleton className="h-32 w-full rounded-[18px]" />
                    <Skeleton className="h-32 w-full rounded-[18px]" />
                  </div>
                ) : services.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Bu şubede aktif hizmet bulunamadı.
                  </p>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {services.map((srv) => {
                      const isSelected = selectedService?.serviceId === srv.serviceId;
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => {
                            setSelectedService(srv);
                            setSelectedSlot(null);
                            if (
                              selectedStaff &&
                              !(selectedStaff.assignedServiceIds ?? []).includes(srv.serviceId)
                            ) {
                              setSelectedStaff(null);
                            }
                          }}
                          className={cn(
                            'group flex cursor-pointer flex-col justify-between rounded-[18px] border p-5 text-left transition-all duration-200',
                            isSelected
                              ? 'border-[#D97706] bg-amber-50/80 ring-2 ring-amber-500/25 dark:border-amber-400 dark:bg-amber-500/12 dark:shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)]'
                              : 'border-slate-200/90 bg-slate-50/60 hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-white dark:border-white/10 dark:bg-slate-950/50 dark:hover:border-amber-400/45 dark:hover:bg-slate-950/80',
                          )}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {srv.serviceName}
                              </h3>
                              <span className="shrink-0 font-serif text-lg font-bold text-[#D97706] dark:text-amber-400">
                                {formatCurrency(srv.finalPrice)}
                              </span>
                            </div>
                            {srv.description && (
                              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                {srv.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs dark:border-white/10">
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
                              <Clock className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
                              {srv.finalDurationMinutes} dk
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 font-semibold text-[#B45309] dark:text-amber-300">
                                <Check className="h-3.5 w-3.5" />
                                Seçildi
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-white/10">
                  <Button
                    disabled={!selectedService}
                    onClick={() => setStep(2)}
                    className="h-11 gap-2 rounded-[14px] bg-[#D97706] px-6 font-semibold text-white shadow-md shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                  >
                    Berber Seçimine Geç
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Staff Selection */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                    <UserCheck className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
                    Berber / Usta Seçimi
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Hizmeti almak istediğiniz uzmanı belirleyin.
                  </p>
                </div>

                {eligibleStaffList.length === 0 ? (
                  <div className="rounded-[18px] border border-amber-500/25 bg-amber-50/70 p-8 text-center dark:border-amber-400/20 dark:bg-amber-500/5">
                    <p className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                      Bu hizmet için henüz atanmış bir uzman bulunmuyor
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Seçtiğiniz hizmeti verebilen bir berber atanmadığı için farklı bir hizmet
                      seçebilirsiniz.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {eligibleStaffList.map((member) => {
                      const isSelected = selectedStaff?.id === member.id;
                      const initials = member.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setSelectedStaff(member);
                            setSelectedSlot(null);
                          }}
                          className={cn(
                            'flex cursor-pointer items-center gap-4 rounded-[18px] border p-4.5 text-left transition-all duration-200',
                            isSelected
                              ? 'border-[#D97706] bg-amber-50/80 ring-2 ring-amber-500/25 dark:border-amber-400 dark:bg-amber-500/12 dark:shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)]'
                              : 'border-slate-200/90 bg-slate-50/60 hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-white dark:border-white/10 dark:bg-slate-950/50 dark:hover:border-amber-400/45 dark:hover:bg-slate-950/80',
                          )}
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-gradient-to-br from-amber-100 to-orange-100 font-serif text-base font-bold text-[#D97706] dark:border-amber-400/35 dark:from-amber-500/25 dark:to-slate-900 dark:text-amber-300">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-serif text-base font-bold text-slate-900 dark:text-white">
                              {member.fullName}
                            </h3>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                              {member.biography || 'Profesyonel Saç & Sakal Tasarım Uzmanı'}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D97706] text-white dark:bg-amber-500 dark:text-slate-950">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-11 gap-2 rounded-[14px]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Hizmete Dön
                  </Button>
                  <Button
                    disabled={!selectedStaff}
                    onClick={() => setStep(3)}
                    className="h-11 gap-2 rounded-[14px] bg-[#D97706] px-6 font-semibold text-white shadow-md shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                  >
                    Tarih &amp; Saat Seç
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Date & Dynamic Slot Grid */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                      <Calendar className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
                      Tarih ve Saat Seçimi
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {selectedStaff?.fullName} • {selectedService?.serviceName} (
                      {selectedService?.finalDurationMinutes} dk)
                    </p>
                  </div>

                  <input
                    type="date"
                    value={selectedDate}
                    min={dateOptions[0].value}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot(null);
                    }}
                    className="h-10 rounded-[14px] border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-medium text-slate-900 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100"
                  />
                </div>

                {/* Horizontal 14-day Calendar Strip */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dateOptions.map((d) => {
                    const active = selectedDate === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => {
                          setSelectedDate(d.value);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          'flex min-w-[74px] cursor-pointer select-none flex-col items-center rounded-[16px] border px-3 py-2.5 transition-all active:scale-95',
                          active
                            ? 'border-[#D97706] bg-[#D97706] font-bold text-white shadow-md shadow-amber-600/25 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                            : 'border-slate-200/90 bg-slate-50/70 text-slate-700 hover:border-amber-400/60 hover:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-amber-400/40',
                        )}
                      >
                        <span className="text-[10px] font-semibold uppercase">{d.dayName}</span>
                        <span className="font-serif text-lg font-bold leading-tight">
                          {d.dayNum}
                        </span>
                        <span className="text-[10px] opacity-80">{d.month}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Slot Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded border border-slate-300 bg-white dark:border-white/15 dark:bg-slate-900" />
                    Müsait
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-[#D97706] dark:bg-amber-500" />
                    Seçili
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded border border-amber-400/40 bg-amber-100 dark:bg-amber-500/15" />
                    Öğle Molası
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-800" />
                    Dolu
                  </span>
                </div>

                {/* Dynamic Slot Grid */}
                {loadingSlots ? (
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-[14px]" />
                    ))}
                  </div>
                ) : slotGrid.isClosedDay ? (
                  <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-8 text-center dark:border-white/10 dark:bg-slate-950/60">
                    <p className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                      Personel seçilen günde çalışmamaktadır
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Lütfen takvimden başka bir gün seçin.
                    </p>
                  </div>
                ) : slotGrid.items.length === 0 ? (
                  <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-8 text-center dark:border-white/10 dark:bg-slate-950/60">
                    <p className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                      Bu tarih için müsait saat bulunamadı
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Farklı bir tarih veya uzman seçmeyi deneyin.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                    {slotGrid.items.map((item) => {
                      if (item.kind === 'break') {
                        return (
                          <button
                            key={`break-${item.startLabel}`}
                            type="button"
                            disabled
                            title="Öğle molası aralığı"
                            className="flex cursor-not-allowed flex-col items-center justify-center rounded-[14px] border border-amber-300/60 bg-amber-50/80 px-2 py-2.5 text-amber-800/75 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300/70"
                          >
                            <span className="text-xs font-semibold line-through">
                              {item.startLabel}
                            </span>
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px]">
                              <Coffee className="h-3 w-3" />
                              Mola
                            </span>
                          </button>
                        );
                      }

                      if (item.kind === 'busy') {
                        return (
                          <button
                            key={`busy-${item.startLabel}`}
                            type="button"
                            disabled
                            title="Bu saat aralığı dolu veya geçmiş"
                            className="flex cursor-not-allowed flex-col items-center justify-center rounded-[14px] border border-slate-200/70 bg-slate-100/80 px-2 py-2.5 text-slate-400 dark:border-white/5 dark:bg-slate-950/40 dark:text-slate-600"
                          >
                            <span className="text-xs font-semibold line-through">
                              {item.startLabel}
                            </span>
                            <span className="mt-0.5 text-[10px]">Dolu</span>
                          </button>
                        );
                      }

                      const isSelected = selectedSlot?.startAtUtc === item.slot.startAtUtc;
                      return (
                        <button
                          key={item.slot.startAtUtc}
                          type="button"
                          onClick={() => setSelectedSlot(item.slot)}
                          className={cn(
                            'flex cursor-pointer select-none flex-col items-center justify-center rounded-[14px] border px-2 py-2.5 transition-all active:scale-95',
                            isSelected
                              ? 'border-[#D97706] bg-[#D97706] font-bold text-white shadow-md shadow-amber-600/30 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                              : 'border-slate-200/90 bg-white text-slate-900 hover:border-[#D97706]/60 hover:bg-amber-50/50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/10',
                          )}
                        >
                          <span className="text-sm font-bold">{item.startLabel}</span>
                          <span
                            className={cn(
                              'text-[10px]',
                              isSelected
                                ? 'text-white/90 dark:text-slate-900'
                                : 'text-slate-400 dark:text-slate-500',
                            )}
                          >
                            → {item.endLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="h-11 gap-2 rounded-[14px]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Berbere Dön
                  </Button>
                  <Button
                    disabled={!selectedSlot}
                    onClick={() => setStep(4)}
                    className="h-11 gap-2 rounded-[14px] bg-[#D97706] px-6 font-semibold text-white shadow-md shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                  >
                    Özeti Görüntüle
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Summary, Penalty Check & Confirm */}
            {step === 4 && selectedService && selectedStaff && selectedSlot && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                    <CheckCircle2 className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
                    Randevu Özeti ve Onay
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Bilgilerinizi kontrol edip randevunuzu onaylayın.
                  </p>
                </div>

                {/* Customer Penalty Check */}
                {loadingPenalty ? (
                  <Skeleton className="h-16 w-full rounded-[16px]" />
                ) : penaltyStatus ? (
                  penaltyStatus.isRestricted ? (
                    <div className="flex items-start gap-3 rounded-[16px] border border-red-500/35 bg-red-50/90 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-200">
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
                      <div className="space-y-1 text-xs">
                        <p className="text-sm font-semibold">Randevu Kısıtlaması Aktif</p>
                        <p>
                          {penaltyStatus.restrictionMessage ||
                            `Aktif ceza sayınız (${penaltyStatus.activePenaltyCount}) nedeniyle şu an bu işletmeden randevu alamazsınız.`}
                        </p>
                      </div>
                    </div>
                  ) : penaltyStatus.activePenaltyCount > 0 ? (
                    <div className="flex items-start gap-3 rounded-[16px] border border-amber-500/35 bg-amber-50/90 p-4 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="space-y-1 text-xs">
                        <p className="text-sm font-semibold">
                          Ceza Uyarısı ({penaltyStatus.activePenaltyCount} / 3 Aktif İhlal)
                        </p>
                        <p>
                          3 aktif no-show veya geç iptal ihlaline ulaştığınızda 14 gün geçici
                          rezervasyon kısıtlaması uygulanır.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-[16px] border border-emerald-500/30 bg-emerald-50/90 px-4 py-3 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Randevu Güvenlik Durumunuz Temiz
                      </span>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        0 Aktif İhlal
                      </span>
                    </div>
                  )
                ) : null}

                {/* Detailed Confirmation Table */}
                <div className="divide-y divide-slate-100 rounded-[18px] border border-slate-200/80 bg-slate-50/75 dark:divide-white/10 dark:border-white/10 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between px-4 py-3.5 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Hizmet</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedService.serviceName} ({selectedService.finalDurationMinutes} dk)
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Berber / Usta</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedStaff.fullName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Tarih &amp; Saat</span>
                    <span className="font-semibold text-[#D97706] dark:text-amber-400">
                      {formatReadableDate(selectedDate)} • {selectedSlot.startTime.slice(0, 5)} -{' '}
                      {selectedSlot.endTime.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-4">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Toplam Tutar
                    </span>
                    <span className="font-serif text-2xl font-bold text-[#D97706] dark:text-amber-400">
                      {formatCurrency(selectedService.finalPrice)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="h-11 gap-2 rounded-[14px]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Saate Dön
                  </Button>
                  <Button
                    size="lg"
                    isLoading={submitting}
                    disabled={penaltyStatus?.isRestricted === true}
                    onClick={handleConfirmBooking}
                    className="h-12 gap-2 rounded-[16px] bg-[#D97706] px-7 text-sm font-semibold text-white shadow-lg shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_24px_rgba(245,158,11,0.4)] dark:hover:bg-amber-400"
                  >
                    <Scissors className="h-4 w-4" />
                    Randevuyu Onayla
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Sticky Live Booking Summary Receipt */}
        <aside className="rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8)] lg:sticky lg:top-24">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 dark:border-white/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/12 text-[#D97706] dark:bg-amber-500/15 dark:text-amber-400">
              <Scissors className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D97706] dark:text-amber-400">
                Canlı Özet
              </p>
              <h3 className="truncate font-serif text-lg font-bold text-slate-900 dark:text-white">
                {routeState?.branch?.branchName ?? 'Seçiminiz'}
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Hizmet</span>
              <span className="text-right font-semibold text-slate-900 dark:text-white">
                {selectedService
                  ? `${selectedService.serviceName} (${selectedService.finalDurationMinutes} dk)`
                  : 'Seçilmedi'}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Berber</span>
              <span className="text-right font-semibold text-slate-900 dark:text-white">
                {selectedStaff ? selectedStaff.fullName : 'Seçilmedi'}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Tarih</span>
              <span className="text-right font-semibold text-slate-900 dark:text-white">
                {step >= 3 || selectedSlot ? formatReadableDate(selectedDate) : 'Seçilmedi'}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Saat</span>
              <span className="text-right font-semibold text-[#D97706] dark:text-amber-400">
                {selectedSlot
                  ? `${selectedSlot.startTime.slice(0, 5)} - ${selectedSlot.endTime.slice(0, 5)}`
                  : 'Seçilmedi'}
              </span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Toplam
            </span>
            <span className="font-serif text-2xl font-bold text-[#D97706] dark:text-amber-400">
              {selectedService ? formatCurrency(selectedService.finalPrice) : '₺0,00'}
            </span>
          </div>
        </aside>
      </div>

      {/* Success Modal */}
      {createdAppointment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-[24px] border border-amber-500/25 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/95 sm:p-7"
          >
            <button
              type="button"
              onClick={() => navigate('/my-appointments')}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                Randevunuz Oluşturuldu!
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Rezervasyon kaydınız onay bekliyor durumunda sisteme eklendi.
              </p>
            </div>

            <div className="mt-5 space-y-2.5 text-xs">
              <div className="flex justify-between rounded-[14px] border border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
                <span className="text-slate-500 dark:text-slate-400">Şube</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {createdAppointment.branchName}
                </span>
              </div>
              <div className="flex justify-between rounded-[14px] border border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
                <span className="text-slate-500 dark:text-slate-400">Hizmet</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {createdAppointment.serviceName} ({createdAppointment.durationSnapshot} dk)
                </span>
              </div>
              <div className="flex justify-between rounded-[14px] border border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
                <span className="text-slate-500 dark:text-slate-400">Berber</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {createdAppointment.staffFullName}
                </span>
              </div>
              <div className="flex justify-between rounded-[14px] border border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
                <span className="text-slate-500 dark:text-slate-400">Ücret</span>
                <span className="font-serif text-base font-bold text-[#D97706] dark:text-amber-400">
                  {formatCurrency(createdAppointment.priceSnapshot)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-2.5">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-[14px]"
                onClick={() => navigate('/explore')}
              >
                Keşfet&apos;e Dön
              </Button>
              <Button
                className="h-11 flex-1 rounded-[14px] bg-[#D97706] font-semibold text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
                onClick={() => navigate('/my-appointments')}
              >
                Randevularım
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
