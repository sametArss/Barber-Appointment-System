import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Search, Sparkles, Users } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import type { BranchServiceResponse, StaffResponse } from '@/types/booking';

interface BranchServicesSectionProps {
  services: BranchServiceResponse[];
  staff: StaffResponse[];
  loading: boolean;
  onSelectService: (serviceId: string) => void;
}

export const BranchServicesSection: React.FC<BranchServicesSectionProps> = ({
  services,
  staff,
  loading,
  onSelectService,
}) => {
  const [query, setQuery] = useState('');

  const filteredServices = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return services;
    return services.filter((srv) =>
      `${srv.serviceName} ${srv.description ?? ''}`.toLocaleLowerCase('tr').includes(q),
    );
  }, [services, query]);

  const getEligibleStaffCount = (serviceId: string) =>
    staff.filter((m) => (m.assignedServiceIds ?? []).includes(serviceId)).length;

  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_24px_65px_-26px_rgba(0,0,0,0.8)] sm:p-7">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97706] dark:text-amber-400">
            Bakım Menüsü
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
            Hizmetler &amp; Fiyatlar
          </h2>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
          {services.length} Hizmet
        </span>
      </div>

      {services.length > 4 && (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hizmet ara (örn. saç kesimi, sakal)..."
            className="h-10 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
          />
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full rounded-[18px]" />
          ))
        ) : filteredServices.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            {services.length === 0
              ? 'Bu şube için henüz listelenmiş hizmet bulunmuyor.'
              : 'Aramanızla eşleşen hizmet bulunamadı.'}
          </div>
        ) : (
          filteredServices.map((srv) => {
            const eligibleCount = getEligibleStaffCount(srv.serviceId);
            return (
              <motion.div
                key={srv.id}
                whileHover={{ y: -1 }}
                className="group flex flex-col justify-between gap-4 rounded-[18px] border border-slate-200/80 bg-slate-50/55 p-4.5 transition-all hover:border-amber-500/50 hover:bg-white dark:border-white/10 dark:bg-slate-950/50 dark:hover:border-amber-400/45 dark:hover:bg-slate-950/80 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                      {srv.serviceName}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
                      <Clock className="h-3 w-3 text-[#D97706] dark:text-amber-400" />
                      {srv.finalDurationMinutes} dk
                    </span>
                    {eligibleCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        <Users className="h-3 w-3" />
                        {eligibleCount} uzman
                      </span>
                    )}
                  </div>

                  {srv.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {srv.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200/60 pt-3 dark:border-white/10 sm:border-t-0 sm:pt-0">
                  <span className="font-serif text-xl font-bold text-[#D97706] dark:text-amber-400">
                    {formatCurrency(srv.finalPrice)}
                  </span>

                  <Button
                    size="sm"
                    onClick={() => onSelectService(srv.serviceId)}
                    className="h-9 gap-1.5 rounded-[12px] bg-[#D97706] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                  >
                    Randevu Al
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
};
