/**
 * Script para corrigir encoding UTF-8 em tickets existentes
 * Executa: npx ts-node backend/fix-encoding.ts
 */

import { database } from './src/database/connection';

async function fixEncoding() {
  console.log('🔧 Corrigindo encoding UTF-8 nos tickets...\n');

  try {
    // 1. Verificar encoding atual
    const encodingResult = await database.query('SHOW client_encoding');
    console.log('📝 Encoding atual:', encodingResult.rows[0].client_encoding);

    // 2. Buscar tickets com caracteres corrompidos
    const corruptedTickets = await database.query(`
      SELECT id, title, description
      FROM tickets
      WHERE title LIKE '%�%' OR description LIKE '%�%'
    `);

    console.log(`\n📊 Encontrados ${corruptedTickets.rows.length} tickets com problemas de encoding\n`);

    if (corruptedTickets.rows.length === 0) {
      console.log('✅ Nenhum ticket precisa de correção!');
      return;
    }

    // 3. Mostrar tickets que serão corrigidos
    console.log('Tickets que serão corrigidos:');
    corruptedTickets.rows.forEach((ticket: any, index: number) => {
      console.log(`${index + 1}. [${ticket.id.substring(0, 8)}] ${ticket.title}`);
    });

    console.log('\n🔄 Aplicando correções...\n');

    // 4. Aplicar correções comuns
    const replacements = [
      ['�o', 'ão'],
      ['n�o', 'não'],
      ['est�', 'está'],
      ['descri��o', 'descrição'],
      ['informa��o', 'informação'],
      ['fun��o', 'função'],
      ['aten��o', 'atenção'],
      ['solu��o', 'solução'],
      ['instala��o', 'instalação'],
      ['configura��o', 'configuração']
    ];

    let totalFixed = 0;

    for (const [wrong, correct] of replacements) {
      // Corrigir títulos
      const titleResult = await database.query(
        `UPDATE tickets SET title = REPLACE(title, $1, $2) WHERE title LIKE $3`,
        [wrong, correct, `%${wrong}%`]
      );
      
      // Corrigir descrições
      const descResult = await database.query(
        `UPDATE tickets SET description = REPLACE(description, $1, $2) WHERE description LIKE $3`,
        [wrong, correct, `%${wrong}%`]
      );

      const fixed = (titleResult.rowCount || 0) + (descResult.rowCount || 0);
      if (fixed > 0) {
        console.log(`✓ "${wrong}" → "${correct}": ${fixed} correções`);
        totalFixed += fixed;
      }
    }

    console.log(`\n✅ Total de correções aplicadas: ${totalFixed}`);

    // 5. Verificar se ainda há problemas
    const remainingIssues = await database.query(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE title LIKE '%�%' OR description LIKE '%�%'
    `);

    if (parseInt(remainingIssues.rows[0].count) > 0) {
      console.log(`\n⚠️ Ainda há ${remainingIssues.rows[0].count} tickets com caracteres não corrigidos automaticamente`);
      console.log('Execute: SELECT id, title FROM tickets WHERE title LIKE \'%�%\' LIMIT 5; no PostgreSQL para ver quais são');
    } else {
      console.log('\n🎉 Todos os tickets foram corrigidos com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro ao corrigir encoding:', error);
  }
}

fixEncoding();
