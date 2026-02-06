# 🗄️ Guia de Migração do Banco de Dados

## ⚡ Quick Start

Se você já tem a tabela `responsibility_terms`, execute a migration para adicionar os novos campos:

```bash
# Conectar ao seu banco PostgreSQL
psql -U seu_usuario -d seu_banco -f migrations/001_add_responsibility_terms_fields.sql
```

---

## 📋 O que a Migration Faz

Adiciona os seguintes campos à tabela `responsibility_terms`:

### **Dados do Colaborador**
```sql
responsible_name VARCHAR(255)          -- Nome do colaborador
responsible_cpf VARCHAR(20)             -- CPF (formato XXX.XXX.XXX-XX)
responsible_position VARCHAR(255)       -- Cargo (Ex: Analista de TI)
responsible_department VARCHAR(255)     -- Departamento
```

### **Dados do Equipamento (JSONB)**
```sql
equipment_details JSONB        -- {code, brand, model, serial, processor, ram}
accessories JSONB              -- {charger, mouse, case, other}
signature_date DATE            -- Data de assinatura
```

### **Dados de Devolução**
```sql
return_reason VARCHAR(50)               -- Motivo (desligamento, troca, manutencao, outro)
reason_other TEXT                       -- Se motivo é "outro", descrição completa
received_by VARCHAR(255)                -- Quem recebeu o equipamento na TI
equipment_condition VARCHAR(50)         -- Estado (perfeito, desgaste, avarias)
checklist JSONB                         -- {tela, teclado, touchpad, portas, carcaca, bateria, carregador, so}
damage_description TEXT                 -- Descrição de danos se houver
witness_name VARCHAR(255)               -- Testemunha/Gestor da devolução
```

### **Índices para Performance**
```sql
CREATE INDEX idx_responsibility_terms_equipment_id ON responsibility_terms(equipment_id);
CREATE INDEX idx_responsibility_terms_status ON responsibility_terms(status);
CREATE INDEX idx_responsibility_terms_responsible_name ON responsibility_terms(responsible_name);
```

---

## 🔄 Backup Antes de Migrar

**SEMPRE faça backup antes de executar migrations!**

```bash
# Backup completo do banco
pg_dump -U seu_usuario seu_banco > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup apenas da tabela
pg_dump -U seu_usuario seu_banco -t responsibility_terms > responsibility_terms_backup.sql
```

---

## 🛠️ Opções de Execução

### **Opção 1: Via psql (Recomendado)**
```bash
psql -U seu_usuario -d seu_banco -f backend/migrations/001_add_responsibility_terms_fields.sql
```

### **Opção 2: Via Node.js**
```typescript
// No seu arquivo de inicialização do banco
import fs from 'fs';
import { database } from './src/database/connection';

const migration = fs.readFileSync('./migrations/001_add_responsibility_terms_fields.sql', 'utf-8');
await database.query(migration);
console.log('Migration executed successfully');
```

### **Opção 3: Manual no pgAdmin**
1. Abra pgAdmin
2. Conecte ao seu banco
3. Abra Query Tool
4. Cole o conteúdo do arquivo SQL
5. Execute (F5 ou botão Run)

### **Opção 4: Via Docker**
```bash
# Se usar Docker
docker exec -i seu_container_postgres psql -U seu_usuario -d seu_banco < migrations/001_add_responsibility_terms_fields.sql
```

---

## ✅ Verificação Pós-Migração

Depois de executar a migration, verifique se tudo correu bem:

```sql
-- Verificar coluna novo campo
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'responsibility_terms'
ORDER BY ordinal_position;

-- Verificar índices
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'responsibility_terms';

-- Verificar estrutura completa
\d responsibility_terms
```

---

## 🔄 Rollback (Se Necessário)

Se precisar desfazer a migration:

```sql
-- Remover índices
DROP INDEX IF EXISTS idx_responsibility_terms_equipment_id;
DROP INDEX IF EXISTS idx_responsibility_terms_status;
DROP INDEX IF EXISTS idx_responsibility_terms_responsible_name;

-- Remover colunas
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS responsible_name;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS responsible_cpf;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS responsible_position;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS responsible_department;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS equipment_details;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS accessories;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS signature_date;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS return_reason;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS reason_other;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS received_by;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS equipment_condition;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS checklist;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS damage_description;
ALTER TABLE responsibility_terms DROP COLUMN IF EXISTS witness_name;
```

---

## 📊 Exemplo de Dados no Banco

Depois de migrar, sua tabela terá essa estrutura:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "equipment_id": "660e8400-e29b-41d4-a716-446655440001",
  "responsible_name": "João Silva",
  "responsible_cpf": "123.456.789-00",
  "responsible_position": "Analista de TI",
  "responsible_department": "Departamento de TI",
  "equipment_details": {
    "code": "TI-2024-001",
    "brand": "Dell",
    "model": "Inspiron 15",
    "serial": "ABC123DEF456",
    "processor": "Intel i7",
    "ram": "16GB"
  },
  "accessories": {
    "charger": true,
    "mouse": false,
    "case": true,
    "other": "Docking Station"
  },
  "issued_date": "2024-02-05",
  "signature_date": "2024-02-05",
  "signature_method": "digital",
  "returned_date": "2024-02-20",
  "return_reason": "desligamento",
  "received_by": "Maria Técnica",
  "equipment_condition": "perfeito",
  "checklist": {
    "tela": { "name": "Tela", "checked": true },
    "teclado": { "name": "Teclado", "checked": true },
    "touchpad": { "name": "Touchpad", "checked": true },
    "portas": { "name": "Portas", "checked": true },
    "carcaca": { "name": "Carcaça", "checked": true },
    "bateria": { "name": "Bateria", "checked": true },
    "carregador": { "name": "Carregador", "checked": true },
    "so": { "name": "SO", "checked": true }
  },
  "damage_description": null,
  "witness_name": "Gerente TI",
  "status": "returned",
  "created_at": "2024-02-05T10:30:00Z",
  "updated_at": "2024-02-20T14:15:00Z"
}
```

---

## 🚀 Próximas Ações

Após a migração:

1. **Testar Endpoints**
   ```bash
   # GET equipamento
   curl -H "Authorization: Bearer TOKEN" \
     http://localhost:3000/api/inventory/equipment/ID
   
   # POST novo termo
   curl -X POST -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{...}' \
     http://localhost:3000/api/inventory/terms
   ```

2. **Verificar Dados Existentes**
   - Se você já tem termos antigos, eles continuarão funcionando
   - Os novos campos serão NULL
   - Você pode preencher gradualmente

3. **Testar no Frontend**
   - Acessar `/inventario/equipamentos`
   - Clicar em "Ver histórico"
   - Testar criar novo termo (SignTermPage)
   - Testar registrar devolução (ReturnTermPage)

---

## ⚠️ Troubleshooting

### **Erro: Column already exists**
Se a coluna já existe, ignore o erro. A migration usa `ADD COLUMN IF NOT EXISTS`.

### **Erro: Table does not exist**
Execute o schema completo em `backend/src/database/schema.ts`:
```bash
npm run init:db
```

### **Erro: Permission denied**
Verifique as permissões do usuário PostgreSQL:
```sql
GRANT ALL PRIVILEGES ON TABLE responsibility_terms TO seu_usuario;
```

### **Erro: Foreign key constraint**
Certifique-se de que a tabela `inventory_equipment` existe:
```sql
SELECT * FROM inventory_equipment LIMIT 1;
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique o log do banco:
   ```bash
   # PostgreSQL log
   tail -f /var/log/postgresql/postgresql.log
   ```

2. Teste a conexão:
   ```bash
   psql -U seu_usuario -d seu_banco -c "SELECT version();"
   ```

3. Valide o schema:
   ```bash
   npm run validate:schema
   ```

---

**Migration pronta! Execute com confiança! ✅**
