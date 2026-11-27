import apiClient from '@/lib/axios';
import type { DataResult, Result } from '@/types/api';
import type { FavoriteBranchResponse, FavoriteToggleResponse } from '@/types/favorite';

export const favoriteService = {
  async getMyFavorites(): Promise<DataResult<FavoriteBranchResponse[]>> {
    const { data } = await apiClient.get<DataResult<FavoriteBranchResponse[]>>('/api/favorites');
    return data;
  },

  async getMyFavoriteBranchIds(): Promise<DataResult<string[]>> {
    const { data } = await apiClient.get<DataResult<string[]>>('/api/favorites/ids');
    return data;
  },

  async toggleFavorite(branchId: string): Promise<DataResult<FavoriteToggleResponse>> {
    const { data } = await apiClient.post<DataResult<FavoriteToggleResponse>>(
      `/api/favorites/toggle/${branchId}`,
    );
    return data;
  },

  async removeFavorite(branchId: string): Promise<Result> {
    const { data } = await apiClient.delete<Result>(`/api/favorites/${branchId}`);
    return data;
  },
};
