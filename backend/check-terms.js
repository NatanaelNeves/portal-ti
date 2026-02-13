const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'portal_ti',
  password: '123',
  port: 5432
});

async function checkResponsibilityTerms() {
  try {
    // Buscar equipamentos com termos ativos mas sem responsável no inventory_equipment
    const query = `
      SELECT 
        ie.id,
        ie.internal_code,
        ie.brand,
        ie.model,
        ie.current_status,
        ie.current_responsible_id as equipment_responsible_id,
        rt.id as term_id,
        rt.responsible_id as term_responsible_id,
        rt.responsible_name,
        rt.status as term_status,
        rt.issued_date
      FROM inventory_equipment ie
      INNER JOIN responsibility_terms rt ON ie.id = rt.equipment_id
      WHERE rt.status = 'active'
        AND ie.current_responsible_id IS NULL
      ORDER BY rt.issued_date DESC
    `;

    const result = await pool.query(query);
    
    console.log(`\n🔍 Encontrados ${result.rows.length} equipamentos com termos ativos mas sem responsável\n`);
    
    if (result.rows.length > 0) {
      console.log('📋 Equipamentos que precisam ser corrigidos:\n');
      result.rows.forEach(eq => {
        console.log(`  - ${eq.internal_code}: ${eq.brand} ${eq.model}`);
        console.log(`    👤 Responsável no termo: ${eq.responsible_name}`);
        console.log(`    📊 Status atual: ${eq.current_status}`);
        console.log(`    📅 Termo emitido em: ${new Date(eq.issued_date).toLocaleString('pt-BR')}\n`);
      });

      // Perguntar se deve corrigir
      console.log('Esses equipamentos serão atualizados:');
      console.log('  - current_responsible_id = responsible_id do termo');
      console.log('  - current_status = in_use');
    } else {
      console.log('✅ Nenhum equipamento com termo ativo desatualizado');
    }

    pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    pool.end();
  }
}

checkResponsibilityTerms();
