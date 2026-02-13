const { Client } = require('pg');

async function checkUsers() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'portal_ti',
    user: 'postgres',
    password: '123',
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    // Ver todos os usuários internos
    const users = await client.query(`
      SELECT id, name, email, role 
      FROM internal_users 
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n👥 Usuários internos cadastrados:');
    users.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Ver quantidade por role
    const roleCounts = await client.query(`
      SELECT role, COUNT(*) as count
      FROM internal_users
      GROUP BY role
      ORDER BY count DESC
    `);

    console.log('\n📊 Contagem por Role:');
    roleCounts.rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkUsers();
