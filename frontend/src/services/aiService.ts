import api from './api';

export interface ArticleSuggestion {
  id: string;
  title: string;
  category: string;
  relevance: number;
}

export interface TicketClassification {
  type: string;
  category: string;
  priority: string;
  reasoning: string;
}

export interface TicketSummary {
  summary: string;
  keyPoints: string[];
  suggestedNextStep: string;
}

export const aiService = {
  async isEnabled(): Promise<boolean> {
    try {
      const res = await api.get('/ai/status');
      return res.data.enabled === true;
    } catch {
      return false;
    }
  },

  async suggestArticles(query: string): Promise<ArticleSuggestion[]> {
    try {
      const res = await api.post('/ai/suggest-articles', { query });
      return res.data.suggestions ?? [];
    } catch {
      return [];
    }
  },

  async classifyTicket(title: string, description: string, department: string): Promise<TicketClassification | null> {
    try {
      const res = await api.post('/ai/classify', { title, description, department });
      return res.data;
    } catch {
      return null;
    }
  },

  async summarizeTicket(ticketId: string): Promise<TicketSummary | null> {
    try {
      const res = await api.post(`/ai/summarize/${ticketId}`);
      return res.data;
    } catch {
      return null;
    }
  },
};
