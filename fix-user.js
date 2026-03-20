const path = require('path');
process.chdir('/home/site/wwwroot');
const conn = require('./dist/database/connection');
const pool = conn.pool || conn.default || conn;
async function run() {
  const sel = await pool.query("SELECT id, name, email, role FROM internal_users WHERE role = 'admin_staff'");
  sel.rows.forEach(u => console.log('BEFORE: ' + JSON.stringify(u)));
  const upd = await pool.query("UPDATE internal_users SET name = 'Denilson Gomes da Silva' WHERE role = 'admin_staff' AND (name ILIKE '%de sousa%' OR name ILIKE '%denilson%') RETURNING id, name, email");
  upd.rows.forEach(u => console.log('UPDATED: ' + JSON.stringify(u)));
  if (upd.rowCount === 0) console.log('NO_MATCH - no admin_staff with de sousa or denilson in name');
}
run().catch(e => console.error('ERR:'+e.message)).finally(() => { try { pool.end(); } catch(x){} });