import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, MapPin, Phone, RefreshCw, Scissors, Store, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { employeeService } from '@/services/employeeService';
import { AppointmentStatus, type AppointmentResponse, type EmployeeWorkplace } from '@/types/booking';

const formatAppointmentDate = (value: string) => new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

const useEmployeeData = () => {
  const [workplaces, setWorkplaces] = useState<EmployeeWorkplace[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [workplacesRes, appointmentsRes] = await Promise.all([
        employeeService.getMyWorkplaces(),
        bookingService.getMyWorkAppointments(),
      ]);
      if (!workplacesRes.success) throw new Error(workplacesRes.message || 'Çalışma yerleri alınamadı.');
      if (!appointmentsRes.success) throw new Error(appointmentsRes.message || 'Randevular alınamadı.');
      setWorkplaces(workplacesRes.data ?? []);
      setAppointments(appointmentsRes.data ?? []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Çalışan bilgileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const updateStatus = async (appointment: AppointmentResponse, newStatus: number) => {
    setUpdatingId(appointment.id);
    try {
      const result = await bookingService.updateMyWorkAppointmentStatus({ appointmentId: appointment.id, newStatus });
      if (!result.success) { toast.error(result.message || 'Randevu güncellenemedi.'); return; }
      const nextStatus = newStatus as AppointmentResponse['status'];
      setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, status: nextStatus } : item));
      toast.success(newStatus === AppointmentStatus.Confirmed ? 'Randevu onaylandı.' : newStatus === AppointmentStatus.Completed ? 'Randevu tamamlandı olarak işaretlendi.' : 'Randevu iptal edildi.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Randevu güncellenemedi.'));
    } finally { setUpdatingId(null); }
  };

  return { workplaces, appointments, loading, updatingId, refresh, updateStatus };
};

const WorkplaceCard: React.FC<{ workplace: EmployeeWorkplace }> = ({ workplace }) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400"><Store className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><CardTitle className="text-base">{workplace.businessName}</CardTitle><CardDescription className="mt-1">{workplace.branchName}</CardDescription></div>
        <Badge variant={workplace.isBookable ? 'success' : 'outline'}>{workplace.isBookable ? 'Randevu alıyor' : 'Randevuya kapalı'}</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-3 text-sm text-slate-600 dark:text-zinc-300">
      <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"/><span>{workplace.address}, {workplace.district}, {workplace.city}</span></p>
      {workplace.businessPhoneNumber && <a className="flex items-center gap-2 hover:text-amber-700 dark:hover:text-amber-400" href={`tel:${workplace.businessPhoneNumber}`}><Phone className="h-4 w-4 text-amber-600"/>{workplace.businessPhoneNumber}</a>}
      {workplace.biography && <p className="border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">{workplace.biography}</p>}
    </CardContent>
  </Card>
);

const AppointmentCard: React.FC<{ appointment: AppointmentResponse; updating: boolean; onUpdate: (status: number) => void }> = ({ appointment, updating, onUpdate }) => {
  const isPending = appointment.status === AppointmentStatus.Pending;
  const isConfirmed = appointment.status === AppointmentStatus.Confirmed;
  const status = isPending ? 'Onay bekliyor' : isConfirmed ? 'Onaylandı' : appointment.status === AppointmentStatus.Completed ? 'Tamamlandı' : appointment.status === AppointmentStatus.Cancelled ? 'İptal edildi' : 'Gelmedi';
  const badgeVariant = isPending ? 'warning' : isConfirmed ? 'success' : appointment.status === AppointmentStatus.Cancelled ? 'danger' : 'outline';
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900 dark:text-zinc-100">{appointment.customerFullName}</h3><Badge variant={badgeVariant}>{status}</Badge></div>
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300"><Scissors className="h-4 w-4 text-amber-600"/>{appointment.serviceName} <span className="text-slate-400">·</span> {formatCurrency(appointment.priceSnapshot)}</p>
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300"><Clock3 className="h-4 w-4 text-amber-600"/>{formatAppointmentDate(appointment.startAt)} <span className="text-slate-400">·</span> {appointment.durationSnapshot} dk</p>
            <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400"><MapPin className="h-3.5 w-3.5"/>{appointment.branchName}</p>
            {appointment.customerPhoneNumber && <a href={`tel:${appointment.customerPhoneNumber}`} className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400"><Phone className="h-3.5 w-3.5"/>{appointment.customerPhoneNumber}</a>}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {isPending && <><Button size="sm" className="gap-1.5" disabled={updating} isLoading={updating} onClick={() => onUpdate(AppointmentStatus.Confirmed)}><Check className="h-4 w-4"/> Onayla</Button><Button size="sm" variant="outline" className="gap-1.5" disabled={updating} onClick={() => onUpdate(AppointmentStatus.Cancelled)}><X className="h-4 w-4"/> İptal et</Button></>}
            {isConfirmed && <><Button size="sm" variant="outline" className="gap-1.5" disabled={updating} onClick={() => onUpdate(AppointmentStatus.Completed)}><Check className="h-4 w-4"/> Tamamlandı</Button><Button size="sm" variant="ghost" className="gap-1.5 text-rose-600" disabled={updating} onClick={() => onUpdate(AppointmentStatus.Cancelled)}>İptal et</Button></>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const EmployeeDashboardPage: React.FC = () => {
  const { workplaces, appointments, loading, updatingId, refresh, updateStatus } = useEmployeeData();
  const upcoming = appointments.filter((appointment) => (appointment.status === AppointmentStatus.Pending || appointment.status === AppointmentStatus.Confirmed) && new Date(appointment.startAt) >= new Date()).slice(0, 4);
  const pendingCount = appointments.filter((appointment) => appointment.status === AppointmentStatus.Pending).length;
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Çalışan paneli</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Merhaba, kolay gelsin</h1><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Çalışma yerlerini ve sana ait randevuları buradan takip et.</p></div><Button variant="outline" className="gap-2" onClick={() => void refresh()}><RefreshCw className="h-4 w-4"/> Yenile</Button></header>
      {loading ? <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28"/><Skeleton className="h-28"/><Skeleton className="h-28"/></div> : <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-sm text-slate-500">Çalıştığım şubeler</p><p className="mt-2 text-3xl font-bold">{workplaces.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-500">Onay bekleyen</p><p className="mt-2 text-3xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-500">Yaklaşan randevular</p><p className="mt-2 text-3xl font-bold">{appointments.filter((appointment) => (appointment.status === AppointmentStatus.Pending || appointment.status === AppointmentStatus.Confirmed) && new Date(appointment.startAt) >= new Date()).length}</p></CardContent></Card></div>}
      <section className="space-y-4"><div className="flex items-center gap-2"><Store className="h-5 w-5 text-amber-600"/><h2 className="text-lg font-semibold">Çalıştığım yerler</h2></div>{loading ? <Skeleton className="h-40"/> : workplaces.length ? <div className="grid gap-4 lg:grid-cols-2">{workplaces.map((workplace) => <WorkplaceCard key={`${workplace.staffProfileId}-${workplace.branchId}`} workplace={workplace}/>)}</div> : <Card><CardContent className="p-6 text-sm text-slate-500">Hesabına henüz bir çalışma yeri atanmamış. Salon yöneticinle iletişime geç.</CardContent></Card>}</section>
      <section className="space-y-4"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-amber-600"/><h2 className="text-lg font-semibold">Yaklaşan randevular</h2></div>{loading ? <Skeleton className="h-36"/> : upcoming.length ? <div className="space-y-3">{upcoming.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} updating={updatingId === appointment.id} onUpdate={(status) => void updateStatus(appointment, status)}/>)}</div> : <Card><CardContent className="p-6 text-sm text-slate-500">Yaklaşan randevun bulunmuyor.</CardContent></Card>}</section>
    </div>
  );
};

export const EmployeeWorkplacesPage: React.FC = () => {
  const { workplaces, loading, refresh } = useEmployeeData();
  return <div className="space-y-6"><header className="flex items-end justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Çalıştığım yerler</h1><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Atandığın salon ve şubelerin.</p></div><Button variant="outline" className="gap-2" onClick={() => void refresh()}><RefreshCw className="h-4 w-4"/> Yenile</Button></header>{loading ? <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40"/><Skeleton className="h-40"/></div> : workplaces.length ? <div className="grid gap-4 md:grid-cols-2">{workplaces.map((workplace) => <WorkplaceCard key={`${workplace.staffProfileId}-${workplace.branchId}`} workplace={workplace}/>)}</div> : <Card><CardContent className="p-8 text-center"><Store className="mx-auto h-8 w-8 text-amber-600"/><h2 className="mt-3 font-semibold">Henüz şube ataması yok</h2><p className="mt-1 text-sm text-slate-500">Salon yöneticinden şube ataması yapmasını isteyebilirsin.</p></CardContent></Card>}</div>;
};

export const EmployeeAppointmentsPage: React.FC = () => {
  const { appointments, loading, updatingId, refresh, updateStatus } = useEmployeeData();
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'past'>('all');
  const filtered = useMemo(() => appointments.filter((appointment) => {
    if (filter === 'pending') return appointment.status === AppointmentStatus.Pending;
    if (filter === 'confirmed') return appointment.status === AppointmentStatus.Confirmed;
    if (filter === 'past') return [AppointmentStatus.Completed, AppointmentStatus.Cancelled, AppointmentStatus.NoShow].includes(appointment.status as 3 | 4 | 5);
    return true;
  }), [appointments, filter]);
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Randevularım</h1><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Yalnızca sana atanmış müşteri randevuları.</p></div><Button variant="outline" className="gap-2" onClick={() => void refresh()}><RefreshCw className="h-4 w-4"/> Yenile</Button></header><div className="flex flex-wrap gap-2">{([['all', 'Tümü'], ['pending', 'Onay bekleyen'], ['confirmed', 'Onaylanan'], ['past', 'Geçmiş']] as const).map(([value, label]) => <Button key={value} size="sm" variant={filter === value ? 'primary' : 'outline'} onClick={() => setFilter(value)}>{label}</Button>)}</div>{loading ? <div className="space-y-3"><Skeleton className="h-36"/><Skeleton className="h-36"/></div> : filtered.length ? <div className="space-y-3">{filtered.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} updating={updatingId === appointment.id} onUpdate={(status) => void updateStatus(appointment, status)}/>)}</div> : <Card><CardContent className="p-8 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-400"/><h2 className="mt-3 font-semibold">Bu filtrede randevu yok</h2><p className="mt-1 text-sm text-slate-500">Filtreyi değiştirince diğer randevularını görebilirsin.</p></CardContent></Card>}</div>;
};
