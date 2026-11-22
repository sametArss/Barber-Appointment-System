import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarPlus,
  ChevronDown,
  Compass,
  LocateFixed,
  MapPin,
  Phone,
  Scissors,
  Search,
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

const DEFAULT_COORDS = {
  lat: 40.991,
  lng: 29.022,
};

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();

  const [coords, setCoords] = useState<{ lat: number; lng: number }>(DEFAULT_COORDS);
  const [locationSource, setLocationSource] = useState<'gps' | 'unavailable'>('unavailable');
  const [locating, setLocating] = useState(false);

  const [queryText, setQueryText] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [radiusKm, setRadiusKm] = useState<number | ''>('');

  const areaSearch = Boolean(city.trim() || district.trim());

  const [branches, setBranches] = useState<BranchSearchResponse[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNearby = useCallback(
    async (
      targetLat: number,
      targetLng: number,
      filters?: { queryText?: string; city?: string; district?: string; radiusKm?: number | '' },
    ) => {
      setLoading(true);
      try {
        const activeRadius = filters && 'radiusKm' in filters ? filters.radiusKm : radiusKm;
        const res = await searchService.getNearbyBranches({
          latitude: targetLat,
          longitude: targetLng,
          radiusKm: activeRadius === '' ? undefined : activeRadius,
          queryText: filters?.queryText ?? queryText,
          city: filters?.city ?? city,
          district: filters?.district ?? district,
          pageNumber: 1,
          pageSize: 20,
        });

        if (res.success && res.data) {
          setBranches(res.data);
          if (res.data.length > 0) {
            setSelectedBranchId((prev) =>
              res.data?.some((b) => b.branchId === prev) ? prev : res.data![0].branchId,
            );
          } else {
            setSelectedBranchId(null);
          }
        } else {
          toast.error(res.message || 'Şubeler yüklenemedi.');
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Yakındaki kuaförler alınamadı.'));
      } finally {
        setLoading(false);
      }
    },
    [city, district, queryText, radiusKm],
  );

  const requestUserLocation = useCallback(
    (showFeedback = false) => {
      if (!('geolocation' in navigator)) {
        setLocationSource('unavailable');
        fetchNearby(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng);
        if (showFeedback) {
          toast.info('Konum desteği yok. Şehir veya ilçe seçerek arayabilirsin.');
        }
        return;
      }

      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(nextCoords);
          setLocationSource('gps');
          setLocating(false);
          if (showFeedback) {
            toast.success('Konumunuz başarıyla güncellendi.');
          }
          fetchNearby(nextCoords.lat, nextCoords.lng);
        },
        () => {
          setLocationSource('unavailable');
          setLocating(false);
          fetchNearby(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng);
          if (showFeedback) {
            toast.info('Konum izni alınamadı. Şehir veya ilçe seçerek arama yapabilirsin.');
          }
        },
        { enableHighAccuracy: true, timeout: 6000 },
      );
    },
    [fetchNearby],
  );

  useEffect(() => {
    requestUserLocation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNearby(coords.lat, coords.lng, { queryText, city, district, radiusKm });
  };

  return (
    <div className="space-y-8 pb-10 sm:space-y-10">
      {/* Editorial Asymmetric Hero + Floating Filter Bar */}
      <section className="relative isolate overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/70 px-6 py-8 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/50 dark:shadow-[0_28px_80px_-30px_rgba(0,0,0,0.8),0_0_40px_-15px_rgba(245,158,11,0.15)] sm:px-10 sm:py-10 lg:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_60%_at_82%_35%,rgba(245,158,11,0.14),transparent_65%)] dark:bg-[radial-gradient(ellipse_55%_60%_at_82%_35%,rgba(245,158,11,0.18),transparent_65%)]" />

        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Side */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
              <span className="inline-flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5" />
                Salonları Keşfet
              </span>
              <span className="h-1 w-1 rounded-full bg-amber-500" />
              <span className="normal-case tracking-normal font-medium text-slate-500 dark:text-slate-400">
                {locationSource === 'gps' ? 'Canlı konum aktif' : 'Şehir veya mesafeye göre ara'}
              </span>
            </div>

            <h1 className="font-serif text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-slate-900 dark:text-[#FAF8F5] sm:text-5xl lg:text-[3.5rem]">
              İyi bir tıraş,
              <br />
              <span className="italic text-amber-700 dark:text-amber-400">doğru yerde başlar.</span>
            </h1>

            <div className="mt-4 h-[2.5px] w-16 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-transparent dark:shadow-[0_0_16px_rgba(245,158,11,0.8)]" />

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <p className="max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Yakınındaki berber ve kuaförleri harita üzerinde incele, hizmetlerini karşılaştır ve
                anında randevunu al.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => requestUserLocation(true)}
                isLoading={locating}
                className="gap-2 rounded-full border-slate-200 bg-white/80 dark:border-amber-500/30 dark:bg-slate-900/70 dark:text-amber-200"
              >
                <LocateFixed className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Konumumu Güncelle
              </Button>
            </div>
          </motion.div>

          {/* Right Side: Abstract Glassmorphism Visual + Floating Scissor */}
          <div className="pointer-events-none relative hidden h-48 items-center justify-center lg:flex">
            <div className="absolute h-48 w-48 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-500/20" />
            <div className="absolute h-44 w-44 rounded-full border border-amber-500/15 dark:border-amber-400/20" />
            <div className="absolute h-36 w-36 rounded-full border border-amber-500/20 dark:border-amber-400/25" />

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex h-28 w-28 rotate-[-10deg] items-center justify-center rounded-[38%_62%_63%_37%/42%_42%_58%_58%] border border-white/80 bg-gradient-to-br from-amber-200/85 via-amber-400/65 to-orange-500/75 shadow-[inset_10px_10px_24px_rgba(255,255,255,0.55),0_22px_50px_-14px_rgba(217,119,6,0.3)] backdrop-blur-2xl dark:border-amber-400/35 dark:from-amber-400/25 dark:via-amber-600/20 dark:to-slate-900/80 dark:shadow-[0_0_45px_-8px_rgba(245,158,11,0.4)]"
            >
              <Scissors
                className="h-11 w-11 rotate-12 text-white drop-shadow dark:text-amber-300 dark:drop-shadow-[0_0_16px_rgba(245,158,11,0.8)]"
                strokeWidth={1.35}
              />
            </motion.div>
            <Sparkles className="absolute right-10 top-6 h-4 w-4 text-amber-500 dark:text-amber-300" />
          </div>
        </div>

        {/* Floating Glassmorphic Search Bar (16px radius) */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative z-10 mt-7 rounded-[16px] border border-slate-200/90 bg-white/90 p-3.5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-amber-500/30 dark:bg-[#0F172A]/85 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.75),0_0_28px_-10px_rgba(245,158,11,0.28)] sm:p-4"
        >
          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-4">
              <label
                htmlFor="explore-query"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Salon veya Hizmet Ara
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-amber-400/70" />
                <input
                  id="explore-query"
                  type="text"
                  placeholder="Örn: Moda Merkez, Saç Kesimi..."
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="explore-city"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Şehir
              </label>
              <input
                id="explore-city"
                type="text"
                placeholder="Örn: İstanbul"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="explore-district"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                İlçe
              </label>
              <input
                id="explore-district"
                type="text"
                placeholder="Örn: Kadıköy"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="radius-select"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {areaSearch ? 'Bölge Araması' : 'Mesafe'}
              </label>
              <div className="relative">
                <select
                  id="radius-select"
                  value={radiusKm}
                  onChange={(e) => {
                    const nextRadius = e.target.value === '' ? '' : Number(e.target.value);
                    setRadiusKm(nextRadius);
                    fetchNearby(coords.lat, coords.lng, {
                      queryText,
                      city,
                      district,
                      radiusKm: nextRadius,
                    });
                  }}
                  disabled={areaSearch}
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

      {/* Main Content Grid: 35% Left Scrollable Cards / 65% Right Contained Map */}
      <div className="grid gap-6 lg:grid-cols-[35fr_65fr] lg:items-start">
        {/* Left Column (35%): Vertical Scrollable Barber Cards */}
        <div className="space-y-3.5 lg:h-[calc(100vh-200px)] lg:min-h-[540px] lg:overflow-y-auto lg:pr-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Card
                key={idx}
                className="rounded-2xl border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-amber-500/15 dark:bg-slate-900/60"
              >
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : branches.length === 0 ? (
            <Card className="rounded-2xl border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
              <CardContent className="flex flex-col items-center p-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Scissors className="h-6 w-6" />
                </div>
                <p className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                  Seçili kriterlere uygun salon bulunamadı
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Şehir/ilçe filtresini temizleyebilir veya mesafeyi genişletebilirsin.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full"
                  onClick={() => {
                    setQueryText('');
                    setCity('');
                    setDistrict('');
                    setRadiusKm('');
                    fetchNearby(coords.lat, coords.lng, {
                      queryText: '',
                      city: '',
                      district: '',
                      radiusKm: '',
                    });
                  }}
                >
                  Filtreleri Temizle
                </Button>
              </CardContent>
            </Card>
          ) : (
            branches.map((branch) => {
              const isSelected = branch.branchId === selectedBranchId;
              return (
                <Card
                  key={branch.branchId}
                  onClick={() => setSelectedBranchId(branch.branchId)}
                  className={cn(
                    'group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/85 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5',
                    'border-slate-200/80 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.12)] hover:border-amber-400/70 hover:shadow-[0_18px_40px_-20px_rgba(217,119,6,0.25)]',
                    'dark:border-amber-500/20 dark:bg-slate-900/65 dark:shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)] dark:hover:border-amber-400/60 dark:hover:shadow-[0_0_28px_-8px_rgba(245,158,11,0.3)]',
                    isSelected &&
                      'border-amber-500 ring-1 ring-amber-500/30 dark:border-amber-400 dark:ring-amber-400/35',
                  )}
                >
                  {/* Floating Rating Badge */}
                  <div className="absolute right-3.5 top-3.5 inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-50/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-sm backdrop-blur-md dark:border-amber-400/35 dark:bg-slate-950/80 dark:text-amber-300">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    <span>4.9</span>
                  </div>

                  <CardContent className="space-y-3.5 p-4 sm:p-5">
                    <div className="flex items-start gap-3.5 pr-14">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-100/70 text-amber-700 dark:border-amber-400/25 dark:from-amber-500/15 dark:to-slate-800 dark:text-amber-300">
                        <Scissors className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          {branch.businessName}
                        </p>
                        <h3 className="mt-0.5 truncate font-serif text-lg font-semibold text-slate-900 dark:text-white">
                          {branch.branchName}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span className="truncate">
                            {areaSearch
                              ? `${branch.district}, ${branch.city}`
                              : `${formatDistance(branch.distanceMeters)} • ${branch.district}/${branch.city}`}
                          </span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="h-3 w-3 shrink-0 text-amber-500/80" />
                          <span>{branch.phoneNumber}</span>
                        </p>
                      </div>
                    </div>

                    {branch.offeredServices.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {branch.offeredServices.slice(0, 4).map((serviceName) => (
                          <span
                            key={serviceName}
                            className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                          >
                            {serviceName}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 rounded-xl bg-slate-900 font-semibold text-white transition-all group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-amber-500/25 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[0_0_18px_rgba(245,158,11,0.35)] dark:hover:bg-amber-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/book/${branch.branchId}`, { state: { branch } });
                        }}
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Randevu Al
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl dark:border-white/15 dark:hover:border-amber-400/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/branch/${branch.branchId}`, { state: { branch } });
                        }}
                      >
                        Salonu İncele
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column (65%): Contained Rounded Interactive Map */}
        <div className="min-w-0">
          <BranchMap
            userLocation={coords}
            radiusKm={radiusKm === '' ? null : radiusKm}
            areaSearch={areaSearch}
            branches={branches}
            selectedBranchId={selectedBranchId}
            onSelectBranch={setSelectedBranchId}
          />
        </div>
      </div>
    </div>
  );
};
