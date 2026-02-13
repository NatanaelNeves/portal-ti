import { database } from './src/database/connection';

(async () => {
  const res = await database.query(`SELECT DISTINCT priority FROM tickets ORDER BY priority`);
  console.log('\n📊 Valores de prioridade no banco:\n');
  res.rows.forEach((r: any) => {
    console.log(`  - ${r.priority}`);
  });
  console.log('');
  process.exit(0);
})();
