export interface FavoriteBranchResponse {
  branchId: string;
  branchName: string;
  businessId: string;
  businessName: string;
  businessDescription: string | null;
  address: string;
  city: string;
  district: string;
  phoneNumber: string;
  createdAt: string;
  averageRating: number;
  totalReviewCount: number;
}

export interface FavoriteToggleResponse {
  branchId: string;
  isFavorited: boolean;
}
