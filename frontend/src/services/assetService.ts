import api from './api';
import { Asset, AssetStatus } from '../types';

export const assetService = {
  create: async (name: string, assetType: string, serialNumber?: string, manufacturer?: string, model?: string) => {
    const response = await api.post('/assets', { name, assetType, serialNumber, manufacturer, model });
    return response.data;
  },

  getAssetById: async (id: string): Promise<Asset> => {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },

  getAssetsByStatus: async (status: AssetStatus, skip = 0, limit = 20) => {
    const response = await api.get(`/assets/status/${status}`, { params: { skip, limit } });
    return response.data;
  },

  updateStatus: async (id: string, status: AssetStatus) => {
    const response = await api.patch(`/assets/${id}/status`, { status });
    return response.data;
  },

  assign: async (id: string, userId: string, departmentId?: string, location?: string) => {
    const response = await api.patch(`/assets/${id}/assign`, { userId, departmentId, location });
    return response.data;
  },
};
