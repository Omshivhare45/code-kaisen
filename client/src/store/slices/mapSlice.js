import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  center: [23.2520, 77.4050], // Delhi/Bhopal center coordinates default
  zoom: 13,
  filters: {
    department: 'all',
    status: 'all',
    searchQuery: '',
    timeRange: 'all', // 'active', 'upcoming', 'past', 'all'
  },
  layers: {
    permits: true,
    complaints: true,
    roads: true,
    boundaries: true,
    heatmap: false,
  },
  selectedPermitId: null,
  selectedComplaintId: null,
  drawingMode: null, // 'point', 'circle', 'line', null
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setViewport(state, action) {
      state.center = action.payload.center;
      if (action.payload.zoom) {
        state.zoom = action.payload.zoom;
      }
    },
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
    toggleLayer(state, action) {
      const layer = action.payload;
      if (state.layers[layer] !== undefined) {
        state.layers[layer] = !state.layers[layer];
      }
    },
    selectPermit(state, action) {
      state.selectedPermitId = action.payload;
      state.selectedComplaintId = null;
    },
    selectComplaint(state, action) {
      state.selectedComplaintId = action.payload;
      state.selectedPermitId = null;
    },
    setDrawingMode(state, action) {
      state.drawingMode = action.payload;
    },
    clearSelection(state) {
      state.selectedPermitId = null;
      state.selectedComplaintId = null;
    }
  }
});

export const {
  setViewport,
  setFilters,
  resetFilters,
  toggleLayer,
  selectPermit,
  selectComplaint,
  setDrawingMode,
  clearSelection
} = mapSlice.actions;

export default mapSlice.reducer;
