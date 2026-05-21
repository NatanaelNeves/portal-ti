-- Migration: equipment reservation module (Phase 1)
-- Purpose: standalone reservation pool, no coupling to inventory_equipment

-- Pool de tipos de equipamento para reserva (admin-gerenciado)
CREATE TABLE IF NOT EXISTS equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  max_quantity INTEGER NOT NULL,
  buffer_minutes INTEGER NOT NULL DEFAULT 30,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela principal de reservas
CREATE TABLE IF NOT EXISTS equipment_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number VARCHAR(20) UNIQUE NOT NULL,
  equipment_type_id UUID NOT NULL REFERENCES equipment_types(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(200) NOT NULL,
  purpose TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending','approved','rejected','ready','in_use','returned','no_show','cancelled')),

  -- Recorrência (placeholder Fase 2)
  recurrence_group_id UUID NULL,

  -- Usuário público (sem login)
  requester_name VARCHAR(200),
  requester_email VARCHAR(200),
  requester_phone VARCHAR(50),
  access_token UUID UNIQUE,

  -- Usuário interno (nullable)
  internal_user_id UUID REFERENCES internal_users(id),

  -- Campos TI
  approved_by_id UUID REFERENCES internal_users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,

  -- Notificações enviadas
  reminder_24h_sent_at TIMESTAMP,
  reminder_1h_sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_res_end_after_start CHECK (end_time > start_time),
  CONSTRAINT chk_res_requester CHECK (
    requester_email IS NOT NULL OR internal_user_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_reservations_date ON equipment_reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_type_date ON equipment_reservations(equipment_type_id, date);
CREATE INDEX IF NOT EXISTS idx_reservations_token ON equipment_reservations(access_token);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON equipment_reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_recurrence ON equipment_reservations(recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;

-- Auditoria de ações
CREATE TABLE IF NOT EXISTS reservation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES equipment_reservations(id),
  action VARCHAR(50) NOT NULL,
  performed_by_id UUID REFERENCES internal_users(id),
  performed_by_name VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservation_logs_reservation_id ON reservation_logs(reservation_id);

-- Seed inicial: Notebooks
INSERT INTO equipment_types (name, description, max_quantity, buffer_minutes, icon, is_active)
SELECT 'Notebooks', 'Notebooks para empréstimo em aulas, treinamentos e eventos', 20, 30, '💻', true
WHERE NOT EXISTS (SELECT 1 FROM equipment_types WHERE name = 'Notebooks');
