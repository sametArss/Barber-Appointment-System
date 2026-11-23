import apiClient from '@/lib/axios';
import type { BusinessServiceItem } from '@/types/admin';
import type { DataResult, Result } from '@/types/api';
import type { EmployeeWorkplace } from '@/types/booking';

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
  async getMyAssignedServices(staffProfileId?: string): Promise<DataResult<BusinessServiceItem[]>> {
    const { data } = await apiClient.get<DataResult<BusinessServiceItem[]>>('/api/services/me/staff-services', {
      params: staffProfileId ? { staffProfileId } : undefined,
    });
    return data;
  },
  async updateMyAssignedServices(staffProfileId: string, serviceIds: string[]): Promise<Result> {
    const { data } = await apiClient.put<Result>('/api/services/me/staff-services', {
      staffProfileId,
      serviceIds,
    });
    return data;
  },
};
