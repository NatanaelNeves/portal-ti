import { database } from './src/database/connection';

(async () => {
  const res = await database.query(`
    SELECT id, title, priority, status 
    FROM tickets 
    ORDER BY priority, created_at DESC
  `);
  
  console.log('\n📊 TODOS OS TICKETS E SUAS PRIORIDADES:\n');
  
  let currentPriority = '';
  res.rows.forEach((t: any) => {
    if (t.priority !== currentPriority) {
      currentPriority = t.priority;
      console.log(`\n=== PRIORIDADE: ${t.priority.toUpperCase()} ===`);
    }
    console.log(`  [${t.id.substring(0,8)}] ${t.title} (status: ${t.status})`);
  });
  
  console.log('\n');
  process.exit(0);
})();
