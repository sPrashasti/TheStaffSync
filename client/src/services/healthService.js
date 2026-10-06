import api from './api';

export const getHealth = async () => {
  const { data } = await api.get('/health');
  return data;
};
