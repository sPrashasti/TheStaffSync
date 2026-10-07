import api from './api';

export const listTrainings = async (params = {}) => (await api.get('/trainings', { params })).data.data;
export const getTraining = async (id) => (await api.get(`/trainings/${id}`)).data.data;
export const createTraining = async (body) => (await api.post('/trainings', body)).data.data;
export const updateTraining = async (id, body) => (await api.put(`/trainings/${id}`, body)).data.data;
export const deleteTraining = async (id) => (await api.delete(`/trainings/${id}`)).data.data;
export const enrollInTraining = async (id) => (await api.post(`/trainings/${id}/enroll`)).data.data;
export const withdrawFromTraining = async (id) => (await api.delete(`/trainings/${id}/enroll`)).data.data;
export const assignToTraining = async (id, employeeId) => (await api.post(`/trainings/${id}/participants`, { employeeId })).data.data;
export const removeFromTraining = async (id, employeeId) => (await api.delete(`/trainings/${id}/participants/${employeeId}`)).data.data;
