import { platformApi } from './api';

// The StaffSync platform console (operator accounts only). Paths are under /api/platform.
export const login = async ({ email, password }) => (await platformApi.post('/auth/login', { email, password })).data.data;
export const getMe = async () => (await platformApi.get('/me')).data.data;
export const changePassword = async ({ currentPassword, newPassword }) =>
  (await platformApi.put('/auth/password', { currentPassword, newPassword })).data.data;

export const getStats = async () => (await platformApi.get('/stats')).data.data;
export const listOrganisations = async (params) => (await platformApi.get('/organisations', { params })).data.data;
export const getOrganisation = async (id) => (await platformApi.get(`/organisations/${id}`)).data.data;
export const renameOrganisation = async (id, name) => (await platformApi.patch(`/organisations/${id}`, { name })).data.data;
export const suspendOrganisation = async (id, reason) => (await platformApi.post(`/organisations/${id}/suspend`, { reason })).data.data;
export const reactivateOrganisation = async (id) => (await platformApi.post(`/organisations/${id}/reactivate`, {})).data.data;
export const listAudit = async (params) => (await platformApi.get('/audit', { params })).data.data;
