const { Client } = require('pg');

async function checkTable() {
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

    // Verificar se a tabela existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'information_articles'
      );
    `);
    console.log('Tabela information_articles existe?', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Verificar estrutura da tabela
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'information_articles'
        ORDER BY ordinal_position;
      `);
      console.log('\n📋 Colunas da tabela:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      // Verificar quantos artigos existem
      const count = await client.query('SELECT COUNT(*) FROM information_articles');
      console.log(`\n📊 Total de artigos: ${count.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();
