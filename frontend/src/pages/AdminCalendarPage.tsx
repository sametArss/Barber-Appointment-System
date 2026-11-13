import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
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

  const fetchCalendarData = useCallback(async () => {
    if (!selectedBranchId) return;

    setLoadingCalendar(true);
    try {
      const [staffRes, apptRes] = await Promise.all([
        bookingService.getBranchStaff(selectedBranchId),
        adminService.getBranchAppointments(
          selectedBranchId,
          viewMode === 'daily' ? selectedDate : undefined,
        ),
      ]);

      setStaffList((staffRes.data ?? []).filter((s) => s.isBookable));

      const rawAppts = apptRes.data ?? [];
      if (viewMode === 'weekly') {
        const { start, end } = getWeekBounds(selectedDate);
        setAppointments(
          rawAppts.filter((a) => {
            const dt = new Date(a.startAt);
            return dt >= start && dt <= end;
          }),
        );
      } else {
        setAppointments(rawAppts);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Takvim verileri alınamadı.'));
    } finally {
      setLoadingCalendar(false);
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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Badge variant="amber">
              <CalendarDays className="h-3 w-3" />
              Canlı Takvim
            </Badge>
            <Badge variant="outline">{appointments.length} Randevu</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Berber Randevu Takvimi
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 capitalize">{weekRangeLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Select */}
          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none shadow-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Daily / Weekly Switch */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                viewMode === 'daily'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-100',
              )}
            >
              Günlük
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                viewMode === 'weekly'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-100',
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
              onClick={() => shiftDate(-1)}
              aria-label="Önceki"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none shadow-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftDate(1)}
              aria-label="Sonraki"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      ) : columns.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-400">
            Seçili şubede görüntülenecek personel bulunamadı.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((col) => (
            <Card key={col.id} className="flex flex-col overflow-hidden">
              <CardHeader className="border-b border-slate-800/80 bg-slate-950/40 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-sm font-bold text-amber-400">
                      {col.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{col.name}</CardTitle>
                      <CardDescription className="text-xs">{col.subtitle}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="amber">{col.appointments.length}</Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-2.5 p-4">
                {col.appointments.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-500">
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
                          'w-full rounded-xl border border-slate-200 dark:border-zinc-800 border-l-4 bg-white/95 dark:bg-zinc-950/70 p-3.5 text-left transition-all hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer shadow-sm',
                          meta.borderAccent,
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
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

                        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-100">
                          <User className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                          {appt.customerFullName}
                        </p>

                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            <Scissors className="h-3 w-3 text-slate-400" />
                            {appt.serviceName}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-zinc-100">
                            {formatCurrency(appt.priceSnapshot)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
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
          <Card accent className="w-full max-w-lg">
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

              {canIssuePenalty && (
                <div className="flex items-start gap-2.5 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  <span>
                    <strong>Gelmedi / No-Show</strong> seçildiğinde randevu durumu
                    güncellenir ve müşterinin hesabına otomatik olarak 1 ceza (grev)
                    kaydı işlenir.
                  </span>
                </div>
              )}

              {/* Quick Action Buttons */}
              <div className="grid gap-2.5 sm:grid-cols-3">
                <Button
                  variant="secondary"
                  disabled={
                    selectedAppt.status === AppointmentStatus.Confirmed ||
                    updatingStatus !== null
                  }
                  isLoading={updatingStatus === AppointmentStatus.Confirmed}
                  onClick={() => handleQuickStatusUpdate(AppointmentStatus.Confirmed)}
                >
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                  Onayla
                </Button>

                <Button
                  variant="primary"
                  disabled={
                    selectedAppt.status === AppointmentStatus.Completed ||
                    updatingStatus !== null
                  }
                  isLoading={updatingStatus === AppointmentStatus.Completed}
                  onClick={() => handleQuickStatusUpdate(AppointmentStatus.Completed)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Tamamlandı
                </Button>

                <Button
                  variant="danger"
                  disabled={
                    selectedAppt.status === AppointmentStatus.NoShow ||
                    updatingStatus !== null
                  }
                  isLoading={updatingStatus === AppointmentStatus.NoShow}
                  onClick={() => handleQuickStatusUpdate(AppointmentStatus.NoShow)}
                >
                  <ShieldAlert className="h-4 w-4" />
                  No-Show
                </Button>
              </div>
            </CardContent>

            <CardFooter className="justify-end border-t border-slate-800/80 pt-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedAppt(null)}>
                Kapat
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

