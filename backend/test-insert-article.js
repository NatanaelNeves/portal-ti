const { Client } = require('pg');

async function testInsert() {
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

    // Pegar primeiro usuário IT_STAFF ou ADMIN
    const userResult = await client.query(`
      SELECT id, name, email, role 
      FROM internal_users 
      WHERE role IN ('IT_STAFF', 'ADMIN') 
      LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ Nenhum usuário IT_STAFF ou ADMIN encontrado');
      return;
    }

    const user = userResult.rows[0];
    console.log('\n👤 Usuário encontrado:', user);

    // Tentar inserir artigo
    console.log('\n📝 Tentando inserir artigo...');
    const result = await client.query(
      "INSERT INTO information_articles (title, content, category, is_public, created_by_id, views_count) VALUES ($1, $2, $3, $4, $5, 0) RETURNING *",
      ['Teste de Artigo', 'Conteúdo de teste', 'Geral', true, user.id]
    );

    console.log('✅ Artigo criado com sucesso!');
    console.log('ID:', result.rows[0].id);
    console.log('Title:', result.rows[0].title);
    console.log('Created by:', result.rows[0].created_by_id);

    // Limpar o teste
    await client.query('DELETE FROM information_articles WHERE title = $1', ['Teste de Artigo']);
    console.log('\n🗑️ Artigo de teste removido');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
  }
}

testInsert();
