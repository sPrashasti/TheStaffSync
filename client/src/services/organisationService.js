import api from './api';

// A company starts using StaffSync: creates the organisation and its first HR account.
export const signup = async ({ companyName, name, email, password }) =>
  (await api.post('/organisations/signup', { companyName, name, email, password })).data.data;
// Always the signed-in user's own organisation; there is no way to ask for another.
export const getMyOrganisation = async () => (await api.get('/organisations/me')).data.data;
export const updateMyOrganisation = async (changes) => (await api.put('/organisations/me', changes)).data.data;
