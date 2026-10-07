import api from './api';

export const listAnnouncements = async (params = {}) => (await api.get('/announcements', { params })).data.data;
export const createAnnouncement = async (body) => (await api.post('/announcements', body)).data.data;
export const updateAnnouncement = async (id, body) => (await api.put(`/announcements/${id}`, body)).data.data;
export const deleteAnnouncement = async (id) => (await api.delete(`/announcements/${id}`)).data.data;
