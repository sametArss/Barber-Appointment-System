import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  MapPin,
  MessageSquare,
  Phone,
  Scissors,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui';
import { formatCurrency, formatDistance, getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { reviewService } from '@/services/reviewService';
import type {
  BranchSearchResponse,
  BranchServiceResponse,
  StaffResponse,
} from '@/types/booking';
import type { ReviewResponse } from '@/types/review';

interface BranchDetailLocationState {
  branch?: BranchSearchResponse;
}

export const BranchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as BranchDetailLocationState | null;
  const branch = routeState?.branch;

  const [services, setServices] = useState<BranchServiceResponse[]>([]);
  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      bookingService.getBranchServices(id),
      bookingService.getBranchStaff(id),
      reviewService.getBranchReviews(id),
    ])
      .then(([srvRes, staffRes, revRes]) => {
        if (cancelled) return;
        setServices((srvRes.data ?? []).filter((s) => s.isActive));
        setStaff((staffRes.data ?? []).filter((s) => s.isBookable));
        setReviews(revRes.data ?? []);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, 'Şube detayları alınamadı.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return null;

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: branch?.branchName || 'BarberBooking Salonu',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Salon bağlantısı kopyalandı!');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Salon Listesine Dön
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-amber-500/50 hover:text-amber-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-amber-400 cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5" />
          Paylaş
        </button>
      </div>

      {/* Hero Showcase Card */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/30 p-6 sm:p-10 shadow-sm dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-950 dark:shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="amber" className="shadow-sm">
                <Scissors className="h-3 w-3" />
                {branch?.businessName ?? 'BarberBooking İşletmesi'}
              </Badge>

              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Star className="h-3 w-3 fill-current text-amber-500" />
                {avgRating} ({reviews.length > 0 ? `${reviews.length} Değerlendirme` : 'Yeni'})
              </span>

              {branch && (
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 text-amber-500" />
                  {formatDistance(branch.distanceMeters)} uzaklıkta
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">
              {branch?.branchName ?? 'Moda Merkez Şubesi'}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                {branch?.address || 'Moda Cad. No:14'}, {branch?.district || 'Kadıköy'}/{branch?.city || 'İstanbul'}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-amber-500 shrink-0" />
                {branch?.phoneNumber || '0216 333 44 55'}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Doğrulanmış Salon
              </span>
            </div>
          </div>

          <Button
            size="lg"
            className="gap-2.5 shadow-lg shadow-amber-500/25 shrink-0 self-start sm:self-auto"
            onClick={() => navigate(`/book/${id}`, { state: { branch } })}
          >
            <CalendarPlus className="h-5 w-5" />
            Hemen Randevu Al
          </Button>
        </div>
      </section>

      {/* Main Content Grid: Services & Staff */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Services Menu */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Hizmet Menüsü &amp; Fiyatlar</CardTitle>
                  <CardDescription>
                    İstediğiniz bakımı seçerek anında randevu oluşturun.
                  </CardDescription>
                </div>
                <Badge variant="outline">{services.length} Hizmet</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))
              ) : services.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                  Bu şube için henüz listelenmiş hizmet bulunmuyor.
                </div>
              ) : (
                services.map((srv) => (
                  <motion.div
                    key={srv.id}
                    whileHover={{ scale: 1.01 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm transition-all hover:border-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950/60"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm sm:text-base">
                        {srv.serviceName}
                      </h4>
                      {srv.description && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          {srv.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          {srv.finalDurationMinutes} dk
                        </span>
                        <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                          {formatCurrency(srv.finalPrice)}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="self-end sm:self-center"
                      onClick={() =>
                        navigate(`/book/${id}`, {
                          state: { branch, preselectedServiceId: srv.serviceId },
                        })
                      }
                    >
                      Seç &amp; Randevu Al
                    </Button>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Staff Team */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-500" />
                Uzman Kadro
              </CardTitle>
              <CardDescription>
                Hizmetinizi emanet edebileceğiniz deneyimli berberler.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-18 w-full rounded-2xl" />
                ))
              ) : staff.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                  Aktif personel kaydı bulunamadı.
                </div>
              ) : (
                staff.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-sm font-bold text-amber-600 dark:text-amber-400 shadow-sm">
                      {person.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate font-bold text-slate-900 dark:text-zinc-100 text-sm">
                        {person.fullName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
                        {person.biography || 'Saç & Sakal Tasarım Uzmanı'}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        <Sparkles className="h-3 w-3" />
                        Randevuya Müsait
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-amber-500" />
                  Müşteri Değerlendirmeleri
                </CardTitle>
                <CardDescription>
                  Yalnızca randevusunu tamamlayan müşterilerimizin doğrulanmış yorumları.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-50/50 p-2.5 px-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-center gap-1 text-lg font-black text-amber-600 dark:text-amber-400">
                  <Star className="h-5 w-5 fill-current text-amber-500" />
                  {avgRating}
                </div>
                <div className="text-xs font-semibold text-slate-600 dark:text-zinc-400 border-l border-amber-500/30 pl-3">
                  {reviews.length} Gerçek Deneyim
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Star className="h-8 w-8 text-amber-500/40 mx-auto" />
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                  Henüz bir değerlendirme yapılmamış.
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Bu şubeden ilk randevuyu alıp deneyimini paylaşan sen ol!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {rev.customerFullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                              {rev.customerFullName}
                            </p>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-500">
                              {rev.serviceName} • {rev.staffFullName}
                            </span>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`h-3.5 w-3.5 ${
                                idx < rev.rating
                                  ? 'fill-current text-amber-500'
                                  : 'text-slate-300 dark:text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed italic">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500">
                      <span>Doğrulanmış Randevu</span>
                      <span>
                        {new Date(rev.createdDate).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Floating Bottom Bar for Mobile Quick Action */}
      <div className="fixed inset-x-0 bottom-16 sm:hidden z-30 p-3 bg-white/95 dark:bg-zinc-950/95 border-t border-slate-200 dark:border-zinc-800 backdrop-blur-md shadow-2xl">
        <Button
          size="lg"
          className="w-full gap-2 font-bold shadow-lg shadow-amber-500/25"
          onClick={() => navigate(`/book/${id}`, { state: { branch } })}
        >
          <CalendarPlus className="h-5 w-5" />
          Randevu Planla
        </Button>
      </div>
    </div>
  );
};
