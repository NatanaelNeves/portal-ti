import { database } from './src/database/connection';

(async () => {
  const res = await database.query(`
    SELECT priority, COUNT(*) as count 
    FROM tickets 
    GROUP BY priority 
    ORDER BY priority
  `);
  
  console.log('\n📊 Contagem de tickets por prioridade:\n');
  res.rows.forEach((r: any) => {
    console.log(`  ${r.priority}: ${r.count} tickets`);
  });
  
  console.log('\n🔍 Testando query com filtro high:\n');
  const testHigh = await database.query(`SELECT COUNT(*) FROM tickets WHERE priority = ANY($1)`, [['high']]);
  console.log(`  Resultado: ${testHigh.rows[0].count} tickets com priority=high`);
  
  console.log('\n🔍 Testando query com filtro medium:\n');
  const testMedium = await database.query(`SELECT COUNT(*) FROM tickets WHERE priority = ANY($1)`, [['medium']]);
  console.log(`  Resultado: ${testMedium.rows[0].count} tickets com priority=medium`);
  
  console.log('');
  process.exit(0);
})();
