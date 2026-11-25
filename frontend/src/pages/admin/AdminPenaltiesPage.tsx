import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Phone,
  RefreshCw,
  Scissors,
  Search,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Skeleton } from '@/components/ui';
import { cn, getApiErrorMessage } from '@/lib/utils';
import { adminService } from '@/services/adminService';
import type { BusinessPenaltyItem } from '@/types/admin';

const REASON_LABELS: Record<string, string> = {
  NoShow: 'Randevuya Gelmedi (No-Show)',
  LateCancellation: 'Geç İptal',
  ManualByBusiness: 'İşletme Tarafından Eklendi',
};

export const AdminPenaltiesPage: React.FC = () => {
  const [penalties, setPenalties] = useState<BusinessPenaltyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'forgiven' | 'expired'>('all');
  const [forgiveTarget, setForgiveTarget] = useState<BusinessPenaltyItem | null>(null);
  const [forgiving, setForgiving] = useState(false);

  const fetchPenalties = async () => {
    setLoading(true);
    try {
      const res = await adminService.getBusinessPenalties();
      if (res.success && res.data) {
        setPenalties(res.data);
      } else {
        toast.error(res.message || 'Ceza kayıtları yüklenemedi.');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Ceza kayıtları alınamadı.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPenalties();
  }, []);

  const stats = useMemo(() => {
    const active = penalties.filter((p) => p.isActive && !p.isExpired);
    const forgiven = penalties.filter((p) => !p.isActive);
    const expired = penalties.filter((p) => p.isActive && p.isExpired);
    const restrictedCustomers = new Set(
      active.filter((p) => p.customerActivePenaltyCount >= 3).map((p) => p.customerUserId),
    ).size;
    return {
      activeCount: active.length,
      forgivenCount: forgiven.length,
      expiredCount: expired.length,
      restrictedCustomers,
    };
  }, [penalties]);

  const filteredPenalties = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return penalties.filter((p) => {
      const matchesQuery =
        !q ||
        `${p.customerFullName} ${p.customerEmail} ${p.customerPhoneNumber} ${p.branchName ?? ''} ${p.serviceName ?? ''} ${p.note ?? ''}`
          .toLocaleLowerCase('tr')
          .includes(q);

      const isCurrentlyActive = p.isActive && !p.isExpired;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isCurrentlyActive) ||
        (statusFilter === 'forgiven' && !p.isActive) ||
        (statusFilter === 'expired' && p.isActive && p.isExpired);

      return matchesQuery && matchesStatus;
    });
  }, [penalties, query, statusFilter]);

  const handleConfirmForgive = async () => {
    if (!forgiveTarget) return;
    setForgiving(true);
    try {
      const res = await adminService.forgivePenalty(forgiveTarget.id);
      if (!res.success) {
        toast.error(res.message || 'Ceza kaydı affedilemedi.');
        return;
      }
      toast.success(`${forgiveTarget.customerFullName} için ceza kaydı affedildi.`);
      setForgiveTarget(null);
      await fetchPenalties();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Ceza affedilirken hata oluştu.'));
    } finally {
      setForgiving(false);
    }
  };

  return (
    <div className="space-y-7 py-2">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D97706] dark:text-amber-400">
            Randevu Güvenliği
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#FAF8F5] sm:text-4xl">
            Müşteri Ceza (No-Show) Yönetimi
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            İşletmenizde oluşan No-Show ve geç iptal kayıtlarını takip edin, gerektiğinde müşteri
            cezasını affedin.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchPenalties()}
          className="h-10 gap-2 rounded-[14px] px-4 text-xs font-semibold"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Yenile
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-[20px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Aktif Ceza
          </span>
          <p className="mt-2 font-serif text-3xl font-bold text-orange-600 dark:text-orange-400">
            {stats.activeCount}
          </p>
        </div>
        <div className="rounded-[20px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kısıtlı Müşteri (3+)
          </span>
          <p className="mt-2 font-serif text-3xl font-bold text-rose-600 dark:text-rose-400">
            {stats.restrictedCustomers}
          </p>
        </div>
        <div className="rounded-[20px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Affedilen
          </span>
          <p className="mt-2 font-serif text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.forgivenCount}
          </p>
        </div>
        <div className="rounded-[20px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Süresi Dolan
          </span>
          <p className="mt-2 font-serif text-3xl font-bold text-slate-700 dark:text-slate-200">
            {stats.expiredCount}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-[20px] border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Müşteri veya not ara"
            placeholder="Müşteri adı, e-posta, telefon veya şube ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#D97706] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
          />
        </div>

        <select
          aria-label="Ceza durumu filtresi"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 rounded-[14px] border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold text-slate-700 focus:border-[#D97706] focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200"
        >
          <option value="all">Tüm Kayıtlar ({penalties.length})</option>
          <option value="active">Aktif Cezalar ({stats.activeCount})</option>
          <option value="forgiven">Affedilenler ({stats.forgivenCount})</option>
          <option value="expired">Süresi Dolanlar ({stats.expiredCount})</option>
        </select>
      </div>

      {/* Penalties List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-[20px]" />
          <Skeleton className="h-28 w-full rounded-[20px]" />
        </div>
      ) : filteredPenalties.length === 0 ? (
        <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-12 text-center shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/65">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500/60" />
          <h3 className="mt-3 font-serif text-xl font-bold text-slate-900 dark:text-white">
            {penalties.length === 0
              ? 'Henüz müşteri ceza kaydı bulunmuyor'
              : 'Seçili filtrelere uygun ceza kaydı yok'}
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Bir randevu Gelmedi (No-Show) olarak işaretlendiğinde otomatik olarak burada listelenir.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredPenalties.map((item) => {
            const isCurrentlyActive = item.isActive && !item.isExpired;
            const isRestricted = item.customerActivePenaltyCount >= 3;

            return (
              <article
                key={item.id}
                className={cn(
                  'rounded-[20px] border bg-white/85 p-5 shadow-sm backdrop-blur-xl transition-all dark:bg-slate-900/65',
                  isCurrentlyActive
                    ? 'border-orange-500/30 dark:border-orange-500/25'
                    : 'border-slate-200/80 opacity-85 dark:border-white/10',
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                        {item.customerFullName}
                      </h2>

                      {isCurrentlyActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                          <ShieldAlert className="h-3 w-3" />
                          Aktif Ceza
                        </span>
                      ) : !item.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Affedildi
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300">
                          Süresi Doldu
                        </span>
                      )}

                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                          isRestricted
                            ? 'border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300'
                            : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300',
                        )}
                      >
                        {item.customerActivePenaltyCount} / 3 Aktif İhlal
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-[#D97706] dark:text-amber-400">
                        {REASON_LABELS[item.reasonName] ?? item.reasonName}
                      </span>
                      {item.branchName && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {item.branchName}
                        </span>
                      )}
                      {item.serviceName && (
                        <span className="inline-flex items-center gap-1">
                          <Scissors className="h-3.5 w-3.5 text-slate-400" />
                          {item.serviceName}
                        </span>
                      )}
                      {item.customerPhoneNumber && (
                        <a
                          href={`tel:${item.customerPhoneNumber}`}
                          className="inline-flex items-center gap-1 hover:text-[#D97706] dark:hover:text-amber-400"
                        >
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {item.customerPhoneNumber}
                        </a>
                      )}
                    </div>

                    {item.note && (
                      <p className="text-xs italic text-slate-500 dark:text-slate-400">
                        &ldquo;{item.note}&rdquo;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        İşlenme: {new Date(item.createdDate).toLocaleDateString('tr-TR')}
                      </span>
                      <span>
                        Geçerlilik Bitişi: {new Date(item.expiresAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>

                  {isCurrentlyActive && (
                    <div className="shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setForgiveTarget(item)}
                        className="h-10 gap-1.5 rounded-[12px] border-emerald-500/40 px-4 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/35 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Cezayı Affet
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Forgive Confirmation Modal */}
      {forgiveTarget && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-md rounded-[22px] border border-emerald-500/30 bg-white p-6 shadow-2xl dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setForgiveTarget(null)}
              disabled={forgiving}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
              Ceza Kaydı Affedilsin mi?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <strong>{forgiveTarget.customerFullName}</strong> adlı müşterinin bu ceza kaydı
              kaldırılacak, aktif ceza sayısı 1 azalacak ve müşteriye bilgilendirme gönderilecektir.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={forgiving}
                onClick={() => setForgiveTarget(null)}
                className="h-10 rounded-xl px-4"
              >
                Vazgeç
              </Button>
              <Button
                size="sm"
                isLoading={forgiving}
                onClick={() => void handleConfirmForgive()}
                className="h-10 gap-1.5 rounded-xl bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Evet, Cezayı Affet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
