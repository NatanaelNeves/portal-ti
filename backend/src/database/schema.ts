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
        department VARCHAR(255),
        unit VARCHAR(255),
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

    // Tabela de refresh tokens para renovação automática de JWT
    await database.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES internal_users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_revoked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índice para melhorar performance na busca de tokens
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    `);

    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
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
        category VARCHAR(50) NOT NULL DEFAULT 'PERIPHERAL',
        type VARCHAR(100) NOT NULL,
        brand VARCHAR(100),
        model VARCHAR(100),
        description TEXT,
        serial_number VARCHAR(255) DEFAULT 'S/N',
        
        -- Campos específicos para notebooks
        processor VARCHAR(255),
        memory_ram VARCHAR(50),
        storage VARCHAR(100),
        screen_size VARCHAR(20),
        operating_system VARCHAR(100),
        
        physical_condition VARCHAR(50) DEFAULT 'good',
        current_status VARCHAR(50) NOT NULL DEFAULT 'available',
        current_location VARCHAR(255),
        current_unit VARCHAR(100),
        current_responsible_id UUID REFERENCES internal_users(id),
        
        acquisition_date DATE,
        purchase_value DECIMAL(12, 2),
        warranty_expiration DATE,
        invoice_file VARCHAR(500),
        photos TEXT[],
        qr_code VARCHAR(255),
        
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
        
        responsible_id UUID REFERENCES internal_users(id),
        responsible_name VARCHAR(255) NOT NULL,
        responsible_cpf VARCHAR(20),
        responsible_email VARCHAR(255),
        responsible_phone VARCHAR(20),
        responsible_position VARCHAR(255),
        responsible_department VARCHAR(255),
        responsible_unit VARCHAR(100),
        
        issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
        delivery_reason VARCHAR(100),
        delivery_notes TEXT,
        delivery_term_pdf VARCHAR(500),
        delivery_term_signed_pdf VARCHAR(500),
        issued_by_id UUID REFERENCES internal_users(id),
        issued_by_name VARCHAR(255),
        
        returned_date DATE,
        return_condition VARCHAR(50),
        return_checklist JSONB,
        return_problems TEXT,
        return_destination VARCHAR(50),
        return_term_pdf VARCHAR(500),
        return_term_signed_pdf VARCHAR(500),
        received_by_id UUID REFERENCES internal_users(id),
        
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de movimentações de equipamento
    await database.query(`
      CREATE TABLE IF NOT EXISTS equipment_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        movement_number VARCHAR(50) UNIQUE NOT NULL,
        equipment_id UUID NOT NULL REFERENCES inventory_equipment(id) ON DELETE CASCADE,
        term_id UUID REFERENCES responsibility_terms(id),
        
        movement_type VARCHAR(50) NOT NULL,
        movement_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        from_user_id UUID REFERENCES internal_users(id),
        from_user_name VARCHAR(255),
        to_user_id UUID REFERENCES internal_users(id),
        to_user_name VARCHAR(255),
        
        from_location VARCHAR(255),
        from_unit VARCHAR(100),
        to_location VARCHAR(255),
        to_unit VARCHAR(100),
        
        from_department VARCHAR(255),
        to_department VARCHAR(255),
        
        reason TEXT,
        condition_before VARCHAR(50),
        condition_after VARCHAR(50),
        
        registered_by_id UUID NOT NULL REFERENCES internal_users(id),
        registered_by_name VARCHAR(255),
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de solicitações de compra (versão melhorada)
    await database.query(`
      CREATE TABLE IF NOT EXISTS purchase_requisitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_number VARCHAR(50) UNIQUE NOT NULL,
        
        requested_by_id UUID NOT NULL REFERENCES internal_users(id),
        requester_name VARCHAR(255),
        requester_department VARCHAR(255),
        requester_unit VARCHAR(100),
        
        item_type VARCHAR(100) NOT NULL,
        item_description TEXT NOT NULL,
        specifications TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        priority VARCHAR(50) DEFAULT 'normal',
        
        reason TEXT NOT NULL,
        needed_by_date DATE,
        
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        approved_by_id UUID REFERENCES internal_users(id),
        approved_by_name VARCHAR(255),
        approval_date DATE,
        rejection_reason TEXT,
        
        estimated_value DECIMAL(12, 2),
        actual_value DECIMAL(12, 2),
        supplier VARCHAR(255),
        purchase_date DATE,
        expected_delivery_date DATE,
        actual_delivery_date DATE,
        invoice_file VARCHAR(500),
        
        received_by_id UUID REFERENCES internal_users(id),
        received_by_name VARCHAR(255),
        received_date DATE,
        becomes_equipment BOOLEAN DEFAULT true,
        created_equipment_id UUID REFERENCES inventory_equipment(id),
        
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de ligação entre requisições e equipamentos
    await database.query(`
      CREATE TABLE IF NOT EXISTS requisition_equipment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requisition_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
        equipment_id UUID NOT NULL REFERENCES inventory_equipment(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requisition_id, equipment_id)
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

    // Migração: Adicionar novas colunas à tabela inventory_equipment se não existirem
    await database.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='category') THEN
          ALTER TABLE inventory_equipment ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'PERIPHERAL';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='current_status') THEN
          ALTER TABLE inventory_equipment ADD COLUMN current_status VARCHAR(50) NOT NULL DEFAULT 'available';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='current_location') THEN
          ALTER TABLE inventory_equipment ADD COLUMN current_location VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='current_responsible_id') THEN
          ALTER TABLE inventory_equipment ADD COLUMN current_responsible_id UUID REFERENCES internal_users(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='physical_condition') THEN
          ALTER TABLE inventory_equipment ADD COLUMN physical_condition VARCHAR(50) DEFAULT 'good';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='processor') THEN
          ALTER TABLE inventory_equipment ADD COLUMN processor VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='memory_ram') THEN
          ALTER TABLE inventory_equipment ADD COLUMN memory_ram VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='storage') THEN
          ALTER TABLE inventory_equipment ADD COLUMN storage VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='screen_size') THEN
          ALTER TABLE inventory_equipment ADD COLUMN screen_size VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='operating_system') THEN
          ALTER TABLE inventory_equipment ADD COLUMN operating_system VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='current_unit') THEN
          ALTER TABLE inventory_equipment ADD COLUMN current_unit VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='purchase_value') THEN
          ALTER TABLE inventory_equipment ADD COLUMN purchase_value DECIMAL(12, 2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='photos') THEN
          ALTER TABLE inventory_equipment ADD COLUMN photos TEXT[];
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='qr_code') THEN
          ALTER TABLE inventory_equipment ADD COLUMN qr_code VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='inventory_equipment' AND column_name='internal_code') THEN
          ALTER TABLE inventory_equipment ADD COLUMN internal_code VARCHAR(50) UNIQUE NOT NULL DEFAULT 'TEMP-' || gen_random_uuid()::text;
        END IF;
      END $$;
    `);
    console.log('✓ Colunas do inventory_equipment atualizadas');

    // Migração: Adicionar novas colunas à tabela responsibility_terms se não existirem
    await database.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='responsible_id') THEN
          ALTER TABLE responsibility_terms ADD COLUMN responsible_id UUID REFERENCES internal_users(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='responsible_name') THEN
          ALTER TABLE responsibility_terms ADD COLUMN responsible_name VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='responsible_cpf') THEN
          ALTER TABLE responsibility_terms ADD COLUMN responsible_cpf VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='responsible_email') THEN
          ALTER TABLE responsibility_terms ADD COLUMN responsible_email VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='responsible_phone') THEN
          ALTER TABLE responsibility_terms ADD COLUMN responsible_phone VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='responsible_position') THEN
          ALTER TABLE responsibility_terms ADD COLUMN responsible_position VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='responsible_department') THEN
          ALTER TABLE responsibility_terms ADD COLUMN responsible_department VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='responsible_unit') THEN
          ALTER TABLE responsibility_terms ADD COLUMN responsible_unit VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='issued_date') THEN
          ALTER TABLE responsibility_terms ADD COLUMN issued_date DATE NOT NULL DEFAULT CURRENT_DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='delivery_reason') THEN
          ALTER TABLE responsibility_terms ADD COLUMN delivery_reason VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='delivery_notes') THEN
          ALTER TABLE responsibility_terms ADD COLUMN delivery_notes TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='delivery_term_pdf') THEN
          ALTER TABLE responsibility_terms ADD COLUMN delivery_term_pdf VARCHAR(500);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='delivery_term_signed_pdf') THEN
          ALTER TABLE responsibility_terms ADD COLUMN delivery_term_signed_pdf VARCHAR(500);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='issued_by_id') THEN
          ALTER TABLE responsibility_terms ADD COLUMN issued_by_id UUID REFERENCES internal_users(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='issued_by_name') THEN
          ALTER TABLE responsibility_terms ADD COLUMN issued_by_name VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='returned_date') THEN
          ALTER TABLE responsibility_terms ADD COLUMN returned_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='return_condition') THEN
          ALTER TABLE responsibility_terms ADD COLUMN return_condition VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='return_checklist') THEN
          ALTER TABLE responsibility_terms ADD COLUMN return_checklist JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='return_problems') THEN
          ALTER TABLE responsibility_terms ADD COLUMN return_problems TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='return_destination') THEN
          ALTER TABLE responsibility_terms ADD COLUMN return_destination VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='return_term_pdf') THEN
          ALTER TABLE responsibility_terms ADD COLUMN return_term_pdf VARCHAR(500);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='return_term_signed_pdf') THEN
          ALTER TABLE responsibility_terms ADD COLUMN return_term_signed_pdf VARCHAR(500);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='responsibility_terms' AND column_name='received_by_id') THEN
          ALTER TABLE responsibility_terms ADD COLUMN received_by_id UUID REFERENCES internal_users(id);
        END IF;
      END $$;
    `);
    console.log('✓ Colunas do responsibility_terms atualizadas');

    // Migração 013: Adicionar department e unit aos public_users
    await database.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='public_users' AND column_name='department') THEN
          ALTER TABLE public_users ADD COLUMN department VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='public_users' AND column_name='unit') THEN
          ALTER TABLE public_users ADD COLUMN unit VARCHAR(255);
        END IF;
      END $$;
    `);
    console.log('✓ Colunas department e unit adicionadas em public_users');

    // Criar novos índices para inventário
    await database.query(`
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
    `);

    console.log('✓ Database schema initialized successfully');
  } catch (error) {
    console.error('✗ Error initializing database:', error);
    throw error;
  }
}
