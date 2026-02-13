-- Migration 011: Adicionar suporte a anexos em tickets
-- Data: 2026-02-11
-- Descrição: Criar tabela de anexos e campo no ticket

-- Criar tabela de anexos
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by_type VARCHAR(20) NOT NULL,  -- 'public' ou 'it_staff'
  uploaded_by_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_uploaded_by ON ticket_attachments(uploaded_by_id);

-- Comentários
COMMENT ON TABLE ticket_attachments IS 'Anexos de chamados (screenshots, logs, documentos)';
COMMENT ON COLUMN ticket_attachments.uploaded_by_type IS 'Tipo de usuário que fez upload: public ou it_staff';
