export interface CreateBusinessRequest {
  name: string;
  description?: string;
  phoneNumber: string;
  branchName: string;
  address: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
}

export interface CreateBranchRequest {
  name: string;
  address: string;
  city: string;
  district: string;
  phoneNumber?: string;
  latitude: number;
  longitude: number;
}

export interface UpdateBranchRequest extends Omit<CreateBranchRequest, 'phoneNumber'> {
  id: string;
  isActive: boolean;
}

export interface UpdateBusinessRequest {
  name: string;
  description?: string;
  phoneNumber: string;
}

export interface CreateStaffRequest {
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  biography?: string | null;
  profileImageUrl?: string;
  isBookable: boolean;
  branchIds: string[];
}

export interface BranchServiceOverride {
  branchId: string;
  branchName?: string;
  priceOverride?: number | null;
  durationOverride?: number | null;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  durationMinutes: number;
  basePrice: number;
  assignToBranchIds?: string[];
  branchOverrides?: BranchServiceOverride[];
}

export interface UpdateServiceRequest extends CreateServiceRequest {
  id: string;
  isActive: boolean;
}

export interface BusinessServiceItem {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  basePrice: number;
  isActive: boolean;
  assignedBranchIds?: string[];
  assignedBranchNames?: string[];
  branchOverrides?: BranchServiceOverride[];
}

export interface SetStaffWorkingHoursRequest {
  staffProfileId: string;
  branchId: string;
  workingHours: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breaks: Array<{ startTime: string; endTime: string }>;
  }>;
}

export interface SubscribeRequest {
  planId: string;
  billingCycle: number;
}

export interface BusinessPenaltyItem {
  id: string;
  customerUserId: string;
  customerFullName: string;
  customerEmail: string;
  customerPhoneNumber: string;
  appointmentId: string | null;
  branchName: string | null;
  serviceName: string | null;
  appointmentStartAt: string | null;
  reasonName: string;
  note: string | null;
  isActive: boolean;
  isExpired: boolean;
  createdDate: string;
  expiresAt: string;
  customerActivePenaltyCount: number;
}

