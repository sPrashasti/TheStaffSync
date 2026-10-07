import api from './api';

export const getNotifications = async (params = {}) => {
  const { data } = await api.get('/notifications', { params });
  return data.data;
};

export const markNotificationRead = async (id) => {
  const { data } = await api.put(`/notifications/${id}/read`);
  return data.data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.put('/notifications/read-all');
  return data.data;
};
