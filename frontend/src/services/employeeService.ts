import apiClient from '@/lib/axios';
import type { BusinessServiceItem, SetStaffWorkingHoursRequest } from '@/types/admin';
import type { DataResult, Result } from '@/types/api';
import type { EmployeeWorkplace, WorkingHourResponse } from '@/types/booking';

export interface StaffScheduleExceptionItem {
  id: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
  typeName?: string | null;
}

export const employeeService = {
  async getMyWorkplaces(): Promise<DataResult<EmployeeWorkplace[]>> {
    const { data } = await apiClient.get<DataResult<EmployeeWorkplace[]>>('/api/staff/me/workplaces');
    return data;
  },
  async updateMyBiography(biography: string | null): Promise<Result> {
    const { data } = await apiClient.put<Result>('/api/staff/me/biography', { biography });
    return data;
  },
  async getBusinessServices(): Promise<DataResult<BusinessServiceItem[]>> {
    const { data } = await apiClient.get<DataResult<BusinessServiceItem[]>>('/api/services/my-business');
    return data;
  },
  async getMyAssignedServices(
    staffProfileId?: string,
    branchId?: string,
  ): Promise<DataResult<BusinessServiceItem[]>> {
    const params: Record<string, string> = {};
    if (staffProfileId) params.staffProfileId = staffProfileId;
    if (branchId) params.branchId = branchId;
    const { data } = await apiClient.get<DataResult<BusinessServiceItem[]>>(
      '/api/services/me/staff-services',
      { params: Object.keys(params).length > 0 ? params : undefined },
    );
    return data;
  },
  async updateMyAssignedServices(
    staffProfileId: string,
    branchId: string,
    serviceIds: string[],
  ): Promise<Result> {
    const { data } = await apiClient.put<Result>('/api/services/me/staff-services', {
      staffProfileId,
      branchId,
      serviceIds,
    });
    return data;
  },
  async getMyWorkingHours(
    staffProfileId: string,
    branchId: string,
  ): Promise<DataResult<WorkingHourResponse[]>> {
    const { data } = await apiClient.get<DataResult<WorkingHourResponse[]>>(
      `/api/schedules/staff/${staffProfileId}/branch/${branchId}/working-hours`,
    );
    return data;
  },
  async saveMyWorkingHours(payload: SetStaffWorkingHoursRequest): Promise<Result> {
    const { data } = await apiClient.post<Result>('/api/schedules/staff-working-hours', payload);
    return data;
  },
  async getMyExceptions(
    staffProfileId: string,
    branchId: string,
  ): Promise<DataResult<StaffScheduleExceptionItem[]>> {
    const { data } = await apiClient.get<DataResult<StaffScheduleExceptionItem[]>>(
      `/api/schedules/staff/${staffProfileId}/branch/${branchId}/exceptions`,
    );
    return data;
  },
  async addMyException(payload: {
    staffProfileId: string;
    branchId: string;
    startAt: string;
    endAt: string;
    reason?: string;
    cancelConflictingAppointments?: boolean;
  }): Promise<Result> {
    const { data } = await apiClient.post<Result>('/api/schedules/staff-exception', payload);
    return data;
  },
  async deleteMyException(exceptionId: string): Promise<Result> {
    const { data } = await apiClient.delete<Result>(
      `/api/schedules/staff-exception/${exceptionId}`,
    );
    return data;
  },
};
