import apiClient from '@/lib/axios';
import type { DataResult, Result } from '@/types/api';
import type { NotificationResponse, UnreadNotificationCount } from '@/types/notification';

export const notificationService = {
  async getMyNotifications(
    unreadOnly = false,
    skip = 0,
    take = 20,
  ): Promise<DataResult<NotificationResponse[]>> {
    const { data } = await apiClient.get<DataResult<NotificationResponse[]>>(
      '/api/notifications',
      { params: { unreadOnly, skip, take } },
    );
    return data;
  },

  async getUnreadCount(): Promise<DataResult<UnreadNotificationCount>> {
    const { data } = await apiClient.get<DataResult<UnreadNotificationCount>>(
      '/api/notifications/unread-count',
    );
    return data;
  },

  async markAsRead(id: string): Promise<Result> {
    const { data } = await apiClient.patch<Result>(`/api/notifications/${id}/read`);
    return data;
  },

  async markAllAsRead(): Promise<Result> {
    const { data } = await apiClient.patch<Result>('/api/notifications/read-all');
    return data;
  },
};

