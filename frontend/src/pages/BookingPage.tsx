import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
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
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui';
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

const getNext14Days = (): Array<{ value: string; dayName: string; dayNum: string; month: string }> => {
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
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[1]?.value ?? dateOptions[0].value);
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
          const found = activeServices.find((s) => s.serviceId === routeState.preselectedServiceId);
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
        // Ceza bilgisi alınamazsa varsayılan akışı engelleme; backend create'te kontrol eder
      })
      .finally(() => {
        if (!cancelled) setLoadingPenalty(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, businessId]);

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
      <Card>
        <CardContent className="p-8 text-center text-sm text-slate-400">
          Geçersiz şube seçimi.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-amber-400 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Geri Dön
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            {routeState?.branch?.branchName ?? 'Randevu Oluştur'}
          </h1>
          <p className="text-sm text-slate-400">
            {routeState?.branch
              ? `${routeState.branch.businessName} • ${routeState.branch.district}/${routeState.branch.city}`
              : 'Hizmet, berber ve uygun saati seçerek randevunuzu tamamlayın.'}
          </p>
        </div>
        <Badge variant="amber" className="self-start sm:self-center">
          Adım {step} / 4
        </Badge>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-4 gap-2">
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
                'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all',
                isCurrent && 'border-amber-500 bg-amber-500/15 text-amber-300',
                isCompleted &&
                  'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 cursor-pointer',
                !isCurrent &&
                  !isCompleted &&
                  'border-slate-800 bg-slate-900/50 text-slate-500 cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isCurrent && 'bg-amber-500 text-slate-950',
                  isCompleted && 'bg-emerald-500 text-slate-950',
                  !isCurrent && !isCompleted && 'bg-slate-800 text-slate-400',
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : item.id}
              </span>
              <span className="hidden truncate text-xs font-semibold sm:inline">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Conflict Alert */}
      {conflictMessage && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <p className="text-sm font-semibold text-rose-200">
                Saat Çakışması (409 Conflict)
              </p>
              <p className="text-xs text-rose-300/90">{conflictMessage}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setConflictMessage(null);
              setStep(3);
            }}
          >
            Başka Slot Seç
          </Button>
        </div>
      )}

      {/* Step 1: Service Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              1. Adım: Hizmet Seçimi
            </CardTitle>
            <CardDescription>
              Almak istediğiniz bakım veya tıraş hizmetini seçin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInit ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : services.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Bu şubede aktif hizmet bulunamadı.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((srv) => {
                  const isSelected = selectedService?.serviceId === srv.serviceId;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(srv);
                        setSelectedSlot(null);
                      }}
                      className={cn(
                        'flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer',
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40'
                          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700',
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-zinc-100">{srv.serviceName}</h3>
                          <Badge variant={isSelected ? 'amber' : 'default'}>
                            {formatCurrency(srv.finalPrice)}
                          </Badge>
                        </div>
                        {srv.description && (
                          <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">{srv.description}</p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                          {srv.finalDurationMinutes} dk
                        </span>
                        {isSelected && (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">Seçildi ✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end border-t border-slate-800/80 pt-4">
            <Button disabled={!selectedService} onClick={() => setStep(2)}>
              Berber Seçimine Geç
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Staff Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-400" />
              2. Adım: Berber / Personel Seçimi
            </CardTitle>
            <CardDescription>
              Hizmeti almak istediğiniz uzmanı belirleyin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staffList.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Bu şubede randevuya uygun personel bulunamadı.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {staffList.map((member) => {
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
                        'flex items-center gap-4 rounded-2xl border p-4 text-left transition-all cursor-pointer',
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40'
                          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700',
                      )}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-sm font-bold text-amber-500 dark:text-amber-400">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-slate-900 dark:text-zinc-100">
                          {member.fullName}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                          {member.biography || 'Profesyonel Saç & Sakal Tasarım Uzmanı'}
                        </p>
                      </div>
                      {isSelected && <Check className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between border-t border-slate-800/80 pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" />
              Hizmete Dön
            </Button>
            <Button disabled={!selectedStaff} onClick={() => setStep(3)}>
              Tarih &amp; Saat Seç
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Date & Dynamic Slot Grid */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-400" />
                  3. Adım: Tarih ve Saat Seçimi
                </CardTitle>
                <CardDescription>
                  {selectedStaff?.fullName} • {selectedService?.serviceName} (
                  {selectedService?.finalDurationMinutes} dk)
                </CardDescription>
              </div>
              <input
                type="date"
                value={selectedDate}
                min={dateOptions[0].value}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Horizontal 14-day Calendar */}
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
                      'flex min-w-18 flex-col items-center rounded-xl border px-3 py-2.5 transition-all cursor-pointer select-none active:scale-95',
                      active
                        ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-amber-500/40 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-zinc-700',
                    )}
                  >
                    <span className="text-[10px] font-medium uppercase">{d.dayName}</span>
                    <span className="text-lg font-bold leading-tight">{d.dayNum}</span>
                    <span className="text-[10px] opacity-80">{d.month}</span>
                  </button>
                );
              })}
            </div>

            {/* Slot Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-slate-300 bg-white dark:border-zinc-700 dark:bg-zinc-900" />
                Müsait
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-500" />
                Seçili
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-orange-500/30 bg-orange-500/15" />
                Öğle Molası (13:00-14:00)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-slate-200 dark:bg-zinc-800/70 opacity-60" />
                Dolu / Kapalı
              </span>
            </div>

            {/* Dynamic Slot Grid */}
            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : slotGrid.isClosedDay ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
                <p className="font-semibold text-slate-800 dark:text-zinc-200">
                  Personel seçilen günde çalışmamaktadır
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Lütfen takvimden başka bir gün seçin.
                </p>
              </div>
            ) : slotGrid.items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
                <p className="font-semibold text-slate-800 dark:text-zinc-200">
                  Bu tarih için müsait randevu saati bulunamadı
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Farklı bir tarih veya personel seçmeyi deneyin.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                {slotGrid.items.map((item) => {
                  if (item.kind === 'break') {
                    return (
                      <button
                        key={`break-${item.startLabel}`}
                        type="button"
                        disabled
                        title="Öğle molası aralığı (13:00 - 14:00)"
                        className="flex flex-col items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 px-2 py-2.5 text-orange-300/70 opacity-75 cursor-not-allowed"
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
                        className="flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/40 px-2 py-2.5 text-slate-600 opacity-60 cursor-not-allowed"
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
                        'flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 transition-all cursor-pointer active:scale-95 select-none',
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-amber-500/60 hover:bg-amber-50/50 dark:border-zinc-700/80 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:border-amber-500/60 dark:hover:bg-amber-500/10',
                      )}
                    >
                      <span className="text-sm font-bold">{item.startLabel}</span>
                      <span
                        className={cn(
                          'text-[10px]',
                          isSelected ? 'text-slate-900 font-medium' : 'text-slate-400',
                        )}
                      >
                        → {item.endLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>

          <CardFooter className="justify-between border-t border-slate-800/80 pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" />
              Berbere Dön
            </Button>
            <Button disabled={!selectedSlot} onClick={() => setStep(4)}>
              Özeti Görüntüle
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Summary, Penalty Check & Confirm */}
      {step === 4 && selectedService && selectedStaff && selectedSlot && (
        <Card accent>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-amber-400" />
              4. Adım: Randevu Özeti ve Onay
            </CardTitle>
            <CardDescription>
              Bilgilerinizi kontrol edip randevunuzu onaylayın.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Customer Penalty Check */}
            {loadingPenalty ? (
              <Skeleton className="h-16 w-full" />
            ) : penaltyStatus ? (
              penaltyStatus.isRestricted ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                  <div className="text-xs space-y-1">
                    <p className="text-sm font-semibold">Randevu Kısıtlaması Aktif</p>
                    <p>
                      {penaltyStatus.restrictionMessage ||
                        `Aktif ceza sayınız (${penaltyStatus.activePenaltyCount}) nedeniyle şu an bu işletmeden randevu alamazsınız.`}
                    </p>
                  </div>
                </div>
              ) : penaltyStatus.activePenaltyCount > 0 ? (
                <div className="flex items-start gap-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 text-orange-200">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
                  <div className="text-xs space-y-1">
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
                <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Müşteri Ceza Durumu Temiz
                  </span>
                  <Badge variant="success">0 Aktif Ceza</Badge>
                </div>
              )
            ) : null}

            {/* Summary Details */}
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/70 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-500 dark:text-zinc-400">Hizmet</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">
                  {selectedService.serviceName} ({selectedService.finalDurationMinutes} dk)
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-500 dark:text-zinc-400">Berber</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">{selectedStaff.fullName}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-500 dark:text-zinc-400">Tarih &amp; Saat</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {selectedDate} • {selectedSlot.startTime.slice(0, 5)} -{' '}
                  {selectedSlot.endTime.slice(0, 5)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5 text-base">
                <span className="font-medium text-slate-700 dark:text-zinc-300">Toplam Tutar</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(selectedService.finalPrice)}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-4">
            <Button variant="outline" onClick={() => setStep(3)}>
              <ArrowLeft className="h-4 w-4" />
              Saate Dön
            </Button>
            <Button
              size="lg"
              isLoading={submitting}
              disabled={penaltyStatus?.isRestricted === true}
              onClick={handleConfirmBooking}
            >
              <Scissors className="h-4 w-4" />
              Randevuyu Onayla
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Success Modal */}
      {createdAppointment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <Card accent className="w-full max-w-md">
            <CardHeader className="relative text-center">
              <button
                type="button"
                onClick={() => navigate('/my-appointments')}
                className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle>Randevunuz Oluşturuldu!</CardTitle>
              <CardDescription>
                Rezervasyon kaydınız onay bekliyor durumunda sisteme eklendi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 dark:bg-zinc-950/70 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Şube</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">
                  {createdAppointment.branchName}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 dark:bg-zinc-950/70 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Hizmet</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">
                  {createdAppointment.serviceName} ({createdAppointment.durationSnapshot} dk)
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 dark:bg-zinc-950/70 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Berber</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">
                  {createdAppointment.staffFullName}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 dark:bg-zinc-950/70 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Ücret</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(createdAppointment.priceSnapshot)}
                </span>
              </div>
            </CardContent>
            <CardFooter className="gap-2.5 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/explore')}
              >
                Keşfet&apos;e Dön
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate('/my-appointments')}
              >
                Randevularım
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

