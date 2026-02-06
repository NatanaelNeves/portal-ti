import api from './api';
import { Ticket, TicketType, TicketPriority } from '../types';

export const ticketService = {
  create: async (title: string, description: string, type?: TicketType, priority?: TicketPriority) => {
    const response = await api.post('/tickets', { title, description, type, priority });
    return response.data;
  },

  getMyTickets: async (): Promise<Ticket[]> => {
    const response = await api.get('/tickets/my-tickets');
    return response.data;
  },

  getAllTickets: async (skip = 0, limit = 20, status?: string) => {
    const response = await api.get('/tickets', { params: { skip, limit, status } });
    return response.data;
  },

  getTicketById: async (id: string): Promise<Ticket> => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/tickets/${id}/status`, { status });
    return response.data;
  },

  assign: async (id: string, assignedToId: string) => {
    const response = await api.patch(`/tickets/${id}/assign`, { assignedToId });
    return response.data;
  },
};
