import apiClient from '@/lib/axios';
import type { DataResult } from '@/types/api';
import type { EmployeeWorkplace } from '@/types/booking';

export const employeeService = {
  async getMyWorkplaces(): Promise<DataResult<EmployeeWorkplace[]>> {
    const { data } = await apiClient.get<DataResult<EmployeeWorkplace[]>>('/api/staff/me/workplaces');
    return data;
  },
};
