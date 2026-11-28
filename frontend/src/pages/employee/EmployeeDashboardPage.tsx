import React from 'react';
import { CalendarDays, RefreshCw, Store } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { AppointmentStatus } from '@/types/booking';
import { EmployeeAppointmentCard, EmployeeWorkplaceCard } from './EmployeeCards';
import { useEmployeeData } from './useEmployeeData';

export const EmployeeDashboardPage: React.FC = () => {
  const { workplaces, appointments, loading, updatingId, refresh, updateStatus } =
    useEmployeeData();
  const allUpcoming = appointments.filter(
    (appointment) =>
      (appointment.status === AppointmentStatus.Pending ||
        appointment.status === AppointmentStatus.Confirmed) &&
      new Date(appointment.startAt) >= new Date(),
  );
  const upcoming = allUpcoming.slice(0, 4);
  const pendingCount = appointments.filter(
    (appointment) => appointment.status === AppointmentStatus.Pending,
  ).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D97706] dark:text-amber-400">
            Çalışan Paneli
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5]">
            Merhaba, kolay gelsin
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Çalışma yerlerini ve sana ait randevuları buradan takip et.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 rounded-[14px] border-slate-200/90 bg-white/80 dark:border-white/15 dark:bg-slate-900/60"
          onClick={() => void refresh()}
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </Button>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-[18px]" />
          <Skeleton className="h-28 rounded-[18px]" />
          <Skeleton className="h-28 rounded-[18px]" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[18px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Çalıştığım Şubeler
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-slate-900 dark:text-white">
              {workplaces.length}
            </p>
          </div>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Onay Bekleyen
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-[#D97706] dark:text-amber-400">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Yaklaşan Randevular
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-slate-900 dark:text-white">
              {allUpcoming.length}
            </p>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Çalıştığım Yerler
          </h2>
        </div>
        {loading ? (
          <Skeleton className="h-40 rounded-[18px]" />
        ) : workplaces.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {workplaces.map((workplace) => (
              <EmployeeWorkplaceCard
                key={`${workplace.staffProfileId}-${workplace.branchId}`}
                workplace={workplace}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
            Hesabına henüz bir çalışma yeri atanmamış. Salon yöneticinle iletişime geç.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Yaklaşan Randevular
          </h2>
        </div>
        {loading ? (
          <Skeleton className="h-36 rounded-[18px]" />
        ) : upcoming.length ? (
          <div className="space-y-3.5">
            {upcoming.map((appointment) => (
              <EmployeeAppointmentCard
                key={appointment.id}
                appointment={appointment}
                updating={updatingId === appointment.id}
                onUpdate={(status) => void updateStatus(appointment, status)}
                onRefresh={refresh}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-slate-200/80 bg-white/80 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
            Yaklaşan randevun bulunmuyor.
          </div>
        )}
      </section>
    </div>
  );
};
