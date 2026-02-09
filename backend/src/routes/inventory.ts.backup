import { Router, Request, Response } from 'express';
import { database } from '../database/connection';

const inventoryRouter = Router();

// ===== RESPONSABILIDADES (Notebooks) =====

// GET - Listar responsabilidades (notebooks por pessoa)
inventoryRouter.get('/responsibilities', async (req: Request, res: Response) => {
  try {
    const result = await database.query(`
      SELECT 
        ie.id,
        ie.code,
        ie.brand,
        ie.model,
        rt.responsible_name,
        rt.responsible_cpf,
        rt.responsible_position as department,
        rt.issued_date,
        ie.status,
        rt.status as term_status
      FROM inventory_equipment ie
      LEFT JOIN responsibility_terms rt ON ie.id = rt.equipment_id AND rt.status = 'active'
      WHERE ie.status = 'in_use'
      ORDER BY rt.responsible_name, ie.code
    `);

    res.json({ responsibilities: result.rows });
  } catch (error: any) {
    console.error('Error fetching responsibilities:', error);
    res.status(500).json({ error: 'Failed to fetch responsibilities' });
  }
});

// GET - Detalhes de um responsável
inventoryRouter.get('/responsibilities/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await database.query(`
      SELECT 
        ie.id,
        ie.internal_code,
        ie.type,
        ie.brand,
        ie.model,
        ie.serial_number,
        rt.id as term_id,
        rt.issued_date,
        rt.signed_date,
        rt.status as term_status,
        ie.current_status,
        ie.notes
      FROM inventory_equipment ie
      LEFT JOIN responsibility_terms rt ON ie.id = rt.equipment_id
      WHERE rt.responsible_id = $1
      ORDER BY rt.issued_date DESC
    `, [userId]);

    res.json({ user_equipment: result.rows });
  } catch (error: any) {
    console.error('Error fetching user equipment:', error);
    res.status(500).json({ error: 'Failed to fetch user equipment' });
  }
});

// ===== EQUIPAMENTOS (Estoque) =====

// GET - Listar todos os equipamentos
inventoryRouter.get('/equipment', async (req: Request, res: Response) => {
  try {
    const { status, brand } = req.query;

    let query = `
      SELECT 
        id,
        code,
        brand,
        model,
        status,
        serial_number,
        purchase_date,
        warranty_expiry,
        created_at
      FROM inventory_equipment
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (brand) {
      params.push(`%${brand}%`);
      query += ` AND brand ILIKE $${params.length}`;
    }

    query += ` ORDER BY code ASC`;

    const result = await database.query(query, params);
    res.json({ equipment: result.rows });
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// GET - Detalhes de um equipamento com histórico
inventoryRouter.get('/equipment/:equipmentId', async (req: Request, res: Response) => {
  try {
    const { equipmentId } = req.params;

    const equipment = await database.query(`
      SELECT * FROM inventory_equipment WHERE id = $1
    `, [equipmentId]);

    if (equipment.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const movements = await database.query(`
      SELECT 
        'ATUALIZAÇÃO'::text as movement_type,
        updated_at as movement_date,
        notes
      FROM inventory_equipment
      WHERE id = $1
      ORDER BY updated_at DESC
      LIMIT 10
    `, [equipmentId]);

    const terms = await database.query(`
      SELECT 
        id,
        issued_date,
        signature_date as signed_date,
        returned_date,
        status,
        responsible_name
      FROM responsibility_terms
      WHERE equipment_id = $1
      ORDER BY issued_date DESC
    `, [equipmentId]);

    res.json({
      equipment: equipment.rows[0],
      movements: movements.rows,
      terms: terms.rows
    });
  } catch (error: any) {
    console.error('Error fetching equipment details:', error);
    res.status(500).json({ error: 'Failed to fetch equipment details' });
  }
});

// POST - Registrar novo equipamento
inventoryRouter.post('/equipment', async (req: Request, res: Response) => {
  try {
    const { internal_code, type, brand, model, serial_number } = req.body;

    const result = await database.query(`
      INSERT INTO inventory_equipment 
      (internal_code, type, brand, model, serial_number, current_status)
      VALUES ($1, $2, $3, $4, $5, 'in_stock')
      RETURNING *
    `, [internal_code, type, brand, model, serial_number]);

    res.status(201).json({ equipment: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating equipment:', error);
    res.status(500).json({ error: 'Failed to create equipment' });
  }
});

// ===== COMPRAS & SOLICITAÇÕES =====

// GET - Listar solicitações de compra
inventoryRouter.get('/purchases', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        id,
        item_description,
        quantity,
        status,
        estimated_value,
        actual_value,
        expected_delivery_date,
        supplier
      FROM purchase_requisitions
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await database.query(query, params);
    res.json({ purchases: result.rows });
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// POST - Nova solicitação de compra
inventoryRouter.post('/purchases', async (req: Request, res: Response) => {
  try {
    const { item_description, quantity, estimated_value, supplier } = req.body;
    const userId = req.headers['x-user-id'] as string;

    const result = await database.query(`
      INSERT INTO purchase_requisitions 
      (item_description, quantity, requested_by_id, estimated_value, supplier, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [item_description, quantity, userId, estimated_value, supplier]);

    res.status(201).json({ purchase: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating purchase requisition:', error);
    res.status(500).json({ error: 'Failed to create purchase requisition' });
  }
});

// PATCH - Atualizar status de compra
inventoryRouter.patch('/purchases/:purchaseId', async (req: Request, res: Response) => {
  try {
    const { purchaseId } = req.params;
    const { status, actual_value, received_by_id } = req.body;

    const result = await database.query(`
      UPDATE purchase_requisitions 
      SET status = $1, actual_value = $2, received_by_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, actual_value, received_by_id, purchaseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json({ purchase: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating purchase:', error);
    res.status(500).json({ error: 'Failed to update purchase' });
  }
});

// ===== MOVIMENTAÇÕES =====

// POST - Registrar movimentação (entrega, devolução, transferência)
inventoryRouter.post('/movements', async (req: Request, res: Response) => {
  try {
    const { equipment_id, movement_type, to_user_id, reason } = req.body;
    const registeredById = req.headers['x-user-id'] as string;

    const equipment = await database.query(
      'SELECT current_responsible_id FROM inventory_equipment WHERE id = $1',
      [equipment_id]
    );

    const from_user_id = equipment.rows[0]?.current_responsible_id;

    // Registrar movimentação
    await database.query(`
      INSERT INTO equipment_movements 
      (equipment_id, movement_type, from_user_id, to_user_id, reason, registered_by_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [equipment_id, movement_type, from_user_id, to_user_id, reason, registeredById]);

    // Atualizar status do equipamento
    let new_status = 'in_stock';
    if (movement_type === 'entrega') {
      new_status = 'in_use';
    } else if (movement_type === 'manutenção') {
      new_status = 'in_maintenance';
    } else if (movement_type === 'devolução') {
      new_status = 'in_stock';
    }

    await database.query(`
      UPDATE inventory_equipment 
      SET current_responsible_id = $1, current_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [to_user_id || null, new_status, equipment_id]);

    res.status(201).json({ message: 'Movement registered successfully' });
  } catch (error: any) {
    console.error('Error registering movement:', error);
    res.status(500).json({ error: 'Failed to register movement' });
  }
});

// ===== RESPONSIBILITY TERMS (Termos de Responsabilidade) =====

// GET - Detalhes completos de um equipamento com histórico e termos
inventoryRouter.get('/equipment/:equipmentId', async (req: Request, res: Response) => {
  try {
    const { equipmentId } = req.params;

    // Fetch equipment details
    const equipmentResult = await database.query(`
      SELECT 
        ie.*,
        iu.name as current_responsible_name
      FROM inventory_equipment ie
      LEFT JOIN internal_users iu ON ie.current_responsible_id = iu.id
      WHERE ie.id = $1
    `, [equipmentId]);

    if (equipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Fetch movement history
    const movementsResult = await database.query(`
      SELECT 
        id, movement_type, from_location, to_location, reason, movement_date
      FROM equipment_movements
      WHERE equipment_id = $1
      ORDER BY movement_date DESC
    `, [equipmentId]);

    // Fetch responsibility terms
    const termsResult = await database.query(`
      SELECT 
        id, responsible_name, issued_date, returned_date, status, signature_method
      FROM responsibility_terms
      WHERE equipment_id = $1
      ORDER BY issued_date DESC
    `, [equipmentId]);

    res.json({
      equipment: equipmentResult.rows[0],
      movements: movementsResult.rows,
      terms: termsResult.rows
    });
  } catch (error: any) {
    console.error('Error fetching equipment details:', error);
    res.status(500).json({ error: 'Failed to fetch equipment details' });
  }
});

// POST - Criar novo termo de responsabilidade
inventoryRouter.post('/terms', async (req: Request, res: Response) => {
  try {
    const {
      equipment_id,
      responsible_name,
      responsible_cpf,
      responsible_position,
      responsible_department,
      equipment_details,
      accessories,
      signature_method,
      signature_date
    } = req.body;

    // Validate required fields
    if (!equipment_id || !responsible_name || !responsible_cpf || !responsible_position) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create responsibility term
    const result = await database.query(`
      INSERT INTO responsibility_terms (
        equipment_id,
        responsible_name,
        responsible_cpf,
        responsible_position,
        responsible_department,
        equipment_details,
        accessories,
        signature_method,
        signature_date,
        status,
        issued_date,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, CURRENT_TIMESTAMP)
      RETURNING id, equipment_id, status, issued_date
    `, [
      equipment_id,
      responsible_name,
      responsible_cpf,
      responsible_position,
      responsible_department,
      JSON.stringify(equipment_details),
      JSON.stringify(accessories),
      signature_method,
      signature_date,
      'active'
    ]);

    // Update equipment status if needed
    await database.query(`
      UPDATE inventory_equipment 
      SET current_responsible_name = $1, current_status = 'in_use', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [responsible_name, equipment_id]);

    res.status(201).json({
      message: 'Responsibility term created successfully',
      term: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating responsibility term:', error);
    res.status(500).json({ error: 'Failed to create responsibility term' });
  }
});

// POST - Registrar devolução de equipamento
inventoryRouter.post('/terms/:termId/devolucao', async (req: Request, res: Response) => {
  try {
    const { termId } = req.params;
    const {
      return_date,
      return_reason,
      reason_other,
      received_by,
      equipment_condition,
      checklist,
      damage_description,
      witness_name
    } = req.body;

    // Validate required fields
    if (!return_date || !return_reason || !received_by) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get term and equipment ID
    const termResult = await database.query(`
      SELECT equipment_id FROM responsibility_terms WHERE id = $1
    `, [termId]);

    if (termResult.rows.length === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }

    const equipment_id = termResult.rows[0].equipment_id;

    // Update term with return information
    await database.query(`
      UPDATE responsibility_terms 
      SET 
        status = 'returned',
        returned_date = $1,
        return_reason = $2,
        reason_other = $3,
        received_by = $4,
        equipment_condition = $5,
        checklist = $6,
        damage_description = $7,
        witness_name = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
    `, [
      return_date,
      return_reason,
      reason_other,
      received_by,
      equipment_condition,
      JSON.stringify(checklist),
      damage_description,
      witness_name,
      termId
    ]);

    // Update equipment status to in_stock
    await database.query(`
      UPDATE inventory_equipment 
      SET current_status = 'in_stock', current_responsible_id = NULL, current_responsible_name = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [equipment_id]);

    // Register movement
    await database.query(`
      INSERT INTO equipment_movements (
        equipment_id, movement_type, from_location, to_location, reason, movement_date, registered_by_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `, [
      equipment_id,
      'devolução',
      'Colaborador',
      'TI - Estoque',
      return_reason === 'outro' ? reason_other : return_reason,
      return_date
    ]);

    res.json({
      message: 'Return registered successfully',
      term: { id: termId, status: 'returned', returned_date: return_date }
    });
  } catch (error: any) {
    console.error('Error registering return:', error);
    res.status(500).json({ error: 'Failed to register return' });
  }
});

// GET - Listar todos os termos de um colaborador
inventoryRouter.get('/terms/user/:userName', async (req: Request, res: Response) => {
  try {
    const { userName } = req.params;

    const result = await database.query(`
      SELECT 
        rt.id,
        rt.equipment_id,
        rt.responsible_name,
        rt.issued_date,
        rt.returned_date,
        rt.status,
        ie.brand,
        ie.model,
        ie.internal_code
      FROM responsibility_terms rt
      JOIN inventory_equipment ie ON rt.equipment_id = ie.id
      WHERE rt.responsible_name ILIKE $1
      ORDER BY rt.issued_date DESC
    `, [`%${userName}%`]);

    res.json({ terms: result.rows });
  } catch (error: any) {
    console.error('Error fetching user terms:', error);
    res.status(500).json({ error: 'Failed to fetch user terms' });
  }
});

// ===== DASHBOARD DE INVENTÁRIO =====

// GET - Visão geral do inventário
inventoryRouter.get('/dashboard/summary', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Fetching dashboard summary...');
    
    const in_use = await database.query(
      'SELECT COUNT(*) FROM inventory_equipment WHERE status = $1',
      ['in_use']
    );

    const in_stock = await database.query(
      'SELECT COUNT(*) FROM inventory_equipment WHERE status = $1',
      ['in_stock']
    );

    const in_maintenance = await database.query(
      'SELECT COUNT(*) FROM inventory_equipment WHERE status = $1',
      ['in_maintenance']
    );

    const notebooks = await database.query(
      'SELECT COUNT(*) FROM inventory_equipment WHERE brand ILIKE $1 OR model ILIKE $1',
      ['%notebook%']
    );

    const without_terms = await database.query(`
      SELECT COUNT(*) FROM inventory_equipment 
      WHERE status = 'in_use' 
      AND NOT EXISTS (
        SELECT 1 FROM responsibility_terms 
        WHERE equipment_id = inventory_equipment.id AND status = 'active'
      )
    `);

    const pending_purchases = await database.query(
      'SELECT COUNT(*) FROM purchase_requisitions WHERE status = $1 OR status = $2',
      ['pending', 'approved']
    );

    res.json({
      summary: {
        in_use: parseInt(in_use.rows[0].count),
        in_stock: parseInt(in_stock.rows[0].count),
        in_maintenance: parseInt(in_maintenance.rows[0].count),
        notebooks: parseInt(notebooks.rows[0].count),
        without_terms: parseInt(without_terms.rows[0].count),
        pending_purchases: parseInt(pending_purchases.rows[0].count)
      }
    });
  } catch (error: any) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ error: 'Failed to fetch inventory summary' });
  }
});

// POST - Registrar recebimento de equipamento
inventoryRouter.post('/equipment/:equipmentId/receive', async (req: Request, res: Response) => {
  try {
    const { equipmentId } = req.params;
    const { received_date, received_by, condition, notes } = req.body;

    // Validação básica
    if (!received_date || !received_by || !condition) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Atualizar o equipamento e seu status
    const updateResult = await database.query(`
      UPDATE inventory_equipment
      SET status = 'in_stock', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [equipmentId]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Registrar movimento de recebimento
    const movementResult = await database.query(`
      INSERT INTO equipment_movements 
      (equipment_id, movement_type, notes, created_at)
      VALUES ($1, 'receive', $2, CURRENT_TIMESTAMP)
      RETURNING *
    `, [equipmentId, `Recebimento - ${received_by} - ${condition} - ${notes}`]);

    res.status(201).json({
      equipment: updateResult.rows[0],
      movement: movementResult.rows[0],
      message: 'Equipment received successfully'
    });
  } catch (error: any) {
    console.error('Error receiving equipment:', error);
    res.status(500).json({ error: 'Failed to receive equipment' });
  }
});

export default inventoryRouter;
