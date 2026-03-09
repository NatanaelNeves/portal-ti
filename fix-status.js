const { Pool } = require('pg');
const p = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  // 1) in_stock -> available (frontend uses 'available' not 'in_stock')
  const r1 = await p.query("UPDATE inventory_equipment SET current_status='available' WHERE current_status='in_stock'");
  console.log('in_stock -> available:', r1.rowCount);

  // 2) maintenance -> available (com defeito = em estoque, nao em manutencao)
  const r2 = await p.query("UPDATE inventory_equipment SET current_status='available' WHERE current_status='maintenance'");
  console.log('maintenance -> available:', r2.rowCount);

  // 3) Summary
  const r3 = await p.query("SELECT current_status, COUNT(*) as c FROM inventory_equipment WHERE category='NOTEBOOK' GROUP BY current_status ORDER BY current_status");
  console.log('Summary:');
  r3.rows.forEach(r => console.log('  ' + r.current_status + ': ' + r.c));

  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
