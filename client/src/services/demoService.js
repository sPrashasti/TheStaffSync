import api from './api';

// Whether the public demo is available: { available, organisationName, roles }.
export const getDemo = async () => (await api.get('/demo')).data.data;
// One-click sign-in as the demo organisation's HR, manager or employee.
export const demoLogin = async (role) => (await api.post('/demo/login', { role })).data.data;
