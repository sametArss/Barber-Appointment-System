import React from 'react';
import {
  ArrowLeft,
  CalendarPlus,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Scissors,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn, formatCurrency, formatDistance } from '@/lib/utils';
import type { BranchSearchResponse } from '@/types/booking';

interface BranchHeroSectionProps {
  branch?: BranchSearchResponse;
  loading: boolean;
  serviceCount: number;
  staffCount: number;
  minPrice: number | null;
  averageRating: number | null;
  reviewCount: number;
  isFavorited?: boolean;
  togglingFavorite?: boolean;
  onToggleFavorite?: () => void;
  onBack: () => void;
  onShare: () => void;
  onBook: () => void;
}

export const BranchHeroSection: React.FC<BranchHeroSectionProps> = ({
  branch,
  loading,
  serviceCount,
  staffCount,
  minPrice,
  averageRating,
  reviewCount,
  isFavorited = false,
  togglingFavorite = false,
  onToggleFavorite,
  onBack,
  onShare,
  onBook,
}) => {
  const fullAddress =
    [branch?.address, branch?.district, branch?.city].filter(Boolean).join(', ') ||
    'Adres bilgisi bulunmuyor';

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-amber-500/45 hover:text-[#D97706] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-amber-400/45 dark:hover:text-amber-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Salon Listesine Dön
        </button>

        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              type="button"
              disabled={togglingFavorite || !branch}
              onClick={onToggleFavorite}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-50',
                isFavorited
                  ? 'border-rose-500/40 bg-rose-50 text-rose-600 shadow-sm dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-300'
                  : 'border-slate-200/90 bg-white/80 text-slate-700 hover:border-rose-400/50 hover:text-rose-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-rose-400/45 dark:hover:text-rose-300',
              )}
            >
              <Heart
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  isFavorited && 'fill-rose-500 text-rose-500 scale-110',
                )}
              />
              {isFavorited ? 'Favorilerde' : 'Favorile'}
            </button>
          )}

          <button
            type="button"
            onClick={onShare}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-amber-500/45 hover:text-[#D97706] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-amber-400/45 dark:hover:text-amber-400"
          >
            <Share2 className="h-3.5 w-3.5" />
            Paylaş
          </button>
        </div>
      </div>

      {/* Editorial Hero Card */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/70 dark:shadow-[0_30px_80px_-28px_rgba(0,0,0,0.85),0_0_40px_-18px_rgba(245,158,11,0.18)] sm:p-9">
        {/* Subtle Warm Editorial Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/12 blur-3xl dark:bg-amber-500/15"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3.5">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/12 px-3 py-1 text-xs font-semibold text-[#B45309] dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-300">
                <Scissors className="h-3.5 w-3.5" />
                {branch?.businessName ?? 'BarberBooking Salonu'}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50/90 px-3 py-1 text-xs font-bold text-[#B45309] dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {averageRating !== null && reviewCount > 0
                  ? `${averageRating.toFixed(1)} · ${reviewCount} değerlendirme`
                  : 'Yeni Salon'}
              </span>

              {branch && branch.distanceMeters > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                  <MapPin className="h-3 w-3 text-[#D97706] dark:text-amber-400" />
                  {formatDistance(branch.distanceMeters)}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Randevuya Açık
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
                {branch?.branchName ?? (loading ? 'Salon yükleniyor…' : 'Salon bilgisi alınamadı')}
              </h1>
              {branch?.businessDescription && (
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {branch.businessDescription}
                </p>
              )}
            </div>

            {/* Contact Meta */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-[#D97706] dark:text-amber-400" />
                <span>{fullAddress}</span>
              </span>

              {branch?.phoneNumber && (
                <a
                  href={`tel:${branch.phoneNumber}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#D97706] dark:hover:text-amber-400"
                >
                  <Phone className="h-4 w-4 shrink-0 text-[#D97706] dark:text-amber-400" />
                  <span>{branch.phoneNumber}</span>
                </a>
              )}
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:flex-row lg:flex-col">
            <Button
              size="lg"
              onClick={onBook}
              className="h-12 gap-2.5 rounded-[16px] bg-[#D97706] px-6 text-sm font-semibold text-white shadow-lg shadow-amber-600/25 hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_24px_rgba(245,158,11,0.35)] dark:hover:bg-amber-400"
            >
              <CalendarPlus className="h-4.5 w-4.5" />
              Hemen Randevu Al
            </Button>

            {branch && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-slate-200/90 bg-white/80 px-5 text-xs font-semibold text-slate-700 transition-colors hover:border-amber-500/45 hover:text-[#D97706] dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-amber-400/45 dark:hover:text-amber-400"
              >
                <Navigation className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
                Yol Tarifi Al
              </a>
            )}
          </div>
        </div>

        {/* Live DB Stat Strip */}
        <div className="relative mt-7 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-6 dark:border-white/10 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/75 px-4 py-3 dark:border-white/10 dark:bg-slate-950/50">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Star className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
              Salon Puanı
            </span>
            <p className="mt-1 font-serif text-xl font-bold text-slate-900 dark:text-white">
              {averageRating !== null && reviewCount > 0 ? `${averageRating.toFixed(1)} / 5` : '—'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/75 px-4 py-3 dark:border-white/10 dark:bg-slate-950/50">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
              Hizmet Çeşidi
            </span>
            <p className="mt-1 font-serif text-xl font-bold text-slate-900 dark:text-white">
              {serviceCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/75 px-4 py-3 dark:border-white/10 dark:bg-slate-950/50">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Users className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
              Uzman Berber
            </span>
            <p className="mt-1 font-serif text-xl font-bold text-slate-900 dark:text-white">
              {staffCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/75 px-4 py-3 dark:border-white/10 dark:bg-slate-950/50">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Scissors className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
              Başlangıç Fiyatı
            </span>
            <p className="mt-1 font-serif text-xl font-bold text-[#D97706] dark:text-amber-400">
              {minPrice !== null ? formatCurrency(minPrice) : '—'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
