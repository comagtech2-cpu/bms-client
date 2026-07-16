import { create } from 'zustand';
import api from '../api/axios';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'low_stock' | 'credit_due' | 'daily_summary' | 'info';
  link?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  page: number;
  totalPages: number;
  fetchNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  generateNotifications: () => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  page: 1,
  totalPages: 1,

  fetchNotifications: async (page = 1) => {
    set({ loading: true });
    try {
      const res = await api.get('/notifications', { params: { page, limit: 15 } });
      set({
        notifications: res.data.data,
        unreadCount: res.data.unreadCount,
        page: res.data.page,
        totalPages: res.data.totalPages,
      });
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      set({ unreadCount: res.data.unreadCount });
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  },

  generateNotifications: async () => {
    try {
      await api.post('/notifications/generate');
      await get().fetchNotifications(1);
    } catch (err) {
      console.error('Failed to generate notifications', err);
    }
  },

  clearAll: async () => {
    try {
      await api.delete('/notifications');
      set({ notifications: [], unreadCount: 0 });
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  },
}));
