#!/usr/bin/env node
/**
 * 🗄️ Initialize Database Schema
 * Cria as tabelas do zero
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

async function initDatabase() {
  try {
    const pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
    });

    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco:', error.message);
    process.exit(1);
  }
}

async function initSchema(pool) {
  try {
    console.log('\n🚀 Database Schema Initialization\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Users
    console.log('📋 Criando tabelas base...');
    
    await pool.query(`
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

    await pool.query(`
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

    await pool.query(`
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de tickets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'medium',
        created_by UUID REFERENCES public_users(id),
        assigned_to UUID REFERENCES internal_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventory
    console.log('   ✓ Tabelas de usuários e departamentos');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_equipment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) UNIQUE NOT NULL,
        brand VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        serial_number VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'in_stock',
        purchase_date DATE,
        warranty_expiry DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('   ✓ Tabelas de inventário');

    // Responsibility Terms
    await pool.query(`
      CREATE TABLE IF NOT EXISTS responsibility_terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id UUID NOT NULL REFERENCES inventory_equipment(id),
        responsible_name VARCHAR(255),
        responsible_cpf VARCHAR(20),
        responsible_position VARCHAR(255),
        responsible_department VARCHAR(255),
        equipment_details JSONB,
        accessories JSONB,
        issued_date DATE DEFAULT CURRENT_DATE,
        signature_date DATE,
        signature_method VARCHAR(50),
        return_reason VARCHAR(50),
        reason_other TEXT,
        returned_date DATE,
        received_by VARCHAR(255),
        equipment_condition VARCHAR(50),
        checklist JSONB,
        damage_description TEXT,
        witness_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('   ✓ Tabelas de responsabilidade');

    // Equipment Movements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipment_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id UUID NOT NULL REFERENCES inventory_equipment(id),
        movement_type VARCHAR(50) NOT NULL,
        notes TEXT,
        moved_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('   ✓ Tabelas de movimentações');

    // Purchase Requisitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_requisitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        requested_by UUID REFERENCES internal_users(id),
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50),
        estimated_cost DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('   ✓ Tabelas de requisições');

    // Create indexes
    console.log('\n📊 Criando índices...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_responsibility_terms_equipment_id ON responsibility_terms(equipment_id)',
      'CREATE INDEX IF NOT EXISTS idx_responsibility_terms_status ON responsibility_terms(status)',
      'CREATE INDEX IF NOT EXISTS idx_responsibility_terms_responsible_name ON responsibility_terms(responsible_name)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_equipment_status ON inventory_equipment(status)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_equipment_code ON inventory_equipment(code)',
      'CREATE INDEX IF NOT EXISTS idx_equipment_movements_equipment_id ON equipment_movements(equipment_id)',
      'CREATE INDEX IF NOT EXISTS idx_equipment_movements_movement_type ON equipment_movements(movement_type)',
    ];

    for (const index of indexes) {
      await pool.query(index);
    }

    console.log('   ✓ 7 índices criados');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n✅ Schema inicializado com sucesso!\n');

  } catch (error) {
    console.error('\n❌ Erro ao criar schema:\n');
    console.error(`   ${error.message}\n`);
    throw error;
  }
}

async function main() {
  let pool;
  
  try {
    pool = await initDatabase();
    await initSchema(pool);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Falha na inicialização do banco de dados');
    if (pool) {
      await pool.end();
    }
    process.exit(1);
  }
}

main();
