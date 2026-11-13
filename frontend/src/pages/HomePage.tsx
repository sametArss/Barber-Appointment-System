import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Scissors,
  ShieldCheck,
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
      <section className="relative overflow-hidden rounded-[2rem] border border-[#e8e1d6] bg-[#eee9e1] p-7 shadow-sm dark:border-zinc-800 dark:bg-[#211f1b] sm:p-12 lg:p-16">
        <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full bg-[#c99561]/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="amber" className="gap-1.5 px-3 py-1 shadow-sm">
              <Scissors className="h-3.5 w-3.5 text-amber-700" />
              İyi bir tıraş, doğru ustayla başlar
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.045em] text-[#27251f] dark:text-zinc-50 leading-[1.08]"
          >
            Bir sonraki{' '}
            <span className="text-[#a56b36] dark:text-[#d5a16c]">iyi tıraşın</span> için yerini ayırt.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 leading-relaxed font-normal max-w-xl"
          >
            Yakınındaki berberleri incele, hizmet ve fiyatları karşılaştır. Sana uyan saati seç; randevun hazır.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3 pt-2"
          >
            <Button
              size="lg"
              className="gap-2 shadow-sm"
              onClick={() => navigate('/explore')}
            >
              <Compass className="h-5 w-5" />
              Salonları keşfet
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

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-6 text-xs font-medium text-slate-600 dark:text-zinc-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#78917a]" />
              <span>Gerçek salon bilgileri</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#a56b36]" />
              <span>Müsait saatleri kolayca gör</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#a56b36]" />
              <span>Konuma veya şehre göre ara</span>
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

      {/* Discovery callout */}
      <section className="rounded-[2rem] border border-[#302c25] bg-[#292720] p-7 text-white shadow-sm sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d5a16c] text-[#292720]">
              <MapPin className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">
                  Sana uygun salonu bul
                </h3>
              </div>
              <p className="mt-1 max-w-xl text-sm text-white/65">
                Hizmetleri, fiyatları ve uygun saatleri karşılaştır; randevunu seçtiğin berberde oluştur.
              </p>
            </div>
          </div>

          <Button
            size="md"
            className="gap-2 shrink-0"
            onClick={() => navigate('/explore')}
          >
            Keşfe başla
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
};
