import React, { useMemo, useState } from 'react';
import { CheckCircle2, MessageSquare, Scissors, Send, Star, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Skeleton } from '@/components/ui';
import { cn, getApiErrorMessage } from '@/lib/utils';
import { reviewService } from '@/services/reviewService';
import type { AppointmentResponse } from '@/types/booking';
import type { ReviewResponse } from '@/types/review';

interface BranchReviewsSectionProps {
  reviews: ReviewResponse[];
  loading: boolean;
  eligibleAppointments: AppointmentResponse[];
  onReviewCreated: () => Promise<void>;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Kötü',
  2: 'Geliştirilebilir',
  3: 'Orta',
  4: 'Çok İyi',
  5: 'Mükemmel',
};

export const BranchReviewsSection: React.FC<BranchReviewsSectionProps> = ({
  reviews,
  loading,
  eligibleAppointments,
  onReviewCreated,
}) => {
  const [selectedStar, setSelectedStar] = useState<number | 'all'>('all');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');

  // Inline review submission state (only for eligible completed appointments)
  const [showForm, setShowForm] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : null;
    const distribution = [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((r) => r.rating === star).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return { star, count, percent };
    });
    return { total, avg, distribution };
  }, [reviews]);

  const reviewedStaffOptions = useMemo(() => {
    const map = new Map<string, string>();
    reviews.forEach((r) => {
      if (r.staffProfileId && r.staffFullName) {
        map.set(r.staffProfileId, r.staffFullName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reviews]);

  const filteredReviews = useMemo(
    () =>
      reviews.filter((r) => {
        const starOk = selectedStar === 'all' || r.rating === selectedStar;
        const staffOk =
          selectedStaffFilter === 'all' || r.staffProfileId === selectedStaffFilter;
        return starOk && staffOk;
      }),
    [reviews, selectedStar, selectedStaffFilter],
  );

  const activeAppointmentId = selectedApptId || eligibleAppointments[0]?.id || '';

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointmentId) {
      toast.error('Değerlendirilecek tamamlanmış randevu seçin.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await reviewService.createReview({
        appointmentId: activeAppointmentId,
        rating,
        comment: comment.trim() || null,
      });

      if (!res.success) {
        toast.error(res.message || 'Değerlendirme kaydedilemedi.');
        return;
      }

      toast.success('Değerlendirmeniz kaydedildi, teşekkürler!');
      setComment('');
      setRating(5);
      setShowForm(false);
      await onReviewCreated();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Değerlendirme gönderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_28px_75px_-25px_rgba(0,0,0,0.8)] sm:p-8">
      {/* Section Header */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97706] dark:text-amber-400">
            Doğrulanmış Deneyimler
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
            <MessageSquare className="h-5 w-5 text-[#D97706] dark:text-amber-400" />
            Müşteri Değerlendirmeleri
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tüm puanlar ve yorumlar yalnızca tamamlanmış randevulardan gerçek zamanlı olarak gelir.
          </p>
        </div>

        {eligibleAppointments.length > 0 && (
          <Button
            size="sm"
            onClick={() => setShowForm((prev) => !prev)}
            className="h-10 gap-2 rounded-[14px] bg-[#D97706] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
          >
            <Star className="h-3.5 w-3.5 fill-current" />
            {showForm ? 'Formu Kapat' : 'Değerlendirme Yaz'}
          </Button>
        )}
      </div>

      {/* Inline Review Form for Eligible Completed Appointments */}
      {showForm && eligibleAppointments.length > 0 && (
        <form
          onSubmit={handleSubmitReview}
          className="mt-6 space-y-4 rounded-[20px] border border-amber-500/30 bg-amber-50/60 p-5 dark:border-amber-400/25 dark:bg-amber-500/8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                Deneyimini Paylaş
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Bu şubede tamamladığın randevu için puan ve yorum bırakabilirsin.
              </p>
            </div>

            {eligibleAppointments.length > 1 && (
              <select
                value={activeAppointmentId}
                onChange={(e) => setSelectedApptId(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
              >
                {eligibleAppointments.map((appt) => (
                  <option key={appt.id} value={appt.id}>
                    {appt.serviceName} · {appt.staffFullName} (
                    {new Date(appt.startAt).toLocaleDateString('tr-TR')})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Interactive Star Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="cursor-pointer rounded-lg p-1 transition-transform hover:scale-110"
                  aria-label={`${star} yıldız`}
                >
                  <Star
                    className={cn(
                      'h-7 w-7 transition-colors',
                      star <= displayRating
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-slate-300 dark:text-slate-700',
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="rounded-full border border-amber-500/30 bg-white px-3 py-1 text-xs font-bold text-[#B45309] dark:bg-slate-900 dark:text-amber-300">
              {displayRating} / 5 · {RATING_LABELS[displayRating]}
            </span>
          </div>

          <textarea
            rows={3}
            maxLength={600}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Hizmet kalitesi, hijyen ve berber deneyimin nasıldı? (İsteğe bağlı)"
            className="w-full rounded-[14px] border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:outline-none dark:border-white/15 dark:bg-slate-950/70 dark:text-slate-100"
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={submitting}
              className="gap-1.5 rounded-[12px] bg-[#D97706] px-5 text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
            >
              <Send className="h-3.5 w-3.5" />
              Yorumu Yayınla
            </Button>
          </div>
        </form>
      )}

      {/* Rating Breakdown Dashboard */}
      {!loading && stats.total > 0 && (
        <div className="mt-6 grid gap-6 rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-slate-950/50 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
          <div className="flex flex-col items-center justify-center border-b border-slate-200/70 pb-5 text-center dark:border-white/10 md:border-b-0 md:border-r md:pb-0 md:pr-6">
            <span className="font-serif text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.avg?.toFixed(1)}
            </span>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((idx) => (
                <Star
                  key={idx}
                  className={cn(
                    'h-4 w-4',
                    stats.avg !== null && idx <= Math.round(stats.avg)
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-slate-300 dark:text-slate-700',
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {stats.total} doğrulanmış yorum
            </p>
          </div>

          <div className="space-y-2">
            {stats.distribution.map((row) => (
              <button
                key={row.star}
                type="button"
                onClick={() =>
                  setSelectedStar((prev) => (prev === row.star ? 'all' : row.star))
                }
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1 text-xs transition-colors',
                  selectedStar === row.star
                    ? 'bg-amber-500/12 font-bold'
                    : 'hover:bg-slate-200/50 dark:hover:bg-white/5',
                )}
              >
                <span className="inline-flex w-11 shrink-0 items-center justify-end gap-1 font-semibold text-slate-700 dark:text-slate-200">
                  {row.star}
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#D97706] to-amber-400 transition-all duration-500"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-semibold text-slate-500 dark:text-slate-400">
                  {row.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {!loading && stats.total > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 5, 4, 3, 2, 1] as const).map((option) => {
              const active = selectedStar === option;
              return (
                <button
                  key={String(option)}
                  type="button"
                  onClick={() => setSelectedStar(option)}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                    active
                      ? 'border-[#D97706] bg-[#D97706] text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-amber-500/40 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300',
                  )}
                >
                  {option === 'all' ? 'Tümü' : `${option} ★`}
                </button>
              );
            })}
          </div>

          {reviewedStaffOptions.length > 1 && (
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200"
            >
              <option value="all">Tüm Berberler</option>
              {reviewedStaffOptions.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Review List */}
      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32 w-full rounded-[18px]" />
            <Skeleton className="h-32 w-full rounded-[18px]" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-200 py-12 text-center dark:border-white/10">
            <Star className="mx-auto h-9 w-9 text-amber-500/45" />
            <h3 className="mt-3 font-serif text-lg font-semibold text-slate-900 dark:text-white">
              Henüz değerlendirme yapılmamış
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Bu şubeden randevu alıp hizmetini tamamladıktan sonra ilk yorumu sen bırakabilirsin.
            </p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            Seçili filtrelere uygun yorum bulunamadı.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredReviews.map((rev) => {
              const initials = rev.customerFullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const formattedDate = new Intl.DateTimeFormat('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(rev.createdDate));

              return (
                <article
                  key={rev.id}
                  className="flex flex-col justify-between rounded-[18px] border border-slate-200/80 bg-slate-50/55 p-5 transition-colors hover:border-amber-500/35 dark:border-white/10 dark:bg-slate-950/50"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 font-serif text-xs font-bold text-[#B45309] dark:text-amber-300">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {rev.customerFullName}
                            </p>
                            <CheckCircle2
                              className="h-3.5 w-3.5 text-emerald-500"
                              aria-label="Doğrulanmış randevu"
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formattedDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1">
                        {[1, 2, 3, 4, 5].map((idx) => (
                          <Star
                            key={idx}
                            className={cn(
                              'h-3 w-3',
                              idx <= rev.rating
                                ? 'fill-amber-500 text-amber-500'
                                : 'text-slate-300 dark:text-slate-700',
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {rev.comment ? (
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs italic text-slate-400 dark:text-slate-500">
                        Yorum metni eklenmeden {rev.rating} yıldız ile puanlandı.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-3 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 dark:bg-slate-900">
                      <Scissors className="h-3 w-3 text-[#D97706] dark:text-amber-400" />
                      {rev.serviceName}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 dark:bg-slate-900">
                      <UserCheck className="h-3 w-3 text-[#D97706] dark:text-amber-400" />
                      {rev.staffFullName}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
