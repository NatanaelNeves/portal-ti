-- Migration: Add ticket_history table for audit trail
-- Created: 2026-02-19

CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  changed_by_type VARCHAR(20) NOT NULL CHECK (changed_by_type IN ('public', 'it_staff')),
  changed_by_id UUID NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX idx_ticket_history_created_at ON ticket_history(created_at DESC);

-- Common actions:
-- 'created', 'status_changed', 'priority_changed', 'assigned', 'unassigned',
-- 'title_updated', 'description_updated', 'message_added', 'attachment_added'

COMMENT ON TABLE ticket_history IS 'Audit trail para todas as ações em tickets';
COMMENT ON COLUMN ticket_history.action IS 'Tipo de ação realizada';
COMMENT ON COLUMN ticket_history.changed_by_type IS 'Tipo do usuário que fez a alteração';
COMMENT ON COLUMN ticket_history.old_value IS 'Valor anterior (se aplicável)';
COMMENT ON COLUMN ticket_history.new_value IS 'Novo valor';
COMMENT ON COLUMN ticket_history.metadata IS 'Dados adicionais em formato JSON';
