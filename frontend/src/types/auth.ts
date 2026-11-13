/**
 * Sistemdeki kullanıcı rolleri (DatabaseSeeder & RBAC).
 */
export type Role =
  | 'SystemAdmin'
  | 'BusinessOwner'
  | 'BusinessManager'
  | 'Employee'
  | 'Customer';

/**
 * Giriş yapmış kullanıcı profili.
 */
export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  roles: Role[];
  businessId: string | null;
}

/**
 * POST /api/auth/login istek modeli (LoginRequestDto).
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/register istek modeli (RegisterRequestDto).
 */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

/**
 * POST /api/auth/refresh-token istek modeli (RefreshTokenRequestDto).
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * AuthController yanıt modeli (AuthResponseDto).
 */
export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  roles: Role[];
  businessId: string | null;
}

export interface CustomerProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  totalAppointments: number;
  completedAppointments: number;
  activePenalties: number;
  isRestricted: boolean;
}

