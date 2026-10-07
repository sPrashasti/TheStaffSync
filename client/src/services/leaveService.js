import api from './api';

export const applyLeave = async (body) => (await api.post('/leaves', body)).data.data;
export const getMyLeaves = async (params = {}) => (await api.get('/leaves/my', { params })).data.data;
export const getTeamLeaves = async (params = {}) => (await api.get('/leaves/team', { params })).data.data;
export const getAllLeaves = async (params = {}) => (await api.get('/leaves', { params })).data.data;
export const approveLeave = async (id) => (await api.put(`/leaves/${id}/approve`)).data.data;
export const rejectLeave = async (id, rejectionReason) => (await api.put(`/leaves/${id}/reject`, { rejectionReason })).data.data;
