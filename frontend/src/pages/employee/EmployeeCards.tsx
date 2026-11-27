import React, { useState } from 'react';
import {
  CalendarClock,
  Check,
  Clock3,
  MapPin,
  Phone,
  Scissors,
  ShieldAlert,
  Store,
  X,
} from 'lucide-react';
import { NoShowConfirmModal } from '@/components/appointments/NoShowConfirmModal';
import { ProposeRescheduleModal } from '@/components/appointments/ProposeRescheduleModal';
import { Badge, Button } from '@/components/ui';
import { cn, formatCurrency } from '@/lib/utils';
import {
  AppointmentStatus,
  type AppointmentResponse,
  type EmployeeWorkplace,
} from '@/types/booking';
import { formatEmployeeAppointmentDate } from './useEmployeeData';

export const EmployeeWorkplaceCard: React.FC<{ workplace: EmployeeWorkplace }> = ({
  workplace,
}) => (
  <div className="rounded-[18px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_14px_38px_-22px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all hover:border-amber-500/40 dark:border-amber-500/15 dark:bg-slate-900/65 dark:shadow-[0_16px_45px_-22px_rgba(0,0,0,0.75)]">
    <div className="flex items-start gap-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-[#D97706] dark:bg-amber-500/15 dark:text-amber-400">
        <Store className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-lg font-bold text-slate-900 dark:text-white">
          {workplace.businessName}
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {workplace.branchName}
        </p>
      </div>
      <Badge variant={workplace.isBookable ? 'success' : 'outline'}>
        {workplace.isBookable ? 'Randevu alıyor' : 'Kapalı'}
      </Badge>
    </div>

    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
      <p className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
        <span>
          {workplace.address}, {workplace.district}, {workplace.city}
        </span>
      </p>
      {workplace.businessPhoneNumber && (
        <a
          className="inline-flex items-center gap-2 font-medium hover:text-[#D97706] dark:hover:text-amber-400"
          href={`tel:${workplace.businessPhoneNumber}`}
        >
          <Phone className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
          {workplace.businessPhoneNumber}
        </a>
      )}
      {workplace.biography && (
        <p className="pt-1 text-slate-500 dark:text-slate-400">{workplace.biography}</p>
      )}
    </div>
  </div>
);

export const EmployeeAppointmentCard: React.FC<{
  appointment: AppointmentResponse;
  updating: boolean;
  onUpdate: (status: number) => void;
  onRefresh?: () => void | Promise<void>;
}> = ({ appointment, updating, onUpdate, onRefresh }) => {
  const [confirmNoShow, setConfirmNoShow] = useState(false);
  const [openReschedule, setOpenReschedule] = useState(false);

  const isPending = appointment.status === AppointmentStatus.Pending;
  const isConfirmed = appointment.status === AppointmentStatus.Confirmed;
  const startMs = new Date(appointment.startAt).getTime();
  const nowMs = Date.now();
  const isBeforeStart = nowMs < startMs;
  const hasStarted = nowMs >= startMs;

  const statusLabel = isPending
    ? 'Onay bekliyor'
    : isConfirmed
      ? 'Onaylandı'
      : appointment.status === AppointmentStatus.Completed
        ? 'Tamamlandı'
        : appointment.status === AppointmentStatus.Cancelled
          ? 'İptal edildi'
          : 'Gelmedi';

  const statusClasses = isPending
    ? 'border-amber-500/35 bg-amber-500/12 text-[#B45309] dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-300'
    : isConfirmed
      ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-300'
      : appointment.status === AppointmentStatus.Cancelled
        ? 'border-red-500/35 bg-red-500/10 text-red-600 dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-300'
        : appointment.status === AppointmentStatus.NoShow
          ? 'border-orange-500/35 bg-orange-500/12 text-orange-700 dark:border-orange-400/35 dark:bg-orange-500/15 dark:text-orange-300'
          : 'border-slate-300/80 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-200';

  const hasActions = isPending || isConfirmed;

  return (
    <>
      <div className="group rounded-[16px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_14px_38px_-22px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-200 hover:border-amber-500/45 hover:shadow-[0_18px_44px_-22px_rgba(217,119,6,0.2)] dark:border-amber-500/15 dark:bg-slate-900/65 dark:shadow-[0_16px_45px_-22px_rgba(0,0,0,0.75)] dark:hover:border-amber-400/50">
        <div
          className={cn(
            'grid items-center gap-4',
            hasActions
              ? 'lg:grid-cols-[minmax(180px,0.9fr)_minmax(0,2fr)_auto]'
              : 'lg:grid-cols-[minmax(190px,0.9fr)_minmax(0,2.2fr)]',
          )}
        >
          <div className="space-y-2">
            <h3 className="font-serif text-lg font-bold leading-snug text-slate-900 dark:text-white">
              {appointment.customerFullName}
            </h3>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold',
                statusClasses,
              )}
            >
              {statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 border-t border-slate-100 pt-3.5 text-xs sm:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 dark:border-white/10">
            <p className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
              <Scissors className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
              <span className="truncate">
                {appointment.serviceName} •{' '}
                <span className="text-[#D97706] dark:text-amber-400">
                  {formatCurrency(appointment.priceSnapshot)}
                </span>
              </span>
            </p>

            <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
              <span className="truncate">
                {formatEmployeeAppointmentDate(appointment.startAt)} • {appointment.durationSnapshot} dk
              </span>
            </p>

            <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="truncate">{appointment.branchName}</span>
            </p>

            {appointment.customerPhoneNumber ? (
              <a
                href={`tel:${appointment.customerPhoneNumber}`}
                className="inline-flex items-center gap-2 font-medium text-slate-700 transition-colors hover:text-[#D97706] dark:text-slate-300 dark:hover:text-amber-400"
              >
                <Phone className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-amber-400" />
                <span>{appointment.customerPhoneNumber}</span>
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                Telefon yok
              </span>
            )}
          </div>

          {hasActions && (
            <div className="flex flex-col items-start gap-1.5 border-t border-slate-100 pt-3 lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {isPending && (
                  <>
                    <Button
                      size="sm"
                      title={
                        isBeforeStart
                          ? 'Randevuyu onayla'
                          : 'Randevu saati geçtiği için artık onaylanamaz'
                      }
                      className="h-9 gap-1.5 rounded-xl bg-[#D97706] text-xs font-semibold text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
                      disabled={updating || !isBeforeStart}
                      isLoading={updating}
                      onClick={() => onUpdate(AppointmentStatus.Confirmed)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 rounded-xl border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/15"
                      disabled={updating}
                      onClick={() => onUpdate(AppointmentStatus.Cancelled)}
                    >
                      <X className="h-3.5 w-3.5" />
                      İptal Et
                    </Button>
                  </>
                )}
                {isConfirmed && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      title={
                        hasStarted
                          ? 'Hizmet tamamlandı olarak işaretle'
                          : 'Randevu saati gelmeden tamamlandı seçilemez'
                      }
                      className="h-9 gap-1.5 rounded-xl border-emerald-500/40 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/35 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                      disabled={updating || !hasStarted}
                      onClick={() => onUpdate(AppointmentStatus.Completed)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Tamamlandı
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title={
                        hasStarted
                          ? 'Müşteri gelmedi (No-Show) olarak işaretle'
                          : 'Randevu saati gelmeden gelmedi seçilemez'
                      }
                      className="h-9 gap-1.5 rounded-xl border-orange-500/40 text-xs font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-400/35 dark:text-orange-300 dark:hover:bg-orange-500/15"
                      disabled={updating || !hasStarted}
                      onClick={() => setConfirmNoShow(true)}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Gelmedi
                    </Button>
                    {isBeforeStart && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1.5 rounded-xl border-amber-500/40 text-xs font-semibold text-[#B45309] hover:bg-amber-50 dark:border-amber-400/35 dark:text-amber-300 dark:hover:bg-amber-500/15"
                          disabled={updating}
                          onClick={() => setOpenReschedule(true)}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          {appointment.hasPendingReschedule ? 'Teklifi Güncelle' : 'Saat Değiştir'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 gap-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15"
                          disabled={updating}
                          onClick={() => onUpdate(AppointmentStatus.Cancelled)}
                        >
                          İptal Et
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>

              {appointment.hasPendingReschedule && appointment.proposedStartAt && (
                <p className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#B45309] dark:text-amber-300">
                  <CalendarClock className="h-3 w-3" />
                  Müşteri onayı bekleniyor →{' '}
                  {new Date(appointment.proposedStartAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}

              {isPending && !isBeforeStart && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Randevu saati geçtiği için onaylanamaz.
                </p>
              )}
              {isConfirmed && !hasStarted && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tamamlandı / Gelmedi randevu saatinde açılır.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <NoShowConfirmModal
        appointment={confirmNoShow ? appointment : null}
        loading={updating}
        onCancel={() => setConfirmNoShow(false)}
        onConfirm={() => {
          setConfirmNoShow(false);
          onUpdate(AppointmentStatus.NoShow);
        }}
      />

      <ProposeRescheduleModal
        appointment={openReschedule ? appointment : null}
        onClose={() => setOpenReschedule(false)}
        onSuccess={() => onRefresh?.()}
      />
    </>
  );
};
