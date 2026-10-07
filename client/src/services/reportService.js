import api from './api';

export const getDepartmentStats = async () => (await api.get('/reports/department-stats')).data.data;
export const getAttendanceSummary = async (params = {}) => (await api.get('/reports/attendance-summary', { params })).data.data;
export const getLeaveSummary = async (params = {}) => (await api.get('/reports/leave-summary', { params })).data.data;
export const getTrainingSummary = async (params = {}) => (await api.get('/reports/training-summary', { params })).data.data;
