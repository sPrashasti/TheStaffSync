import api from './api';

export const checkIn = async () => (await api.post('/attendance/check-in')).data.data;
export const checkOut = async () => (await api.post('/attendance/check-out')).data.data;
export const getToday = async () => (await api.get('/attendance/today')).data.data;
export const getMyAttendance = async (params = {}) => (await api.get('/attendance/my', { params })).data.data;
export const getTeamAttendance = async (params = {}) => (await api.get('/attendance/team', { params })).data.data;
export const getAllAttendance = async (params = {}) => (await api.get('/attendance', { params })).data.data;
