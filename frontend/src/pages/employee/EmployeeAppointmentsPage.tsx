import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, UserRound } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AppointmentStatus } from '@/types/booking';
import { EmployeeAppointmentCard } from './EmployeeCards';
import { useEmployeeData } from './useEmployeeData';

export const EmployeeAppointmentsPage: React.FC = () => {
  const { appointments, loading, updatingId, refresh, updateStatus } = useEmployeeData();
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'past'>('all');

  const counts = useMemo(
    () => ({
      all: appointments.length,
      pending: appointments.filter((a) => a.status === AppointmentStatus.Pending).length,
      confirmed: appointments.filter((a) => a.status === AppointmentStatus.Confirmed).length,
      past: appointments.filter((a) =>
        [
          AppointmentStatus.Completed,
          AppointmentStatus.Cancelled,
          AppointmentStatus.NoShow,
        ].includes(a.status as 3 | 4 | 5),
      ).length,
    }),
    [appointments],
  );

  const filtered = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (filter === 'pending') return appointment.status === AppointmentStatus.Pending;
        if (filter === 'confirmed') return appointment.status === AppointmentStatus.Confirmed;
        if (filter === 'past') {
          return [
            AppointmentStatus.Completed,
            AppointmentStatus.Cancelled,
            AppointmentStatus.NoShow,
          ].includes(appointment.status as 3 | 4 | 5);
        }
        return true;
      }),
    [appointments, filter],
  );

  const tabs: Array<{
    value: 'all' | 'pending' | 'confirmed' | 'past';
    label: string;
    count: number;
  }> = [
    { value: 'all', label: 'Tümü', count: counts.all },
    { value: 'pending', label: 'Onay bekleyen', count: counts.pending },
    { value: 'confirmed', label: 'Onaylanan', count: counts.confirmed },
    { value: 'past', label: 'Geçmiş', count: counts.past },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5]">
            Randevularım
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Yalnızca sana atanmış müşteri randevuları.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 rounded-[14px] border-slate-200/90 bg-white/80 px-4 text-xs font-semibold dark:border-white/15 dark:bg-slate-900/60"
          onClick={() => void refresh()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Yenile
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = filter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-[14px] border px-4 py-2 text-xs font-semibold transition-all duration-200',
                isActive
                  ? 'border-[#D97706] bg-[#D97706] text-white shadow-md shadow-amber-600/25 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'border-slate-200/90 bg-transparent text-slate-600 hover:border-amber-500/40 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/40 dark:hover:text-white',
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isActive
                    ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3.5">
          <Skeleton className="h-28 rounded-[16px]" />
          <Skeleton className="h-28 rounded-[16px]" />
        </div>
      ) : filtered.length ? (
        <div className="space-y-3.5">
          {filtered.map((appointment, idx) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(idx * 0.03, 0.15) }}
            >
              <EmployeeAppointmentCard
                appointment={appointment}
                updating={updatingId === appointment.id}
                onUpdate={(status) => void updateStatus(appointment, status)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-slate-200/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/60">
          <UserRound className="mx-auto h-9 w-9 text-slate-400 dark:text-slate-500" />
          <h2 className="mt-3 font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Bu filtrede randevu yok
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Filtreyi değiştirerek diğer randevularını görüntüleyebilirsin.
          </p>
        </div>
      )}
    </div>
  );
};
