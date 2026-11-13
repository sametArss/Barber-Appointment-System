import { useCallback, useEffect, useState } from 'react';
import {
  CalendarPlus,
  Compass,
  Filter,
  LocateFixed,
  MapPin,
  Phone,
  Scissors,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BranchMap } from '@/components/explore/BranchMap';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Skeleton,
} from '@/components/ui';
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
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const areaSearch = Boolean(city.trim() || district.trim());

  const [branches, setBranches] = useState<BranchSearchResponse[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNearby = useCallback(
    async (
      targetLat: number,
      targetLng: number,
      filters?: { queryText?: string; city?: string; district?: string; radiusKm?: number },
    ) => {
      setLoading(true);
      try {
        const res = await searchService.getNearbyBranches({
          latitude: targetLat,
          longitude: targetLng,
          radiusKm: filters?.radiusKm ?? radiusKm,
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
        setLocationSource('unavailable'); setLoading(false); setBranches([]);
        if (showFeedback) toast.info('Konum desteği yok. Salonları bulmak için şehir veya ilçe ara.');
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
          setLoading(false); setBranches([]);
          if (showFeedback) toast.info('Konum izni alınamadı. Şehir veya ilçe seçerek arama yapabilirsin.');
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
    if (locationSource !== 'gps' && !areaSearch) {
      toast.info('Yakınındaki salonlar için konum izni ver veya şehir/ilçe seç.');
      return;
    }
    fetchNearby(coords.lat, coords.lng, { queryText, city, district, radiusKm });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="amber">
              <Compass className="h-3.5 w-3.5" />
              Yakınımdaki Salonlar
            </Badge>
            <Badge variant={locationSource === 'gps' ? 'success' : 'outline'}>
              {locationSource === 'gps'
                ? 'Canlı Konum Aktif'
                : 'Şehir / ilçe seçerek ara'}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-3xl">
            Çevrendeki Berber &amp; Kuaförler
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Yakınındaki salonları bul veya şehir ve ilçe yazarak Türkiye’nin her yerinde ara.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => requestUserLocation(true)}
          isLoading={locating}
          className="gap-2 shrink-0 shadow-sm"
        >
          <LocateFixed className="h-4 w-4 text-amber-500" />
          Konumumu Güncelle
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-3 md:grid-cols-12 md:items-end"
          >
            <div className="md:col-span-4">
              <Input
                label="Salon veya Hizmet Ara"
                placeholder="Örn: Moda Merkez, Saç Kesimi..."
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Şehir"
                placeholder="İstanbul"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="İlçe"
                placeholder="Kadıköy"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label
                htmlFor="radius-select"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300"
              >
                {areaSearch ? 'Şehir / ilçe araması' : 'En fazla mesafe'}
              </label>
              <select
                id="radius-select"
                value={radiusKm}
                onChange={(e) => {
                  const nextRadius = Number(e.target.value);
                  setRadiusKm(nextRadius);
                  fetchNearby(coords.lat, coords.lng, {
                    queryText,
                    city,
                    district,
                    radiusKm: nextRadius,
                  });
                }}
                disabled={areaSearch}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 shadow-sm"
              >
                <option value={2}>2 km içinde</option>
                <option value={5}>5 km içinde</option>
                <option value={10}>10 km içinde</option>
                <option value={15}>15 km içinde</option>
                <option value={25}>25 km içinde</option>
                <option value={50}>50 km içinde</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="h-11 w-full gap-2 font-bold shadow-sm" isLoading={loading}>
                <Filter className="h-4 w-4" />
                Filtrele
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Split View: Branch Cards + Leaflet Map */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Branch List */}
        <div className="space-y-3 lg:col-span-5 lg:max-h-[650px] lg:overflow-y-auto lg:pr-1">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx}>
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
            <Card>
              <CardContent className="flex flex-col items-center p-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
                  <Scissors className="h-6 w-6" />
                </div>
                <p className="font-bold text-slate-900 dark:text-zinc-100">
                  Seçili kriterlere uygun salon bulunamadı
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Şehir veya ilçe yazdıysanız yazımı kontrol edin; yakın aramada mesafeyi artırın.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setQueryText('');
                    setCity('');
                    setDistrict('');
                    setRadiusKm(25);
                    fetchNearby(coords.lat, coords.lng, {
                      queryText: '',
                      city: '',
                      district: '',
                      radiusKm: 25,
                    });
                  }}
                >
                  Filtreleri Temizle (25 km)
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
                    'cursor-pointer transition-all hover:border-amber-500/50 hover:shadow-md',
                    isSelected && 'border-amber-500/80 ring-1 ring-amber-500/30 dark:border-amber-500/70',
                  )}
                >
                  <CardContent className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          {branch.businessName}
                        </p>
                        <h3 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-zinc-50">
                          {branch.branchName}
                        </h3>
                      </div>
                      <Badge variant="amber" className="shrink-0 text-xs">
                        <MapPin className="h-3 w-3" />
                        {areaSearch ? `${branch.district}, ${branch.city}` : formatDistance(branch.distanceMeters)}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-slate-500 dark:text-zinc-400">
                      <p>
                        {branch.address} • {branch.district}/{branch.city}
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                        <Phone className="h-3.5 w-3.5 text-amber-500" />
                        {branch.phoneNumber}
                      </p>
                    </div>

                    {branch.offeredServices.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {branch.offeredServices.map((serviceName) => (
                          <Badge key={serviceName} variant="default" className="text-[11px]">
                            {serviceName}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                      <Button
                        size="sm"
                        className="flex-1 font-bold"
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

        {/* Leaflet Map */}
        <div className="lg:col-span-7">
          <BranchMap
            userLocation={coords}
            radiusKm={radiusKm}
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
