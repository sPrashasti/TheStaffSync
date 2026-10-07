import api from './api';

export const getNotifications = async (params = {}) => (await api.get('/notifications', { params })).data.data;
export const markNotificationRead = async (id) => (await api.put(`/notifications/${id}/read`)).data.data;
export const markAllNotificationsRead = async () => (await api.put('/notifications/read-all')).data.data;
