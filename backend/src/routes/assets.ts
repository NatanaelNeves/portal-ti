import { Router, Request, Response } from 'express';
import { database } from '../database/connection';

const inventoryRouter = Router();

// Get all inventory items
inventoryRouter.get('/inventory', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const status = req.query.status as string;
    let query = 'SELECT * FROM inventory_items ORDER BY created_at DESC';
    const params: any[] = [];

    if (status) {
      query = 'SELECT * FROM inventory_items WHERE status = $1 ORDER BY created_at DESC';
      params.push(status);
    }

    const result = await database.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Get single inventory item
inventoryRouter.get('/inventory/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await database.query('SELECT * FROM inventory_items WHERE id = $1', [id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create inventory item
inventoryRouter.post('/inventory', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const { name, type, serial_number, location, status } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type required' });
    }

    const result = await database.query(
      `INSERT INTO inventory_items (name, type, serial_number, location, status, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [name, type, serial_number || null, location || 'Storage', status || 'available']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update inventory item
inventoryRouter.patch('/inventory/:id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const { id } = req.params;
    const { name, type, location, status } = req.body;

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      fields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (type) {
      fields.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }
    if (location) {
      fields.push(`location = $${paramCount}`);
      values.push(location);
      paramCount++;
    }
    if (status) {
      fields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await database.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete inventory item
inventoryRouter.delete('/inventory/:id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const { id } = req.params;
    const result = await database.query('DELETE FROM inventory_items WHERE id = $1 RETURNING *', [id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default inventoryRouter;
