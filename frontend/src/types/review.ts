/**
 * POST /api/reviews istek modeli (CreateReviewRequestDto).
 */
export interface CreateReviewRequest {
  appointmentId: string;
  /** 1 - 5 arası yıldız puanı */
  rating: number;
  comment?: string | null;
}

/**
 * Yorum yanıt modeli (ReviewResponseDto).
 */
export interface ReviewResponse {
  id: string;
  appointmentId: string;
  customerUserId: string;
  customerFullName: string;
  businessId: string;
  branchId: string;
  branchName: string;
  staffProfileId: string;
  staffFullName: string;
  serviceName: string;
  rating: number;
  comment: string | null;
  createdDate: string;
}

/**
 * İşletme yorum özeti (BusinessReviewSummaryDto).
 */
export interface BusinessReviewSummary {
  businessId: string;
  averageRating: number;
  totalReviewCount: number;
  recentReviews: ReviewResponse[];
}

