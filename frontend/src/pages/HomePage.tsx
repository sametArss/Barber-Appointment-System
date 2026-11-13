import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuthStore();
  const isStaffOrOwner = hasRole(['BusinessOwner', 'BusinessManager', 'Employee']);

  return (
    <div className="space-y-16 py-4 sm:py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50 to-amber-50/20 p-8 sm:p-14 lg:p-20 shadow-sm dark:border-zinc-800/90 dark:bg-gradient-to-b dark:from-zinc-900/90 dark:via-zinc-950 dark:to-zinc-950 dark:shadow-2xl">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none dark:bg-amber-500/10" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="amber" className="gap-1.5 px-3 py-1 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Şehrin En İyi Berber &amp; Salon Deneyimi
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 leading-[1.12]"
          >
            Stiline En Uygun Salonu Keşfet,{' '}
            <span className="text-amber-500 dark:text-amber-400">Saniyeler İçinde</span> Yerini Ayırt.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-600 dark:text-zinc-400 leading-relaxed font-normal max-w-2xl"
          >
            Sıra beklemeden, çevrendeki seçkin berber ve kuaförleri haritada incele.
            Ustanı ve sana en uygun saati seçerek randevunu güvenle planla.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center gap-3.5 pt-2"
          >
            <Button
              size="lg"
              className="gap-2 shadow-lg shadow-amber-500/25"
              onClick={() => navigate('/explore')}
            >
              <Compass className="h-5 w-5" />
              Yakınımdaki Salonları Keşfet
              <ArrowRight className="h-4 w-4" />
            </Button>

            {isAuthenticated ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  navigate(isStaffOrOwner ? '/admin/dashboard' : '/my-appointments')
                }
              >
                {isStaffOrOwner ? 'Salon Yönetim Paneli' : 'Randevularım'}
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => navigate('/login')}>
                Giriş Yap / Kayıt Ol
              </Button>
            )}
          </motion.div>

          {/* Social Proof Stats */}
          <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-200/80 dark:border-zinc-800/80 text-xs font-semibold text-slate-600 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>%100 Gerçek Müşteri Yorumları</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Anında Onaylanan Randevular</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span>4.9 / 5.0 Salon Memnuniyeti</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="amber">Neden BarberBooking?</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Berber Deneyiminizi Kolaylaştıran Çözümler
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Hem müşteriler hem de salon sahipleri için tasarlanmış kusursuz randevu altyapısı.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="h-full">
              <CardContent className="p-7 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
                  Konuma Göre Canlı Keşif
                </h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Harita üzerinde bulunduğun konuma en yakın berberleri mesafe ve müşteri puanlarına göre görüntüle.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="h-full">
              <CardContent className="p-7 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
                  Şeffaf ve Esnek Saatler
                </h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Öğle molaları ve dolu saatler anında filtrelenir; personelin yalnızca gerçek müsait vakitlerini görürsün.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="h-full">
              <CardContent className="p-7 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
                  Garantili &amp; Sırasız Randevu
                </h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Akıllı çakışma önleyici motor sayesinde seçtiğin randevu anında senin adına rezerve edilir ve kilitlenir.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Featured Salon Showcase */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-10 dark:border-zinc-800/90 dark:bg-zinc-900/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
              <Scissors className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
                  Moda Merkez Şubesi
                </h3>
                <Badge variant="amber" className="text-[10px]">Öne Çıkan</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Kadıköy / Moda • Modern Saç Kesimi, Sakal Şekillendirme ve Sıcak Havlu Bakımı
              </p>
            </div>
          </div>

          <Button
            size="md"
            className="gap-2 shrink-0"
            onClick={() => navigate('/branch/20000000-0000-0000-0000-000000000001')}
          >
            Hizmetleri Gör &amp; Randevu Al
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
};
