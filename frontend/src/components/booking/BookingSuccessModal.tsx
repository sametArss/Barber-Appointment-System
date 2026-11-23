import { motion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import type { AppointmentResponse } from '@/types/booking';

interface BookingSuccessModalProps {
  appointment: AppointmentResponse;
  onExplore: () => void;
  onViewAppointments: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  appointment,
  onExplore,
  onViewAppointments,
}) => (
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
        onClick={onViewAppointments}
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
            {appointment.branchName}
          </span>
        </div>
        <div className="flex justify-between rounded-[14px] border border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
          <span className="text-slate-500 dark:text-slate-400">Hizmet</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {appointment.serviceName} ({appointment.durationSnapshot} dk)
          </span>
        </div>
        <div className="flex justify-between rounded-[14px] border border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
          <span className="text-slate-500 dark:text-slate-400">Berber</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {appointment.staffFullName}
          </span>
        </div>
        <div className="flex justify-between rounded-[14px] border border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
          <span className="text-slate-500 dark:text-slate-400">Ücret</span>
          <span className="font-serif text-base font-bold text-[#D97706] dark:text-amber-400">
            {formatCurrency(appointment.priceSnapshot)}
          </span>
        </div>
      </div>

      <div className="mt-6 flex gap-2.5">
        <Button
          variant="outline"
          className="h-11 flex-1 rounded-[14px]"
          onClick={onExplore}
        >
          Keşfet&apos;e Dön
        </Button>
        <Button
          className="h-11 flex-1 rounded-[14px] bg-[#D97706] font-semibold text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
          onClick={onViewAppointments}
        >
          Randevularım
        </Button>
      </div>
    </motion.div>
  </div>
);
