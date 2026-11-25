import React from 'react';
import { Sparkles, Star, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import type { StaffResponse } from '@/types/booking';
import type { ReviewResponse } from '@/types/review';

interface BranchStaffSectionProps {
  staff: StaffResponse[];
  reviews: ReviewResponse[];
  loading: boolean;
}

export const BranchStaffSection: React.FC<BranchStaffSectionProps> = ({
  staff,
  reviews,
  loading,
}) => {
  const getStaffRating = (staffId: string) => {
    const staffRevs = reviews.filter((r) => r.staffProfileId === staffId);
    if (staffRevs.length === 0) return null;
    const avg = staffRevs.reduce((acc, r) => acc + r.rating, 0) / staffRevs.length;
    return { avg: avg.toFixed(1), count: staffRevs.length };
  };

  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_24px_65px_-26px_rgba(0,0,0,0.8)] sm:p-7">
      <div className="border-b border-slate-100 pb-5 dark:border-white/10">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97706] dark:text-amber-400">
          Ekip
        </p>
        <h2 className="mt-1 flex items-center gap-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
          <UserCheck className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
          Uzman Kadro
        </h2>
      </div>

      <div className="mt-5 space-y-3.5">
        {loading ? (
          Array.from({ length: 2 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full rounded-[18px]" />
          ))
        ) : staff.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            Bu şubede randevuya açık personel kaydı bulunamadı.
          </div>
        ) : (
          staff.map((person) => {
            const initials = person.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const ratingInfo = getStaffRating(person.id);
            const assignedNames = person.assignedServiceNames ?? [];

            return (
              <div
                key={person.id}
                className="rounded-[18px] border border-slate-200/80 bg-slate-50/55 p-4 transition-colors hover:border-amber-500/40 dark:border-white/10 dark:bg-slate-950/50 dark:hover:border-amber-400/40"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-100 to-orange-100 font-serif text-sm font-bold text-[#D97706] dark:border-amber-400/35 dark:from-amber-500/25 dark:to-slate-900 dark:text-amber-300">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-serif text-base font-bold text-slate-900 dark:text-white">
                        {person.fullName}
                      </h3>
                      {ratingInfo ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-[#B45309] dark:text-amber-300">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {ratingInfo.avg}
                          <span className="font-normal opacity-75">({ratingInfo.count})</span>
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="h-3 w-3" />
                          Müsait
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {person.biography || 'Profesyonel Saç & Sakal Tasarım Uzmanı'}
                    </p>
                  </div>
                </div>

                {assignedNames.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200/60 pt-3 dark:border-white/10">
                    {assignedNames.slice(0, 4).map((srvName) => (
                      <span
                        key={srvName}
                        className="rounded-full border border-amber-500/25 bg-amber-500/8 px-2.5 py-0.5 text-[10px] font-semibold text-[#B45309] dark:border-amber-400/25 dark:bg-amber-500/12 dark:text-amber-300"
                      >
                        {srvName}
                      </span>
                    ))}
                    {assignedNames.length > 4 && (
                      <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        +{assignedNames.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
