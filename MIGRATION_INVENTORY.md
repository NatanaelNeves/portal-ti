# 🚀 Migração do Banco de Dados - Módulo de Inventário Completo

## ⚠️ IMPORTANTE: Backup Primeiro!

Antes de executar qualquer migração, faça backup do banco de dados:

```bash
pg_dump -h localhost -U postgres -d portal_ti > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 📋 Migrações Necessárias

### 1. Adicionar Novas Colunas em `inventory_equipment`

```sql
-- Adicionar categoria (NOTEBOOK vs PERIPHERAL)
ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'PERIPHERAL';

-- Adicionar descrição
ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Alterar serial_number para aceitar S/N como padrão
ALTER TABLE inventory_equipment 
ALTER COLUMN serial_number DROP NOT NULL,
ALTER COLUMN serial_number SET DEFAULT 'S/N';

-- Campos específicos para notebooks
ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS processor VARCHAR(255),
ADD COLUMN IF NOT EXISTS memory_ram VARCHAR(50),
ADD COLUMN IF NOT EXISTS storage VARCHAR(100),
ADD COLUMN IF NOT EXISTS screen_size VARCHAR(20),
ADD COLUMN IF NOT EXISTS operating_system VARCHAR(100);

-- Alterar current_status: 'in_stock' -> 'available'
UPDATE inventory_equipment SET current_status = 'available' WHERE current_status = 'in_stock';

-- Adicionar campos de localização
ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS current_unit VARCHAR(100),
ADD COLUMN IF NOT EXISTS purchase_value DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS invoice_file VARCHAR(500);

-- Adicionar array de fotos
ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Adicionar QR code
ALTER TABLE inventory_equipment 
ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255);
```

### 2. Atualizar Tabela `responsibility_terms`

```sql
-- Adicionar campos do responsável
ALTER TABLE responsibility_terms 
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES internal_users(id),
ADD COLUMN IF NOT EXISTS responsible_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS responsible_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS responsible_unit VARCHAR(100);

-- Detalhes da entrega
ALTER TABLE responsibility_terms 
ADD COLUMN IF NOT EXISTS delivery_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_term_pdf VARCHAR(500),
ADD COLUMN IF NOT EXISTS delivery_term_signed_pdf VARCHAR(500),
ADD COLUMN IF NOT EXISTS issued_by_id UUID REFERENCES internal_users(id),
ADD COLUMN IF NOT EXISTS issued_by_name VARCHAR(255);

-- Detalhes da devolução
ALTER TABLE responsibility_terms 
ADD COLUMN IF NOT EXISTS return_condition VARCHAR(50),
ADD COLUMN IF NOT EXISTS return_checklist JSONB,
ADD COLUMN IF NOT EXISTS return_problems TEXT,
ADD COLUMN IF NOT EXISTS return_destination VARCHAR(50),
ADD COLUMN IF NOT EXISTS return_term_pdf VARCHAR(500),
ADD COLUMN IF NOT EXISTS return_term_signed_pdf VARCHAR(500),
ADD COLUMN IF NOT EXISTS received_by_id UUID REFERENCES internal_users(id),
ADD COLUMN IF NOT EXISTS received_by_name VARCHAR(255);

-- Remover colunas antigas que não são mais usadas (opcional)
-- ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS equipment_details;
-- ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS accessories;
-- ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS signature_method;
-- ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS signature_date;
-- ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS witness_name;
```

### 3. Atualizar Tabela `equipment_movements`

```sql
-- Adicionar movement_number
ALTER TABLE equipment_movements 
ADD COLUMN IF NOT EXISTS movement_number VARCHAR(50) UNIQUE;

-- Adicionar term_id
ALTER TABLE equipment_movements 
ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES responsibility_terms(id);

-- Alterar movement_date para TIMESTAMP
ALTER TABLE equipment_movements 
ALTER COLUMN movement_date TYPE TIMESTAMP USING movement_date::TIMESTAMP;

-- Adicionar campos de usuários
ALTER TABLE equipment_movements 
ADD COLUMN IF NOT EXISTS from_user_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS to_user_name VARCHAR(255);

-- Adicionar unidades
ALTER TABLE equipment_movements 
ADD COLUMN IF NOT EXISTS from_unit VARCHAR(100),
ADD COLUMN IF NOT EXISTS to_unit VARCHAR(100);

-- Adicionar departamentos
ALTER TABLE equipment_movements 
ADD COLUMN IF NOT EXISTS from_department VARCHAR(255),
ADD COLUMN IF NOT EXISTS to_department VARCHAR(255);

-- Adicionar condições
ALTER TABLE equipment_movements 
ADD COLUMN IF NOT EXISTS condition_before VARCHAR(50),
ADD COLUMN IF NOT EXISTS condition_after VARCHAR(50);

-- Adicionar registered_by_name
ALTER TABLE equipment_movements 
ADD COLUMN IF NOT EXISTS registered_by_name VARCHAR(255);
```

### 4. Atualizar Tabela `purchase_requisitions`

```sql
-- Adicionar request_number
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS request_number VARCHAR(50) UNIQUE;

-- Adicionar campos do solicitante
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS requester_department VARCHAR(255),
ADD COLUMN IF NOT EXISTS requester_unit VARCHAR(100);

-- Adicionar tipo de item
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(100);

-- Adicionar specifications
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS specifications TEXT;

-- Adicionar priority
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal';

-- Adicionar reason
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Adicionar needed_by_date
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS needed_by_date DATE;

-- Adicionar campos de aprovação
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Adicionar invoice_file
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS invoice_file VARCHAR(500);

-- Adicionar campos de recebimento
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS received_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS received_date DATE;

-- Remover requesting_department_id (agora usa texto)
-- ALTER TABLE purchase_requisitions DROP COLUMN IF EXISTS requesting_department_id;
-- Remover created_equipment_id (agora usa tabela de vínculo)
-- ALTER TABLE purchase_requisitions DROP COLUMN IF EXISTS created_equipment_id;
```

### 5. Criar Tabela de Vínculo `requisition_equipment`

```sql
CREATE TABLE IF NOT EXISTS requisition_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES inventory_equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(requisition_id, equipment_id)
);
```

### 6. Criar Índices para Performance

```sql
CREATE INDEX IF NOT EXISTS idx_equipment_status ON inventory_equipment(current_status);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON inventory_equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_responsible ON inventory_equipment(current_responsible_id);
CREATE INDEX IF NOT EXISTS idx_equipment_code ON inventory_equipment(internal_code);
CREATE INDEX IF NOT EXISTS idx_terms_equipment ON responsibility_terms(equipment_id);
CREATE INDEX IF NOT EXISTS idx_terms_responsible ON responsibility_terms(responsible_id);
CREATE INDEX IF NOT EXISTS idx_terms_status ON responsibility_terms(status);
CREATE INDEX IF NOT EXISTS idx_movements_equipment ON equipment_movements(equipment_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON equipment_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_requester ON purchase_requisitions(requested_by_id);
```

### 7. Gerar Números Automáticos para Registros Existentes (Opcional)

```sql
-- Atualizar movement_number para movimentações existentes
UPDATE equipment_movements 
SET movement_number = 'MOV-2026-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 6, '0')
WHERE movement_number IS NULL;

-- Atualizar request_number para requisições existentes
UPDATE purchase_requisitions 
SET request_number = 'PED-2026-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 3, '0')
WHERE request_number IS NULL;
```

## 🔄 Como Executar a Migração

### Opção 1: Via psql (Linha de Comando)

```bash
psql -h localhost -U postgres -d portal_ti -f migration_inventory_complete.sql
```

### Opção 2: Via pgAdmin

1. Abra pgAdmin
2. Conecte ao banco `portal_ti`
3. Abra Query Tool
4. Cole o conteúdo acima
5. Execute (F5)

### Opção 3: Via Código (Automático)

O schema.ts já foi atualizado. Basta reiniciar o backend:

```bash
cd backend
npm run dev
```

O sistema criará automaticamente as novas colunas e tabelas na próxima inicialização.

## ✅ Verificar se Migração foi Bem-Sucedida

```sql
-- Verificar novas colunas em inventory_equipment
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory_equipment' 
ORDER BY ordinal_position;

-- Verificar tabela requisition_equipment foi criada
SELECT COUNT(*) FROM requisition_equipment;

-- Verificar índices criados
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('inventory_equipment', 'responsibility_terms', 'equipment_movements', 'purchase_requisitions');
```

## 🎯 Próximos Passos Após Migração

1. ✅ Backend reiniciado automaticamente aplicará o schema
2. ✅ Frontend já tem as novas páginas (Notebooks, Periféricos)
3. ✅ APIs completas para CRUD, entrega, devolução, PDFs
4. ✅ Geração de PDFs de termos funcionando
5. ✅ Visões por pessoa e por unidade disponíveis

## 🔍 Testar Funcionalidades

1. **Cadastrar Notebook:**
   - POST `/api/inventory/notebooks`

2. **Cadastrar Periférico:**
   - POST `/api/inventory/peripherals`

3. **Entregar Equipamento:**
   - POST `/api/inventory/movements/deliver`

4. **Gerar PDF de Entrega:**
   - GET `/api/inventory/terms/:termId/delivery-pdf`

5. **Devolver Equipamento:**
   - POST `/api/inventory/movements/return`

6. **Gerar PDF de Devolução:**
   - GET `/api/inventory/terms/:termId/return-pdf`

---

**Data da Migração:** $(date)
**Versão:** 2.0 - Módulo de Inventário Completo
