import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { employeeService } from '@/services/employeeService';
import {
  AppointmentStatus,
  type AppointmentResponse,
  type EmployeeWorkplace,
} from '@/types/booking';

export const formatEmployeeAppointmentDate = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const useEmployeeData = () => {
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
      if (!workplacesRes.success) {
        throw new Error(workplacesRes.message || 'Çalışma yerleri alınamadı.');
      }
      if (!appointmentsRes.success) {
        throw new Error(appointmentsRes.message || 'Randevular alınamadı.');
      }
      setWorkplaces(workplacesRes.data ?? []);
      setAppointments(appointmentsRes.data ?? []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Çalışan bilgileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateStatus = async (appointment: AppointmentResponse, newStatus: number) => {
    setUpdatingId(appointment.id);
    try {
      const result = await bookingService.updateMyWorkAppointmentStatus({
        appointmentId: appointment.id,
        newStatus,
      });
      if (!result.success) {
        toast.error(result.message || 'Randevu güncellenemedi.');
        return;
      }
      const nextStatus = newStatus as AppointmentResponse['status'];
      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id ? { ...item, status: nextStatus } : item,
        ),
      );
      if (newStatus === AppointmentStatus.NoShow) {
        toast.warning(
          'Randevu gelmedi (No-Show) olarak işaretlendi ve müşteriye otomatik ceza puanı işlendi.',
        );
      } else {
        toast.success(
          newStatus === AppointmentStatus.Confirmed
            ? 'Randevu onaylandı.'
            : newStatus === AppointmentStatus.Completed
              ? 'Randevu tamamlandı olarak işaretlendi.'
              : 'Randevu iptal edildi.',
        );
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Randevu güncellenemedi.'));
    } finally {
      setUpdatingId(null);
    }
  };

  return { workplaces, appointments, loading, updatingId, refresh, updateStatus };
};
