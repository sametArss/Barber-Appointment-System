import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquarePlus,
  Plus,
  Scissors,
  ShieldAlert,
  Star,
  X,
  XCircle,
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui';
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { reviewService } from '@/services/reviewService';
import { AppointmentStatus, type AppointmentResponse } from '@/types/booking';

type AppointmentTab = 'all' | 'active' | 'pending' | 'past';

const statusPillMap: Record<number, { label: string; className: string }> = {
  [AppointmentStatus.Pending]: {
    label: 'Onay Bekliyor',
    className:
      'border-amber-500/35 bg-amber-500/12 text-[#B45309] dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-300',
  },
  [AppointmentStatus.Confirmed]: {
    label: 'Onaylandı',
    className:
      'border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  [AppointmentStatus.Completed]: {
    label: 'Tamamlandı',
    className:
      'border-slate-300/80 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-200',
  },
  [AppointmentStatus.Cancelled]: {
    label: 'İptal Edildi',
    className:
      'border-red-500/35 bg-red-500/10 text-red-600 dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-300',
  },
  [AppointmentStatus.NoShow]: {
    label: 'Gelmedi (No-Show)',
    className:
      'border-orange-500/35 bg-orange-500/12 text-orange-700 dark:border-orange-400/35 dark:bg-orange-500/15 dark:text-orange-300',
  },
};

const ratingLabels: Record<number, string> = {
  1: 'Kötü',
  2: 'Geliştirilebilir',
  3: 'Orta',
  4: 'Çok İyi',
  5: 'Mükemmel',
};

export const MyAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [reviewedAppointmentIds, setReviewedAppointmentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppointmentTab>('all');

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<AppointmentResponse | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Review modal state
  const [reviewTarget, setReviewTarget] = useState<AppointmentResponse | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadAppointmentsAndReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingService.getMyAppointments();
      if (res.success && res.data) {
        const list = res.data;
        setAppointments(list);

        const completedBranchIds = Array.from(
          new Set(
            list
              .filter((a) => a.status === AppointmentStatus.Completed)
              .map((a) => a.branchId),
          ),
        );

        if (completedBranchIds.length > 0) {
          const reviewResponses = await Promise.allSettled(
            completedBranchIds.map((bId) => reviewService.getBranchReviews(bId)),
          );
          const reviewed = new Set<string>();
          reviewResponses.forEach((result) => {
            if (result.status === 'fulfilled' && result.value.success && result.value.data) {
              result.value.data.forEach((rev) => reviewed.add(rev.appointmentId));
            }
          });
          setReviewedAppointmentIds(reviewed);
        }
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Randevularınız yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointmentsAndReviews();
  }, [loadAppointmentsAndReviews]);

  const counts = useMemo(() => {
    const active = appointments.filter((a) => a.status === AppointmentStatus.Confirmed).length;
    const pending = appointments.filter((a) => a.status === AppointmentStatus.Pending).length;
    const past = appointments.filter(
      (a) =>
        a.status === AppointmentStatus.Completed ||
        a.status === AppointmentStatus.Cancelled ||
        a.status === AppointmentStatus.NoShow,
    ).length;
    return { active, pending, past, all: appointments.length };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return appointments.filter((a) => a.status === AppointmentStatus.Confirmed);
      case 'pending':
        return appointments.filter((a) => a.status === AppointmentStatus.Pending);
      case 'past':
        return appointments.filter(
          (a) =>
            a.status === AppointmentStatus.Completed ||
            a.status === AppointmentStatus.Cancelled ||
            a.status === AppointmentStatus.NoShow,
        );
      default:
        return appointments;
    }
  }, [activeTab, appointments]);

  const hoursUntilCancelTarget = useMemo(() => {
    if (!cancelTarget) return 999;
    const diffMs = new Date(cancelTarget.startAt).getTime() - Date.now();
    return diffMs / (1000 * 60 * 60);
  }, [cancelTarget]);

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;

    setCancelling(true);
    try {
      const res = await bookingService.cancelAppointment({
        appointmentId: cancelTarget.id,
        reason: cancelReason.trim() || 'Müşteri tarafından iptal edildi.',
      });
      if (res.success) {
        toast.success('Randevunuz iptal edildi.');
        setCancelTarget(null);
        setCancelReason('');
        await loadAppointmentsAndReviews();
      } else {
        toast.error(res.message || 'İptal işlemi başarısız.');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Randevu iptal edilemedi.'));
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenReview = (appt: AppointmentResponse) => {
    setReviewTarget(appt);
    setRating(5);
    setHoverRating(0);
    setComment('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;

    setSubmittingReview(true);
    try {
      const res = await reviewService.createReview({
        appointmentId: reviewTarget.id,
        rating,
        comment: comment.trim() || null,
      });

      if (res.success) {
        setReviewedAppointmentIds((prev) => new Set(prev).add(reviewTarget.id));
        toast.success('Değerlendirmeniz başarıyla kaydedildi!');
        setReviewTarget(null);
      } else {
        toast.error(res.message || 'Değerlendirme gönderilemedi.');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const msg = getApiErrorMessage(error, 'Bu randevu daha önce değerlendirilmiş.');
        setReviewedAppointmentIds((prev) => new Set(prev).add(reviewTarget.id));
        toast.info(msg);
        setReviewTarget(null);
      } else {
        toast.error(getApiErrorMessage(error, 'Değerlendirme gönderilemedi.'));
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const tabs: Array<{ id: AppointmentTab; label: string; count: number }> = [
    { id: 'all', label: 'Tümü', count: counts.all },
    { id: 'active', label: 'Aktif', count: counts.active },
    { id: 'pending', label: 'Bekleyen', count: counts.pending },
    { id: 'past', label: 'Geçmiş', count: counts.past },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-7 py-2 sm:py-4">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
            Randevularım
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Aktif, bekleyen ve geçmiş tüm randevu geçmişinizi buradan yönetin.
          </p>
        </div>

        <Button
          onClick={() => navigate('/explore')}
          className="h-11 w-fit gap-2 rounded-[16px] bg-[#D97706] px-5 text-sm font-semibold text-white shadow-md shadow-amber-600/25 transition-all hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_22px_rgba(245,158,11,0.35)] dark:hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Yeni Randevu Al
        </Button>
      </div>

      {/* Modern Segmented Tabs */}
      <div className="flex flex-wrap gap-2.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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
                  'rounded-full px-2 py-0.5 text-[11px] font-bold',
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

      {/* Appointments List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-[18px]" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="flex flex-col items-center rounded-[20px] border border-slate-200/80 bg-white/80 p-12 text-center shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/60">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/12 text-[#D97706] dark:bg-amber-500/15 dark:text-amber-400">
            <CalendarCheck className="h-7 w-7" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Bu kategoride randevu bulunamadı
          </h3>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Size en yakın berber şubesini keşfedip saniyeler içinde yeni bir randevu
            oluşturabilirsiniz.
          </p>
          <Button
            className="mt-5 rounded-[14px] bg-[#D97706] text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
            onClick={() => navigate('/explore')}
          >
            Salonları Keşfet
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appt, index) => {
            const pill = statusPillMap[appt.status] ?? {
              label: appt.statusName,
              className:
                'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200',
            };
            const canCancel =
              appt.status === AppointmentStatus.Pending ||
              appt.status === AppointmentStatus.Confirmed;
            const isCompleted = appt.status === AppointmentStatus.Completed;
            const alreadyReviewed = reviewedAppointmentIds.has(appt.id);

            return (
              <motion.article
                key={appt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
                className="group rounded-[18px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_14px_38px_-22px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-[0_20px_48px_-22px_rgba(217,119,6,0.22)] dark:border-amber-500/15 dark:bg-slate-900/65 dark:shadow-[0_16px_45px_-22px_rgba(0,0,0,0.75)] dark:hover:border-amber-400/55 dark:hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.28)] sm:p-6"
              >
                {/* Top Row: Status Pill + Branch Name */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold',
                      pill.className,
                    )}
                  >
                    {pill.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-[#D97706] dark:text-amber-400" />
                    {appt.branchName}
                  </span>
                </div>

                {/* Middle Row: Bold Service + Staff (Inter) | Far-right Bold Price (Playfair) */}
                <div className="mt-3.5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <h3 className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-[#D97706] dark:bg-amber-500/15 dark:text-amber-400">
                      <Scissors className="h-4 w-4" />
                    </span>
                    <span>
                      {appt.serviceName}{' '}
                      <span className="font-normal text-slate-400 dark:text-slate-500">•</span>{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {appt.staffFullName}
                      </span>
                    </span>
                  </h3>

                  <span className="font-serif text-2xl font-bold tracking-tight text-[#D97706] dark:text-amber-400">
                    {formatCurrency(appt.priceSnapshot)}
                  </span>
                </div>

                {appt.cancellationReason && (
                  <p className="mt-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-1.5 text-xs text-red-600 dark:text-red-300">
                    İptal Notu: {appt.cancellationReason}
                  </p>
                )}

                {/* Bottom Row: Date/Time with Clock | Outlined Cancel or Review Button */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 dark:border-white/10">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    {new Date(appt.startAt).toLocaleString('tr-TR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    ({appt.durationSnapshot} dk)
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 rounded-xl border-red-200 bg-white/80 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                        onClick={() => {
                          setCancelTarget(appt);
                          setCancelReason('');
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                        İptal Et
                      </Button>
                    )}

                    {isCompleted && (
                      <Button
                        size="sm"
                        variant={alreadyReviewed ? 'outline' : 'primary'}
                        disabled={alreadyReviewed}
                        onClick={() => handleOpenReview(appt)}
                        className={cn(
                          'h-9 gap-1.5 rounded-xl text-xs font-semibold',
                          !alreadyReviewed &&
                            'bg-[#D97706] text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950',
                        )}
                      >
                        {alreadyReviewed ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Değerlendirildi
                          </>
                        ) : (
                          <>
                            <MessageSquarePlus className="h-3.5 w-3.5" />
                            Değerlendir
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation + Penalty Rules Modal */}
      {cancelTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md rounded-[24px] border-red-500/30 bg-white/95 backdrop-blur-2xl dark:bg-slate-900/95">
            <form onSubmit={handleConfirmCancel}>
              <CardHeader className="relative">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
                <CardTitle className="flex items-center gap-2 font-serif text-xl text-red-600 dark:text-red-400">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Randevu İptali
                </CardTitle>
                <CardDescription>
                  {cancelTarget.branchName} • {cancelTarget.serviceName}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {hoursUntilCancelTarget < 24 ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        Geç İptal &amp; Ceza Kuralı Uyarısı
                      </p>
                      <p>
                        Randevunuza 24 saatten az kaldı. İşletme kuralları gereği geç iptallerde
                        hesabınıza ceza puanı işlenebilir (3 aktif ceza = 14 gün randevu
                        kısıtlaması).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                    Randevunuza 24 saatten fazla süre kaldığı için cezasız iptal edebilirsiniz.
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="cancel-reason"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    İptal Nedeni
                  </label>
                  <textarea
                    id="cancel-reason"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Örn. Programım değişti..."
                    className="w-full rounded-[16px] border border-slate-200 bg-slate-50/75 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </CardContent>

              <CardFooter className="gap-2.5 border-t border-slate-100 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-[14px]"
                  onClick={() => setCancelTarget(null)}
                >
                  Vazgeç
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1 rounded-[14px] bg-red-600 text-white hover:bg-red-700"
                  isLoading={cancelling}
                >
                  İptali Onayla
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* 5-Star Verified Review Modal */}
      {reviewTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md rounded-[24px] border-amber-500/25 bg-white/95 backdrop-blur-2xl dark:bg-slate-900/95">
            <form onSubmit={handleSubmitReview}>
              <CardHeader className="relative">
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <Star className="h-5 w-5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                  Hizmeti Değerlendir
                </CardTitle>
                <CardDescription>
                  {reviewTarget.branchName} • {reviewTarget.staffFullName} (
                  {reviewTarget.serviceName})
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const active = (hoverRating || rating) >= starValue;
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(starValue)}
                          className="cursor-pointer p-1 transition-transform hover:scale-110"
                          aria-label={`${starValue} Yıldız`}
                        >
                          <Star
                            className={cn(
                              'h-8 w-8 transition-colors',
                              active
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-700',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="mt-2 text-xs font-semibold text-[#D97706] dark:text-amber-400">
                    {hoverRating || rating} / 5 • {ratingLabels[hoverRating || rating]}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="review-comment"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Yorumunuz (İsteğe Bağlı)
                  </label>
                  <textarea
                    id="review-comment"
                    rows={3}
                    maxLength={500}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ustanın ilgisi, kesim kalitesi ve salon temizliği nasıldı?"
                    className="w-full rounded-[16px] border border-slate-200 bg-slate-50/75 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </CardContent>

              <CardFooter className="gap-2.5 border-t border-slate-100 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-[14px]"
                  onClick={() => setReviewTarget(null)}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-[14px] bg-[#D97706] text-white hover:bg-[#B45309] dark:bg-amber-500 dark:text-slate-950"
                  isLoading={submittingReview}
                >
                  Yorumu Gönder
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
