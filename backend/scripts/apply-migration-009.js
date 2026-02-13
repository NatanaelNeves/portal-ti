const { Client } = require('pg');

async function applyMigration() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'portal_ti',
    user: 'postgres',
    password: '123'
  });

  try {
    await client.connect();
    console.log('📡 Conectado ao banco de dados');

    await client.query(`ALTER TABLE equipment_movements ALTER COLUMN registered_by_id DROP NOT NULL;`);
    console.log('✅ equipment_movements.registered_by_id agora aceita NULL');

    await client.query(`ALTER TABLE responsibility_terms ALTER COLUMN issued_by_id DROP NOT NULL;`);
    console.log('✅ responsibility_terms.issued_by_id agora aceita NULL');

    await client.query(`UPDATE equipment_movements SET registered_by_name = 'Sistema' WHERE registered_by_name IS NULL;`);
    console.log('✅ Valores NULL em registered_by_name atualizados');

    await client.query(`UPDATE responsibility_terms SET issued_by_name = 'Sistema' WHERE issued_by_name IS NULL;`);
    console.log('✅ Valores NULL em issued_by_name atualizados');

    console.log('🎉 Migração 009 aplicada com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao aplicar migração:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
