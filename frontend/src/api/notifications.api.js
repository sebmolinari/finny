import api from "./client";

export const notificationsAPI = {
  getAll: (unreadOnly = false) =>
    api.get("/notifications", {
      params: unreadOnly ? { unread_only: true } : {},
    }),

  markRead: (id) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch("/notifications/read-all"),

  purgeAll: () => api.delete("/notifications/admin/purge"),
};
