const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'portal_ti',
  password: '123',
  port: 5432
});

async function findUser() {
  try {
    // Buscar em internal_users
    const internal = await pool.query(`
      SELECT id, name, email, 'internal_users' as table_name
      FROM internal_users 
      WHERE LOWER(name) LIKE LOWER('%teeste%')
    `);

    // Buscar em public_users
    const public_ = await pool.query(`
      SELECT id, name, email, 'public_users' as table_name
      FROM public_users 
      WHERE LOWER(name) LIKE LOWER('%teeste%')
    `);

    console.log('\n🔍 Buscando usuário "teeste da silva"...\n');

    if (internal.rows.length > 0) {
      console.log('✅ Encontrado em internal_users:');
      internal.rows.forEach(u => {
        console.log(`  - ID: ${u.id}`);
        console.log(`    Nome: ${u.name}`);
        console.log(`    Email: ${u.email}\n`);
      });
    }

    if (public_.rows.length > 0) {
      console.log('✅ Encontrado em public_users:');
      public_.rows.forEach(u => {
        console.log(`  - ID: ${u.id}`);
        console.log(`    Nome: ${u.name}`);
        console.log(`    Email: ${u.email}\n`);
      });
    }

    if (internal.rows.length === 0 && public_.rows.length === 0) {
      console.log('❌ Usuário "teeste da silva" NÃO encontrado em nenhuma tabela');
      console.log('   Esse usuário foi cadastrado manualmente no termo sem vínculo ao sistema\n');
    }

    pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    pool.end();
  }
}

findUser();
