import apiClient from '../../../services/apiClient.js';

export const getMapLayers = async (filters = {}) => {
  const response = await apiClient.get('/map/layers', { params: filters });
  return response.data;
};

export const getWardsGeoJson = async () => {
  const response = await apiClient.get('/map/wards');
  return response.data;
};

export const getRoadsGeoJson = async () => {
  const response = await apiClient.get('/map/roads');
  return response.data;
};
