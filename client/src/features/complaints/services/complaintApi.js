import apiClient from '../../../services/apiClient.js';

export const getComplaints = async (filters = {}) => {
  const response = await apiClient.get('/complaints', { params: filters });
  return response.data;
};

export const getComplaintById = async (id) => {
  const response = await apiClient.get(`/complaints/${id}`);
  return response.data;
};

// Uses multipart/form-data for photo uploads
export const createComplaint = async (formData) => {
  const response = await apiClient.post('/complaints', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateComplaintStatus = async (id, statusData) => {
  const response = await apiClient.put(`/complaints/${id}/status`, statusData);
  return response.data;
};

export const submitFeedback = async (id, feedbackData) => {
  const response = await apiClient.post(`/complaints/${id}/feedback`, feedbackData);
  return response.data;
};
