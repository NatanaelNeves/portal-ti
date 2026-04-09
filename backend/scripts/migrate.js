#!/usr/bin/env node
/**
 * 🗄️ Database Migration Script
 * Execute migrations via Node.js
 * 
 * Usage:
 *   npm run migrate
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const MIGRATION_TABLE = 'schema_migrations';

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
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    console.error('\n⚠️  Verifique suas credenciais em .env:');
    console.error('   DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME');
    process.exit(1);
  }
}

// Read migration file
function getMigrationDirectories() {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.join(process.cwd(), 'migrations'),
    path.join(process.cwd(), 'backend', 'migrations')
  ].filter(Boolean);

  return Array.from(new Set(candidates)).filter((dir) => fs.existsSync(dir));
}

function resolveMigrationsDir() {
  const dirs = getMigrationDirectories();
  return dirs.length > 0 ? dirs[0] : null;
}

async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(pool) {
  const result = await pool.query(`SELECT filename FROM ${MIGRATION_TABLE}`);
  return new Set(result.rows.map((row) => row.filename));
}

function listMigrationFiles(migrationsDir) {
  return fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

async function applyMigration(pool, migrationsDir, filename) {
  const migrationPath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(migrationPath, 'utf-8').trim();

  if (!sql) {
    console.log(`⚠️  Migration vazia ignorada: ${filename}`);
    return;
  }

  console.log(`📦 Aplicando migration: ${filename}`);
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query(`INSERT INTO ${MIGRATION_TABLE} (filename) VALUES ($1)`, [filename]);
    await pool.query('COMMIT');
    console.log(`✅ Migration aplicada: ${filename}`);
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Main function
async function main() {
  let pool;
  
  try {
    console.log('\n🚀 Database Migration Tool\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Initialize database
    console.log('🔌 Conectando ao banco de dados...');
    pool = await initDatabase();
    console.log('✅ Conectado ao banco de dados\n');
    
    const migrationsDir = resolveMigrationsDir();
    if (!migrationsDir) {
      throw new Error('Diretório de migrations não encontrado.');
    }

    console.log(`📂 Lendo migrations de: ${migrationsDir}`);
    await ensureMigrationTable(pool);

    const appliedMigrations = await getAppliedMigrations(pool);
    const migrationFiles = listMigrationFiles(migrationsDir);
    const pendingMigrations = migrationFiles.filter((filename) => !appliedMigrations.has(filename));

    if (pendingMigrations.length === 0) {
      console.log('✅ Nenhuma migration pendente');
    } else {
      console.log(`⏳ ${pendingMigrations.length} migration(s) pendente(s) encontradas\n`);
      for (const filename of pendingMigrations) {
        await applyMigration(pool, migrationsDir, filename);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n🎉 Migration concluída com sucesso!\n');
    console.log('Próximos passos:');
    console.log('  1. Testar os endpoints da API');
    console.log('  2. Validar o frontend');
    console.log('  3. Deploy em produção\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Erro durante a migration:\n');
    console.error(`   ${error.message}\n`);
    
    if (error.detail) {
      console.error(`   Detalhes: ${error.detail}\n`);
    }
    
    console.error('Dicas de resolução:');
    console.error('  • Verifique a conexão com o banco de dados');
    console.error('  • Confirme que o diretório migrations existe');
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
