import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import axios from 'axios';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BOOKING_STEPS,
  BookingConfirmStep,
  BookingSlotStep,
  BookingSuccessModal,
  BookingSummarySidebar,
  buildSlotGrid,
  getNext14Days,
  type GridSlotItem,
} from '@/components/booking';
import { Button, Skeleton } from '@/components/ui';
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { searchService } from '@/services/searchService';
import { useAuthStore } from '@/store/useAuthStore';
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
  preselectedStaffProfileId?: string;
  isQuickRebook?: boolean;
}

export const BookingPage: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const routeState = location.state as BookingLocationState | null;

  const preselectedServiceId =
    routeState?.preselectedServiceId ?? searchParams.get('serviceId') ?? undefined;
  const preselectedStaffProfileId =
    routeState?.preselectedStaffProfileId ?? searchParams.get('staffId') ?? undefined;
  const isQuickRebook = Boolean(routeState?.isQuickRebook || searchParams.get('rebook') === '1');

  const [branchInfo, setBranchInfo] = useState<BranchSearchResponse | undefined>(routeState?.branch);
  const [quickRebookApplied, setQuickRebookApplied] = useState(false);

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

  const businessId = selectedStaff?.businessId ?? branchInfo?.businessId ?? null;

  useEffect(() => {
    if (!branchId) return;

    let cancelled = false;
    setLoadingInit(true);

    Promise.all([
      bookingService.getBranchServices(branchId),
      bookingService.getBranchStaff(branchId),
      routeState?.branch ? Promise.resolve(null) : searchService.getBranch(branchId).catch(() => null),
    ])
      .then(([srvRes, staffRes, branchRes]) => {
        if (cancelled) return;
        if (branchRes?.success && branchRes.data) {
          setBranchInfo(branchRes.data);
        }

        const activeServices = (srvRes.data ?? []).filter((s) => s.isActive);
        const bookableStaff = (staffRes.data ?? []).filter((s) => s.isBookable);

        setServices(activeServices);
        setStaffList(bookableStaff);

        let matchedService: BranchServiceResponse | null = null;
        if (preselectedServiceId) {
          matchedService = activeServices.find((s) => s.serviceId === preselectedServiceId) ?? null;
          if (matchedService) {
            setSelectedService(matchedService);
          }
        }

        if (matchedService && preselectedStaffProfileId) {
          const matchedStaff = bookableStaff.find(
            (st) =>
              st.id === preselectedStaffProfileId &&
              st.userId !== currentUserId &&
              (st.assignedServiceIds ?? []).includes(matchedService!.serviceId),
          );
          if (matchedStaff) {
            setSelectedStaff(matchedStaff);
            setStep(3);
            setQuickRebookApplied(true);
            if (isQuickRebook) {
              toast.success('Önceki hizmet ve berberiniz otomatik seçildi — sadece tarih & saat seçin!');
            }
          } else if (isQuickRebook) {
            setStep(2);
            toast.info('Önceki berberiniz şu an bu hizmet için uygun değil. Lütfen başka bir berber seçin.');
          }
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
  }, [
    branchId,
    preselectedServiceId,
    preselectedStaffProfileId,
    isQuickRebook,
    currentUserId,
    routeState?.branch,
  ]);

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
            {branchInfo?.branchName ?? 'Randevu Oluştur'}
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            {branchInfo ? (
              <>
                <MapPin className="h-4 w-4 text-[#D97706] dark:text-amber-400" />
                <span>
                  {branchInfo.businessName} • {branchInfo.district}/{branchInfo.city}
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

      {quickRebookApplied && selectedService && selectedStaff && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-3 text-xs text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Hızlı Tekrar Randevu:</strong> {selectedService.serviceName} &amp;{' '}
              {selectedStaff.fullName} sizin için otomatik seçildi. Sadece tarih &amp; saat seçmeniz yeterli!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="cursor-pointer font-semibold underline decoration-emerald-500/60 underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-100"
          >
            Hizmeti Değiştir
          </button>
        </div>
      )}

      {/* Modern Glassmorphic Stepper */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {BOOKING_STEPS.map((item) => {
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

      {/* Main Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
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
                      const isSelf = currentUserId !== null && member.userId === currentUserId;
                      const isSelected = !isSelf && selectedStaff?.id === member.id;
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
                          disabled={isSelf}
                          title={isSelf ? 'Kendi kendinize randevu oluşturamazsınız' : undefined}
                          onClick={() => {
                            if (isSelf) return;
                            setSelectedStaff(member);
                            setSelectedSlot(null);
                          }}
                          className={cn(
                            'flex items-center gap-4 rounded-[18px] border p-4.5 text-left transition-all duration-200',
                            isSelf
                              ? 'cursor-not-allowed border-slate-200/70 bg-slate-100/70 opacity-65 dark:border-white/10 dark:bg-slate-950/40'
                              : isSelected
                                ? 'cursor-pointer border-[#D97706] bg-amber-50/80 ring-2 ring-amber-500/25 dark:border-amber-400 dark:bg-amber-500/12 dark:shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)]'
                                : 'cursor-pointer border-slate-200/90 bg-slate-50/60 hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-white dark:border-white/10 dark:bg-slate-950/50 dark:hover:border-amber-400/45 dark:hover:bg-slate-950/80',
                          )}
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-gradient-to-br from-amber-100 to-orange-100 font-serif text-base font-bold text-[#D97706] dark:border-amber-400/35 dark:from-amber-500/25 dark:to-slate-900 dark:text-amber-300">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-serif text-base font-bold text-slate-900 dark:text-white">
                                {member.fullName}
                              </h3>
                              {isSelf && (
                                <span className="shrink-0 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-white/15 dark:bg-slate-900 dark:text-slate-300">
                                  Bu sensin
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                              {isSelf
                                ? 'Kendi profilinizden randevu oluşturamazsınız.'
                                : member.biography || 'Profesyonel Saç & Sakal Tasarım Uzmanı'}
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
              <BookingSlotStep
                selectedStaff={selectedStaff}
                selectedService={selectedService}
                dateOptions={dateOptions}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                loadingSlots={loadingSlots}
                slotGrid={slotGrid}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
              />
            )}

            {/* Step 4: Summary, Penalty Check & Confirm */}
            {step === 4 && selectedService && selectedStaff && selectedSlot && (
              <BookingConfirmStep
                selectedService={selectedService}
                selectedStaff={selectedStaff}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                penaltyStatus={penaltyStatus}
                loadingPenalty={loadingPenalty}
                submitting={submitting}
                onBack={() => setStep(3)}
                onConfirm={handleConfirmBooking}
              />
            )}
          </AnimatePresence>
        </div>

          {/* Right: Sticky Live Booking Summary Receipt */}
        <BookingSummarySidebar
          branchName={branchInfo?.branchName}
          selectedService={selectedService}
          selectedStaff={selectedStaff}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          step={step}
        />
      </div>

      {/* Success Modal */}
      {createdAppointment && (
        <BookingSuccessModal
          appointment={createdAppointment}
          onExplore={() => navigate('/explore')}
          onViewAppointments={() => navigate('/my-appointments')}
        />
      )}
    </div>
  );
};
