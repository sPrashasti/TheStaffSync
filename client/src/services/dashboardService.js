import api from './api';

export const getEmployeeDashboard = async () => (await api.get('/dashboard/employee')).data.data;
export const getManagerDashboard = async () => (await api.get('/dashboard/manager')).data.data;
export const getHrDashboard = async () => (await api.get('/dashboard/hr')).data.data;
