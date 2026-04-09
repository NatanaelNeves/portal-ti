// Rota de diagnóstico temporária - remover após uso
import { Router, Request, Response } from 'express';
import { database } from '../database/connection';

const diagnosticRouter = Router();

// GET /api/diagnostic/documents - Verificar todos os documentos
diagnosticRouter.get('/documents', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Diagnostic: Checking all documents...');

    // Documento específico
    const docResult = await database.query(
      `SELECT id, title, file_url, file_size, document_type, created_at
       FROM documents
       WHERE id = 'f3657198-d245-4c8c-9af2-e24b5ef0e0bb'`
    );

    // Todos os documentos
    const allDocs = await database.query(
      `SELECT id, title, file_url, file_size, document_type, created_at,
              CASE 
                WHEN file_url IS NULL THEN 'SEM_ARQUIVO'
                ELSE 'COM_ARQUIVO'
              END as status
       FROM documents
       ORDER BY created_at DESC`
    );

    // Documentos sem arquivo
    const noFileUrl = await database.query(
      `SELECT id, title, created_at
       FROM documents
       WHERE file_url IS NULL
       ORDER BY created_at DESC`
    );

    res.json({
      specific_document: {
        id: 'f3657198-d245-4c8c-9af2-e24b5ef0e0bb',
        found: docResult.rows.length > 0,
        document: docResult.rows[0] || null
      },
      all_documents: {
        total: allDocs.rows.length,
        documents: allDocs.rows
      },
      documents_without_file: {
        total: noFileUrl.rows.length,
        documents: noFileUrl.rows
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Diagnostic error:', error);
    res.status(500).json({
      error: 'Failed to check documents',
      details: error.message
    });
  }
});

export default diagnosticRouter;
