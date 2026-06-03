import express, { Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { database } from '../database/connection';
import { UserRole } from '../types/enums';

const router = express.Router();
const guard = [authMiddleware, requireRole(UserRole.ADMIN, UserRole.IT_STAFF)];

router.get('/', ...guard, async (_req: Request, res: Response) => {
  const result = await database.query(`SELECT * FROM recurring_tickets ORDER BY created_at DESC`);
  res.json(result.rows);
});

router.post('/', ...guard, async (req: Request, res: Response) => {
  const { title, description, type, priority, department, category, frequency, day_of_week, day_of_month } = req.body;
  if (!title || !description || !frequency) { res.status(400).json({ error: 'title, description e frequency são obrigatórios' }); return; }
  const user = (req as any).user;
  const result = await database.query(
    `INSERT INTO recurring_tickets (title, description, type, priority, department, category, frequency, day_of_week, day_of_month, created_by_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [title, description, type||'request', priority||'medium', department||'ti', category||null, frequency, day_of_week||null, day_of_month||null, user.id],
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/:id', ...guard, async (req: Request, res: Response) => {
  const { is_active } = req.body;
  const result = await database.query(
    `UPDATE recurring_tickets SET is_active=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
    [is_active, req.params.id],
  );
  if (!result.rows.length) { res.status(404).json({ error: 'Não encontrado' }); return; }
  res.json(result.rows[0]);
});

router.delete('/:id', ...guard, async (req: Request, res: Response) => {
  await database.query(`DELETE FROM recurring_tickets WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

export default router;
