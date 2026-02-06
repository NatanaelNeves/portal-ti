const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'portal_ti',
  user: 'postgres',
  password: '123'
});

async function createUsers() {
  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados\n');

    // Usuários a serem criados
    const users = [
      {
        email: 'admin@opequenonazareno.org.br',
        name: 'Administrador',
        password: 'admin123',
        role: 'admin'
      },
      {
        email: 'ti@opequenonazareno.org.br',
        name: 'Suporte TI',
        password: 'ti123',
        role: 'it_staff'
      },
      {
        email: 'gestor@opequenonazareno.org.br',
        name: 'Gestor',
        password: 'gestor123',
        role: 'manager'
      }
    ];

    console.log('Criando usuários internos...\n');

    for (const user of users) {
      // Hash da senha
      const passwordHash = await bcrypt.hash(user.password, 10);

      // Inserir ou atualizar usuário
      const result = await client.query(
        `INSERT INTO internal_users (email, name, password_hash, role, is_active) 
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (email) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = true
         RETURNING id, email, name, role`,
        [user.email, user.name, passwordHash, user.role]
      );

      console.log(`✓ Criado/Atualizado: ${result.rows[0].name}`);
      console.log(`  Email: ${result.rows[0].email}`);
      console.log(`  Senha: ${user.password}`);
      console.log(`  Função: ${result.rows[0].role}\n`);
    }

    console.log('═══════════════════════════════════════════');
    console.log('CREDENCIAIS DE ACESSO');
    console.log('═══════════════════════════════════════════\n');
    
    console.log('ADMINISTRADOR:');
    console.log('  URL: http://localhost:3000/login-interno');
    console.log('  Email: admin@opequenonazareno.org.br');
    console.log('  Senha: admin123\n');
    
    console.log('EQUIPE DE TI:');
    console.log('  URL: http://localhost:3000/login-interno');
    console.log('  Email: ti@opequenonazareno.org.br');
    console.log('  Senha: ti123\n');
    
    console.log('GESTOR:');
    console.log('  URL: http://localhost:3000/login-interno');
    console.log('  Email: gestor@opequenonazareno.org.br');
    console.log('  Senha: gestor123\n');
    
    console.log('═══════════════════════════════════════════');
    console.log('⚠️  IMPORTANTE: Altere estas senhas após o primeiro acesso!');
    console.log('═══════════════════════════════════════════\n');

    await client.end();
  } catch (error) {
    console.error('✗ Erro:', error.message);
    process.exit(1);
  }
}

createUsers();
