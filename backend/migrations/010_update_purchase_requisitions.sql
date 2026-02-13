-- Migração 010: Atualizar tabela purchase_requisitions com colunas faltantes

-- Adicionar coluna request_number
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS request_number VARCHAR(50);
UPDATE purchase_requisitions SET request_number = 'PED-2026-' || LPAD(ROW_NUMBER() OVER (ORDER BY id)::TEXT, 3, '0') WHERE request_number IS NULL;
ALTER TABLE purchase_requisitions ALTER COLUMN request_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_requisitions_request_number ON purchase_requisitions(request_number);

-- Adicionar colunas de solicitante
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255);
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS requester_department VARCHAR(255);
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS requester_unit VARCHAR(100);

-- Adicionar colunas de item
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS item_type VARCHAR(100);
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS specifications TEXT;
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal';

-- Adicionar colunas de justificativa
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS needed_by_date DATE;

-- Adicionar colunas de aprovação
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255);
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Adicionar colunas de entrega
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS actual_delivery_date DATE;
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS invoice_file VARCHAR(500);

-- Adicionar colunas de recebimento
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS received_by_id UUID REFERENCES internal_users(id);
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS received_by_name VARCHAR(255);
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS received_date DATE;
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS becomes_equipment BOOLEAN DEFAULT true;
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS created_equipment_id UUID REFERENCES inventory_equipment(id);

-- Adicionar coluna de notas
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS notes TEXT;

-- Adicionar timestamps se não existirem
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Atualizar timestamps existentes
UPDATE purchase_requisitions SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE purchase_requisitions SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;
