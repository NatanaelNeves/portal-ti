import { io, Socket } from 'socket.io-client';
import { showToast } from '../utils/toast';

/**
 * Serviço de WebSocket para notificações em tempo real
 */
class WebSocketClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Conectar ao servidor WebSocket
   */
  connect(token: string) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket já conectado');
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Autenticar
      this.socket?.emit('authenticate', token);
    });

    this.socket.on('authenticated', (data: { success: boolean; userId?: string; error?: string }) => {
      if (data.success) {
        console.log('✅ WebSocket autenticado para usuário:', data.userId);
      } else {
        console.error('❌ Falha na autenticação WebSocket:', data.error);
        showToast.error('Erro ao conectar notificações em tempo real');
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ WebSocket desconectado:', reason);
      this.isConnected = false;

      if (reason === 'io server disconnect') {
        // Servidor desconectou, tentar reconectar manualmente
        this.reconnect(token);
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Erro de conexão WebSocket:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        showToast.warning('Não foi possível conectar notificações em tempo real');
      }
    });

    // Listeners de eventos
    this.setupEventListeners();
  }

  /**
   * Tentar reconectar
   */
  private reconnect(_token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`🔄 Tentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.socket?.connect();
      }, 2000);
    }
  }

  /**
   * Configurar listeners de eventos
   */
  private setupEventListeners() {
    // Novo ticket
    this.socket?.on('ticket:new', (data: any) => {
      console.log('📩 Novo ticket:', data);
      showToast.info(`Novo chamado: ${data.title}`);
      
      // Disparar evento customizado para atualizar UI
      window.dispatchEvent(new CustomEvent('ticket:new', { detail: data }));
    });

    // Ticket atualizado
    this.socket?.on('ticket:updated', (data: any) => {
      console.log('🔄 Ticket atualizado:', data);
      showToast.info('Um chamado foi atualizado');
      
      window.dispatchEvent(new CustomEvent('ticket:updated', { detail: data }));
    });

    // Nova mensagem
    this.socket?.on('ticket:message', (data: any) => {
      console.log('💬 Nova mensagem:', data);
      showToast.info(`Nova mensagem de ${data.authorName}`);
      
      window.dispatchEvent(new CustomEvent('ticket:message', { detail: data }));
    });

    // Ticket atribuído
    this.socket?.on('ticket:assigned', (data: any) => {
      console.log('👤 Ticket atribuído:', data);
      showToast.success(`Ticket atribuído: ${data.title}`);
      
      window.dispatchEvent(new CustomEvent('ticket:assigned', { detail: data }));
    });
  }

  /**
   * Desconectar do servidor WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 WebSocket desconectado manualmente');
    }
  }

  /**
   * Verificar se está conectado
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket !== null;
  }

  /**
   * Emitir evento customizado
   */
  emit(event: string, data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket não conectado. Não foi possível emitir evento:', event);
    }
  }

  /**
   * Escutar evento customizado
   */
  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remover listener de evento
   */
  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }
}

// Singleton
export const websocketClient = new WebSocketClient();
