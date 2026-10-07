import api from './api';

export const listEmployees = async (params = {}) => (await api.get('/employees', { params })).data.data;
export const getMyProfile = async () => (await api.get('/employees/me')).data.data;
export const getMyTeam = async () => (await api.get('/employees/team')).data.data;
export const getEmployee = async (id) => (await api.get(`/employees/${id}`)).data.data;
export const createEmployee = async (body) => (await api.post('/employees', body)).data.data;
export const updateEmployee = async (id, body) => (await api.put(`/employees/${id}`, body)).data.data;
export const deactivateEmployee = async (id) => (await api.delete(`/employees/${id}`)).data.data;
