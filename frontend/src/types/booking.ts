/**
 * Randevu durum kodları (AppointmentStatus enum).
 * 1: Pending, 2: Confirmed, 3: Completed, 4: Cancelled, 5: NoShow
 */
export const AppointmentStatus = {
  Pending: 1,
  Confirmed: 2,
  Completed: 3,
  Cancelled: 4,
  NoShow: 5,
} as const;

export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

/**
 * GET /api/search/nearby sorgu parametreleri (NearbyBranchesQueryDto).
 */
export interface NearbyBranchesQuery {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  queryText?: string;
  city?: string;
  district?: string;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * GET /api/search/nearby yanıt öğesi (NearbyBranchResponseDto).
 */
export interface BranchSearchResponse {
  branchId: string;
  businessId: string;
  businessName: string;
  branchName: string;
  address: string;
  city: string;
  district: string;
  phoneNumber: string;
  longitude: number;
  latitude: number;
  distanceMeters: number;
  distanceKm: number;
  offeredServices: string[];
}

/**
 * GET /api/services/branch/{branchId} yanıt öğesi (BranchServiceResponseDto).
 */
export interface BranchServiceResponse {
  id: string;
  branchId: string;
  serviceId: string;
  serviceName: string;
  description: string | null;
  finalPrice: number;
  finalDurationMinutes: number;
  isActive: boolean;
}

/**
 * GET /api/staff/branch/{branchId} yanıt öğesi (StaffResponseDto).
 */
export interface StaffResponse {
  id: string;
  businessMemberId: string;
  userId: string;
  businessId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  temporaryPassword?: string | null;
  accountAlreadyExisted?: boolean;
  biography: string | null;
  profileImageUrl: string | null;
  isBookable: boolean;
  assignedBranchIds: string[];
}

export interface EmployeeWorkplace {
  staffProfileId: string;
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
  address: string;
  city: string;
  district: string;
  businessPhoneNumber: string;
  biography: string | null;
  isBookable: boolean;
}

/**
 * Çalışma saati mola aralığı (WorkingHourBreakDto).
 */
export interface WorkingHourBreak {
  startTime: string;
  endTime: string;
}

/**
 * Personel/Şube çalışma saati (WorkingHourResponseDto).
 */
export interface WorkingHourResponse {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breaks: WorkingHourBreak[];
}

/**
 * GET /api/appointments/available-slots sorgu parametreleri (AvailableSlotsQueryDto).
 */
export interface AvailableSlotsQuery {
  branchId: string;
  staffProfileId: string;
  serviceId: string;
  /** YYYY-MM-DD formatında tarih (DateOnly) */
  date: string;
}

/**
 * GET /api/appointments/available-slots yanıt öğesi (AvailableSlotResponseDto).
 */
export interface AvailableSlot {
  /** HH:mm:ss formatında yerel başlangıç saati */
  startTime: string;
  /** HH:mm:ss formatında yerel bitiş saati */
  endTime: string;
  /** ISO-8601 UTC başlangıç zamanı */
  startAtUtc: string;
  /** ISO-8601 UTC bitiş zamanı */
  endAtUtc: string;
}

/**
 * POST /api/appointments istek modeli (CreateAppointmentRequestDto).
 */
export interface AppointmentCreateRequest {
  branchId: string;
  staffProfileId: string;
  serviceId: string;
  /** ISO-8601 DateTimeOffset */
  startAt: string;
}

/**
 * Randevu iptal isteği (CancelAppointmentRequestDto).
 */
export interface CancelAppointmentRequest {
  appointmentId: string;
  reason: string;
}

/**
 * PATCH /api/appointments/status istek modeli (UpdateAppointmentStatusRequestDto).
 */
export interface UpdateAppointmentStatusRequest {
  appointmentId: string;
  newStatus: AppointmentStatus;
  note?: string | null;
}

/**
 * Randevu yanıt modeli (AppointmentResponseDto).
 */
export interface AppointmentResponse {
  id: string;
  customerUserId: string;
  customerFullName: string;
  customerPhoneNumber: string;
  businessId: string;
  branchId: string;
  branchName: string;
  staffProfileId: string;
  staffFullName: string;
  serviceId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  priceSnapshot: number;
  durationSnapshot: number;
  status: AppointmentStatus;
  statusName: string;
  cancellationReason: string | null;
}

/**
 * Müşteri ceza öğesi (PenaltyItemDto).
 */
export interface PenaltyItem {
  id: string;
  businessId: string;
  appointmentId: string | null;
  reasonName: string;
  note: string | null;
  createdDate: string;
  expiresAt: string;
}

/**
 * GET /api/penalties/my-status/{businessId} yanıt modeli (CustomerPenaltyStatusDto).
 */
export interface CustomerPenaltyStatus {
  customerUserId: string;
  activePenaltyCount: number;
  isRestricted: boolean;
  restrictionExpiresAt: string | null;
  restrictionMessage: string | null;
  penalties: PenaltyItem[];
}
