const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'portal_ti',
  password: '123',
  port: 5432
});

async function fixInconsistentEquipment() {
  try {
    // 1. Buscar equipamentos "em uso" sem responsável
    const inconsistent = await pool.query(`
      SELECT id, internal_code, brand, model, current_status, current_responsible_id
      FROM inventory_equipment
      WHERE current_status = 'in_use' AND current_responsible_id IS NULL
    `);

    console.log(`\n🔍 Encontrados ${inconsistent.rows.length} equipamentos inconsistentes`);
    
    if (inconsistent.rows.length > 0) {
      console.log('\n📋 Equipamentos que serão corrigidos:');
      inconsistent.rows.forEach(eq => {
        console.log(`  - ${eq.internal_code}: ${eq.brand} ${eq.model}`);
      });

      // 2. Atualizar para 'in_stock'
      const result = await pool.query(`
        UPDATE inventory_equipment
        SET current_status = 'in_stock'
        WHERE current_status = 'in_use' AND current_responsible_id IS NULL
        RETURNING id, internal_code
      `);

      console.log(`\n✅ Corrigidos ${result.rows.length} equipamentos`);
      console.log('   Status alterado de "in_use" para "in_stock"');
    } else {
      console.log('✅ Nenhum equipamento inconsistente encontrado');
    }

    pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    pool.end();
  }
}

fixInconsistentEquipment();
