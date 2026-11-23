import React from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { AppointmentResponse } from '@/types/booking';

interface NoShowConfirmModalProps {
  appointment: AppointmentResponse | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const NoShowConfirmModal: React.FC<NoShowConfirmModalProps> = ({
  appointment,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  if (!appointment) return null;

  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(appointment.startAt));

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="noshow-confirm-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-[22px] border border-orange-500/35 bg-white p-6 shadow-2xl dark:border-orange-500/30 dark:bg-slate-900">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50 dark:hover:text-slate-200"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/15 text-orange-600 dark:text-orange-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3
              id="noshow-confirm-title"
              className="font-serif text-xl font-bold text-slate-900 dark:text-white"
            >
              Müşteri Gelmedi Olarak İşaretlensin mi?
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Bu işlem onaylandıktan sonra geri alınamaz ve randevu kilitlenir.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs dark:border-white/10 dark:bg-slate-950/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Müşteri</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {appointment.customerFullName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Hizmet</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {appointment.serviceName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Tarih &amp; Saat</span>
            <span className="font-semibold text-[#D97706] dark:text-amber-400">
              {formattedDate}
            </span>
          </div>
        </div>

        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-orange-500/30 bg-orange-50/90 p-3 text-xs text-orange-900 dark:bg-orange-500/10 dark:text-orange-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500 dark:text-orange-400" />
          <span>
            Müşterinin hesabına otomatik olarak <strong>1 No-Show ceza puanı</strong> işlenecektir.
            Devam etmek istediğinize emin misiniz?
          </span>
        </div>

        <div className="mt-5 flex justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={onCancel}
            className="h-10 rounded-xl px-4"
          >
            Vazgeç
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={loading}
            onClick={onConfirm}
            className="h-10 gap-1.5 rounded-xl bg-orange-600 px-4 font-semibold text-white hover:bg-orange-700 dark:bg-orange-500 dark:text-slate-950 dark:hover:bg-orange-400"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Evet, Gelmedi İşaretle
          </Button>
        </div>
      </div>
    </div>
  );
};
