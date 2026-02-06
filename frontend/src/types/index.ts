export enum UserRole {
  FINAL_USER = 'final_user',
  IT_STAFF = 'it_staff',
  MANAGER = 'manager',
  ADMIN = 'admin',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING = 'waiting',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum TicketType {
  INCIDENT = 'incident',
  REQUEST = 'request',
  CHANGE = 'change',
  PROBLEM = 'problem',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AssetStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string;
  assignedToId?: string;
  departmentId?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  name: string;
  assetType: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  status: AssetStatus;
  assignedToId?: string;
  departmentId?: string;
  location?: string;
  acquisitionDate?: Date;
  warrantyExpiration?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
