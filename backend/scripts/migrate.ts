#!/usr/bin/env node
/**
 * 🗄️ Database Migration Script
 * Execute migrations via Node.js
 * 
 * Usage:
 *   npm run migrate
 *   npx ts-node backend/scripts/migrate.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const __dirname = path.join(process.cwd(), 'backend', 'scripts');

// Initialize database connection
async function initDatabase() {
  try {
    const pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    return pool;
  } catch (error: any) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    console.error('\n⚠️  Verifique suas credenciais em .env:');
    console.error('   DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME');
    process.exit(1);
  }
}

// Read migration file
function readMigration(filename: string): string {
  // O arquivo está em backend/migrations quando rodamos npm run migrate do backend
  const migrationPath = path.join(path.dirname(__dirname), 'migrations', filename);
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Arquivo de migration não encontrado: ${migrationPath}`);
  }
  
  return fs.readFileSync(migrationPath, 'utf-8');
}

// Execute migration
async function executeMigration(pool: any, sql: string): Promise<void> {
  try {
    console.log('⏳ Executando migration...\n');
    
    const result = await pool.query(sql);
    
    console.log('✅ Migration executada com sucesso!');
    console.log(`   Comandos executados: ${sql.split(';').filter((s: string) => s.trim()).length}`);
    
    return result;
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Alguns campos já existem (isso é normal)');
      console.log('   Continuando...\n');
      return;
    }
    
    throw error;
  }
}

// Verify migration
async function verifyMigration(pool: any): Promise<void> {
  try {
    console.log('\n📋 Verificando campos adicionados...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'responsibility_terms'
      ORDER BY ordinal_position
    `);
    
    if (result.rows.length === 0) {
      console.log('⚠️  Nenhuma coluna encontrada na tabela responsibility_terms');
      return;
    }
    
    const newFields = [
      'responsible_name',
      'responsible_cpf',
      'responsible_position',
      'responsible_department',
      'equipment_details',
      'accessories',
      'signature_date',
      'return_reason',
      'reason_other',
      'received_by',
      'equipment_condition',
      'checklist',
      'damage_description',
      'witness_name'
    ];
    
    const currentFields = result.rows.map((r: any) => r.column_name);
    const addedFields = newFields.filter(f => currentFields.includes(f));
    const missingFields = newFields.filter(f => !currentFields.includes(f));
    
    console.log(`✅ Campos adicionados: ${addedFields.length}/${newFields.length}`);
    addedFields.forEach(field => {
      const fieldInfo = result.rows.find((r: any) => r.column_name === field);
      console.log(`   ✓ ${field} (${fieldInfo.data_type})`);
    });
    
    if (missingFields.length > 0) {
      console.log(`\n⚠️  Campos faltando: ${missingFields.length}`);
      missingFields.forEach(field => console.log(`   ✗ ${field}`));
    }
    
    // Check indexes
    console.log('\n📊 Verificando índices...\n');
    const indexResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'responsibility_terms'
      AND indexname LIKE 'idx_%'
    `);
    
    const expectedIndexes = [
      'idx_responsibility_terms_equipment_id',
      'idx_responsibility_terms_status',
      'idx_responsibility_terms_responsible_name'
    ];
    
    const createdIndexes = indexResult.rows.map((r: any) => r.indexname);
    const addedIndexes = expectedIndexes.filter(idx => createdIndexes.includes(idx));
    
    console.log(`✅ Índices criados: ${addedIndexes.length}/${expectedIndexes.length}`);
    addedIndexes.forEach(idx => console.log(`   ✓ ${idx}`));
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar migration:', error.message);
  }
}

// Main function
async function main() {
  let pool: any;
  
  try {
    console.log('\n🚀 Database Migration Tool\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Initialize database
    console.log('🔌 Conectando ao banco de dados...');
    pool = await initDatabase();
    console.log('✅ Conectado ao banco de dados\n');
    
    // Read migration
    console.log('📂 Lendo arquivo de migration...');
    const migration = readMigration('001_add_responsibility_terms_fields.sql');
    console.log(`✅ Arquivo lido (${migration.length} caracteres)\n`);
    
    // Execute migration
    await executeMigration(pool, migration);
    
    // Verify migration
    await verifyMigration(pool);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n🎉 Migration concluída com sucesso!\n');
    console.log('Próximos passos:');
    console.log('  1. Testar os endpoints da API');
    console.log('  2. Validar o frontend');
    console.log('  3. Deploy em produção\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Erro durante a migration:\n');
    console.error(`   ${error.message}\n`);
    
    if (error.detail) {
      console.error(`   Detalhes: ${error.detail}\n`);
    }
    
    console.error('Dicas de resolução:');
    console.error('  • Verifique a conexão com o banco de dados');
    console.error('  • Confirme que a tabela responsibility_terms existe');
    console.error('  • Verifique as permissões do usuário PostgreSQL');
    console.error('  • Consulte DATABASE_MIGRATION_GUIDE.md para troubleshooting\n');
    
    if (pool) {
      await pool.end();
    }
    process.exit(1);
  }
}

// Run main function
main();
