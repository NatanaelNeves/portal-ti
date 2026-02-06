import { database } from './connection';

export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database schema...');

    // Tabela de usuários públicos (sem login - acesso via token)
    await database.query(`
      CREATE TABLE IF NOT EXISTS public_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        user_token VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_access TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de usuários internos (TI, Gestor - com login)
    await database.query(`
      CREATE TABLE IF NOT EXISTS internal_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'it_staff',
        department_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Legacy users table (mantendo para compatibilidade)
    await database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'final_user',
        department_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de departamentos
    await database.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de chamados (tickets) - suporta usuários públicos e internos
    await database.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        requester_type VARCHAR(20) NOT NULL DEFAULT 'public',
        requester_id UUID NOT NULL,
        assigned_to_id UUID REFERENCES internal_users(id),
        department_id UUID REFERENCES departments(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de mensagens/histórico de chamados
    await database.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        author_type VARCHAR(20) NOT NULL DEFAULT 'public',
        author_id UUID NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de ativos (inventário)
    await database.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        item_type VARCHAR(100) NOT NULL,
        serial_number VARCHAR(255) UNIQUE,
        manufacturer VARCHAR(255),
        model VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'available',
        assigned_to_id UUID REFERENCES internal_users(id),
        department_id UUID REFERENCES departments(id),
        location VARCHAR(255),
        acquisition_date DATE,
        warranty_expiration DATE,
        notes TEXT,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de movimentações de inventário
    await database.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        movement_type VARCHAR(50) NOT NULL,
        from_user_id UUID REFERENCES internal_users(id),
        to_user_id UUID REFERENCES internal_users(id),
        from_department_id UUID REFERENCES departments(id),
        to_department_id UUID REFERENCES departments(id),
        description TEXT,
        responsible_id UUID NOT NULL REFERENCES internal_users(id),
        movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de documentos
    await database.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        document_type VARCHAR(50) NOT NULL,
        file_url VARCHAR(500),
        file_size INTEGER,
        is_public BOOLEAN DEFAULT false,
        uploaded_by_id UUID NOT NULL REFERENCES internal_users(id),
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de artigos da central de informações
    await database.query(`
      CREATE TABLE IF NOT EXISTS information_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        is_public BOOLEAN DEFAULT true,
        created_by_id UUID NOT NULL REFERENCES internal_users(id),
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Legacy tables para compatibilidade
    await database.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        asset_type VARCHAR(100) NOT NULL,
        serial_number VARCHAR(255) UNIQUE,
        manufacturer VARCHAR(255),
        model VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'available',
        assigned_to_id UUID REFERENCES users(id),
        department_id UUID REFERENCES departments(id),
        location VARCHAR(255),
        acquisition_date DATE,
        warranty_expiration DATE,
        notes TEXT,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Legacy movimentações de ativos
    await database.query(`
      CREATE TABLE IF NOT EXISTS asset_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        movement_type VARCHAR(50) NOT NULL,
        from_user_id UUID REFERENCES users(id),
        to_user_id UUID REFERENCES users(id),
        from_department_id UUID REFERENCES departments(id),
        to_department_id UUID REFERENCES departments(id),
        description TEXT,
        document_id UUID,
        responsible_id UUID NOT NULL REFERENCES users(id),
        movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Legacy solicitações de compra
    await database.query(`
      CREATE TABLE IF NOT EXISTS purchase_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL DEFAULT 'requested',
        requested_by_id UUID NOT NULL REFERENCES users(id),
        requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
        supplier VARCHAR(255),
        estimated_cost DECIMAL(10, 2),
        actual_cost DECIMAL(10, 2),
        estimated_delivery DATE,
        actual_delivery DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Legacy artigos de conhecimento
    await database.query(`
      CREATE TABLE IF NOT EXISTS knowledge_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        is_public BOOLEAN DEFAULT false,
        created_by_id UUID NOT NULL REFERENCES users(id),
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ===== NOVO MÓDULO DE INVENTÁRIO (2026) =====
    
    // Tabela de equipamentos (versão melhorada)
    await database.query(`
      CREATE TABLE IF NOT EXISTS inventory_equipment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        internal_code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(100) NOT NULL,
        brand VARCHAR(100),
        model VARCHAR(100),
        serial_number VARCHAR(255) UNIQUE,
        physical_condition VARCHAR(50) DEFAULT 'good',
        current_status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
        current_location VARCHAR(255),
        current_responsible_id UUID REFERENCES internal_users(id),
        acquisition_date DATE,
        warranty_expiration DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de termos de responsabilidade
    await database.query(`
      CREATE TABLE IF NOT EXISTS responsibility_terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id UUID NOT NULL REFERENCES inventory_equipment(id) ON DELETE CASCADE,
        responsible_name VARCHAR(255) NOT NULL,
        responsible_cpf VARCHAR(20),
        responsible_position VARCHAR(255),
        responsible_department VARCHAR(255),
        equipment_details JSONB,
        accessories JSONB,
        issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
        signed_date DATE,
        returned_date DATE,
        return_reason VARCHAR(50),
        reason_other TEXT,
        received_by VARCHAR(255),
        equipment_condition VARCHAR(50),
        checklist JSONB,
        damage_description TEXT,
        witness_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        signature_method VARCHAR(50),
        signature_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de movimentações de equipamento
    await database.query(`
      CREATE TABLE IF NOT EXISTS equipment_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id UUID NOT NULL REFERENCES inventory_equipment(id) ON DELETE CASCADE,
        movement_type VARCHAR(50) NOT NULL,
        from_user_id UUID REFERENCES internal_users(id),
        to_user_id UUID REFERENCES internal_users(id),
        from_location VARCHAR(255),
        to_location VARCHAR(255),
        reason VARCHAR(255),
        registered_by_id UUID NOT NULL REFERENCES internal_users(id),
        movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de solicitações de compra (versão melhorada)
    await database.query(`
      CREATE TABLE IF NOT EXISTS purchase_requisitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_description VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        requested_by_id UUID NOT NULL REFERENCES internal_users(id),
        requesting_department_id UUID REFERENCES departments(id),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        estimated_value DECIMAL(12, 2),
        actual_value DECIMAL(12, 2),
        approval_date DATE,
        approved_by_id UUID REFERENCES internal_users(id),
        purchase_date DATE,
        supplier VARCHAR(255),
        expected_delivery_date DATE,
        actual_delivery_date DATE,
        received_by_id UUID REFERENCES internal_users(id),
        becomes_equipment BOOLEAN DEFAULT true,
        created_equipment_id UUID REFERENCES inventory_equipment(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ===== MIGRAÇÕES =====
    console.log('Aplicando migrações...');

    // Migração: Corrigir constraint assigned_to_id da tabela tickets
    await database.query(`
      DO $$ 
      BEGIN
        -- Dropar constraint antiga se existir
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'tickets_assigned_to_id_fkey' 
          AND conrelid = 'tickets'::regclass
        ) THEN
          ALTER TABLE tickets DROP CONSTRAINT tickets_assigned_to_id_fkey;
        END IF;
        
        -- Criar nova constraint apontando para internal_users
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'tickets_assigned_to_internal_users_fkey'
          AND conrelid = 'tickets'::regclass
        ) THEN
          ALTER TABLE tickets 
          ADD CONSTRAINT tickets_assigned_to_internal_users_fkey 
          FOREIGN KEY (assigned_to_id) REFERENCES internal_users(id);
        END IF;
      END $$;
    `);
    console.log('✓ Constraint assigned_to_id corrigida');

    // Migrations - Add missing columns if they don't exist
    await database.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='tickets' AND column_name='requester_type') THEN
          ALTER TABLE tickets ADD COLUMN requester_type VARCHAR(20) NOT NULL DEFAULT 'public';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='tickets' AND column_name='requester_id') THEN
          ALTER TABLE tickets ADD COLUMN requester_id UUID;
        END IF;
        
        -- Drop old foreign key constraint if it exists
        -- requester_id can reference either public_users or internal_users depending on requester_type
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='tickets_requester_id_fkey') THEN
          ALTER TABLE tickets DROP CONSTRAINT tickets_requester_id_fkey;
        END IF;
      END $$;
    `);

    // Criar índices para melhor performance
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_public_users_token ON public_users(user_token);
      CREATE INDEX IF NOT EXISTS idx_public_users_email ON public_users(email);
      CREATE INDEX IF NOT EXISTS idx_internal_users_email ON internal_users(email);
      CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
      CREATE INDEX IF NOT EXISTS idx_inventory_assigned ON inventory_items(assigned_to_id);
      CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_articles_public ON information_articles(is_public);
      CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id);
    `);

    console.log('✓ Database schema initialized successfully');
  } catch (error) {
    console.error('✗ Error initializing database:', error);
    throw error;
  }
}
