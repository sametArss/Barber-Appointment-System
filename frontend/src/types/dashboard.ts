/**
 * GET /api/reports/dashboard sorgu parametreleri (DashboardSummaryQueryDto).
 */
export interface DashboardSummaryQuery {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * En çok tercih edilen hizmet raporu (TopServiceReportDto).
 */
export interface TopService {
  serviceId: string;
  serviceName: string;
  appointmentCount: number;
  totalRevenue: number;
}

/**
 * Personel performans raporu (StaffPerformanceReportDto).
 */
export interface StaffPerformance {
  staffProfileId: string;
  staffFullName: string;
  completedAppointments: number;
  totalRevenue: number;
  averageRating: number;
}

/**
 * GET /api/reports/dashboard yanıt modeli (DashboardSummaryResponseDto).
 */
export interface DashboardSummaryResponse {
  totalRevenue: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  cancellationRate: number;
  averageRating: number;
  topServices: TopService[];
  staffPerformances: StaffPerformance[];
}

