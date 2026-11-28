import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui';
import { formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import type { DashboardSummaryResponse } from '@/types/dashboard';

export const AdminReportsPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getDashboardSummary()
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        }
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, 'Raporlar alınamadı.'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
          Gelir &amp; Finansal Analitik
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Salon cironuz, randevu tamamlama oranlarınız ve en çok tercih edilen hizmetleriniz.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card accent>
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Toplam Ciro
                </span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {formatCurrency(data.totalRevenue)}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Tamamlanan randevulardan
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Tamamlanan Randevular
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-zinc-50">
                  {data.completedAppointments}
                </p>
                <span className="text-[10px] text-slate-500">
                  Toplam {data.totalAppointments} rezervasyon arasından
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  İptal &amp; Gelmeme Oranı
                </span>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  %{data.cancellationRate}
                </p>
                <span className="text-[10px] text-rose-500">
                  {data.cancelledAppointments} iptal • {data.noShowAppointments} No-Show
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Müşteri Memnuniyeti
                </span>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {data.averageRating > 0 ? `${data.averageRating.toFixed(1)} / 5.0` : '—'}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                  Müşteri değerlendirmeleri
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">En Çok Tercih Edilen Hizmetler</CardTitle>
                <CardDescription>Gelir getiren popüler bakımlar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topServices.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Veri bulunamadı.</p>
                ) : (
                  data.topServices.map((srv) => (
                    <div
                      key={srv.serviceId}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 text-xs"
                    >
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {srv.serviceName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{srv.appointmentCount} Adet</span>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">
                          {formatCurrency(srv.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personel Ciro Dağılımı</CardTitle>
                <CardDescription>Berber bazlı hizmet performansları.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.staffPerformances.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Veri bulunamadı.</p>
                ) : (
                  data.staffPerformances.map((st) => (
                    <div
                      key={st.staffProfileId}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 text-xs"
                    >
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {st.staffFullName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{st.completedAppointments} Randevu</span>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">
                          {formatCurrency(st.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
};
