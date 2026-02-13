import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

interface UserSocket {
  userId: string;
  userRole: string;
  socketId: string;
}

/**
 * Serviço de WebSocket para notificações em tempo real
 */
export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, UserSocket[]> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('🔌 Client connected:', socket.id);

      // Autenticar socket usando JWT
      socket.on('authenticate', (token: string) => {
        try {
          const decoded = jwt.verify(token, config.jwt.secret) as any;
          
          // Armazenar usuário conectado
          const userSocket: UserSocket = {
            userId: decoded.id,
            userRole: decoded.role,
            socketId: socket.id,
          };

          const userSockets = this.connectedUsers.get(decoded.id) || [];
          userSockets.push(userSocket);
          this.connectedUsers.set(decoded.id, userSockets);

          // Juntar usuário a salas baseadas no papel
          socket.join(`user:${decoded.id}`);
          socket.join(`role:${decoded.role}`);

          console.log(`✓ User authenticated: ${decoded.name} (${decoded.role})`);
          socket.emit('authenticated', { success: true, userId: decoded.id });
        } catch (error) {
          console.error('❌ Authentication failed:', error);
          socket.emit('authenticated', { success: false, error: 'Invalid token' });
        }
      });

      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        
        // Remover usuário da lista de conectados
        for (const [userId, sockets] of this.connectedUsers.entries()) {
          const filtered = sockets.filter(s => s.socketId !== socket.id);
          if (filtered.length > 0) {
            this.connectedUsers.set(userId, filtered);
          } else {
            this.connectedUsers.delete(userId);
          }
        }
      });
    });
  }

  /**
   * Notificar um usuário específico
   */
  notifyUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
    console.log(`📤 Sent ${event} to user ${userId}`);
  }

  /**
   * Notificar todos os usuários de um role específico
   */
  notifyRole(role: string, event: string, data: any) {
    this.io.to(`role:${role}`).emit(event, data);
    console.log(`📤 Sent ${event} to role ${role}`);
  }

  /**
   * Notificar todos os usuários conectados
   */
  notifyAll(event: string, data: any) {
    this.io.emit(event, data);
    console.log(`📤 Sent ${event} to all users`);
  }

  /**
   * Notificar sobre novo ticket
   */
  notifyNewTicket(ticketId: string, title: string, priority: string, requesterName: string) {
    this.notifyRole('it_staff', 'ticket:new', {
      ticketId,
      title,
      priority,
      requesterName,
      timestamp: new Date().toISOString(),
    });

    this.notifyRole('admin', 'ticket:new', {
      ticketId,
      title,
      priority,
      requesterName,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notificar sobre atualização de ticket
   */
  notifyTicketUpdate(ticketId: string, userId: string, updates: any) {
    this.notifyUser(userId, 'ticket:updated', {
      ticketId,
      updates,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notificar sobre nova mensagem em ticket
   */
  notifyNewMessage(ticketId: string, userId: string, message: string, authorName: string) {
    this.notifyUser(userId, 'ticket:message', {
      ticketId,
      message,
      authorName,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notificar sobre ticket atribuído
   */
  notifyTicketAssigned(ticketId: string, assignedToId: string, title: string) {
    this.notifyUser(assignedToId, 'ticket:assigned', {
      ticketId,
      title,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Obter instância do Socket.IO
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Obter usuários conectados
   */
  getConnectedUsers(): Map<string, UserSocket[]> {
    return this.connectedUsers;
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

export function initializeWebSocket(httpServer: HttpServer): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService(httpServer);
  }
  return wsService;
}

export function getWebSocketService(): WebSocketService | null {
  return wsService;
}
