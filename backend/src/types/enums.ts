// Tipos de usuário do sistema
export enum UserRole {
  FINAL_USER = 'final_user',      // Usuário final
  IT_STAFF = 'it_staff',          // Equipe de TI
  MANAGER = 'manager',            // Coordenação/Gestão
  ADMIN = 'admin',                // Administrador do sistema
}

// Status de chamados
export enum TicketStatus {
  OPEN = 'open',                  // Aberto
  IN_PROGRESS = 'in_progress',    // Em andamento
  WAITING = 'waiting',            // Aguardando
  RESOLVED = 'resolved',          // Resolvido
  CLOSED = 'closed',              // Fechado
  CANCELLED = 'cancelled',        // Cancelado
}

// Tipos de chamados
export enum TicketType {
  INCIDENT = 'incident',          // Incidente
  REQUEST = 'request',            // Solicitação
  CHANGE = 'change',              // Mudança
  PROBLEM = 'problem',            // Problema
}

// Prioridades de chamados
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Status de ativos
export enum AssetStatus {
  AVAILABLE = 'available',        // Disponível
  IN_USE = 'in_use',              // Em uso
  MAINTENANCE = 'maintenance',    // Manutenção
  RETIRED = 'retired',            // Baixado
}

// Tipos de movimentação de ativos
export enum MovementType {
  ENTRY = 'entry',                // Entrada
  EXIT = 'exit',                  // Saída
  TRANSFER = 'transfer',          // Transferência
  MAINTENANCE = 'maintenance',    // Manutenção
  RETIREMENT = 'retirement',      // Baixa
}

// Status de compras
export enum PurchaseStatus {
  REQUESTED = 'requested',        // Solicitado
  QUOTE = 'quote',                // Cotação
  APPROVED = 'approved',          // Aprovado
  PURCHASED = 'purchased',        // Comprado
  RECEIVED = 'received',          // Recebido
  CANCELLED = 'cancelled',        // Cancelado
}

// Interface para usuário autenticado
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
}
