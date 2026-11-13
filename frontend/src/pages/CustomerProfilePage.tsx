import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { adminService } from '@/services/adminService';
import { useAuthStore } from '@/store/useAuthStore';
import type { CustomerPenaltyStatus } from '@/types/booking';

export const CustomerProfilePage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [penaltyStatus, setPenaltyStatus] = useState<CustomerPenaltyStatus | null>(null);

  useEffect(() => {
    // Query all active penalties across all businesses (Guid.Empty)
    const targetBusinessId = '00000000-0000-0000-0000-000000000000';

    adminService
      .getMyPenaltyStatus(targetBusinessId)
      .then((res) => {
        if (res.success && res.data) {
          setPenaltyStatus(res.data);
        }
      })
      .catch(() => {
        // Müşterinin henüz ceza kaydı yoksa veya salon seçilmemişse sessiz geçilir
      });
  }, []);

  const activeStrikes = penaltyStatus?.activePenaltyCount ?? 0;
  const isRestricted = penaltyStatus?.isRestricted ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">
          Profilim &amp; Güvenilirlik Durumum
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
          Hesap bilgileriniz, randevu itibarınız ve güvenlik ayarlarınız.
        </p>
      </div>

      {/* Account Info Card */}
      <Card accent>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xl font-bold shadow-sm">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? <UserCircle2 className="h-8 w-8" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-50">
                  {user?.fullName}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-amber-500" />
                    {user?.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-amber-500" />
                    0555 123 45 67
                  </span>
                </div>
              </div>
            </div>

            <Badge variant="amber" className="self-start sm:self-center">
              {user?.roles?.[0] === 'BusinessOwner' ? 'İşletme Sahibi' : 'Doğrulanmış Müşteri'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm dark:border-zinc-800 dark:bg-zinc-950/60">
            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Hesap Rolleri
            </span>
            <div className="flex gap-1.5">
              {user?.roles.map((r) => (
                <Badge key={r} variant="default" className="text-xs">
                  {r === 'BusinessOwner' ? 'Salon Sahibi' : 'Müşteri'}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Reliability & Strike Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            Randevu Güvenilirlik Durumu
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Salonların ve diğer müşterilerin hakkını korumak için randevulara katılımınız puanlanır.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Strike meter */}
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Gelmeme / No-Show İhlal Sayacı
              </span>
              <Badge variant={activeStrikes === 0 ? 'success' : activeStrikes < 3 ? 'warning' : 'danger'}>
                {activeStrikes === 0
                  ? '0/3 İhlal • Kusursuz İtibar'
                  : `${activeStrikes}/3 İhlal • Dikkat`}
              </Badge>
            </div>

            {/* Visual 3-bar strike indicator */}
            <div className="grid grid-cols-3 gap-2 pt-1.5">
              {[1, 2, 3].map((step) => {
                const isFilled = activeStrikes >= step;
                return (
                  <div
                    key={step}
                    className={`h-3 rounded-full transition-all duration-300 ${
                      isFilled
                        ? step === 3
                          ? 'bg-rose-500'
                          : 'bg-orange-500'
                        : 'bg-slate-200 dark:bg-zinc-800'
                    }`}
                  />
                );
              })}
            </div>

            <p className="text-xs text-slate-500 dark:text-zinc-400 pt-1">
              {activeStrikes === 0 ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Harika! Tüm randevularınıza zamanında katıldınız. Hiçbir kısıtlamanız bulunmuyor.
                </span>
              ) : isRestricted ? (
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  {penaltyStatus?.restrictionMessage ||
                    '3 kez randevuya gelmediğiniz için geçici olarak yeni randevu alımınız sınırlandırılmıştır.'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Randevularınıza katılamayacağınız durumlarda lütfen en az 2 saat öncesinden iptal ediniz.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800/80 pt-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-amber-500" />
              <span>Ceza puanları 30 gün sonra otomatik olarak sıfırlanır.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Zamanında yapılan iptaller ceza puanına yol açmaz.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button variant="outline" onClick={() => navigate('/my-appointments')}>
          Randevularımı Görüntüle
        </Button>

        <Button
          variant="danger"
          onClick={() => {
            logout();
            toast.success('Başarıyla çıkış yapıldı.');
            navigate('/login', { replace: true, state: null });
          }}
        >
          <LogOut className="h-4 w-4" />
          Oturumu Kapat
        </Button>
      </div>
    </div>
  );
};
