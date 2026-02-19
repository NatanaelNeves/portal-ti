import { io, Socket } from 'socket.io-client';
import { useToastStore } from '../stores/toastStore';

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server
   */
  connect(token: string) {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.token = token;
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
    this.authenticate();
  }

  /**
   * Authenticate socket connection
   */
  private authenticate() {
    if (this.socket && this.token) {
      this.socket.emit('authenticate', this.token);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
      this.authenticate();
    });

    this.socket.on('authenticated', (data: { success: boolean; error?: string }) => {
      if (data.success) {
        console.log('✅ WebSocket authenticated');
      } else {
        console.error('❌ WebSocket authentication failed:', data.error);
        this.disconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Ticket events
    this.socket.on('ticket:created', (data) => {
      console.log('🎫 New ticket created:', data);
      useToastStore.getState().info('Novo chamado criado!');
      window.dispatchEvent(new CustomEvent('ticket:created', { detail: data }));
    });

    this.socket.on('ticket:updated', (data) => {
      console.log('🎫 Ticket updated:', data);
      useToastStore.getState().info('Chamado atualizado!');
      window.dispatchEvent(new CustomEvent('ticket:updated', { detail: data }));
    });

    this.socket.on('ticket:assigned', (data) => {
      console.log('🎫 Ticket assigned:', data);
      useToastStore.getState().success(`Chamado #${data.ticketId} atribuído a você!`);
      window.dispatchEvent(new CustomEvent('ticket:assigned', { detail: data }));
    });

    this.socket.on('ticket:message', (data) => {
      console.log('💬 New message on ticket:', data);
      useToastStore.getState().info('Nova mensagem em chamado');
      window.dispatchEvent(new CustomEvent('ticket:message', { detail: data }));
    });

    // Inventory events
    this.socket.on('inventory:updated', (data) => {
      console.log('📦 Inventory updated:', data);
      window.dispatchEvent(new CustomEvent('inventory:updated', { detail: data }));
    });

    // General notifications
    this.socket.on('notification', (data) => {
      console.log('🔔 Notification:', data);
      
      if (data.type === 'success') {
        useToastStore.getState().success(data.message);
      } else if (data.type === 'error') {
        useToastStore.getState().error(data.message);
      } else if (data.type === 'warning') {
        useToastStore.getState().warning(data.message);
      } else {
        useToastStore.getState().info(data.message);
      }
      
      window.dispatchEvent(new CustomEvent('notification', { detail: data }));
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Emit custom event
   */
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit event: WebSocket not connected');
    }
  }

  /**
   * Subscribe to custom event
   */
  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unsubscribe from custom event
   */
  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
