import apiClient from '@/lib/axios';
import type { DataResult } from '@/types/api';
import type { BranchSearchResponse, NearbyBranchesQuery } from '@/types/booking';

export const searchService = {
  async getBranch(branchId: string): Promise<DataResult<BranchSearchResponse>> {
    const { data } = await apiClient.get<DataResult<BranchSearchResponse>>(`/api/search/branch/${branchId}`);
    return data;
  },
  async getNearbyBranches(query: NearbyBranchesQuery): Promise<DataResult<BranchSearchResponse[]>> {
    const { data } = await apiClient.get<DataResult<BranchSearchResponse[]>>('/api/search/nearby', {
      params: {
        latitude: query.latitude,
        longitude: query.longitude,
        ...(query.radiusKm && query.radiusKm > 0 ? { radiusKm: query.radiusKm } : {}),
        ...(query.queryText?.trim() ? { queryText: query.queryText.trim() } : {}),
        ...(query.city?.trim() ? { city: query.city.trim() } : {}),
        ...(query.district?.trim() ? { district: query.district.trim() } : {}),
        pageNumber: query.pageNumber ?? 1,
        pageSize: query.pageSize ?? 20,
      },
    });
    return data;
  },
};

