import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  RefreshCw,
  Scissors,
  ShieldAlert,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { NoShowConfirmModal } from '@/components/appointments/NoShowConfirmModal';
import { ProposeRescheduleModal } from '@/components/appointments/ProposeRescheduleModal';
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
  type BadgeVariant,
} from '@/components/ui';
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import { bookingService } from '@/services/bookingService';
import { useAuthStore } from '@/store/useAuthStore';
import {
  AppointmentStatus,
  type AppointmentResponse,
  type StaffResponse,
} from '@/types/booking';
import type { BranchResponse } from '@/types/subscription';

type CalendarViewMode = 'daily' | 'weekly';

const statusMeta: Record<
  number,
  { label: string; variant: BadgeVariant; borderAccent: string }
> = {
  [AppointmentStatus.Pending]: {
    label: 'Onay Bekliyor',
    variant: 'amber',
    borderAccent: 'border-l-amber-500',
  },
  [AppointmentStatus.Confirmed]: {
    label: 'Onaylandı',
    variant: 'success',
    borderAccent: 'border-l-emerald-500',
  },
  [AppointmentStatus.Completed]: {
    label: 'Tamamlandı',
    variant: 'default',
    borderAccent: 'border-l-sky-500',
  },
  [AppointmentStatus.Cancelled]: {
    label: 'İptal Edildi',
    variant: 'danger',
    borderAccent: 'border-l-rose-500',
  },
  [AppointmentStatus.NoShow]: {
    label: 'Gelmedi (No-Show)',
    variant: 'warning',
    borderAccent: 'border-l-orange-500',
  },
};

const toDateInputValue = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getWeekBounds = (dateStr: string): { start: Date; end: Date } => {
  const base = new Date(`${dateStr}T00:00:00`);
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(base);
  start.setDate(base.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const AdminCalendarPage: React.FC = () => {
  const hasRole = useAuthStore((s) => s.hasRole);
  const canIssuePenalty = hasRole(['BusinessOwner', 'BusinessManager']);

  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    toDateInputValue(new Date()),
  );

  const [staffList, setStaffList] = useState<StaffResponse[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Selected appointment quick action modal
  const [selectedAppt, setSelectedAppt] = useState<AppointmentResponse | null>(null);
  const [confirmNoShowModal, setConfirmNoShowModal] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<AppointmentResponse | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<AppointmentStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingInit(true);
    adminService
      .getMyBranches()
      .then((res) => {
        if (cancelled) return;
        const list = res.data ?? [];
        setBranches(list);
        if (list.length > 0) {
          setSelectedBranchId(list[0].id);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, 'Şubeler yüklenemedi.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInit(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Personel listesini sadece şube değiştiğinde çek (tarih değiştikçe gereksiz API çağrısı atma)
  useEffect(() => {
    if (!selectedBranchId) {
      setStaffList([]);
      return;
    }
    let cancelled = false;
    bookingService
      .getBranchStaff(selectedBranchId)
      .then((staffRes) => {
        if (!cancelled) {
          setStaffList((staffRes.data ?? []).filter((s) => s.isBookable));
        }
      })
      .catch(() => {
        // Takvim yüklemesi devam edebilir
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBranchId]);

  const calendarSeqRef = useRef(0);

  const fetchCalendarData = useCallback(async () => {
    if (!selectedBranchId) return;
    const seq = ++calendarSeqRef.current;

    setLoadingCalendar(true);
    try {
      const rangeParam =
        viewMode === 'daily'
          ? { date: selectedDate }
          : (() => {
              const { start, end } = getWeekBounds(selectedDate);
              return {
                startDate: toDateInputValue(start),
                endDate: toDateInputValue(end),
              };
            })();

      const apptRes = await adminService.getBranchAppointments(selectedBranchId, rangeParam);
      if (seq !== calendarSeqRef.current) return;
      setAppointments(apptRes.data ?? []);
    } catch (error) {
      if (seq !== calendarSeqRef.current) return;
      toast.error(getApiErrorMessage(error, 'Takvim verileri alınamadı.'));
    } finally {
      if (seq === calendarSeqRef.current) {
        setLoadingCalendar(false);
      }
    }
  }, [selectedBranchId, selectedDate, viewMode]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const shiftDate = (deltaDays: number) => {
    const step = viewMode === 'weekly' ? deltaDays * 7 : deltaDays;
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + step);
    setSelectedDate(toDateInputValue(d));
  };

  const columns = useMemo(() => {
    const knownStaffIds = new Set(staffList.map((s) => s.id));
    const cols = staffList.map((staff) => ({
      id: staff.id,
      name: staff.fullName,
      subtitle: staff.biography || 'Uzman Berber',
      appointments: appointments.filter((a) => a.staffProfileId === staff.id),
    }));

    const unassigned = appointments.filter((a) => !knownStaffIds.has(a.staffProfileId));
    if (unassigned.length > 0) {
      cols.push({
        id: 'other',
        name: 'Diğer Personel',
        subtitle: 'Şube dışı / eski atama',
        appointments: unassigned,
      });
    }

    return cols;
  }, [appointments, staffList]);

  const weekRangeLabel = useMemo(() => {
    if (viewMode === 'daily') {
      return new Date(`${selectedDate}T00:00:00`).toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    const { start, end } = getWeekBounds(selectedDate);
    return `${start.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
    })} – ${end.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`;
  }, [selectedDate, viewMode]);

  const handleQuickStatusUpdate = async (newStatus: AppointmentStatus) => {
    if (!selectedAppt) return;

    setUpdatingStatus(newStatus);
    try {
      const defaultNote =
        newStatus === AppointmentStatus.Confirmed
          ? 'İşletme tarafından onaylandı.'
          : newStatus === AppointmentStatus.Completed
            ? 'Hizmet tamamlandı.'
            : 'Müşteri randevuya gelmedi (No-Show).';

      const statusRes = await adminService.updateAppointmentStatus({
        appointmentId: selectedAppt.id,
        newStatus,
        note: actionNote.trim() || defaultNote,
      });

      if (!statusRes.success) {
        toast.error(statusRes.message || 'Durum güncellenemedi.');
        return;
      }

      if (newStatus === AppointmentStatus.NoShow) {
        toast.warning(
          'Randevu No-Show olarak işaretlendi ve müşterinin hesabına otomatik ceza puanı işlendi.',
        );
      } else {
        toast.success(
          newStatus === AppointmentStatus.Confirmed
            ? 'Randevu onaylandı.'
            : newStatus === AppointmentStatus.Completed
              ? 'Randevu tamamlandı olarak işaretlendi.'
              : 'Randevu durumu güncellendi.',
        );
      }

      setConfirmNoShowModal(false);
      setSelectedAppt(null);
      setActionNote('');
      await fetchCalendarData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Durum güncellenemedi.'));
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <div className="space-y-7 py-2">
      {/* Editorial Header & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D97706] dark:text-amber-400">
              Canlı Takvim
            </p>
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#B45309] dark:border-amber-400/30 dark:text-amber-300">
              {appointments.length} Randevu
            </span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
            Berber Randevu Takvimi
          </h1>
          <p className="mt-1.5 text-sm capitalize text-slate-500 dark:text-slate-400">
            {weekRangeLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Select */}
          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-10 rounded-[14px] border border-slate-200/90 bg-white/85 px-3.5 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur-xl focus:border-[#D97706] focus:outline-none dark:border-white/15 dark:bg-slate-900/75 dark:text-slate-100"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Daily / Weekly Switch */}
          <div className="inline-flex rounded-[14px] border border-slate-200/90 bg-white/85 p-1 shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/75">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={cn(
                'cursor-pointer rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors',
                viewMode === 'daily'
                  ? 'bg-[#D97706] font-bold text-white shadow-sm dark:bg-amber-500 dark:text-slate-950'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white',
              )}
            >
              Günlük
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={cn(
                'cursor-pointer rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors',
                viewMode === 'weekly'
                  ? 'bg-[#D97706] font-bold text-white shadow-sm dark:bg-amber-500 dark:text-slate-950'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white',
              )}
            >
              Haftalık
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="rounded-[12px]"
              onClick={() => shiftDate(-1)}
              aria-label="Önceki"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 rounded-[14px] border border-slate-200/90 bg-white/85 px-3 text-xs font-medium text-slate-900 shadow-sm focus:border-[#D97706] focus:outline-none dark:border-white/15 dark:bg-slate-900/75 dark:text-slate-100"
            />
            <Button
              variant="outline"
              size="icon"
              className="rounded-[12px]"
              onClick={() => shiftDate(1)}
              aria-label="Sonraki"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-[12px]"
            onClick={fetchCalendarData}
            title="Yenile"
            aria-label="Yenile"
          >
            <RefreshCw className={cn('h-4 w-4', loadingCalendar && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Staff Columns Grid */}
      {loadingInit || loadingCalendar ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-[22px]" />
          ))}
        </div>
      ) : columns.length === 0 ? (
        <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-12 text-center text-sm text-slate-500 shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:text-slate-400">
          Seçili şubede görüntülenecek personel bulunamadı.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((col) => (
            <section
              key={col.id}
              className="flex flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/85 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_24px_65px_-26px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-5 py-4 dark:border-white/10 dark:bg-slate-950/50">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-100 to-orange-100 font-serif text-sm font-bold text-[#D97706] dark:border-amber-400/35 dark:from-amber-500/25 dark:to-slate-900 dark:text-amber-300">
                    {col.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-serif text-base font-bold text-slate-900 dark:text-white">
                      {col.name}
                    </h2>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {col.subtitle}
                    </p>
                  </div>
                </div>
                <Badge variant="amber">{col.appointments.length}</Badge>
              </div>

              <div className="flex-1 space-y-2.5 p-4">
                {col.appointments.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-[16px] border border-dashed border-slate-200 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
                    <CalendarDays className="mb-1.5 h-5 w-5 opacity-50" />
                    Bu aralıkta randevu yok
                  </div>
                ) : (
                  col.appointments.map((appt) => {
                    const meta = statusMeta[appt.status] ?? {
                      label: appt.statusName,
                      variant: 'default' as BadgeVariant,
                      borderAccent: 'border-l-slate-500',
                    };
                    const start = new Date(appt.startAt);
                    const end = new Date(appt.endAt);

                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => {
                          setSelectedAppt(appt);
                          setActionNote('');
                        }}
                        className={cn(
                          'w-full cursor-pointer rounded-[16px] border border-slate-200/80 border-l-4 bg-white/95 p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/50 hover:bg-amber-50/30 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-amber-400/45 dark:hover:bg-slate-950',
                          meta.borderAccent,
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D97706] dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            {viewMode === 'weekly' &&
                              `${start.toLocaleDateString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                              })} • `}
                            {start.toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {end.toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <Badge variant={meta.variant} className="text-[10px]">
                            {meta.label}
                          </Badge>
                        </div>

                        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                          <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          {appt.customerFullName}
                        </p>

                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Scissors className="h-3 w-3 text-[#D97706] dark:text-amber-400" />
                            {appt.serviceName}
                          </span>
                          <span className="font-serif text-sm font-bold text-slate-900 dark:text-white">
                            {formatCurrency(appt.priceSnapshot)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Quick Status Action Modal */}
      {selectedAppt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <Card
            accent
            className="w-full max-w-lg rounded-[24px] border-slate-200/80 bg-white/95 backdrop-blur-2xl dark:border-amber-500/25 dark:bg-slate-900/95"
          >
            <CardHeader className="relative">
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <Badge
                  variant={statusMeta[selectedAppt.status]?.variant ?? 'default'}
                >
                  {statusMeta[selectedAppt.status]?.label ?? selectedAppt.statusName}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-zinc-400">{selectedAppt.branchName}</span>
              </div>
              <CardTitle className="mt-2">{selectedAppt.customerFullName}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                  {selectedAppt.customerPhoneNumber || 'Telefon yok'}
                </span>
                <span>•</span>
                <span>
                  {selectedAppt.serviceName} ({selectedAppt.durationSnapshot} dk)
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <div>
                  <span className="text-slate-500 dark:text-zinc-400 block">Tarih &amp; Saat</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100">
                    {new Date(selectedAppt.startAt).toLocaleString('tr-TR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-zinc-400 block">Personel &amp; Tutar</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {selectedAppt.staffFullName} •{' '}
                    {formatCurrency(selectedAppt.priceSnapshot)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="status-action-note"
                  className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-zinc-300"
                >
                  İşlem Notu (İsteğe Bağlı)
                </label>
                <input
                  id="status-action-note"
                  type="text"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Örn. Hizmet tamamlandı..."
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>

              {(() => {
                const startMs = new Date(selectedAppt.startAt).getTime();
                const nowMs = Date.now();
                const isBeforeStart = nowMs < startMs;
                const hasStarted = nowMs >= startMs;
                const isPending = selectedAppt.status === AppointmentStatus.Pending;
                const isConfirmed = selectedAppt.status === AppointmentStatus.Confirmed;
                const isFinal =
                  selectedAppt.status === AppointmentStatus.Completed ||
                  selectedAppt.status === AppointmentStatus.Cancelled ||
                  selectedAppt.status === AppointmentStatus.NoShow;

                if (isFinal) {
                  return (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                      Bu randevu sonuçlandırıldığı için durumu artık değiştirilemez.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {isPending && !isBeforeStart && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-50/90 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                        <span>
                          Randevu saati geçtiği için artık onaylanamaz. İsterseniz iptal
                          edebilirsiniz.
                        </span>
                      </div>
                    )}

                    {isConfirmed && !hasStarted && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-sky-500/30 bg-sky-50/90 p-3 text-xs text-sky-900 dark:bg-sky-500/10 dark:text-sky-200">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                        <span>
                          <strong>Tamamlandı</strong> veya <strong>Gelmedi (No-Show)</strong>{' '}
                          seçenekleri randevu saati geldikten sonra aktif olur.
                        </span>
                      </div>
                    )}

                    {isConfirmed && hasStarted && canIssuePenalty && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-orange-500/30 bg-orange-50/90 p-3 text-xs text-orange-900 dark:bg-orange-500/10 dark:text-orange-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500 dark:text-orange-400" />
                        <span>
                          <strong>Gelmedi / No-Show</strong> seçildiğinde onay penceresi açılır ve
                          onaylandığında müşterinin hesabına otomatik 1 ceza puanı işlenir.
                        </span>
                      </div>
                    )}

                    {selectedAppt.hasPendingReschedule && selectedAppt.proposedStartAt && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-50/90 p-3 text-xs text-amber-900 dark:bg-amber-500/12 dark:text-amber-200">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706] dark:text-amber-400" />
                        <span>
                          Müşteriye{' '}
                          <strong>
                            {new Date(selectedAppt.proposedStartAt).toLocaleString('tr-TR', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </strong>{' '}
                          yeni saat teklifi gönderildi; müşteri onayı bekleniyor.
                        </span>
                      </div>
                    )}

                    {/* Quick Action Buttons */}
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      <Button
                        variant="secondary"
                        disabled={!isPending || !isBeforeStart || updatingStatus !== null}
                        isLoading={updatingStatus === AppointmentStatus.Confirmed}
                        onClick={() => handleQuickStatusUpdate(AppointmentStatus.Confirmed)}
                      >
                        <UserCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                        Onayla
                      </Button>

                      <Button
                        variant="primary"
                        disabled={!isConfirmed || !hasStarted || updatingStatus !== null}
                        isLoading={updatingStatus === AppointmentStatus.Completed}
                        onClick={() => handleQuickStatusUpdate(AppointmentStatus.Completed)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Tamamlandı
                      </Button>

                      <Button
                        variant="danger"
                        disabled={!isConfirmed || !hasStarted || updatingStatus !== null}
                        isLoading={updatingStatus === AppointmentStatus.NoShow}
                        onClick={() => setConfirmNoShowModal(true)}
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Gelmedi
                      </Button>
                    </div>

                    {isConfirmed && isBeforeStart && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-full gap-2 rounded-xl border-amber-500/40 text-xs font-semibold text-[#B45309] hover:bg-amber-50 dark:border-amber-400/35 dark:text-amber-300 dark:hover:bg-amber-500/15"
                        onClick={() => {
                          const target = selectedAppt;
                          setSelectedAppt(null);
                          setRescheduleAppt(target);
                        }}
                      >
                        <CalendarClock className="h-4 w-4" />
                        {selectedAppt.hasPendingReschedule
                          ? 'Saat Değişikliği Teklifini Güncelle'
                          : 'Yeni Saat Teklif Et (Reschedule)'}
                      </Button>
                    )}
                  </div>
                );
              })()}
            </CardContent>

            <CardFooter className="justify-end border-t border-slate-200 pt-3 dark:border-zinc-800/80">
              <Button variant="ghost" size="sm" onClick={() => setSelectedAppt(null)}>
                Kapat
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <NoShowConfirmModal
        appointment={confirmNoShowModal ? selectedAppt : null}
        loading={updatingStatus === AppointmentStatus.NoShow}
        onCancel={() => setConfirmNoShowModal(false)}
        onConfirm={() => void handleQuickStatusUpdate(AppointmentStatus.NoShow)}
      />

      <ProposeRescheduleModal
        appointment={rescheduleAppt}
        onClose={() => setRescheduleAppt(null)}
        onSuccess={fetchCalendarData}
      />
    </div>
  );
};

