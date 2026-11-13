import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CalendarCheck2,
  CheckCircle2,
  CreditCard,
  Percent,
  RefreshCw,
  Scissors,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
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
import { cn, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import type { DashboardSummaryResponse } from '@/types/dashboard';
import type { BranchResponse, BusinessSubscriptionDetails } from '@/types/subscription';

type DatePreset = 'all' | '30d' | '7d';

const QuotaBar: React.FC<{
  label: string;
  current: number;
  max: number;
  unit: string;
}> = ({ label, current, max, unit }) => {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(100, Math.round((current / safeMax) * 100));
  const isFull = current >= max;
  const isNearLimit = !isFull && ratio >= 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-zinc-300">{label}</span>
        <span
          className={cn(
            'font-bold',
            isFull
              ? 'text-rose-600 dark:text-rose-400'
              : isNearLimit
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-800 dark:text-zinc-100',
          )}
        >
          {current}/{max} {unit} Kullanımda
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isFull
              ? 'bg-rose-500'
              : isNearLimit
                ? 'bg-amber-500'
                : 'bg-amber-500',
          )}
          style={{ width: `${ratio}%` }}
        />
      </div>
      {isFull && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
          <AlertTriangle className="h-3.5 w-3.5" />
          Kota limitine ulaşıldı! Yeni ekleme için paketinizi yükseltin.
        </p>
      )}
      {isNearLimit && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5" />
          Kota dolmak üzere (%{ratio}).
        </p>
      )}
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');

  const [dashboard, setDashboard] = useState<DashboardSummaryResponse | null>(null);
  const [subscription, setSubscription] = useState<BusinessSubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchesLoaded, setBranchesLoaded] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      let startDate: string | undefined;
      if (datePreset === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
      } else if (datePreset === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString();
      }

      const [branchesRes, subRes] = await Promise.allSettled([
        adminService.getMyBranches(),
        adminService.getMySubscription(),
      ]);

      if (branchesRes.status === 'fulfilled' && branchesRes.value.success && branchesRes.value.data) {
        setBranches(branchesRes.value.data); setBranchesLoaded(true);
      } else {
        setBranchesLoaded(false);
        toast.error(branchesRes.status === 'rejected' ? getApiErrorMessage(branchesRes.reason, 'Şubeler alınamadı.') : branchesRes.value.message || 'Şubeler alınamadı.');
        setDashboard(null);
        return;
      }

      if (subRes.status === 'fulfilled' && subRes.value.success && subRes.value.data) {
        setSubscription(subRes.value.data);
      }

      if ((branchesRes.value.data?.length ?? 0) === 0) {
        setDashboard(null);
        return;
      }

      try {
        const dashRes = await adminService.getDashboardSummary({ branchId: selectedBranchId || undefined, startDate });
        if (dashRes.success && dashRes.data) setDashboard(dashRes.data);
        else toast.error(dashRes.message || 'Genel bakış verileri alınamadı.');
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Genel bakış verileri alınamadı.'));
      }
    } finally {
      setLoading(false);
    }
  }, [datePreset, selectedBranchId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const maxServiceRevenue = Math.max(
    1,
    ...(dashboard?.topServices.map((s) => s.totalRevenue) ?? [1]),
  );
  const totalStaffRevenue = Math.max(
    1,
    dashboard?.staffPerformances.reduce((sum, s) => sum + s.totalRevenue, 0) ?? 1,
  );

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-3xl">
            Genel Bakış
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Randevularını, salon performansını ve işletme ayarlarını tek yerden takip et.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none shadow-sm"
            >
              <option value="">Tüm Şubeler</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-1 shadow-sm">
            {(
              [
                { id: 'all', label: 'Tüm Zamanlar' },
                { id: '30d', label: 'Son 30 Gün' },
                { id: '7d', label: 'Son 7 Gün' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                  datePreset === preset.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-100',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon" onClick={fetchDashboardData} aria-label="Yenile">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      {branchesLoaded && branches.length === 0 && !loading ? (
        <Card className="overflow-hidden border-[#e8e1d6] bg-[#eee9e1] dark:border-zinc-800 dark:bg-[#211f1b]">
          <CardContent className="flex flex-col gap-6 p-6 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <Badge variant="amber" className="mb-3">Kuruluma başlayalım</Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">Salonun için ilk adımlar</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">Önce şube adresini ekle. Ardından hizmetlerini ve ekibini tanımlayarak randevu almaya hazır hale gel.</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {['Şube bilgilerini ekle', 'Hizmet ve fiyatlarını tanımla', 'Ekibini ve çalışma saatlerini ayarla'].map((step, index) => <div key={step} className="rounded-xl border border-white/70 bg-white/65 p-3 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-black/15 dark:text-zinc-200"><span className="mr-2 font-bold text-amber-700 dark:text-amber-400">0{index + 1}</span>{step}</div>)}
              </div>
            </div>
            <Button size="lg" className="gap-2" onClick={() => navigate('/admin/branches')}><Scissors className="h-4 w-4"/> İlk şubeyi ekle</Button>
          </CardContent>
        </Card>
      ) : !branchesLoaded && !loading ? (
        <Card className="border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-zinc-100">Salon bilgileri yüklenemedi</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">Bağlantını kontrol edip tekrar deneyebilirsin.</p>
            </div>
            <Button variant="outline" onClick={fetchDashboardData} className="gap-2"><RefreshCw className="h-4 w-4" /> Tekrar dene</Button>
          </CardContent>
        </Card>
      ) : loading && (!dashboard || !branchesLoaded) ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : dashboard ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card accent>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Toplam Ciro
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatCurrency(dashboard?.totalRevenue ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Tamamlanan randevular toplamı
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Tamamlanan Randevu
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <CalendarCheck2 className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-zinc-100">
                {dashboard?.completedAppointments ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Toplam {dashboard?.totalAppointments ?? 0} randevu içerisinden
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  İptal / No-Show Oranı
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                  <Percent className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-zinc-100">
                %{dashboard?.cancellationRate ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                {dashboard?.cancelledAppointments ?? 0} iptal •{' '}
                {dashboard?.noShowAppointments ?? 0} no-show
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Ortalama Puan
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Star className="h-4.5 w-4.5 fill-amber-400" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-zinc-100">
                {(dashboard?.averageRating ?? 0) > 0 ? dashboard!.averageRating.toFixed(1) : '—'}{' '}
                {(dashboard?.averageRating ?? 0) > 0 && <span className="text-sm font-normal text-slate-500 dark:text-zinc-400">/ 5.0</span>}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Müşteri değerlendirmeleri</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {branches.length > 0 && dashboard && <>
      {/* Popular Services + Staff Performance + SaaS Quota */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Top Services */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4.5 w-4.5 text-amber-400" />
              En Popüler Hizmetler
            </CardTitle>
            <CardDescription>Randevu adedi ve ciro sıralaması.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!dashboard || dashboard.topServices.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Henüz tamamlanmış hizmet verisi yok.
              </p>
            ) : (
              dashboard.topServices.map((srv, idx) => {
                const widthPct = Math.max(
                  8,
                  Math.round((srv.totalRevenue / maxServiceRevenue) * 100),
                );
                return (
                  <div key={srv.serviceId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-zinc-100">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15 text-[10px] text-amber-600 dark:bg-slate-800 dark:text-amber-400">
                          #{idx + 1}
                        </span>
                        {srv.serviceName}
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(srv.totalRevenue)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {srv.appointmentCount} tamamlanan randevu
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Staff Revenue Breakdown */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4.5 w-4.5 text-amber-400" />
              Personel Ciro Dağılımı
            </CardTitle>
            <CardDescription>Berber bazlı gelir ve memnuniyet puanı.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!dashboard || dashboard.staffPerformances.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Henüz personel performans verisi yok.
              </p>
            ) : (
              dashboard.staffPerformances.map((staff) => {
                const sharePct = Math.round((staff.totalRevenue / totalStaffRevenue) * 100);
                return (
                  <div
                    key={staff.staffProfileId}
                    className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-bold text-amber-500 dark:text-amber-400">
                          {staff.staffFullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                            {staff.staffFullName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            {staff.completedAppointments} randevu • %{sharePct} pay
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(staff.totalRevenue)}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-zinc-300">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {staff.averageRating > 0 ? staff.averageRating.toFixed(1) : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(5, sharePct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* SaaS Plan & Quota Card */}
        <Card accent className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4.5 w-4.5 text-amber-400" />
                SaaS Paket &amp; Kota
              </CardTitle>
              {subscription && (
                <Badge variant="amber">
                  <Award className="h-3 w-3" />
                  {subscription.planName} Plan
                </Badge>
              )}
            </div>
            <CardDescription>
              {subscription
                ? `${subscription.planName} Plan - ${subscription.currentBranchCount}/${subscription.maxBranchCount} Şube, ${subscription.currentStaffCount}/${subscription.maxStaffPerBranch} Personel Kullanımda`
                : 'Aktif abonelik kotası yükleniyor...'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {!subscription ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <QuotaBar
                  label="Şube Kotası"
                  current={subscription.currentBranchCount}
                  max={subscription.maxBranchCount}
                  unit="Şube"
                />

                <QuotaBar
                  label="Personel Kotası"
                  current={subscription.currentStaffCount}
                  max={subscription.maxStaffPerBranch * subscription.maxBranchCount}
                  unit="Personel"
                />

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-950/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Durum</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {subscription.statusName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Aylık Randevu Limiti</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {subscription.maxMonthlyAppointments.toLocaleString('tr-TR')} randevu
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Dönem Bitişi</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {new Date(subscription.endDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick summary footer */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Scissors className="h-3.5 w-3.5 text-amber-500/70" />
        <span>
          Dashboard verileri canlı veritabanı randevuları ve doğrulanmış yorumlardan
          hesaplanır.
        </span>
      </div>
      </>}
    </div>
  );
};

