import apiClient from '../../../services/apiClient.js';

export const loginUser = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await apiClient.post('/auth/forgotpassword', { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await apiClient.post(`/auth/resetpassword/${token}`, { password });
  return response.data;
};

export const getProfile = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await apiClient.put('/auth/updatedetails', profileData);
  return response.data;
};
