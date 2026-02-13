const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'portal_ti',
  password: '123',
  port: 5432
});

const equipmentId = '360bd237-f04b-439b-9ddd-a3074fcaacb3';

pool.query('SELECT * FROM inventory_equipment WHERE id = $1', [equipmentId], (err, result) => {
  if (err) {
    console.error('❌ Error:', err);
  } else if (result.rows.length === 0) {
    console.log('❌ Equipment not found');
  } else {
    const eq = result.rows[0];
    console.log('\n📦 Equipment Status Fields:');
    console.log('  ID:', eq.id);
    console.log('  Internal Code:', eq.internal_code);
    console.log('  ⚠️  status field:', eq.status);
    console.log('  ✅ current_status field:', eq.current_status);
    console.log('  📍 current_location:', eq.current_location);
    console.log('  👤 current_responsible_id:', eq.current_responsible_id);
    console.log('\n🔍 All columns in result:');
    console.log(Object.keys(eq).join(', '));
  }
  pool.end();
});
