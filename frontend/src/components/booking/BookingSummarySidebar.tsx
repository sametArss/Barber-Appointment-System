import { Scissors } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { AvailableSlot, BranchServiceResponse, StaffResponse } from '@/types/booking';
import { formatReadableDate } from './bookingUtils';

interface BookingSummarySidebarProps {
  branchName?: string;
  selectedService: BranchServiceResponse | null;
  selectedStaff: StaffResponse | null;
  selectedDate: string;
  selectedSlot: AvailableSlot | null;
  step: number;
}

export const BookingSummarySidebar: React.FC<BookingSummarySidebarProps> = ({
  branchName,
  selectedService,
  selectedStaff,
  selectedDate,
  selectedSlot,
  step,
}) => (
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
          {branchName ?? 'Seçiminiz'}
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
);
