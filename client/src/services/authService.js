import api from './api';

export const login = async ({ email, password }) => (await api.post('/auth/login', { email, password })).data.data;
export const register = async ({ name, email, password }) => (await api.post('/auth/register', { name, email, password })).data.data;
export const getMe = async () => (await api.get('/auth/me')).data.data;
export const changePassword = async ({ currentPassword, newPassword }) => (await api.put('/auth/password', { currentPassword, newPassword })).data.data;
