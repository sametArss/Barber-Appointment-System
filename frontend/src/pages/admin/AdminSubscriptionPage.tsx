import React, { useEffect, useState } from 'react';
import { CheckCircle2, Crown, RefreshCw } from 'lucide-react';
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
import { formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import type { BusinessSubscriptionDetails, SubscriptionPlan } from '@/types/subscription';

export const AdminSubscriptionPage: React.FC = () => {
  const [sub, setSub] = useState<BusinessSubscriptionDetails | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [plansError, setPlansError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setPlansError('');
    try {
      const [subResult, plansResult] = await Promise.allSettled([
        adminService.getMySubscription(),
        adminService.getSubscriptionPlans(),
      ]);

      if (subResult.status === 'fulfilled' && subResult.value.success && subResult.value.data) {
        setSub(subResult.value.data);
      } else {
        setSub(null);
      }
      if (plansResult.status === 'fulfilled' && plansResult.value.success && plansResult.value.data) {
        setPlans(plansResult.value.data);
      } else {
        setPlans([]);
        setPlansError(
          plansResult.status === 'rejected'
            ? getApiErrorMessage(plansResult.reason, 'Paket seçenekleri alınamadı.')
            : plansResult.value.message || 'Paket seçenekleri şu anda alınamıyor.',
        );
      }
    } catch (err) {
      const message = getApiErrorMessage(err, 'Paket seçenekleri alınamadı.');
      setPlansError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setUpgradingPlanId(planId);
    try {
      const res = await adminService.subscribe({
        planId,
        billingCycle: 1,
      });

      if (!res.success) {
        toast.error(res.message || 'Paket geçişi başarısız oldu.');
        return;
      }

      toast.success('Abonelik paketiniz başarıyla güncellendi!');
      await fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Paket güncellenirken hata oluştu.'));
    } finally {
      setUpgradingPlanId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
          Paket ve Kullanım
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Aktif abonelik durumunuzu, şube/personel kotalarınızı ve plan yükseltme seçeneklerini inceleyin.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-44 w-full rounded-2xl" />
      ) : sub ? (
        <Card accent>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-extrabold">{sub.planName} Planı</CardTitle>
                    <Badge variant="success">Aktif Abonelik</Badge>
                  </div>
                  <CardDescription>
                    Yenilenme Tarihi:{' '}
                    {new Date(sub.endDate).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </CardDescription>
                </div>
              </div>

              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                Otomatik Yenileme: {sub.autoRenew ? 'Açık' : 'Kapalı'}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-zinc-400">Şube Kullanımı</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {sub.currentBranchCount} / {sub.maxBranchCount}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (sub.currentBranchCount / Math.max(1, sub.maxBranchCount)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-zinc-400">Personel Kapasitesi</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {sub.currentStaffCount} / {sub.maxStaffPerBranch * sub.maxBranchCount}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (sub.currentStaffCount / (sub.maxStaffPerBranch * sub.maxBranchCount || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-zinc-400">Aylık Randevu Kotası</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {sub.maxMonthlyAppointments} Randevu/Ay
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Aylık dönem için üst sınır.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
          Mevcut Paket Seçenekleri
        </h3>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map((item) => (
              <Skeleton key={item} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : plansError ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-zinc-100">
                  Paketler yüklenemedi
                </h4>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{plansError}</p>
              </div>
              <Button variant="outline" onClick={fetchData} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Yeniden dene
              </Button>
            </CardContent>
          </Card>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Crown className="mx-auto h-8 w-8 text-amber-500" />
              <h4 className="mt-3 font-semibold text-slate-900 dark:text-zinc-100">
                Henüz sunulan paket yok
              </h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                Paketler sisteme eklendiğinde burada görünecek.
              </p>
              <Button variant="outline" onClick={fetchData} className="mt-4 gap-2">
                <RefreshCw className="h-4 w-4" /> Yenile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((p) => {
              const isCurrent = sub?.planId === p.id;
              return (
                <Card key={p.id} accent={isCurrent} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                      {isCurrent && <Badge variant="success">Mevcut Paketiniz</Badge>}
                    </div>
                    <CardDescription>{p.description}</CardDescription>
                    <div className="pt-3">
                      <span className="text-2xl font-black text-slate-900 dark:text-zinc-50">
                        {formatCurrency(p.monthlyPrice)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-400"> / ay</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Maksimum {p.maxBranchCount} Şube Tanımlama</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Şube Başına {p.maxStaffPerBranch} Personel</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Aylık {p.maxMonthlyAppointments} Randevu Kapasitesi</span>
                    </div>
                    {p.hasAdvancedReporting && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>Gelişmiş Ciro &amp; Personel Performans Raporları</span>
                      </div>
                    )}

                    <div className="pt-4">
                      <Button
                        variant={isCurrent ? 'outline' : 'primary'}
                        className="w-full font-bold"
                        disabled={isCurrent || upgradingPlanId !== null}
                        isLoading={upgradingPlanId === p.id}
                        onClick={() => handleSubscribe(p.id)}
                      >
                        {isCurrent ? 'Kullanımda' : `${p.name} Paketine Geç`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
