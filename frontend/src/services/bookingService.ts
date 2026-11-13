import apiClient from '@/lib/axios';
import type { DataResult, Result } from '@/types/api';
import type {
  AppointmentCreateRequest,
  AppointmentResponse,
  AvailableSlot,
  AvailableSlotsQuery,
  BranchServiceResponse,
  CancelAppointmentRequest,
  CustomerPenaltyStatus,
  StaffResponse,
  WorkingHourResponse,
} from '@/types/booking';

export const bookingService = {
  async getBranchServices(branchId: string): Promise<DataResult<BranchServiceResponse[]>> {
    const { data } = await apiClient.get<DataResult<BranchServiceResponse[]>>(
      `/api/services/branch/${branchId}`,
    );
    return data;
  },

  async getBranchStaff(branchId: string): Promise<DataResult<StaffResponse[]>> {
    const { data } = await apiClient.get<DataResult<StaffResponse[]>>(
      `/api/staff/branch/${branchId}`,
    );
    return data;
  },

  async getStaffWorkingHours(
    staffProfileId: string,
    branchId: string,
  ): Promise<DataResult<WorkingHourResponse[]>> {
    const { data } = await apiClient.get<DataResult<WorkingHourResponse[]>>(
      `/api/schedules/staff/${staffProfileId}/branch/${branchId}/working-hours`,
    );
    return data;
  },

  async getAvailableSlots(query: AvailableSlotsQuery): Promise<DataResult<AvailableSlot[]>> {
    const { data } = await apiClient.get<DataResult<AvailableSlot[]>>(
      '/api/appointments/available-slots',
      {
        params: query,
      },
    );
    return data;
  },

  async createAppointment(
    payload: AppointmentCreateRequest,
  ): Promise<DataResult<AppointmentResponse>> {
    const { data } = await apiClient.post<DataResult<AppointmentResponse>>(
      '/api/appointments',
      payload,
    );
    return data;
  },

  async getMyAppointments(): Promise<DataResult<AppointmentResponse[]>> {
    const { data } = await apiClient.get<DataResult<AppointmentResponse[]>>(
      '/api/appointments/my-appointments',
    );
    return data;
  },

  async cancelAppointment(payload: CancelAppointmentRequest): Promise<Result> {
    const { data } = await apiClient.post<Result>('/api/appointments/cancel', payload);
    return data;
  },

  async getMyPenaltyStatus(businessId: string): Promise<DataResult<CustomerPenaltyStatus>> {
    const { data } = await apiClient.get<DataResult<CustomerPenaltyStatus>>(
      `/api/penalties/my-status/${businessId}`,
    );
    return data;
  },
};

