import apiClient from '@/lib/axios';
import type { DataResult } from '@/types/api';
import type { LoginRequest, LoginResponse, RegisterRequest } from '@/types/auth';

export const authService = {
  async login(payload: LoginRequest): Promise<DataResult<LoginResponse>> {
    const { data } = await apiClient.post<DataResult<LoginResponse>>('/api/auth/login', payload);
    return data;
  },

  async register(payload: RegisterRequest): Promise<DataResult<LoginResponse>> {
    const { data } = await apiClient.post<DataResult<LoginResponse>>('/api/auth/register', payload);
    return data;
  },
};

