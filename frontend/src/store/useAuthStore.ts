import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LoginResponse, Role, User } from '@/types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  isAuthenticated: boolean;
  setAuth: (auth: LoginResponse) => void;
  updateTokens: (auth: LoginResponse) => void;
  logout: () => void;
  hasRole: (role: Role | Role[]) => boolean;
}

const mapAuthToUser = (auth: LoginResponse): User => ({
  id: auth.userId,
  fullName: auth.fullName,
  email: auth.email,
  roles: auth.roles,
  businessId: auth.businessId,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      isAuthenticated: false,

      setAuth: (auth) =>
        set({
          user: mapAuthToUser(auth),
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          accessTokenExpiresAt: auth.accessTokenExpiresAt,
          refreshTokenExpiresAt: auth.refreshTokenExpiresAt,
          isAuthenticated: true,
        }),

      updateTokens: (auth) =>
        set({
          user: mapAuthToUser(auth),
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          accessTokenExpiresAt: auth.accessTokenExpiresAt,
          refreshTokenExpiresAt: auth.refreshTokenExpiresAt,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          isAuthenticated: false,
        }),

      hasRole: (role) => {
        const userRoles = get().user?.roles ?? [];
        if (Array.isArray(role)) {
          return role.some((r) => userRoles.includes(r));
        }
        return userRoles.includes(role);
      },
    }),
    {
      name: 'barberbooking-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

