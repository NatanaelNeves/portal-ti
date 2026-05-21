import api from './api';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface EquipmentType {
  id: string;
  name: string;
  description: string | null;
  buffer_minutes: number;
  icon: string | null;
}

export interface EquipmentTypeAdmin extends EquipmentType {
  max_quantity: number;
  is_active: boolean;
  active_reservations: number;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityResult {
  available: boolean;
  remaining: number;
  capacity_status?: 'available' | 'partial';
  reason?: 'conflict' | 'buffer';
  next_available?: string;
  buffer_minutes?: number;
  message?: string;
}

export interface Reservation {
  id: string;
  reservation_number: string;
  equipment_type_id: string;
  type_name: string;
  type_icon: string | null;
  quantity: number;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  purpose: string;
  status: ReservationStatus;
  requester_name: string | null;
  requester_email: string | null;
  requester_phone: string | null;
  internal_user_name: string | null;
  internal_user_id: string | null;
  approved_by_name: string | null;
  rejection_reason: string | null;
  notes: string | null;
  access_token: string | null;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus =
  | 'pending' | 'approved' | 'rejected'
  | 'ready' | 'in_use' | 'returned'
  | 'no_show' | 'cancelled';

export interface CreateReservationPayload {
  equipment_type_id: string;
  quantity: number;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  purpose: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
}

export interface ReservationListResult {
  reservations: Reservation[];
  total: number;
  page: number;
  limit: number;
}

export interface ActiveNowResult {
  count: number;
  type: string;
  next_return: { time: string; location: string } | null;
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Recusada',
  ready: 'Pronta para Retirada',
  in_use: 'Em Uso',
  returned: 'Devolvida',
  no_show: 'Não Compareceu',
  cancelled: 'Cancelada',
};

export const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: '#F59E0B',
  approved: '#4A90E2',
  rejected: '#B91C1C',
  ready: '#8B5CF6',
  in_use: '#007A33',
  returned: '#6B7280',
  no_show: '#F28C38',
  cancelled: '#EF4444',
};

export const reservationService = {
  // Público
  getTypes: async (): Promise<EquipmentType[]> => {
    const res = await axios.get(`${API_BASE}/api/reservations/types`);
    return res.data;
  },

  checkAvailability: async (
    typeId: string | null,
    date: string,
    startTime: string,
    endTime: string,
    quantity: number,
  ): Promise<AvailabilityResult> => {
    const params: Record<string, any> = { date, start_time: startTime, end_time: endTime, quantity };
    if (typeId) params.type_id = typeId;
    const res = await axios.get(`${API_BASE}/api/reservations/availability`, { params });
    return res.data;
  },

  createPublic: async (payload: Omit<CreateReservationPayload, 'equipment_type_id'> & { equipment_type_id?: string }): Promise<{ id: string; reservation_number: string; access_token: string; tracking_url: string }> => {
    const res = await axios.post(`${API_BASE}/api/reservations`, payload);
    return res.data;
  },

  getByToken: async (token: string): Promise<Reservation> => {
    const res = await axios.get(`${API_BASE}/api/reservations/public/${token}`);
    return res.data;
  },

  getICSUrlByToken: (token: string) => `${API_BASE}/api/reservations/public/${token}/ics`,

  // Autenticado
  create: async (payload: CreateReservationPayload): Promise<{ id: string; reservation_number: string }> => {
    const res = await api.post('/reservations', payload);
    return res.data;
  },

  getMyReservations: async (): Promise<Reservation[]> => {
    const res = await api.get('/reservations/my');
    return res.data;
  },

  getById: async (id: string): Promise<Reservation> => {
    const res = await api.get(`/reservations/${id}`);
    return res.data;
  },

  getICSUrl: (id: string) => `${API_BASE}/api/reservations/${id}/ics`,

  cancel: async (id: string): Promise<void> => {
    await api.patch(`/reservations/${id}/cancel`);
  },

  // Admin / TI
  getAll: async (params: {
    date_filter?: string;
    status?: string;
    type_id?: string;
    page?: number;
    limit?: number;
    sort?: 'date_asc' | 'date_desc';
  }): Promise<ReservationListResult> => {
    const res = await api.get('/reservations', { params });
    return res.data;
  },

  getActiveNow: async (): Promise<ActiveNowResult> => {
    const res = await api.get('/reservations/active-now');
    return res.data;
  },

  exportCSV: (params: { date_filter?: string; status?: string; type_id?: string }) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return `${API_BASE}/api/reservations/export/csv?${qs}`;
  },

  approve: async (id: string): Promise<void> => {
    await api.patch(`/reservations/${id}/approve`);
  },

  reject: async (id: string, reason: string): Promise<void> => {
    await api.patch(`/reservations/${id}/reject`, { reason });
  },

  markReady: async (id: string): Promise<void> => {
    await api.patch(`/reservations/${id}/ready`);
  },

  markNoShow: async (id: string): Promise<void> => {
    await api.patch(`/reservations/${id}/no-show`);
  },

  // Admin — tipos
  getEquipmentTypes: async (): Promise<EquipmentTypeAdmin[]> => {
    const res = await api.get('/reservations/equipment-types');
    return res.data;
  },

  createEquipmentType: async (data: { name: string; description?: string; max_quantity: number; buffer_minutes?: number; icon?: string }): Promise<EquipmentTypeAdmin> => {
    const res = await api.post('/reservations/equipment-types', data);
    return res.data;
  },

  updateEquipmentType: async (id: string, data: Partial<{ name: string; description: string; max_quantity: number; buffer_minutes: number; icon: string; is_active: boolean }>): Promise<EquipmentTypeAdmin> => {
    const res = await api.patch(`/reservations/equipment-types/${id}`, data);
    return res.data;
  },

  deleteEquipmentType: async (id: string): Promise<void> => {
    await api.delete(`/reservations/equipment-types/${id}`);
  },
};
