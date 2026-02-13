import { database } from './src/database/connection';

(async () => {
  const res = await database.query(`SELECT id, title FROM tickets WHERE title LIKE '%�%' LIMIT 5`);
  console.log('\n📊 Tickets restantes com problemas de encoding:\n');
  res.rows.forEach((t: any, i: number) => {
    console.log(`${i+1}. [${t.id.substring(0,8)}] "${t.title}"`);
  });
  console.log('');
  process.exit(0);
})();
