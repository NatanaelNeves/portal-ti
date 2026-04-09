// Script para verificar documentos no banco de dados
import { database } from './src/database/connection';

async function checkDocuments() {
  try {
    console.log('🔍 Verificando documentos no banco de dados...\n');

    // Verificar documento específico
    console.log('📄 Documento específico (f3657198-d245-4c8c-9af2-e24b5ef0e0bb):');
    const docResult = await database.query(
      `SELECT id, title, file_url, file_size, document_type, created_at
       FROM documents
       WHERE id = $1`,
      ['f3657198-d245-4c8c-9af2-e24b5ef0e0bb']
    );

    if (docResult.rows.length === 0) {
      console.error('❌ Documento NÃO EXISTE no banco de dados!\n');
    } else {
      const doc = docResult.rows[0];
      console.log(`  ID: ${doc.id}`);
      console.log(`  Título: ${doc.title}`);
      console.log(`  File URL: ${doc.file_url || 'NULL'}`);
      console.log(`  File Size: ${doc.file_size || 'NULL'}`);
      console.log(`  Document Type: ${doc.document_type}`);
      console.log(`  Created At: ${doc.created_at}`);
      console.log('');
    }

    // Listar todos os documentos
    console.log('📋 Todos os documentos no banco:');
    const allDocs = await database.query(
      `SELECT id, title, file_url, 
              CASE 
                WHEN file_url IS NULL THEN 'SEM ARQUIVO'
                ELSE 'COM ARQUIVO'
              END as status
       FROM documents
       ORDER BY created_at DESC
       LIMIT 20`
    );

    if (allDocs.rows.length === 0) {
      console.log('  (Nenhum documento encontrado)\n');
    } else {
      allDocs.rows.forEach((doc, index) => {
        console.log(`\n${index + 1}. ${doc.title}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Status: ${doc.status}`);
        console.log(`   File URL: ${doc.file_url || 'NULL'}`);
      });
      console.log('');
    }

    // Verificar documentos com problemas
    console.log('⚠️ Documentos SEM file_url:');
    const noFileUrl = await database.query(
      `SELECT id, title, created_at
       FROM documents
       WHERE file_url IS NULL
       ORDER BY created_at DESC`
    );

    if (noFileUrl.rows.length === 0) {
      console.log('  (Todos documentos têm arquivo)\n');
    } else {
      noFileUrl.rows.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.title} (ID: ${doc.id})`);
      });
      console.log('');
    }

    await database.disconnect();
    console.log('✅ Verificação concluída');
  } catch (error: any) {
    console.error('❌ Erro ao verificar documentos:', error.message);
    process.exit(1);
  }
}

checkDocuments();
