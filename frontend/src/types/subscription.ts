/**
 * Şube yanıt modeli (BranchResponseDto).
 */
export interface BranchResponse {
  id: string;
  businessId: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phoneNumber: string;
  longitude: number;
  latitude: number;
  isActive: boolean;
}

/**
 * İşletme abonelik planı (SubscriptionPlanDto).
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  annualPrice: number;
  maxBranchCount: number;
  maxStaffPerBranch: number;
  maxMonthlyAppointments: number;
  hasSmsNotification: boolean;
  hasAdvancedReporting: boolean;
  isActive: boolean;
}

/**
 * GET /api/subscriptions/my-subscription yanıt modeli (BusinessSubscriptionDetailsDto).
 */
export interface BusinessSubscriptionDetails {
  subscriptionId: string;
  businessId: string;
  planId: string;
  planName: string;
  status: number;
  statusName: string;
  billingCycle: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  maxBranchCount: number;
  maxStaffPerBranch: number;
  maxMonthlyAppointments: number;
  currentBranchCount: number;
  currentStaffCount: number;
}

/**
 * POST /api/penalties istek modeli (CreatePenaltyRequestDto).
 * Reason: 1 = NoShow, 2 = LateCancellation, 3 = ManualByBusiness
 */
export interface CreatePenaltyRequest {
  customerUserId: string;
  appointmentId?: string | null;
  reason: 1 | 2 | 3;
  note?: string | null;
}

