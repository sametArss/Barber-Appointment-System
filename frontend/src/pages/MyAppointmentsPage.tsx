import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Compass,
  MessageSquarePlus,
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
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
  type BadgeVariant,
} from '@/components/ui';
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { reviewService } from '@/services/reviewService';
import { AppointmentStatus, type AppointmentResponse } from '@/types/booking';

type AppointmentTab = 'active' | 'pending' | 'past' | 'all';

const statusBadgeMap: Record<number, { label: string; variant: BadgeVariant }> = {
  [AppointmentStatus.Pending]: { label: 'Onay Bekliyor', variant: 'amber' },
  [AppointmentStatus.Confirmed]: { label: 'Onaylandı', variant: 'success' },
  [AppointmentStatus.Completed]: { label: 'Tamamlandı', variant: 'default' },
  [AppointmentStatus.Cancelled]: { label: 'İptal Edildi', variant: 'danger' },
  [AppointmentStatus.NoShow]: { label: 'Gelmedi (No-Show)', variant: 'warning' },
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

        // Tamamlanan randevuların şubelerinden daha önce yorumlanıp yorumlanmadığını kontrol et
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
    { id: 'active', label: 'Aktif (Onaylı)', count: counts.active },
    { id: 'pending', label: 'Bekleyen', count: counts.pending },
    { id: 'past', label: 'Geçmiş', count: counts.past },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-3xl">
            Randevularım
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Aktif, bekleyen ve geçmiş tüm randevu geçmişinizi buradan yönetin.
          </p>
        </div>
        <Button onClick={() => navigate('/explore')} className="gap-2 shadow-sm">
          <Compass className="h-4 w-4" />
          Yeni Randevu Al
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-zinc-800 pb-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer shadow-sm',
                isActive
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-zinc-700',
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isActive
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center p-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-slate-800 dark:text-amber-400">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">
              Bu kategoride randevu bulunamadı
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
              Size en yakın berber şubesini keşfedip yeni bir randevu oluşturabilirsiniz.
            </p>
            <Button className="mt-5" onClick={() => navigate('/explore')}>
              Şubeleri Keşfet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const badge = statusBadgeMap[appt.status] ?? {
              label: appt.statusName,
              variant: 'default' as BadgeVariant,
            };
            const canCancel =
              appt.status === AppointmentStatus.Pending ||
              appt.status === AppointmentStatus.Confirmed;
            const isCompleted = appt.status === AppointmentStatus.Completed;
            const alreadyReviewed = reviewedAppointmentIds.has(appt.id);

            return (
              <Card key={appt.id}>
                <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">
                        {appt.branchName}
                      </span>
                    </div>

                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-zinc-100">
                      <Scissors className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      {appt.serviceName} • {appt.staffFullName}
                    </h3>

                    <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400">
                      <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      {new Date(appt.startAt).toLocaleString('tr-TR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      ({appt.durationSnapshot} dk)
                    </p>

                    {appt.cancellationReason && (
                      <p className="text-xs text-rose-500 dark:text-rose-400">
                        İptal Notu: {appt.cancellationReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="mr-1 text-base font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(appt.priceSnapshot)}
                    </span>

                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCancelTarget(appt);
                          setCancelReason('');
                        }}
                      >
                        <XCircle className="h-4 w-4 text-rose-400" />
                        İptal Et
                      </Button>
                    )}

                    {isCompleted && (
                      <Button
                        size="sm"
                        variant={alreadyReviewed ? 'secondary' : 'primary'}
                        disabled={alreadyReviewed}
                        onClick={() => handleOpenReview(appt)}
                      >
                        {alreadyReviewed ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            Değerlendirildi
                          </>
                        ) : (
                          <>
                            <MessageSquarePlus className="h-4 w-4" />
                            Değerlendir
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation + Penalty Rules Modal */}
      {cancelTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md border-rose-500/30">
            <form onSubmit={handleConfirmCancel}>
              <CardHeader className="relative">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
                <CardTitle className="flex items-center gap-2 text-rose-500 dark:text-rose-400">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  Randevu İptali
                </CardTitle>
                <CardDescription>
                  {cancelTarget.branchName} • {cancelTarget.serviceName}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {hoursUntilCancelTarget < 24 ? (
                  <div className="flex items-start gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 p-3.5 text-xs text-orange-900 dark:text-orange-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500 dark:text-orange-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-orange-700 dark:text-orange-300">
                        Geç İptal &amp; Ceza Kuralı Uyarısı
                      </p>
                      <p>
                        Randevunuza 24 saatten az kaldı. İşletme kuralları gereği geç
                        iptallerde hesabınıza ceza puanı işlenebilir (3 aktif ceza = 14
                        gün randevu kısıtlaması).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                    Randevunuza 24 saatten fazla süre kaldığı için cezasız iptal
                    edebilirsiniz.
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="cancel-reason"
                    className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-zinc-300"
                  >
                    İptal Nedeni
                  </label>
                  <textarea
                    id="cancel-reason"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Örn. Programım değişti..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>
              </CardContent>

              <CardFooter className="gap-2.5 border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCancelTarget(null)}
                >
                  Vazgeç
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <Card accent className="w-full max-w-md">
            <form onSubmit={handleSubmitReview}>
              <CardHeader className="relative">
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                  Hizmeti Değerlendir
                </CardTitle>
                <CardDescription>
                  {reviewTarget.branchName} • {reviewTarget.staffFullName} (
                  {reviewTarget.serviceName})
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* 5-Star Selector */}
                <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
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
                          className="p-1 transition-transform hover:scale-110 cursor-pointer"
                          aria-label={`${starValue} Yıldız`}
                        >
                          <Star
                            className={cn(
                              'h-8 w-8 transition-colors',
                              active
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-zinc-700',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {hoverRating || rating} / 5 • {ratingLabels[hoverRating || rating]}
                  </span>
                </div>

                {/* Comment */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="review-comment"
                    className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-zinc-300"
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
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>
              </CardContent>

              <CardFooter className="gap-2.5 border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReviewTarget(null)}
                >
                  İptal
                </Button>
                <Button type="submit" className="flex-1" isLoading={submittingReview}>
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
