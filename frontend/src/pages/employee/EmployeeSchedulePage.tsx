import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  CalendarOff,
  Check,
  Clock,
  Coffee,
  Plus,
  RefreshCw,
  Save,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Skeleton } from '@/components/ui';
import { cn, getApiErrorMessage } from '@/lib/utils';
import { employeeService, type StaffScheduleExceptionItem } from '@/services/employeeService';
import type { EmployeeWorkplace } from '@/types/booking';
import { useEmployeeData } from './useEmployeeData';

interface BreakRange {
  start: string;
  end: string;
}

interface DayScheduleState {
  dayOfWeek: number;
  label: string;
  active: boolean;
  start: string;
  end: string;
  breaks: BreakRange[];
}

const ORDERED_DAYS: Array<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: 1, label: 'Pazartesi' },
  { dayOfWeek: 2, label: 'Salı' },
  { dayOfWeek: 3, label: 'Çarşamba' },
  { dayOfWeek: 4, label: 'Perşembe' },
  { dayOfWeek: 5, label: 'Cuma' },
  { dayOfWeek: 6, label: 'Cumartesi' },
  { dayOfWeek: 0, label: 'Pazar' },
];

const createEmptyWeek = (): DayScheduleState[] =>
  ORDERED_DAYS.map((d) => ({
    dayOfWeek: d.dayOfWeek,
    label: d.label,
    active: false,
    start: '09:00',
    end: '19:00',
    breaks: [],
  }));

const getTodayInput = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const STORAGE_KEY = 'employee_schedule_selected_workplace';

export const EmployeeSchedulePage: React.FC = () => {
  const { workplaces, loading, refresh } = useEmployeeData();
  const [selectedWorkplaceKey, setSelectedWorkplaceKey] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [days, setDays] = useState<DayScheduleState[]>(createEmptyWeek);
  const [hasUnsavedHours, setHasUnsavedHours] = useState(false);
  const [exceptions, setExceptions] = useState<StaffScheduleExceptionItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  // One-time time-range block / leave form
  const [blockDate, setBlockDate] = useState(getTodayInput);
  const [fullDay, setFullDay] = useState(false);
  const [blockStart, setBlockStart] = useState('15:00');
  const [blockEnd, setBlockEnd] = useState('17:00');
  const [blockReason, setBlockReason] = useState('');
  const [addingBlock, setAddingBlock] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [conflictPrompt, setConflictPrompt] = useState<{
    message: string;
    startIso: string;
    endIso: string;
    reason: string;
  } | null>(null);

  const handleSelectWorkplace = (key: string) => {
    setSelectedWorkplaceKey(key);
    try {
      sessionStorage.setItem(STORAGE_KEY, key);
    } catch {
      // ignore
    }
  };

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

  const loadSchedule = useCallback(async (workplace: EmployeeWorkplace | null) => {
    if (!workplace) {
      setDays(createEmptyWeek());
      setExceptions([]);
      return;
    }
    setLoadingSchedule(true);
    try {
      const [whRes, exRes] = await Promise.all([
        employeeService.getMyWorkingHours(workplace.staffProfileId, workplace.branchId),
        employeeService.getMyExceptions(workplace.staffProfileId, workplace.branchId),
      ]);

      const nextWeek = createEmptyWeek();
      for (const item of whRes.data ?? []) {
        const target = nextWeek.find((d) => d.dayOfWeek === item.dayOfWeek);
        if (target) {
          target.active = true;
          target.start = item.startTime.slice(0, 5);
          target.end = item.endTime.slice(0, 5);
          target.breaks = (item.breaks ?? []).map((b) => ({
            start: b.startTime.slice(0, 5),
            end: b.endTime.slice(0, 5),
          }));
        }
      }
      setDays(nextWeek);
      setHasUnsavedHours(false);
      setExceptions(exRes.data ?? []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Çalışma saatleri yüklenemedi.'));
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule(selectedWorkplace);
  }, [selectedWorkplace, loadSchedule]);

  const updateDay = (dayOfWeek: number, patch: Partial<DayScheduleState>) => {
    setHasUnsavedHours(true);
    setDays((current) =>
      current.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)),
    );
  };

  const addBreak = (dayOfWeek: number) => {
    setHasUnsavedHours(true);
    setDays((current) =>
      current.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              breaks: [
                ...d.breaks,
                d.breaks.length === 0
                  ? { start: '13:00', end: '14:00' }
                  : { start: '15:00', end: '17:00' },
              ],
            }
          : d,
      ),
    );
  };

  const updateBreak = (dayOfWeek: number, index: number, patch: Partial<BreakRange>) => {
    setHasUnsavedHours(true);
    setDays((current) =>
      current.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              breaks: d.breaks.map((b, i) => (i === index ? { ...b, ...patch } : b)),
            }
          : d,
      ),
    );
  };

  const removeBreak = (dayOfWeek: number, index: number) => {
    setHasUnsavedHours(true);
    setDays((current) =>
      current.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, breaks: d.breaks.filter((_, i) => i !== index) }
          : d,
      ),
    );
  };

  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkplace) return;

    const toApiTime = (v: string) => (v.length === 5 ? `${v}:00` : v);
    const activeDays = days
      .filter((d) => d.active)
      .map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startTime: toApiTime(d.start),
        endTime: toApiTime(d.end),
        breaks: d.breaks.map((b) => ({
          startTime: toApiTime(b.start),
          endTime: toApiTime(b.end),
        })),
      }));

    setSavingHours(true);
    try {
      const res = await employeeService.saveMyWorkingHours({
        staffProfileId: selectedWorkplace.staffProfileId,
        branchId: selectedWorkplace.branchId,
        workingHours: activeDays,
      });

      if (!res.success) {
        toast.error(res.message || 'Çalışma saatleri kaydedilemedi.');
        return;
      }

      setHasUnsavedHours(false);
      toast.success(`${selectedWorkplace.branchName} şubesi için mesai saatlerin kaydedildi!`);
      await loadSchedule(selectedWorkplace);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Çalışma saatleri kaydedilemedi.'));
    } finally {
      setSavingHours(false);
    }
  };

  const submitBlock = async (
    startIso: string,
    endIso: string,
    reason: string,
    cancelConflictingAppointments: boolean,
  ) => {
    if (!selectedWorkplace) return;
    setAddingBlock(true);
    try {
      const res = await employeeService.addMyException({
        staffProfileId: selectedWorkplace.staffProfileId,
        branchId: selectedWorkplace.branchId,
        startAt: startIso,
        endAt: endIso,
        reason,
        cancelConflictingAppointments,
      });

      if (!res.success) {
        toast.error(res.message || 'Saat kapatma kaydedilemedi.');
        return;
      }

      toast.success(res.message || 'Seçilen saat aralığı randevuya kapatıldı!');
      setBlockReason('');
      setConflictPrompt(null);
      await loadSchedule(selectedWorkplace);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setConflictPrompt({
          message: getApiErrorMessage(
            error,
            'Bu saat aralığında aktif randevular bulunuyor. İptal edip kapatmak ister misiniz?',
          ),
          startIso,
          endIso,
          reason,
        });
      } else {
        toast.error(getApiErrorMessage(error, 'Saat kapatma kaydedilemedi.'));
      }
    } finally {
      setAddingBlock(false);
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkplace || !blockDate) return;

    const startTime = fullDay ? '00:00' : blockStart;
    const endTime = fullDay ? '23:59' : blockEnd;
    const startLocal = new Date(`${blockDate}T${startTime}:00`);
    const endLocal = new Date(`${blockDate}T${endTime}:00`);

    if (Number.isNaN(startLocal.getTime()) || Number.isNaN(endLocal.getTime())) {
      toast.warning('Geçerli tarih ve saat seçin.');
      return;
    }
    if (startLocal >= endLocal) {
      toast.warning('Başlangıç saati bitiş saatinden önce olmalıdır.');
      return;
    }

    const reason = blockReason.trim() || (fullDay ? 'Tam gün izin' : 'Özel kapalı saat');
    await submitBlock(startLocal.toISOString(), endLocal.toISOString(), reason, false);
  };

  const handleDeleteBlock = async (exceptionId: string) => {
    setDeletingId(exceptionId);
    try {
      const res = await employeeService.deleteMyException(exceptionId);
      if (!res.success) {
        toast.error(res.message || 'Kayıt silinemedi.');
        return;
      }
      setExceptions((prev) => prev.filter((item) => item.id !== exceptionId));
      toast.success('Kapalı saat aralığı kaldırıldı, randevuya tekrar açıldı.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Kayıt silinemedi.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-7 py-2">
      {/* Editorial Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D97706] dark:text-amber-400">
            Zaman Planlaması
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
            Mesai &amp; Saat Kapatma
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Her şube için haftalık çalışma saatlerini, tekrarlayan molalarını ve belirli tarihlerdeki
            kapalı saat aralıklarını yönet.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 rounded-[14px] px-4 text-xs font-semibold"
          onClick={() => {
            void refresh();
            void loadSchedule(selectedWorkplace);
          }}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loadingSchedule && 'animate-spin')} />
          Yenile
        </Button>
      </header>

      {/* Step 1: Select Branch */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            1. Planlayacağın Şubeyi Seç
          </h2>
        </div>

        {loading ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-24 rounded-[18px]" />
            <Skeleton className="h-24 rounded-[18px]" />
          </div>
        ) : workplaces.length === 0 ? (
          <div className="rounded-[20px] border border-slate-200/80 bg-white/85 p-10 text-center dark:border-white/10 dark:bg-slate-900/65">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Henüz atanmış bir şuben bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {workplaces.map((w) => {
              const key = `${w.staffProfileId}-${w.branchId}`;
              const isSelected =
                selectedWorkplace &&
                `${selectedWorkplace.staffProfileId}-${selectedWorkplace.branchId}` === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectWorkplace(key)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-[18px] border p-4 text-left transition-all',
                    isSelected
                      ? 'border-[#D97706] bg-amber-50/80 ring-2 ring-amber-500/25 dark:border-amber-400 dark:bg-amber-500/12'
                      : 'border-slate-200/80 bg-white/85 hover:border-amber-400/50 dark:border-white/10 dark:bg-slate-900/65',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-serif text-base font-bold text-slate-900 dark:text-white">
                      {w.branchName}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {w.businessName} · {w.district}/{w.city}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#D97706] px-2.5 py-0.5 text-[10px] font-bold text-white dark:bg-amber-500 dark:text-slate-950">
                      <Check className="h-3 w-3" />
                      Seçili
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedWorkplace && (
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          {/* Left: Weekly Schedule & Multiple Breaks */}
          <form
            onSubmit={handleSaveHours}
            className="space-y-5 rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 lg:col-span-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-white/10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97706] dark:text-amber-400">
                  {selectedWorkplace.branchName}
                </p>
                <h2 className="mt-0.5 flex items-center gap-2 font-serif text-xl font-bold text-slate-900 dark:text-white">
                  <Clock className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
                  Haftalık Mesai &amp; Molalar
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                {hasUnsavedHours && (
                  <span className="rounded-full border border-amber-500/35 bg-amber-500/12 px-2.5 py-1 text-[11px] font-semibold text-[#B45309] dark:text-amber-300">
                    Kaydedilmedi
                  </span>
                )}
                <Button
                  type="submit"
                  size="sm"
                  isLoading={savingHours}
                  className="h-10 gap-1.5 rounded-[12px] bg-[#D97706] px-4 text-xs font-semibold text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
                >
                  <Save className="h-3.5 w-3.5" />
                  Mesaiyi Kaydet
                </Button>
              </div>
            </div>

            {loadingSchedule ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-[16px]" />
                <Skeleton className="h-16 rounded-[16px]" />
                <Skeleton className="h-16 rounded-[16px]" />
              </div>
            ) : (
              <div className="space-y-3">
                {days.map((day) => (
                  <div
                    key={day.dayOfWeek}
                    className={cn(
                      'rounded-[16px] border p-4 transition-colors',
                      day.active
                        ? 'border-amber-500/30 bg-amber-50/35 dark:border-amber-400/25 dark:bg-amber-500/5'
                        : 'border-slate-200/80 bg-slate-50/50 dark:border-white/10 dark:bg-slate-950/40',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-bold text-slate-900 dark:text-white">
                        <input
                          type="checkbox"
                          checked={day.active}
                          onChange={(e) => updateDay(day.dayOfWeek, { active: e.target.checked })}
                          className="h-4 w-4 accent-[#D97706]"
                        />
                        {day.label}
                      </label>

                      {day.active ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={day.start}
                            onChange={(e) => updateDay(day.dayOfWeek, { start: e.target.value })}
                            required
                            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
                          />
                          <span className="text-xs text-slate-400">–</span>
                          <input
                            type="time"
                            value={day.end}
                            onChange={(e) => updateDay(day.dayOfWeek, { end: e.target.value })}
                            required
                            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Kapalı / İzinli</span>
                      )}
                    </div>

                    {day.active && (
                      <div className="mt-3 space-y-2 border-t border-slate-200/60 pt-3 dark:border-white/10">
                        {day.breaks.map((brk, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-slate-950/60"
                          >
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              <Coffee className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
                              Mola / Kapalı Aralık #{idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={brk.start}
                                onChange={(e) =>
                                  updateBreak(day.dayOfWeek, idx, { start: e.target.value })
                                }
                                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
                              />
                              <span className="text-xs text-slate-400">–</span>
                              <input
                                type="time"
                                value={brk.end}
                                onChange={(e) =>
                                  updateBreak(day.dayOfWeek, idx, { end: e.target.value })
                                }
                                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={() => removeBreak(day.dayOfWeek, idx)}
                                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
                                aria-label="Molayı kaldır"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addBreak(day.dayOfWeek)}
                          className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#D97706] hover:underline dark:text-amber-400"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Mola / Kapalı Saat Aralığı Ekle
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* Right: One-Time Specific Time-Range Block / Leave */}
          <div className="space-y-5 rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 lg:col-span-5">
            <div className="border-b border-slate-100 pb-4 dark:border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97706] dark:text-amber-400">
                Tek Seferlik Blok
              </p>
              <h2 className="mt-0.5 flex items-center gap-2 font-serif text-xl font-bold text-slate-900 dark:text-white">
                <CalendarOff className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
                Özel Saat Kapat / İzin
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Örn. 09:00–23:00 çalışırken yalnızca bugün 15:00–17:00 arasını randevuya kapat.
              </p>
            </div>

            <form onSubmit={handleAddBlock} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tarih
                </label>
                <input
                  type="date"
                  min={getTodayInput()}
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  required
                  className="h-10 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold text-slate-900 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-100"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={fullDay}
                  onChange={(e) => setFullDay(e.target.checked)}
                  className="h-4 w-4 accent-[#D97706]"
                />
                Tüm günü kapat (Tam gün izin)
              </label>

              {!fullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Başlangıç Saati
                    </label>
                    <input
                      type="time"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      required
                      className="h-10 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold text-slate-900 dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bitiş Saati
                    </label>
                    <input
                      type="time"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      required
                      className="h-10 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold text-slate-900 dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Açıklama (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Örn. Doktor randevusu, özel iş..."
                  className="h-10 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-100"
                />
              </div>

              <Button
                type="submit"
                isLoading={addingBlock}
                className="h-10 w-full gap-1.5 rounded-[14px] bg-[#D97706] text-xs font-semibold text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
              >
                <CalendarOff className="h-3.5 w-3.5" />
                Bu Saat Aralığını Kapat
              </Button>
            </form>

            {/* Active Blocked Ranges List */}
            <div className="border-t border-slate-100 pt-4 dark:border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Yaklaşan Kapalı Saatler ({exceptions.length})
              </h3>

              {exceptions.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-white/10">
                  Bu şubede yaklaşan kapalı saat veya izin kaydı yok.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {exceptions.map((ex) => {
                    const start = new Date(ex.startAt);
                    const end = new Date(ex.endAt);
                    return (
                      <div
                        key={ex.id}
                        className="flex items-start justify-between gap-2 rounded-[14px] border border-orange-500/25 bg-orange-50/60 p-3 text-xs dark:border-orange-500/20 dark:bg-orange-500/10"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {start.toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: 'long',
                              weekday: 'short',
                            })}
                          </p>
                          <p className="mt-0.5 font-semibold text-orange-700 dark:text-orange-300">
                            {start.toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            –{' '}
                            {end.toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {ex.reason && (
                            <p className="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-300">
                              {ex.reason}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={deletingId === ex.id}
                          onClick={() => void handleDeleteBlock(ex.id)}
                          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                          title="Kapalı saati kaldır"
                          aria-label="Kapalı saati kaldır"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conflicting Appointments Confirmation Modal */}
      {conflictPrompt && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-md rounded-[22px] border border-orange-500/35 bg-white p-6 shadow-2xl dark:border-orange-500/30 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setConflictPrompt(null)}
              disabled={addingBlock}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/15 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                  Bu Saatte Aktif Randevu Var!
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {conflictPrompt.message}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-50/70 p-3 text-[11px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              Onaylarsanız çakışan randevular iptal edilecek, müşterilere otomatik bildirim
              gönderilecek ve seçtiğiniz saat aralığı kapatılacaktır.
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={addingBlock}
                onClick={() => setConflictPrompt(null)}
                className="h-10 rounded-xl px-4"
              >
                Vazgeç
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={addingBlock}
                onClick={() =>
                  void submitBlock(
                    conflictPrompt.startIso,
                    conflictPrompt.endIso,
                    conflictPrompt.reason,
                    true,
                  )
                }
                className="h-10 rounded-xl bg-orange-600 px-4 font-semibold text-white hover:bg-orange-700 dark:bg-orange-500 dark:text-slate-950"
              >
                İptal Et ve Saati Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
