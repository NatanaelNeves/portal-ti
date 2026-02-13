import { database } from './src/database/connection';

(async () => {
  const res = await database.query(`SELECT id, title, description FROM tickets WHERE title LIKE '%�%' OR description LIKE '%�%' LIMIT 5`);
  console.log('\n📊 Tickets com problemas de encoding:\n');
  res.rows.forEach((t: any, i: number) => {
    console.log(`${i+1}. ID: ${t.id.substring(0,8)}`);
    console.log(`   Título: "${t.title}"`);
    console.log(`   Descrição: "${t.description?.substring(0, 100)}..."`);
    console.log(`   Bytes do título: ${Buffer.from(t.title).toString('hex').substring(0, 60)}`);
    console.log('');
  });
  
  // Tentar correção manual
  console.log('🔄 Tentando corrigir caractere � restante...\n');
  const update = await database.query(`
    UPDATE tickets 
    SET title = REPLACE(REPLACE(title, '�', 'ã'), '  ', ' '),
        description = REPLACE(REPLACE(description, '�', 'ã'), '  ', ' ')
    WHERE title LIKE '%�%' OR description LIKE '%�%'
  `);
  console.log(`✅ ${update.rowCount || 0} tickets atualizados!`);
  
  process.exit(0);
})();
