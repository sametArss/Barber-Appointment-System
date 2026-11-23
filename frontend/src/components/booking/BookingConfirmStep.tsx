import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Scissors,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import type {
  AvailableSlot,
  BranchServiceResponse,
  CustomerPenaltyStatus,
  StaffResponse,
} from '@/types/booking';
import { formatReadableDate } from './bookingUtils';

interface BookingConfirmStepProps {
  selectedService: BranchServiceResponse;
  selectedStaff: StaffResponse;
  selectedDate: string;
  selectedSlot: AvailableSlot;
  penaltyStatus: CustomerPenaltyStatus | null;
  loadingPenalty: boolean;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export const BookingConfirmStep: React.FC<BookingConfirmStepProps> = ({
  selectedService,
  selectedStaff,
  selectedDate,
  selectedSlot,
  penaltyStatus,
  loadingPenalty,
  submitting,
  onBack,
  onConfirm,
}) => (
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
              3 aktif no-show veya geç iptal ihlaline ulaştığınızda 14 gün geçici rezervasyon
              kısıtlaması uygulanır.
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
      <Button variant="outline" onClick={onBack} className="h-11 gap-2 rounded-[14px]">
        <ArrowLeft className="h-4 w-4" />
        Saate Dön
      </Button>
      <Button
        size="lg"
        isLoading={submitting}
        disabled={penaltyStatus?.isRestricted === true}
        onClick={onConfirm}
        className="h-12 gap-2 rounded-[16px] bg-[#D97706] px-7 text-sm font-semibold text-white shadow-lg shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_24px_rgba(245,158,11,0.4)] dark:hover:bg-amber-400"
      >
        <Scissors className="h-4 w-4" />
        Randevuyu Onayla
      </Button>
    </div>
  </motion.div>
);
