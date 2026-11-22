import apiClient from '@/lib/axios';
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
};
