import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { database } from '../database/connection';
import { upload, deleteFile } from '../services/uploadService';
import path from 'path';
import fs from 'fs';

const documentsRouter = Router();

// Helper: verify internal JWT
function verifyInternalToken(req: Request): any | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    const decoded: any = jwt.verify(token, config.jwt.secret);
    if (!decoded || !decoded.id) return null;
    return decoded;
  } catch {
    return null;
  }
}

// Upload middleware for documents
const uploadDocFile = upload.single('file');

// ── GET /api/documents ──────────────────────────────────────
// List all documents (with optional filters)
documentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = verifyInternalToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { document_type, search, is_public } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (document_type) {
      params.push(document_type);
      conditions.push(`d.document_type = $${params.length}`);
    }

    if (is_public !== undefined) {
      params.push(is_public === 'true');
      conditions.push(`d.is_public = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(d.title ILIKE $${params.length} OR d.description ILIKE $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await database.query(
      `SELECT d.*, u.name as uploaded_by_name
       FROM documents d
       LEFT JOIN internal_users u ON d.uploaded_by_id = u.id
       ${where}
       ORDER BY d.created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Erro ao listar documentos' });
  }
});

// ── GET /api/documents/stats ─────────────────────────────────
// Get document stats
documentsRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = verifyInternalToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const result = await database.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE document_type = 'manual') as manuais,
        COUNT(*) FILTER (WHERE document_type = 'policy') as politicas,
        COUNT(*) FILTER (WHERE document_type = 'procedure') as procedimentos,
        COUNT(*) FILTER (WHERE document_type = 'form') as formularios,
        COUNT(*) FILTER (WHERE document_type = 'template') as modelos,
        COUNT(*) FILTER (WHERE document_type = 'other') as outros,
        COUNT(*) FILTER (WHERE is_public = true) as publicos,
        COUNT(*) FILTER (WHERE is_public = false) as privados,
        COALESCE(SUM(views_count), 0) as total_views
      FROM documents
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting document stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// ── GET /api/documents/:id/download ──────────────────────────
// Download document file
documentsRouter.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await database.query(
      'SELECT file_url, title FROM documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const doc = result.rows[0];

    if (!doc.file_url) {
      return res.status(404).json({ error: 'Arquivo não disponível para este documento' });
    }

    // Construir caminho absoluto do arquivo
    const filePath = path.join(__dirname, '../..', doc.file_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
    }

    // Enviar arquivo com headers apropriados
    res.download(filePath, `${doc.title}${path.extname(doc.file_url)}`);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Erro ao baixar documento' });
  }
});

// ── GET /api/documents/:id ───────────────────────────────────
// Get single document + increment view count
documentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Increment view count
    await database.query(
      'UPDATE documents SET views_count = views_count + 1 WHERE id = $1',
      [id]
    );

    const result = await database.query(
      `SELECT d.*, u.name as uploaded_by_name
       FROM documents d
       LEFT JOIN internal_users u ON d.uploaded_by_id = u.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Erro ao buscar documento' });
  }
});

// ── POST /api/documents ──────────────────────────────────────
// Create document (with optional file upload)
documentsRouter.post('/', uploadDocFile, async (req: Request, res: Response) => {
  try {
    const user = verifyInternalToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { title, description, document_type, is_public } = req.body;

    if (!title || !document_type) {
      return res.status(400).json({ error: 'Título e tipo são obrigatórios' });
    }

    let file_url: string | null = null;
    let file_size: number | null = null;

    if (req.file) {
      file_url = `/uploads/documents/${req.file.filename}`;
      file_size = req.file.size;
    }

    const result = await database.query(
      `INSERT INTO documents (title, description, document_type, file_url, file_size, is_public, uploaded_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title,
        description || null,
        document_type,
        file_url,
        file_size,
        is_public === 'true' || is_public === true,
        user.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Erro ao criar documento' });
  }
});

// ── PUT /api/documents/:id ───────────────────────────────────
// Update document metadata
documentsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = verifyInternalToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { id } = req.params;
    const { title, description, document_type, is_public } = req.body;

    const result = await database.query(
      `UPDATE documents 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           document_type = COALESCE($3, document_type),
           is_public = COALESCE($4, is_public),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, description, document_type, is_public, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
});

// ── DELETE /api/documents/:id ────────────────────────────────
// Delete document + file
documentsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = verifyInternalToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { id } = req.params;

    // Get file path before deleting record
    const doc = await database.query(
      'SELECT file_url FROM documents WHERE id = $1',
      [id]
    );

    if (doc.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Delete file if exists
    if (doc.rows[0].file_url) {
      const filePath = require('path').join(__dirname, '../..', doc.rows[0].file_url);
      deleteFile(filePath);
    }

    await database.query('DELETE FROM documents WHERE id = $1', [id]);

    res.json({ message: 'Documento removido com sucesso' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Erro ao remover documento' });
  }
});

export default documentsRouter;
