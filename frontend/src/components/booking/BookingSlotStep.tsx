import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, Coffee } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { AvailableSlot, BranchServiceResponse, StaffResponse } from '@/types/booking';
import type { DateOption, GridSlotItem } from './bookingUtils';

interface BookingSlotStepProps {
  selectedStaff: StaffResponse | null;
  selectedService: BranchServiceResponse | null;
  dateOptions: DateOption[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  loadingSlots: boolean;
  slotGrid: { isClosedDay: boolean; items: GridSlotItem[] };
  selectedSlot: AvailableSlot | null;
  onSelectSlot: (slot: AvailableSlot) => void;
  onBack: () => void;
  onNext: () => void;
}

export const BookingSlotStep: React.FC<BookingSlotStepProps> = ({
  selectedStaff,
  selectedService,
  dateOptions,
  selectedDate,
  onSelectDate,
  loadingSlots,
  slotGrid,
  selectedSlot,
  onSelectSlot,
  onBack,
  onNext,
}) => (
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
        onChange={(e) => onSelectDate(e.target.value)}
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
            onClick={() => onSelectDate(d.value)}
            className={cn(
              'flex min-w-[74px] cursor-pointer select-none flex-col items-center rounded-[16px] border px-3 py-2.5 transition-all active:scale-95',
              active
                ? 'border-[#D97706] bg-[#D97706] font-bold text-white shadow-md shadow-amber-600/25 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'border-slate-200/90 bg-slate-50/70 text-slate-700 hover:border-amber-400/60 hover:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-amber-400/40',
            )}
          >
            <span className="text-[10px] font-semibold uppercase">{d.dayName}</span>
            <span className="font-serif text-lg font-bold leading-tight">{d.dayNum}</span>
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
                <span className="text-xs font-semibold line-through">{item.startLabel}</span>
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
                <span className="text-xs font-semibold line-through">{item.startLabel}</span>
                <span className="mt-0.5 text-[10px]">Dolu</span>
              </button>
            );
          }

          const isSelected = selectedSlot?.startAtUtc === item.slot.startAtUtc;
          return (
            <button
              key={item.slot.startAtUtc}
              type="button"
              onClick={() => onSelectSlot(item.slot)}
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
      <Button variant="outline" onClick={onBack} className="h-11 gap-2 rounded-[14px]">
        <ArrowLeft className="h-4 w-4" />
        Berbere Dön
      </Button>
      <Button
        disabled={!selectedSlot}
        onClick={onNext}
        className="h-11 gap-2 rounded-[14px] bg-[#D97706] px-6 font-semibold text-white shadow-md shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
      >
        Özeti Görüntüle
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  </motion.div>
);
