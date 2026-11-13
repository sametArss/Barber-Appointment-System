/**
 * GET /api/notifications yanıt öğesi (NotificationResponseDto).
 */
export interface NotificationResponse {
  id: string;
  userId: string;
  type: number;
  typeName: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  relatedEntityId: string | null;
  createdDate: string;
}

/**
 * GET /api/notifications/unread-count yanıt modeli (UnreadNotificationCountDto).
 */
export interface UnreadNotificationCount {
  unreadCount: number;
}

