const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'portal_ti',
  password: '123',
  port: 5432
});

async function fixEquipmentWithActiveTerms() {
  try {
    console.log('\n🔧 Iniciando correção de equipamentos com termos ativos...\n');

    // Atualizar equipamentos que têm termos ativos
    const updateQuery = `
      UPDATE inventory_equipment ie
      SET 
        current_responsible_id = rt.responsible_id,
        current_status = 'in_use',
        updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT DISTINCT ON (equipment_id)
          equipment_id,
          responsible_id
        FROM responsibility_terms
        WHERE status = 'active'
        ORDER BY equipment_id, issued_date DESC
      ) rt
      WHERE ie.id = rt.equipment_id
        AND ie.current_responsible_id IS NULL
      RETURNING 
        ie.id,
        ie.internal_code,
        ie.brand,
        ie.model
    `;

    const result = await pool.query(updateQuery);

    console.log(`✅ Corrigidos ${result.rows.length} equipamentos:\n`);
    result.rows.forEach(eq => {
      console.log(`  ✓ ${eq.internal_code}: ${eq.brand} ${eq.model}`);
    });

    console.log('\n📊 Alterações aplicadas:');
    console.log('  - current_responsible_id atualizado com base no termo ativo');
    console.log('  - current_status alterado para "in_use"');
    console.log('\n✅ Correção concluída!\n');

    pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    pool.end();
  }
}

fixEquipmentWithActiveTerms();
