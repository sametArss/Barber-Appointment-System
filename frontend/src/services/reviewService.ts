import apiClient from '@/lib/axios';
import type { DataResult } from '@/types/api';
import type {
  BusinessReviewSummary,
  CreateReviewRequest,
  ReviewResponse,
} from '@/types/review';

export const reviewService = {
  async createReview(payload: CreateReviewRequest): Promise<DataResult<ReviewResponse>> {
    const { data } = await apiClient.post<DataResult<ReviewResponse>>('/api/reviews', payload);
    return data;
  },

  async getBranchReviews(branchId: string): Promise<DataResult<ReviewResponse[]>> {
    const { data } = await apiClient.get<DataResult<ReviewResponse[]>>(
      `/api/reviews/branch/${branchId}`,
    );
    return data;
  },

  async getBusinessSummary(businessId: string): Promise<DataResult<BusinessReviewSummary>> {
    const { data } = await apiClient.get<DataResult<BusinessReviewSummary>>(
      `/api/reviews/business/${businessId}/summary`,
    );
    return data;
  },
};

