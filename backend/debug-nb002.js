const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'portal_ti',
  password: '123',
  port: 5432
});

const equipmentId = '360bd237-f04b-439b-9ddd-a3074fcaacb3';

async function debugEquipment() {
  try {
    // 1. Ver dados do equipamento
    const eq = await pool.query('SELECT * FROM inventory_equipment WHERE id = $1', [equipmentId]);
    console.log('\n📦 Equipamento NB-002:');
    console.log('  current_status:', eq.rows[0]?.current_status);
    console.log('  current_responsible_id:', eq.rows[0]?.current_responsible_id);

    // 2. Ver termos de responsabilidade
    const terms = await pool.query(`
      SELECT 
        id,
        responsible_id,
        responsible_name,
        status,
        issued_date,
        returned_date
      FROM responsibility_terms 
      WHERE equipment_id = $1
      ORDER BY issued_date DESC
    `, [equipmentId]);

    console.log('\n📋 Termos de Responsabilidade:');
    terms.rows.forEach(t => {
      console.log(`  - ID: ${t.id}`);
      console.log(`    Responsável ID: ${t.responsible_id}`);
      console.log(`    Responsável Nome: ${t.responsible_name}`);
      console.log(`    Status: ${t.status}`);
      console.log(`    Emitido: ${new Date(t.issued_date).toLocaleString('pt-BR')}`);
      console.log(`    Devolvido: ${t.returned_date ? new Date(t.returned_date).toLocaleString('pt-BR') : 'N/A'}`);
      console.log('');
    });

    // 3. Ver movimentações
    const movements = await pool.query(`
      SELECT 
        movement_type,
        to_user_name,
        movement_date
      FROM equipment_movements
      WHERE equipment_id = $1
      ORDER BY movement_date DESC
      LIMIT 3
    `, [equipmentId]);

    console.log('📦 Últimas Movimentações:');
    movements.rows.forEach(m => {
      console.log(`  - ${m.movement_type}: ${m.to_user_name || 'N/A'} em ${new Date(m.movement_date).toLocaleString('pt-BR')}`);
    });

    pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    pool.end();
  }
}

debugEquipment();
