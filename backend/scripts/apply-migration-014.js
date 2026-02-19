const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Ler variáveis de ambiente do .env
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'portal_ti',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function applyMigration() {
  try {
    console.log('📁 Lendo migration 014_add_ticket_history.sql...');
    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/014_add_ticket_history.sql'),
      'utf8'
    );

    console.log('🔄 Aplicando migration...');
    await pool.query(sql);
    
    console.log('✅ Migration 014 applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
