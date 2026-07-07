import apiClient from '../../../services/apiClient.js';

export const getPermits = async (filters = {}) => {
  const response = await apiClient.get('/permits', { params: filters });
  return response.data;
};

export const getPermitById = async (id) => {
  const response = await apiClient.get(`/permits/${id}`);
  return response.data;
};

export const createPermit = async (permitData) => {
  const response = await apiClient.post('/permits', permitData);
  return response.data;
};

export const updatePermitStatus = async (id, statusData) => {
  const response = await apiClient.put(`/permits/${id}/status`, statusData);
  return response.data;
};

export const deletePermit = async (id) => {
  const response = await apiClient.delete(`/permits/${id}`);
  return response.data;
};

export const getConflicts = async () => {
  const response = await apiClient.get('/admin/conflicts');
  return response.data;
};
