const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'portal_ti',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

/**
 * Importar usuários de um arquivo CSV
 * 
 * Formato CSV esperado:
 * email,name,role,password
 * usuario@empresa.com,João Silva,it_staff,senha123
 * 
 * Roles válidas: admin, it_staff, manager
 */
async function importUsers(csvFilePath) {
  const users = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        users.push(row);
      })
      .on('end', async () => {
        console.log(`📁 ${users.length} usuários encontrados no CSV`);

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const user of users) {
          try {
            // Validar campos obrigatórios
            if (!user.email || !user.name || !user.role || !user.password) {
              console.log(`⚠️  Pulando usuário com dados incompletos: ${user.email || 'sem email'}`);
              skipped++;
              continue;
            }

            // Validar role
            const validRoles = ['admin', 'it_staff', 'manager'];
            if (!validRoles.includes(user.role)) {
              console.log(`⚠️  Role inválida para ${user.email}: ${user.role}`);
              skipped++;
              continue;
            }

            // Verificar se já existe
            const existing = await pool.query(
              'SELECT id FROM users WHERE email = $1',
              [user.email]
            );

            if (existing.rows.length > 0) {
              console.log(`⚠️  Usuário já existe: ${user.email}`);
              skipped++;
              continue;
            }

            // Hash da senha
            const passwordHash = await bcrypt.hash(user.password, 10);

            // Inserir usuário
            await pool.query(
              `INSERT INTO users (id, email, name, password_hash, role, is_active, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW())`,
              [user.email, user.name, passwordHash, user.role]
            );

            console.log(`✅ Importado: ${user.name} (${user.email}) - ${user.role}`);
            imported++;
          } catch (error) {
            console.error(`❌ Erro ao importar ${user.email}:`, error.message);
            errors++;
          }
        }

        console.log('\n📊 Resumo da Importação:');
        console.log(`   ✅ Importados: ${imported}`);
        console.log(`   ⚠️  Pulados: ${skipped}`);
        console.log(`   ❌ Erros: ${errors}`);

        resolve({ imported, skipped, errors });
      })
      .on('error', reject);
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  const csvFile = process.argv[2];

  if (!csvFile) {
    console.error('❌ Uso: node import-users.js <arquivo.csv>');
    console.log('\nFormato CSV esperado:');
    console.log('email,name,role,password');
    console.log('usuario@empresa.com,João Silva,it_staff,senha123');
    console.log('\nRoles válidas: admin, it_staff, manager');
    process.exit(1);
  }

  if (!fs.existsSync(csvFile)) {
    console.error(`❌ Arquivo não encontrado: ${csvFile}`);
    process.exit(1);
  }

  importUsers(csvFile)
    .then(({ imported, skipped, errors }) => {
      if (errors > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { importUsers };
