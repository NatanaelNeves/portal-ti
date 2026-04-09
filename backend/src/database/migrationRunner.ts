import fs from 'fs';
import path from 'path';
import { database } from './connection';

const MIGRATION_TABLE = 'schema_migrations';

function getCandidateMigrationDirs(): string[] {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.join(process.cwd(), 'migrations'),
    path.join(process.cwd(), 'backend', 'migrations'),
  ].filter((dir): dir is string => Boolean(dir));

  return Array.from(new Set(candidates)).filter((dir) => fs.existsSync(dir));
}

function resolveMigrationsDir(): string | null {
  const dirs = getCandidateMigrationDirs();
  return dirs.length > 0 ? dirs[0] : null;
}

async function ensureMigrationTable(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client: any): Promise<Set<string>> {
  const result = await client.query(`SELECT filename FROM ${MIGRATION_TABLE} ORDER BY filename`);
  return new Set(result.rows.map((row: { filename: string }) => row.filename));
}

function listMigrationFiles(migrationsDir: string): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

async function applyMigrationFile(client: any, migrationsDir: string, filename: string): Promise<void> {
  const migrationPath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(migrationPath, 'utf-8').trim();

  if (!sql) {
    console.log(`⚠️  Skipping empty migration: ${filename}`);
    return;
  }

  console.log(`📦 Applying migration: ${filename}`);

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(`INSERT INTO ${MIGRATION_TABLE} (filename) VALUES ($1)`, [filename]);
    await client.query('COMMIT');
    console.log(`✅ Migration applied: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function applyPendingMigrations(): Promise<void> {
  const migrationsDir = resolveMigrationsDir();

  if (!migrationsDir) {
    console.log('⚠️  Migration directory not found. Skipping automatic migrations.');
    return;
  }

  const migrationFiles = listMigrationFiles(migrationsDir);

  if (migrationFiles.length === 0) {
    console.log(`ℹ️  No migration files found in ${migrationsDir}`);
    return;
  }

  const client = await database.getClient();
  try {
    await ensureMigrationTable(client);
    const appliedMigrations = await getAppliedMigrations(client);

    const pendingMigrations = migrationFiles.filter((filename) => !appliedMigrations.has(filename));

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations to apply');
      return;
    }

    console.log(`🛠️  Applying ${pendingMigrations.length} pending migration(s)...`);
    for (const filename of pendingMigrations) {
      await applyMigrationFile(client, migrationsDir, filename);
    }

    console.log('✅ All pending migrations applied successfully');
  } finally {
    client.release();
  }
}
