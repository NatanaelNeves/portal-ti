const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'portal_ti',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

/**
 * Importar equipamentos de um arquivo CSV
 * 
 * Formato CSV esperado:
 * code,type,brand,model,serial_number,processor,ram,storage,status,location,notes
 * NB-001,notebook,Dell,Latitude 5420,ABC123,Intel i5 11th,16GB,512GB SSD,available,TI,Novo
 * 
 * Tipos válidos: notebook, desktop, monitor, mouse, keyboard, printer, other
 * Status válidos: available, in_use, maintenance, retired
 */
async function importEquipments(csvFilePath) {
  const equipments = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        equipments.push(row);
      })
      .on('end', async () => {
        console.log(`📁 ${equipments.length} equipamentos encontrados no CSV`);

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const equip of equipments) {
          try {
            // Validar campos obrigatórios
            if (!equip.code || !equip.type) {
              console.log(`⚠️  Pulando equipamento com dados incompletos: ${equip.code || 'sem código'}`);
              skipped++;
              continue;
            }

            // Validar type
            const validTypes = ['notebook', 'desktop', 'monitor', 'mouse', 'keyboard', 'printer', 'other'];
            if (!validTypes.includes(equip.type)) {
              console.log(`⚠️  Tipo inválido para ${equip.code}: ${equip.type}`);
              skipped++;
              continue;
            }

            // Validar status
            const validStatuses = ['available', 'in_use', 'maintenance', 'retired'];
            const status = equip.status || 'available';
            if (!validStatuses.includes(status)) {
              console.log(`⚠️  Status inválido para ${equip.code}: ${status}`);
              skipped++;
              continue;
            }

            // Verificar se já existe
            const existing = await pool.query(
              'SELECT id FROM equipment WHERE code = $1',
              [equip.code]
            );

            if (existing.rows.length > 0) {
              console.log(`⚠️  Equipamento já existe: ${equip.code}`);
              skipped++;
              continue;
            }

            // Inserir equipamento
            await pool.query(
              `INSERT INTO equipment (
                id, code, type, brand, model, serial_number,
                processor, ram, storage, status, location, notes,
                created_at
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
              )`,
              [
                equip.code,
                equip.type,
                equip.brand || null,
                equip.model || null,
                equip.serial_number || null,
                equip.processor || null,
                equip.ram || null,
                equip.storage || null,
                status,
                equip.location || null,
                equip.notes || null
              ]
            );

            console.log(`✅ Importado: ${equip.code} - ${equip.type} ${equip.brand || ''} ${equip.model || ''}`);
            imported++;
          } catch (error) {
            console.error(`❌ Erro ao importar ${equip.code}:`, error.message);
            errors++;
          }
        }

        console.log('\n📊 Resumo da Importação:');
        console.log(`   ✅ Importados: ${imported}`);
        console.log(`   ⚠️  Pulados: ${skipped}`);
        console.log(`   ❌ Erros: ${errors}`);

        resolve({ imported, skipped, errors });
      })
      .on('error', reject);
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  const csvFile = process.argv[2];

  if (!csvFile) {
    console.error('❌ Uso: node import-equipment.js <arquivo.csv>');
    console.log('\nFormato CSV esperado:');
    console.log('code,type,brand,model,serial_number,processor,ram,storage,status,location,notes');
    console.log('NB-001,notebook,Dell,Latitude 5420,ABC123,Intel i5,16GB,512GB SSD,available,TI,Novo');
    console.log('\nTipos válidos: notebook, desktop, monitor, mouse, keyboard, printer, other');
    console.log('Status válidos: available, in_use, maintenance, retired');
    process.exit(1);
  }

  if (!fs.existsSync(csvFile)) {
    console.error(`❌ Arquivo não encontrado: ${csvFile}`);
    process.exit(1);
  }

  importEquipments(csvFile)
    .then(({ imported, skipped, errors }) => {
      if (errors > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { importEquipments };
