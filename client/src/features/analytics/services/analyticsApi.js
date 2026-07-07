import apiClient from '../../../services/apiClient.js';

export const getDepartmentPerformance = async () => {
  const response = await apiClient.get('/analytics/performance');
  return response.data;
};

export const getPermitStats = async () => {
  const response = await apiClient.get('/analytics/permits');
  return response.data;
};

export const getComplaintStats = async () => {
  const response = await apiClient.get('/analytics/complaints');
  return response.data;
};

export const getSlaViolations = async () => {
  const response = await apiClient.get('/analytics/sla');
  return response.data;
};
