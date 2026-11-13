import apiClient from '@/lib/axios';
import type { DataResult, Result } from '@/types/api';
import type { CustomerProfileResponse } from '@/types/auth';

export const customerService = {
  async getMyProfile(): Promise<DataResult<CustomerProfileResponse>> {
    const { data } = await apiClient.get<DataResult<CustomerProfileResponse>>('/api/customers/me');
    return data;
  },
  async updateMyProfile(payload: { firstName: string; lastName: string; phoneNumber: string }): Promise<Result> {
    const { data } = await apiClient.put<Result>('/api/customers/me', payload);
    return data;
  },
};
