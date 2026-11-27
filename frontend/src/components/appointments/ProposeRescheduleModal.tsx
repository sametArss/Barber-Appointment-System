import React, { useEffect, useState } from 'react';
import { CalendarClock, Clock, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Skeleton } from '@/components/ui';
import { cn, getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import type { AppointmentResponse, AvailableSlot } from '@/types/booking';

interface ProposeRescheduleModalProps {
  appointment: AppointmentResponse | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

const toLocalDateInput = (isoOrDate: string | Date) => {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const ProposeRescheduleModal: React.FC<ProposeRescheduleModalProps> = ({
  appointment,
  onClose,
  onSuccess,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateInput(new Date()));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    setSelectedDate(toLocalDateInput(appointment.startAt));
    setSelectedSlot(null);
    setNote(appointment.rescheduleNote ?? '');
  }, [appointment]);

  useEffect(() => {
    if (!appointment || !selectedDate) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlot(null);

    bookingService
      .getAvailableSlots({
        branchId: appointment.branchId,
        staffProfileId: appointment.staffProfileId,
        serviceId: appointment.serviceId,
        date: selectedDate,
      })
      .then((res) => {
        if (!cancelled) {
          const currentStartMs = new Date(appointment.startAt).getTime();
          setSlots(
            (res.data ?? []).filter((s) => new Date(s.startAtUtc).getTime() !== currentStartMs),
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, 'Müsait saatler yüklenemedi.'));
          setSlots([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appointment, selectedDate]);

  if (!appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.warning('Lütfen teklif etmek istediğiniz yeni saati seçin.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await bookingService.proposeReschedule({
        appointmentId: appointment.id,
        newStartAt: selectedSlot.startAtUtc,
        note: note.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.message || 'Saat değişikliği teklifi gönderilemedi.');
        return;
      }

      toast.success('Yeni saat teklifi müşteriye gönderildi!');
      onClose();
      await onSuccess();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Saat değişikliği teklifi gönderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  };

  const currentFormatted = new Date(appointment.startAt).toLocaleString('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-amber-500/30 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/95">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Kapat"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/12 text-[#D97706] dark:text-amber-400">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
              Yeni Saat Teklif Et
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {appointment.customerFullName} · {appointment.serviceName} (Mevcut: {currentFormatted})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Yeni Tarih Seçin
            </label>
            <input
              type="date"
              min={toLocalDateInput(new Date())}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="h-10 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold text-slate-900 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/15 dark:bg-slate-950/70 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Müsait Saatler</span>
              <span className="text-[11px] font-normal text-slate-400">
                {appointment.durationSnapshot} dk
              </span>
            </label>

            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-xl" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                Seçilen tarih için başka müsait saat bulunamadı. Farklı bir tarih seçebilirsiniz.
              </div>
            ) : (
              <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                {slots.map((slot) => {
                  const active = selectedSlot?.startAtUtc === slot.startAtUtc;
                  return (
                    <button
                      key={slot.startAtUtc}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'flex cursor-pointer flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs font-bold transition-all',
                        active
                          ? 'border-[#D97706] bg-[#D97706] text-white shadow-sm dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-amber-500/50 hover:bg-amber-50/50 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200',
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 opacity-75" />
                        {slot.startTime.slice(0, 5)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Müşteriye Kısa Not (İsteğe Bağlı)
            </label>
            <input
              type="text"
              maxLength={240}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn. 15:00'te yoğunluk oldu, 16:00 sizin için uygun mu?"
              className="h-10 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/15 dark:bg-slate-950/70 dark:text-slate-100"
            />
          </div>

          <p className="rounded-xl border border-amber-500/25 bg-amber-50/70 p-3 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            Müşteriye bildirim gönderilecektir. Müşteri yeni saati onaylarsa randevu güncellenir;
            reddederse veya mevcut randevu saatine kadar onaylamazsa randevu otomatik iptal edilir.
          </p>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedSlot}
              isLoading={submitting}
              className="h-10 gap-1.5 rounded-[12px] bg-[#D97706] px-5 font-semibold text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
            >
              <Send className="h-3.5 w-3.5" />
              Teklifi Gönder
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
