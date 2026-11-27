import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarPlus,
  ChevronDown,
  Clock3,
  MapPin,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BranchMap } from '@/components/explore/BranchMap';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { cn, formatDistance, getApiErrorMessage } from '@/lib/utils';
import { searchService } from '@/services/searchService';
import type { BranchSearchResponse } from '@/types/booking';

const DEFAULT_COORDS = { lat: 40.991, lng: 29.022 };

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [radiusKm, setRadiusKm] = useState<number | ''>('');
  const [branches, setBranches] = useState<BranchSearchResponse[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const areaSearch = Boolean(city.trim() || district.trim());

  const search = useCallback(
    async (
      targetCoords = coords,
      filters: { queryText: string; city: string; district: string; radiusKm: number | '' } = {
        queryText: query,
        city,
        district,
        radiusKm,
      },
    ) => {
      setLoading(true);
      try {
        const response = await searchService.getNearbyBranches({
          latitude: targetCoords.lat,
          longitude: targetCoords.lng,
          radiusKm: filters.radiusKm === '' ? undefined : filters.radiusKm,
          queryText: filters.queryText,
          city: filters.city,
          district: filters.district,
          pageNumber: 1,
          pageSize: 12,
        });
        if (response.success && response.data) {
          setBranches(response.data);
          setSelected(response.data[0]?.branchId ?? null);
        } else {
          toast.error(response.message || 'Salonlar yüklenemedi.');
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Salonlar alınamadı.'));
      } finally {
        setLoading(false);
      }
    },
    [city, coords, district, query, radiusKm],
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      search(DEFAULT_COORDS, { queryText: '', city: '', district: '', radiusKm: '' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: position }) => {
        const next = { lat: position.latitude, lng: position.longitude };
        setCoords(next);
        search(next, { queryText: '', city: '', district: '', radiusKm: '' });
      },
      () => {
        search(DEFAULT_COORDS, { queryText: '', city: '', district: '', radiusKm: '' });
      },
      { timeout: 5000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    search(coords, { queryText: query, city, district, radiusKm });
  };

  return (
    <div className="space-y-10 pb-10 sm:space-y-12">
      {/* Editorial Asymmetric Hero Section */}
      <section className="relative isolate overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/70 px-6 py-10 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/50 dark:shadow-[0_28px_80px_-30px_rgba(0,0,0,0.8),0_0_40px_-15px_rgba(245,158,11,0.15)] sm:px-10 sm:py-12 lg:px-14">
        {/* Subtle Warm Ambient Gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_60%_at_82%_35%,rgba(245,158,11,0.14),transparent_65%)] dark:bg-[radial-gradient(ellipse_55%_60%_at_82%_35%,rgba(245,158,11,0.18),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 -z-10 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-500/10" />

        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left Column: Serif Editorial Headline + Accent Line + Inter Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-2xl"
          >
            <div className="mb-5 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Seçkin Berber & Salon Deneyimi</span>
            </div>

            <h1 className="font-serif text-[2.65rem] font-semibold leading-[1.06] tracking-[-0.03em] text-slate-900 dark:text-[#FAF8F5] sm:text-5xl lg:text-[4rem]">
              İyi bir tıraş,
              <br />
              <span className="italic text-amber-700 dark:text-amber-400">doğru yerde başlar.</span>
            </h1>

            {/* Subtle Glowing Amber Accent Line */}
            <div className="mt-5 h-[2.5px] w-20 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-transparent dark:shadow-[0_0_18px_rgba(245,158,11,0.8)]" />

            <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              Şehrindeki en iyi berber ve kuaför salonlarını keşfet, gerçek müsait saatleri gör ve
              saniyeler içinde yerini ayırt.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Onaylı Salonlar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Anlık Müsaitlik
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Haritada Keşfet
              </span>
            </div>
          </motion.div>

          {/* Right Column: Warm Abstract Glassmorphism Visual + Floating Scissor Icon */}
          <div className="pointer-events-none relative hidden h-[290px] items-center justify-center lg:flex">
            <div className="absolute h-64 w-64 rounded-full bg-gradient-to-tr from-amber-300/35 via-orange-200/30 to-amber-100/20 blur-3xl dark:from-amber-500/25 dark:via-orange-500/15 dark:to-transparent" />
            <div className="absolute h-[250px] w-[250px] rounded-full border border-amber-500/15 dark:border-amber-400/20" />
            <div className="absolute h-[196px] w-[196px] rounded-full border border-amber-500/20 dark:border-amber-400/25" />

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex h-44 w-44 rotate-[-10deg] items-center justify-center rounded-[38%_62%_63%_37%/42%_42%_58%_58%] border border-white/80 bg-gradient-to-br from-amber-200/80 via-amber-400/60 to-orange-500/70 shadow-[inset_12px_12px_32px_rgba(255,255,255,0.6),0_28px_60px_-15px_rgba(217,119,6,0.3)] backdrop-blur-2xl dark:border-amber-400/35 dark:from-amber-400/25 dark:via-amber-600/20 dark:to-slate-900/80 dark:shadow-[inset_8px_8px_28px_rgba(245,158,11,0.2),0_0_55px_-8px_rgba(245,158,11,0.4)]"
            >
              <div className="absolute inset-3.5 rounded-[inherit] border border-white/40 dark:border-amber-300/20" />
              <Scissors
                className="h-16 w-16 rotate-12 text-white drop-shadow-[0_6px_16px_rgba(180,83,9,0.45)] dark:text-amber-300 dark:drop-shadow-[0_0_20px_rgba(245,158,11,0.85)]"
                strokeWidth={1.3}
              />
            </motion.div>

            {/* Floating Glass Accent Pill */}
            <div className="absolute right-6 top-8 flex items-center gap-1.5 rounded-full border border-white/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-md dark:border-amber-400/30 dark:bg-slate-900/80 dark:text-amber-200 dark:shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              <span>4.9 Ortalama Puan</span>
            </div>
          </div>
        </div>

        {/* Floating Glassmorphic Filter Bar (16px radius) */}
        <form
          onSubmit={handleSubmit}
          className="relative z-10 mt-9 rounded-[16px] border border-slate-200/90 bg-white/90 p-3.5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-amber-500/30 dark:bg-[#0F172A]/85 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.75),0_0_28px_-10px_rgba(245,158,11,0.28)] sm:p-4"
        >
          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            {/* Search Input */}
            <div className="md:col-span-4">
              <label
                htmlFor="home-search-query"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Salon veya Hizmet
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-amber-400/70" />
                <input
                  id="home-search-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Örn: Saç Kesimi, Makas Stüdyo..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400"
                />
              </div>
            </div>

            {/* City Input */}
            <div className="md:col-span-2">
              <label
                htmlFor="home-city-input"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Şehir
              </label>
              <input
                id="home-city-input"
                type="text"
                placeholder="Örn: İstanbul"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400"
              />
            </div>

            {/* District Input */}
            <div className="md:col-span-2">
              <label
                htmlFor="home-district-input"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                İlçe
              </label>
              <input
                id="home-district-input"
                type="text"
                placeholder="Örn: Kadıköy"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400"
              />
            </div>

            {/* Distance Selector */}
            <div className="md:col-span-2">
              <label
                htmlFor="home-radius-select"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {areaSearch ? 'Bölge Araması' : 'Mesafe'}
              </label>
              <div className="relative">
                <select
                  id="home-radius-select"
                  value={radiusKm}
                  disabled={areaSearch}
                  onChange={(e) => {
                    const next = e.target.value === '' ? '' : Number(e.target.value);
                    setRadiusKm(next);
                    search(coords, { queryText: query, city, district, radiusKm: next });
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3.5 pr-9 text-sm text-slate-900 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-amber-400"
                >
                  <option value="">Seçilmedi</option>
                  <option value={2}>2 km içinde</option>
                  <option value={5}>5 km içinde</option>
                  <option value={10}>10 km içinde</option>
                  <option value={15}>15 km içinde</option>
                  <option value={25}>25 km içinde</option>
                  <option value={50}>50 km içinde</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Solid Amber Search Button */}
            <div className="md:col-span-2">
              <Button
                type="submit"
                isLoading={loading}
                className="h-11 w-full gap-2 rounded-xl bg-amber-500 font-semibold text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_24px_rgba(245,158,11,0.45)] dark:hover:bg-amber-400"
              >
                <Search className="h-4 w-4" />
                Salon Ara
              </Button>
            </div>
          </div>
        </form>
      </section>

      {/* Main Content Grid: 35% Scrollable Cards / 65% Contained Interactive Map */}
      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
              Seçkin Salonlar
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-3xl">
              Sana en yakın salonu seç
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-fit gap-2 rounded-full border-slate-200 bg-white/80 dark:border-amber-500/25 dark:bg-slate-900/60 dark:hover:border-amber-400/50"
            onClick={() => navigate('/explore')}
          >
            Tüm salonları keşfet
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[35fr_65fr] lg:items-start">
          {/* Left Column (35%): Vertical Scrollable Glassmorphic Barber Cards */}
          <div className="space-y-3.5 lg:h-[calc(100vh-200px)] lg:min-h-[540px] lg:overflow-y-auto lg:pr-2">
            {loading && branches.length === 0 ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <Card
                  key={idx}
                  className="rounded-2xl border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/60"
                >
                  <CardContent className="space-y-3 p-5">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </CardContent>
                </Card>
              ))
            ) : branches.length > 0 ? (
              branches.map((branch) => {
                const isSelected = selected === branch.branchId;
                return (
                  <Card
                    key={branch.branchId}
                    onClick={() => setSelected(branch.branchId)}
                    className={cn(
                      'group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/85 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5',
                      'border-slate-200/80 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.12)] hover:border-amber-400/70 hover:shadow-[0_18px_40px_-20px_rgba(217,119,6,0.25)]',
                      'dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)] dark:hover:border-amber-400/60 dark:hover:shadow-[0_0_28px_-8px_rgba(245,158,11,0.3)]',
                      isSelected &&
                        'border-amber-500 ring-1 ring-amber-500/30 dark:border-amber-400 dark:ring-amber-400/35',
                    )}
                  >
                    {/* Floating Rating Badge (DB) */}
                    <div className="absolute right-3.5 top-3.5 inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-50/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-sm backdrop-blur-md dark:border-amber-400/35 dark:bg-slate-950/80 dark:text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                      <span>
                        {branch.totalReviewCount && branch.totalReviewCount > 0 && branch.averageRating
                          ? `${branch.averageRating.toFixed(1)} (${branch.totalReviewCount})`
                          : 'Yeni'}
                      </span>
                    </div>

                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3.5 pr-14">
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-100/70 text-amber-700 dark:border-amber-400/25 dark:from-amber-500/15 dark:to-slate-800 dark:text-amber-300">
                          <Scissors className="h-6 w-6" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            {branch.businessName}
                          </p>
                          <h3 className="mt-0.5 truncate font-serif text-lg font-semibold text-slate-900 dark:text-white">
                            {branch.branchName}
                          </h3>
                          <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            <span className="truncate">
                              {areaSearch
                                ? `${branch.district}, ${branch.city}`
                                : `${formatDistance(branch.distanceMeters)} • ${branch.district}`}
                            </span>
                          </p>
                        </div>
                      </div>

                      {branch.offeredServices.length > 0 && (
                        <div className="mt-3.5 flex flex-wrap gap-1.5">
                          {branch.offeredServices.slice(0, 3).map((service) => (
                            <span
                              key={service}
                              className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/branch/${branch.branchId}`, { state: { branch } });
                          }}
                          className="text-xs font-semibold text-slate-600 transition-colors hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-300"
                        >
                          Salonu İncele →
                        </button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/book/${branch.branchId}`, { state: { branch } });
                          }}
                          className="gap-1.5 rounded-xl bg-slate-900 text-white transition-all group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-amber-500/25 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_18px_rgba(245,158,11,0.35)] dark:hover:bg-amber-400"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          Randevu Al
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="flex min-h-[260px] items-center justify-center rounded-2xl border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/60">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Scissors className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-semibold text-slate-900 dark:text-white">
                    Salon bulunamadı
                  </h3>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Farklı bir şehir, ilçe seçebilir veya mesafe yarıçapını genişletebilirsin.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column (65%): Contained Rounded Interactive Map */}
          <div className="min-w-0">
            <BranchMap
              userLocation={coords}
              radiusKm={radiusKm === '' ? null : radiusKm}
              areaSearch={areaSearch}
              branches={branches}
              selectedBranchId={selected}
              onSelectBranch={setSelected}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
