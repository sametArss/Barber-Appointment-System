import apiClient from '@/lib/axios';
import type {
  BusinessServiceItem,
  CreateBranchRequest,
  CreateBusinessRequest,
  CreateServiceRequest,
  CreateStaffRequest,
  SetStaffWorkingHoursRequest,
  SubscribeRequest,
} from '@/types/admin';
import type { DataResult, Result } from '@/types/api';
import type {
  AppointmentResponse,
  CustomerPenaltyStatus,
  StaffResponse,
  UpdateAppointmentStatusRequest,
} from '@/types/booking';
import type {
  DashboardSummaryQuery,
  DashboardSummaryResponse,
} from '@/types/dashboard';
import type {
  BranchResponse,
  BusinessSubscriptionDetails,
  CreatePenaltyRequest,
  SubscriptionPlan,
} from '@/types/subscription';

export const adminService = {
  // Business & Branches
  async createBusiness(payload: CreateBusinessRequest): Promise<DataResult<any>> {
    const { data } = await apiClient.post<DataResult<any>>('/api/businesses', payload);
    return data;
  },

  async getMyBranches(): Promise<DataResult<BranchResponse[]>> {
    const { data } = await apiClient.get<DataResult<BranchResponse[]>>(
      '/api/businesses/me/branches',
    );
    return data;
  },

  async createBranch(payload: CreateBranchRequest): Promise<DataResult<BranchResponse>> {
    const { data } = await apiClient.post<DataResult<BranchResponse>>(
      '/api/businesses/branches',
      payload,
    );
    return data;
  },

  // Appointments
  async getBranchAppointments(
    branchId: string,
    date?: string,
  ): Promise<DataResult<AppointmentResponse[]>> {
    const { data } = await apiClient.get<DataResult<AppointmentResponse[]>>(
      `/api/appointments/branch/${branchId}`,
      {
        params: date ? { date } : undefined,
      },
    );
    return data;
  },

  async updateAppointmentStatus(payload: UpdateAppointmentStatusRequest): Promise<Result> {
    const { data } = await apiClient.patch<Result>('/api/appointments/status', payload);
    return data;
  },

  async addPenalty(payload: CreatePenaltyRequest): Promise<Result> {
    const { data } = await apiClient.post<Result>('/api/penalties', payload);
    return data;
  },

  async getMyPenaltyStatus(businessId: string): Promise<DataResult<CustomerPenaltyStatus>> {
    const { data } = await apiClient.get<DataResult<CustomerPenaltyStatus>>(
      `/api/penalties/my-status/${businessId}`,
    );
    return data;
  },

  // Staff
  async getBusinessStaff(): Promise<DataResult<StaffResponse[]>> {
    const { data } = await apiClient.get<DataResult<StaffResponse[]>>('/api/staff');
    return data;
  },

  async createStaff(payload: CreateStaffRequest): Promise<DataResult<StaffResponse>> {
    const { data } = await apiClient.post<DataResult<StaffResponse>>('/api/staff', payload);
    return data;
  },

  async setStaffWorkingHours(payload: SetStaffWorkingHoursRequest): Promise<Result> {
    const { data } = await apiClient.post<Result>(
      '/api/schedules/staff-working-hours',
      payload,
    );
    return data;
  },

  // Services
  async getBusinessServices(): Promise<DataResult<BusinessServiceItem[]>> {
    const { data } = await apiClient.get<DataResult<BusinessServiceItem[]>>(
      '/api/services/my-business',
    );
    return data;
  },

  async createService(payload: CreateServiceRequest): Promise<DataResult<BusinessServiceItem>> {
    const { data } = await apiClient.post<DataResult<BusinessServiceItem>>(
      '/api/services',
      payload,
    );
    return data;
  },

  async assignServiceToBranch(payload: {
    branchId: string;
    serviceId: string;
    priceOverride?: number;
    durationOverride?: number;
  }): Promise<Result> {
    const { data } = await apiClient.post<Result>('/api/services/assign-branch', payload);
    return data;
  },

  async assignServicesToStaff(payload: {
    staffProfileId: string;
    serviceIds: string[];
  }): Promise<Result> {
    const { data } = await apiClient.post<Result>('/api/services/assign-staff', payload);
    return data;
  },

  // Reports
  async getDashboardSummary(
    query?: DashboardSummaryQuery,
  ): Promise<DataResult<DashboardSummaryResponse>> {
    const { data } = await apiClient.get<DataResult<DashboardSummaryResponse>>(
      '/api/reports/dashboard',
      {
        params: query,
      },
    );
    return data;
  },

  // Subscription
  async getMySubscription(): Promise<DataResult<BusinessSubscriptionDetails>> {
    const { data } = await apiClient.get<DataResult<BusinessSubscriptionDetails>>(
      '/api/subscriptions/my-subscription',
    );
    return data;
  },

  async getSubscriptionPlans(): Promise<DataResult<SubscriptionPlan[]>> {
    const { data } = await apiClient.get<DataResult<SubscriptionPlan[]>>(
      '/api/subscriptions/plans',
    );
    return data;
  },

  async subscribe(payload: SubscribeRequest): Promise<Result> {
    const { data } = await apiClient.post<Result>('/api/subscriptions/subscribe', payload);
    return data;
  },
};
