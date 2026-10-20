import api from './api';

// Photos are sent and received as images, not JSON. They need the session token, so they are
// fetched here and shown from memory rather than linked with <img src> directly.

export const uploadMyPhoto = async (blob) => {
  const { data } = await api.put('/profile-photos/me', blob, { headers: { 'Content-Type': blob.type } });
  return data.data;
};

export const removeMyPhoto = async () => {
  const { data } = await api.delete('/profile-photos/me');
  return data.data;
};

// One object URL per photo version, shared by every avatar on screen.
const cache = new Map();

export const getPhotoUrl = (userId, version) => {
  const key = `${userId}:${version}`;
  if (!cache.has(key)) {
    const request = api
      .get(`/profile-photos/${userId}`, { responseType: 'blob' })
      .then(({ data }) => URL.createObjectURL(data))
      .catch((err) => {
        cache.delete(key);
        throw err;
      });
    cache.set(key, request);
  }
  return cache.get(key);
};
