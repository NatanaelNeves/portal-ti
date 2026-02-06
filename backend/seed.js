const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'portal_ti',
  user: 'postgres',
  password: '123'
});

const articles = [
  {
    title: 'Como abrir um chamado',
    content: 'Acesse a página inicial, clique em "Abrir Chamado" e preencha o formulário com os detalhes do problema.',
    category: 'getting-started'
  },
  {
    title: 'Entender o status do chamado',
    content: 'Os chamados passam pelos seguintes status: Aberto, Em Andamento, Resolvido e Fechado. Você pode acompanhar em tempo real.',
    category: 'faq'
  },
  {
    title: 'Solucionar problemas de conexão',
    content: 'Se está com dificuldades de conexão, verifique sua conexão de rede, limpe o cache do navegador e tente novamente.',
    category: 'troubleshooting'
  },
  {
    title: 'Como usar o inventário',
    content: 'O inventário permite rastrear todos os equipamentos da TI. Acesse a seção de inventário para visualizar e gerenciar itens.',
    category: 'tutorials'
  },
  {
    title: 'Solicitar suporte técnico',
    content: 'Para suporte técnico, entre em contato através de um chamado descrevendo seu problema. A equipe de TI responderá dentro de 24 horas.',
    category: 'faq'
  }
];

async function seed() {
  try {
    await client.connect();
    console.log('Connected to database');

    // First, create or get a default admin user
    const adminResult = await client.query(
      `INSERT INTO internal_users (email, name, password_hash, role) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      ['admin@portal-ti.local', 'Admin System', 'hash', 'admin']
    );

    const adminId = adminResult.rows[0].id;
    console.log('Admin user ID:', adminId);

    // Insert articles with the admin user ID
    for (const article of articles) {
      await client.query(
        `INSERT INTO information_articles (title, content, category, is_public, created_by_id) 
         VALUES ($1, $2, $3, true, $4)`,
        [article.title, article.content, article.category, adminId]
      );
    }

    console.log('Sample articles inserted successfully');
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seed();
