import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { database } from '../database/connection';

const router = express.Router();

// GET /api/status — público, retorna incidentes ativos
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await database.query(
      `SELECT id, title, description, severity, status, created_at, resolved_at
       FROM system_incidents
       ORDER BY created_at DESC
       LIMIT 20`,
    );
    const active = result.rows.filter((r: any) => r.status === 'active');
    res.json({
      operational: active.length === 0,
      incidents: result.rows,
    });
  } catch (err) {
    console.error('[STATUS]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/status/incidents — criar incidente (admin/it_staff)
router.post('/incidents', authMiddleware, async (req: Request, res: Response) => {
  const { title, description, severity } = req.body;
  if (!title) { res.status(400).json({ error: 'title obrigatório' }); return; }
  const user = (req as any).user;
  try {
    const result = await database.query(
      `INSERT INTO system_incidents (title, description, severity, status, created_by_id)
       VALUES ($1, $2, $3, 'active', $4) RETURNING *`,
      [title, description || null, severity || 'medium', user.id],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar incidente' });
  }
});

// PATCH /api/status/incidents/:id/resolve — resolver incidente
router.patch('/incidents/:id/resolve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await database.query(
      `UPDATE system_incidents SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Incidente não encontrado' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao resolver incidente' });
  }
});

// DELETE /api/status/incidents/:id — remover incidente
router.delete('/incidents/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await database.query('DELETE FROM system_incidents WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover incidente' });
  }
});

export default router;
