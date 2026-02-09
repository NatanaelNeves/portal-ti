import { Router, Request, Response } from 'express';
import { database } from '../database/connection';
import { PDFService } from '../services/pdfService';
import { QRCodeService } from '../services/qrcodeService';
import { uploadEquipmentPhoto, uploadDocument, getFileUrl, deleteFile } from '../services/uploadService';

const inventoryRouter = Router();

// ===== HELPER FUNCTIONS =====

// Gerar próximo código interno baseado no tipo
async function generateInternalCode(category: string, type: string): Promise<string> {
  let prefix = 'EQ';
  
  if (category === 'NOTEBOOK') {
    prefix = 'NB';
  } else {
    // Periféricos
    if (type.toLowerCase().includes('mouse')) prefix = 'MS';
    else if (type.toLowerCase().includes('teclado') || type.toLowerCase().includes('keyboard')) prefix = 'KB';
    else if (type.toLowerCase().includes('monitor')) prefix = 'MN';
    else if (type.toLowerCase().includes('carregador') || type.toLowerCase().includes('charger')) prefix = 'CH';
    else if (type.toLowerCase().includes('webcam')) prefix = 'WC';
    else if (type.toLowerCase().includes('fone') || type.toLowerCase().includes('headset')) prefix = 'HS';
    else prefix = 'PR'; // Peripheral genérico
  }
  
  const result = await database.query(`
    SELECT internal_code FROM inventory_equipment 
    WHERE internal_code LIKE $1 
    ORDER BY internal_code DESC 
    LIMIT 1
  `, [`${prefix}-%`]);
  
  if (result.rows.length === 0) {
    return `${prefix}-001`;
  }
  
  const lastCode = result.rows[0].internal_code;
  const lastNumber = parseInt(lastCode.split('-')[1]);
  const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
  
  return `${prefix}-${nextNumber}`;
}

// Gerar número de movimentação
async function generateMovementNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MOV-${year}`;
  
  const result = await database.query(`
    SELECT movement_number FROM equipment_movements 
    WHERE movement_number LIKE $1 
    ORDER BY movement_number DESC 
    LIMIT 1
  `, [`${prefix}-%`]);
  
  if (result.rows.length === 0) {
    return `${prefix}-000001`;
  }
  
  const lastNumber = parseInt(result.rows[0].movement_number.split('-')[2]);
  const nextNumber = (lastNumber + 1).toString().padStart(6, '0');
  
  return `${prefix}-${nextNumber}`;
}

// Gerar número de requisição
async function generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PED-${year}`;
  
  const result = await database.query(`
    SELECT request_number FROM purchase_requisitions 
    WHERE request_number LIKE $1 
    ORDER BY request_number DESC 
    LIMIT 1
  `, [`${prefix}-%`]);
  
  if (result.rows.length === 0) {
    return `${prefix}-001`;
  }
  
  const lastNumber = parseInt(result.rows[0].request_number.split('-')[2]);
  const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
  
  return `${prefix}-${nextNumber}`;
}

// ===== NOTEBOOKS =====

// GET - Listar notebooks
inventoryRouter.get('/notebooks', async (req: Request, res: Response) => {
  try {
    const { status, unit } = req.query;

    let query = `
      SELECT 
        ie.*,
        iu.name as responsible_name,
        rt.issued_date as in_use_since
      FROM inventory_equipment ie
      LEFT JOIN internal_users iu ON ie.current_responsible_id = iu.id
      LEFT JOIN responsibility_terms rt ON ie.id = rt.equipment_id AND rt.status = 'active'
      WHERE ie.category = 'NOTEBOOK'
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND ie.current_status = $${params.length}`;
    }

    if (unit) {
      params.push(unit);
      query += ` AND ie.current_unit = $${params.length}`;
    }

    query += ` ORDER BY ie.internal_code ASC`;

    const result = await database.query(query, params);
    res.json({ notebooks: result.rows, total: result.rows.length });
  } catch (error: any) {
    console.error('Error fetching notebooks:', error);
    res.status(500).json({ error: 'Failed to fetch notebooks' });
  }
});

// POST - Cadastrar notebook
inventoryRouter.post('/notebooks', async (req: Request, res: Response) => {
  try {
    const {
      brand, model, serial_number, processor, memory_ram, storage, 
      screen_size, operating_system, physical_condition, current_unit,
      acquisition_date, purchase_value, warranty_expiration, notes
    } = req.body;

    const internal_code = await generateInternalCode('NOTEBOOK', 'Notebook');

    const result = await database.query(`
      INSERT INTO inventory_equipment (
        internal_code, category, type, brand, model, serial_number,
        processor, memory_ram, storage, screen_size, operating_system,
        physical_condition, current_status, current_unit,
        acquisition_date, purchase_value, warranty_expiration, notes
      ) VALUES ($1, 'NOTEBOOK', 'Notebook', $2, $3, $4, $5, $6, $7, $8, $9, $10, 'in_stock', $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      internal_code, brand, model, serial_number || 'S/N', 
      processor, memory_ram, storage, screen_size, operating_system,
      physical_condition || 'good', current_unit,
      acquisition_date, purchase_value, warranty_expiration, notes
    ]);

    res.status(201).json({ notebook: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating notebook:', error);
    res.status(500).json({ error: 'Failed to create notebook' });
  }
});

// ===== PERIFÉRICOS =====

// GET - Listar periféricos
inventoryRouter.get('/peripherals', async (req: Request, res: Response) => {
  try {
    const { status, type, unit } = req.query;

    let query = `
      SELECT 
        ie.*,
        iu.name as responsible_name,
        rt.issued_date as in_use_since
      FROM inventory_equipment ie
      LEFT JOIN internal_users iu ON ie.current_responsible_id = iu.id
      LEFT JOIN responsibility_terms rt ON ie.id = rt.equipment_id AND rt.status = 'active'
      WHERE ie.category = 'PERIPHERAL'
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND ie.current_status = $${params.length}`;
    }

    if (type) {
      params.push(`%${type}%`);
      query += ` AND ie.type ILIKE $${params.length}`;
    }

    if (unit) {
      params.push(unit);
      query += ` AND ie.current_unit = $${params.length}`;
    }

    query += ` ORDER BY ie.type ASC, ie.internal_code ASC`;

    const result = await database.query(query, params);
    
    // Agrupar por tipo para estatísticas
    const byType: any = {};
    result.rows.forEach((item: any) => {
      if (!byType[item.type]) {
        byType[item.type] = { total: 0, available: 0, in_use: 0, maintenance: 0 };
      }
      byType[item.type].total++;
      if (item.current_status === 'available') byType[item.type].available++;
      if (item.current_status === 'in_use') byType[item.type].in_use++;
      if (item.current_status === 'maintenance') byType[item.type].maintenance++;
    });

    res.json({ peripherals: result.rows, total: result.rows.length, byType });
  } catch (error: any) {
    console.error('Error fetching peripherals:', error);
    res.status(500).json({ error: 'Failed to fetch peripherals' });
  }
});

// POST - Cadastrar periférico
inventoryRouter.post('/peripherals', async (req: Request, res: Response) => {
  try {
    const {
      type, brand, model, description, serial_number,
      physical_condition, current_unit, acquisition_date, 
      purchase_value, notes
    } = req.body;

    const internal_code = await generateInternalCode('PERIPHERAL', type);

    const result = await database.query(`
      INSERT INTO inventory_equipment (
        internal_code, category, type, brand, model, description, serial_number,
        physical_condition, current_status, current_unit,
        acquisition_date, purchase_value, notes
      ) VALUES ($1, 'PERIPHERAL', $2, $3, $4, $5, $6, $7, 'in_stock', $8, $9, $10, $11)
      RETURNING *
    `, [
      internal_code, type, brand, model, description, serial_number || 'S/N',
      physical_condition || 'good', current_unit,
      acquisition_date, purchase_value, notes
    ]);

    res.status(201).json({ peripheral: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating peripheral:', error);
    res.status(500).json({ error: 'Failed to create peripheral' });
  }
});

// ===== EQUIPMENT (COMBINED) =====

// GET - Listar todos os equipamentos (notebooks + periféricos)
inventoryRouter.get('/equipment', async (req: Request, res: Response) => {
  try {
    const { status, unit, search } = req.query;

    let query = `
      SELECT 
        ie.*,
        iu.name as responsible_name,
        rt.issued_date as in_use_since
      FROM inventory_equipment ie
      LEFT JOIN internal_users iu ON ie.current_responsible_id = iu.id
      LEFT JOIN responsibility_terms rt ON ie.id = rt.equipment_id AND rt.status = 'active'
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND ie.current_status = $${params.length}`;
    }

    if (unit) {
      params.push(unit);
      query += ` AND ie.current_unit = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (ie.internal_code ILIKE $${params.length} OR ie.brand ILIKE $${params.length} OR ie.model ILIKE $${params.length})`;
    }

    query += ` ORDER BY ie.internal_code ASC`;

    const result = await database.query(query, params);
    
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// POST - Cadastro em lote de periféricos
inventoryRouter.post('/peripherals/batch', async (req: Request, res: Response) => {
  try {
    const {
      type, brand, model, description, quantity,
      physical_condition, current_unit, acquisition_date,
      purchase_value, notes
    } = req.body;

    const created = [];

    for (let i = 0; i < quantity; i++) {
      const internal_code = await generateInternalCode('PERIPHERAL', type);
      
      const result = await database.query(`
        INSERT INTO inventory_equipment (
          internal_code, category, type, brand, model, description, serial_number,
          physical_condition, current_status, current_unit,
          acquisition_date, purchase_value, notes
        ) VALUES ($1, 'PERIPHERAL', $2, $3, $4, $5, 'S/N', $6, 'in_stock', $7, $8, $9, $10)
        RETURNING *
      `, [
        internal_code, type, brand, model, description,
        physical_condition || 'good', current_unit,
        acquisition_date, purchase_value, notes
      ]);

      created.push(result.rows[0]);
    }

    res.status(201).json({ peripherals: created, count: created.length });
  } catch (error: any) {
    console.error('Error creating peripherals batch:', error);
    res.status(500).json({ error: 'Failed to create peripherals batch' });
  }
});

// ===== EQUIPAMENTOS (GERAL) =====

// GET - Detalhes de um equipamento
inventoryRouter.get('/equipment/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const equipment = await database.query(`
      SELECT 
        ie.*,
        iu.name as responsible_name,
        iu.email as responsible_email
      FROM inventory_equipment ie
      LEFT JOIN internal_users iu ON ie.current_responsible_id = iu.id
      WHERE ie.id = $1
    `, [id]);

    if (equipment.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Buscar histórico de movimentações
    const movements = await database.query(`
      SELECT 
        em.*,
        rt.delivery_term_pdf,
        rt.return_term_pdf
      FROM equipment_movements em
      LEFT JOIN responsibility_terms rt ON em.term_id = rt.id
      WHERE em.equipment_id = $1
      ORDER BY em.movement_date DESC
    `, [id]);

    // Buscar termos ativos
    const terms = await database.query(`
      SELECT * FROM responsibility_terms
      WHERE equipment_id = $1
      ORDER BY issued_date DESC
    `, [id]);

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

// ===== MOVIMENTAÇÕES - ENTREGA =====

// POST - Entregar equipamento
inventoryRouter.post('/movements/deliver', async (req: Request, res: Response) => {
  try {
    const {
      equipment_id,
      responsible_id,
      responsible_name,
      responsible_department,
      responsible_unit,
      responsible_email,
      responsible_phone,
      responsible_cpf,
      delivery_reason,
      delivery_notes,
      issued_by_id,
      issued_by_name
    } = req.body;

    // Verificar se equipamento existe e está disponível
    const equipment = await database.query(`
      SELECT * FROM inventory_equipment WHERE id = $1
    `, [equipment_id]);

    if (equipment.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Aceitar equipamentos disponíveis ou em estoque
    if (!['available', 'in_stock'].includes(equipment.rows[0].current_status)) {
      return res.status(400).json({ 
        error: 'Equipment is not available', 
        current_status: equipment.rows[0].current_status 
      });
    }

    const movement_number = await generateMovementNumber();

    // Criar termo de responsabilidade
    const term = await database.query(`
      INSERT INTO responsibility_terms (
        equipment_id, responsible_id, responsible_name, responsible_department,
        responsible_unit, responsible_email, responsible_phone, responsible_cpf,
        issued_date, delivery_reason, delivery_notes, issued_by_id, issued_by_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11, $12, 'active')
      RETURNING *
    `, [
      equipment_id, responsible_id, responsible_name, responsible_department,
      responsible_unit, responsible_email, responsible_phone, responsible_cpf,
      delivery_reason, delivery_notes, issued_by_id, issued_by_name
    ]);

    // Criar movimentação
    await database.query(`
      INSERT INTO equipment_movements (
        movement_number, equipment_id, term_id, movement_type, movement_date,
        to_user_id, to_user_name, to_unit, to_department,
        reason, registered_by_id, registered_by_name
      ) VALUES ($1, $2, $3, 'delivery', CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10)
    `, [
      movement_number, equipment_id, term.rows[0].id, responsible_id,
      responsible_name, responsible_unit, responsible_department,
      delivery_reason, issued_by_id, issued_by_name
    ]);

    // Atualizar status do equipamento
    await database.query(`
      UPDATE inventory_equipment 
      SET current_status = 'in_use', 
          current_responsible_id = $1,
          current_responsible_name = $2,
          current_location = $3,
          current_unit = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [
      responsible_id, 
      responsible_name,
      `${responsible_department} - ${responsible_unit}`, 
      responsible_unit, 
      equipment_id
    ]);

    res.status(201).json({ 
      term: term.rows[0],
      movement_number,
      message: 'Equipment delivered successfully'
    });
  } catch (error: any) {
    console.error('Error delivering equipment:', error);
    res.status(500).json({ error: 'Failed to deliver equipment' });
  }
});

// GET - Gerar PDF termo de entrega
inventoryRouter.get('/terms/:termId/delivery-pdf', async (req: Request, res: Response) => {
  try {
    const { termId } = req.params;

    const result = await database.query(`
      SELECT 
        rt.*,
        ie.internal_code,
        ie.category,
        ie.type,
        ie.brand,
        ie.model,
        ie.serial_number,
        ie.processor,
        ie.memory_ram,
        ie.storage,
        ie.physical_condition,
        em.movement_number
      FROM responsibility_terms rt
      JOIN inventory_equipment ie ON rt.equipment_id = ie.id
      LEFT JOIN equipment_movements em ON rt.id = em.term_id AND em.movement_type = 'delivery'
      WHERE rt.id = $1
    `, [termId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }

    const term = result.rows[0];
    
    // Montar especificações para notebooks
    let specifications = '';
    if (term.category === 'NOTEBOOK') {
      const specs = [];
      if (term.processor) specs.push(term.processor);
      if (term.memory_ram) specs.push(term.memory_ram);
      if (term.storage) specs.push(term.storage);
      specifications = specs.join(' ');
    }

    const pdfData = {
      movementNumber: term.movement_number || 'N/A',
      equipment: {
        category: term.category,
        type: term.type,
        brand: term.brand,
        model: term.model,
        internalCode: term.internal_code,
        serialNumber: term.serial_number,
        specifications,
        condition: term.physical_condition
      },
      responsible: {
        name: term.responsible_name,
        cpf: term.responsible_cpf,
        department: term.responsible_department,
        unit: term.responsible_unit,
        phone: term.responsible_phone,
        email: term.responsible_email
      },
      delivery: {
        date: new Date(term.issued_date),
        reason: term.delivery_reason,
        notes: term.delivery_notes
      },
      deliveredBy: {
        name: term.issued_by_name
      },
      location: `Maracanaú/CE`
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=termo_entrega_${term.internal_code}.pdf`);
    
    PDFService.generateDeliveryTerm(pdfData, res);
  } catch (error: any) {
    console.error('Error generating delivery PDF:', error);
    res.status(500).json({ error: 'Failed to generate delivery PDF' });
  }
});

// ===== MOVIMENTAÇÕES - DEVOLUÇÃO =====

// POST - Devolver equipamento
inventoryRouter.post('/movements/return', async (req: Request, res: Response) => {
  try {
    const {
      equipment_id,
      return_condition,
      return_checklist,
      return_problems,
      return_destination, // 'available', 'maintenance', 'retired'
      received_by_id,
      received_by_name
    } = req.body;

    // Verificar se equipamento existe e está em uso
    const equipment = await database.query(`
      SELECT * FROM inventory_equipment WHERE id = $1
    `, [equipment_id]);

    if (equipment.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    if (equipment.rows[0].current_status !== 'in_use') {
      return res.status(400).json({ error: 'Equipment is not in use' });
    }

    // Buscar termo ativo
    const activeTerm = await database.query(`
      SELECT * FROM responsibility_terms 
      WHERE equipment_id = $1 AND status = 'active'
      ORDER BY issued_date DESC
      LIMIT 1
    `, [equipment_id]);

    if (activeTerm.rows.length === 0) {
      return res.status(400).json({ error: 'No active responsibility term found' });
    }

    const term = activeTerm.rows[0];
    const movement_number = await generateMovementNumber();

    // Atualizar termo de responsabilidade
    await database.query(`
      UPDATE responsibility_terms
      SET returned_date = CURRENT_DATE,
          return_condition = $1,
          return_checklist = $2,
          return_problems = $3,
          return_destination = $4,
          received_by_id = $5,
          received_by_name = $6,
          status = 'returned',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      return_condition, JSON.stringify(return_checklist), return_problems,
      return_destination, received_by_id, received_by_name, term.id
    ]);

    // Criar movimentação de devolução
    await database.query(`
      INSERT INTO equipment_movements (
        movement_number, equipment_id, term_id, movement_type, movement_date,
        from_user_id, from_user_name, from_unit, from_department,
        condition_after, reason, registered_by_id, registered_by_name, notes
      ) VALUES ($1, $2, $3, 'return', CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, 'Devolução', $9, $10, $11)
    `, [
      movement_number, equipment_id, term.id,
      term.responsible_id, term.responsible_name, term.responsible_unit, term.responsible_department,
      return_condition, received_by_id, received_by_name, return_problems
    ]);

    // Atualizar status do equipamento
    await database.query(`
      UPDATE inventory_equipment 
      SET current_status = $1,
          current_responsible_id = NULL,
          current_responsible_name = NULL,
          current_location = $2,
          physical_condition = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [
      return_destination,
      `Estoque TI - ${equipment.rows[0].current_unit}`,
      return_condition,
      equipment_id
    ]);

    res.status(200).json({ 
      message: 'Equipment returned successfully',
      movement_number,
      term_id: term.id
    });
  } catch (error: any) {
    console.error('Error returning equipment:', error);
    res.status(500).json({ error: 'Failed to return equipment' });
  }
});

// GET - Gerar PDF termo de devolução
inventoryRouter.get('/terms/:termId/return-pdf', async (req: Request, res: Response) => {
  try {
    const { termId } = req.params;

    const result = await database.query(`
      SELECT 
        rt.*,
        ie.internal_code,
        ie.category,
        ie.type,
        ie.brand,
        ie.model,
        ie.serial_number,
        em.movement_number
      FROM responsibility_terms rt
      JOIN inventory_equipment ie ON rt.equipment_id = ie.id
      LEFT JOIN equipment_movements em ON rt.id = em.term_id AND em.movement_type = 'return'
      WHERE rt.id = $1
    `, [termId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }

    const term = result.rows[0];

    if (!term.returned_date) {
      return res.status(400).json({ error: 'Equipment not yet returned' });
    }

    // Calcular dias de uso
    const deliveryDate = new Date(term.issued_date);
    const returnDate = new Date(term.returned_date);
    const daysInUse = Math.floor((returnDate.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

    const pdfData = {
      movementNumber: term.movement_number || 'N/A',
      equipment: {
        category: term.category,
        type: term.type,
        brand: term.brand,
        model: term.model,
        internalCode: term.internal_code,
        serialNumber: term.serial_number
      },
      responsible: {
        name: term.responsible_name,
        department: term.responsible_department,
        unit: term.responsible_unit
      },
      history: {
        deliveryDate,
        returnDate,
        daysInUse,
        deliveryTermFile: term.delivery_term_pdf
      },
      inspection: {
        condition: term.return_condition,
        checklist: term.return_checklist ? JSON.parse(term.return_checklist) : {},
        notes: term.return_problems
      },
      returnReason: 'Devolução regular',
      returnDestination: term.return_destination,
      receivedBy: {
        name: term.received_by_name
      },
      location: `Maracanaú/CE`
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=termo_devolucao_${term.internal_code}.pdf`);
    
    PDFService.generateReturnTerm(pdfData, res);
  } catch (error: any) {
    console.error('Error generating return PDF:', error);
    res.status(500).json({ error: 'Failed to generate return PDF' });
  }
});

// ===== MOVIMENTAÇÕES - TRANSFERÊNCIA/RELOCAÇÃO =====

// POST - Transferir equipamento (entre colaboradores ou unidades)
inventoryRouter.post('/movements/transfer', async (req: Request, res: Response) => {
  try {
    const {
      equipment_id,
      transfer_type, // 'employee' | 'location'
      // Para transfer_type = 'employee'
      new_responsible_id,
      new_responsible_name,
      new_responsible_department,
      new_responsible_unit,
      new_responsible_email,
      new_responsible_phone,
      new_responsible_cpf,
      transfer_reason,
      // Para transfer_type = 'location'
      new_location,
      new_unit,
      // Comum
      notes,
      registered_by_id,
      registered_by_name
    } = req.body;

    // Verificar se equipamento existe
    const equipment = await database.query(`
      SELECT * FROM inventory_equipment WHERE id = $1
    `, [equipment_id]);

    if (equipment.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const equipmentData = equipment.rows[0];
    const movement_number = await generateMovementNumber();

    if (transfer_type === 'employee') {
      // TRANSFERÊNCIA ENTRE COLABORADORES
      
      // Se equipamento está em uso, encerrar termo atual
      let oldTermId = null;
      if (equipmentData.current_status === 'in_use') {
        const activeTerm = await database.query(`
          SELECT * FROM responsibility_terms 
          WHERE equipment_id = $1 AND status = 'active'
          ORDER BY issued_date DESC
          LIMIT 1
        `, [equipment_id]);

        if (activeTerm.rows.length > 0) {
          oldTermId = activeTerm.rows[0].id;
          
          // Encerrar termo anterior
          await database.query(`
            UPDATE responsibility_terms
            SET status = 'transferred',
                returned_date = CURRENT_DATE,
                return_notes = $1,
                received_by_id = $2,
                received_by_name = $3
            WHERE id = $4
          `, [
            `Transferido para ${new_responsible_name}`,
            registered_by_id,
            registered_by_name,
            oldTermId
          ]);
        }
      }

      // Criar novo termo de responsabilidade
      const newTerm = await database.query(`
        INSERT INTO responsibility_terms (
          equipment_id, responsible_id, responsible_name, responsible_department,
          responsible_unit, responsible_email, responsible_phone, responsible_cpf,
          issued_date, delivery_reason, delivery_notes, issued_by_id, issued_by_name, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11, $12, 'active')
        RETURNING *
      `, [
        equipment_id, new_responsible_id, new_responsible_name, new_responsible_department,
        new_responsible_unit, new_responsible_email, new_responsible_phone, new_responsible_cpf,
        transfer_reason || 'Transferência de colaborador',
        notes,
        registered_by_id,
        registered_by_name
      ]);

      // Registrar movimentação de transferência
      await database.query(`
        INSERT INTO equipment_movements (
          movement_number, equipment_id, term_id, movement_type, movement_date,
          from_user_id, from_user_name,
          to_user_id, to_user_name, to_unit, to_department,
          reason, notes, registered_by_id, registered_by_name
        ) VALUES ($1, $2, $3, 'transfer', CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        movement_number,
        equipment_id,
        newTerm.rows[0].id,
        equipmentData.current_responsible_id,
        equipmentData.current_responsible_name,
        new_responsible_id,
        new_responsible_name,
        new_responsible_unit,
        new_responsible_department,
        transfer_reason || 'Transferência de colaborador',
        notes,
        registered_by_id,
        registered_by_name
      ]);

      // Atualizar equipamento
      await database.query(`
        UPDATE inventory_equipment 
        SET current_status = 'in_use',
            current_responsible_id = $1,
            current_responsible_name = $2,
            current_location = $3,
            current_unit = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [
        new_responsible_id,
        new_responsible_name,
        `${new_responsible_department} - ${new_responsible_unit}`,
        new_responsible_unit,
        equipment_id
      ]);

      return res.status(200).json({
        message: 'Equipment transferred successfully',
        movement_number,
        new_term_id: newTerm.rows[0].id,
        old_term_id: oldTermId
      });

    } else if (transfer_type === 'location') {
      // RELOCAÇÃO (mudança de unidade/localização)
      
      // Registrar movimentação de relocação
      await database.query(`
        INSERT INTO equipment_movements (
          movement_number, equipment_id, movement_type, movement_date,
          from_location, to_location, to_unit,
          reason, notes, registered_by_id, registered_by_name
        ) VALUES ($1, $2, 'relocation', CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9)
      `, [
        movement_number,
        equipment_id,
        equipmentData.current_location,
        new_location,
        new_unit,
        transfer_reason || 'Relocação de unidade',
        notes,
        registered_by_id,
        registered_by_name
      ]);

      // Atualizar localização do equipamento
      await database.query(`
        UPDATE inventory_equipment 
        SET current_location = $1,
            current_unit = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [new_location, new_unit, equipment_id]);

      return res.status(200).json({
        message: 'Equipment relocated successfully',
        movement_number
      });

    } else {
      return res.status(400).json({ 
        error: 'Invalid transfer_type. Must be "employee" or "location"' 
      });
    }

  } catch (error: any) {
    console.error('Error transferring equipment:', error);
    res.status(500).json({ error: 'Failed to transfer equipment' });
  }
});

// ===== VISÕES =====

// GET - Visão por pessoa (quem tem o quê)
inventoryRouter.get('/view/by-person', async (req: Request, res: Response) => {
  try {
    const { unit, department } = req.query;

    let query = `
      SELECT 
        iu.id as user_id,
        iu.name as user_name,
        iu.email as user_email,
        rt.responsible_department as department,
        rt.responsible_unit as unit,
        COUNT(ie.id) as equipment_count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', ie.id,
            'internal_code', ie.internal_code,
            'category', ie.category,
            'type', ie.type,
            'brand', ie.brand,
            'model', ie.model,
            'issued_date', rt.issued_date
          )
        ) as equipment
      FROM internal_users iu
      JOIN responsibility_terms rt ON iu.id = rt.responsible_id AND rt.status = 'active'
      JOIN inventory_equipment ie ON rt.equipment_id = ie.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (unit) {
      params.push(unit);
      query += ` AND rt.responsible_unit = $${params.length}`;
    }

    if (department) {
      params.push(`%${department}%`);
      query += ` AND rt.responsible_department ILIKE $${params.length}`;
    }

    query += `
      GROUP BY iu.id, iu.name, iu.email, rt.responsible_department, rt.responsible_unit
      ORDER BY iu.name ASC
    `;

    const result = await database.query(query, params);
    res.json({ people: result.rows, total: result.rows.length });
  } catch (error: any) {
    console.error('Error fetching by person view:', error);
    res.status(500).json({ error: 'Failed to fetch by person view' });
  }
});

// GET - Visão por unidade (o que tem em cada lugar)
inventoryRouter.get('/view/by-unit', async (req: Request, res: Response) => {
  try {
    const result = await database.query(`
      SELECT 
        ie.current_unit as unit,
        ie.category,
        ie.type,
        ie.current_status as status,
        COUNT(*) as count
      FROM inventory_equipment ie
      WHERE ie.current_unit IS NOT NULL
      GROUP BY ie.current_unit, ie.category, ie.type, ie.current_status
      ORDER BY ie.current_unit ASC, ie.category ASC, ie.type ASC
    `);

    // Agrupar por unidade
    const units: any = {};
    result.rows.forEach((row: any) => {
      if (!units[row.unit]) {
        units[row.unit] = {
          unit: row.unit,
          total: 0,
          notebooks: { total: 0, available: 0, in_use: 0, maintenance: 0 },
          peripherals: {}
        };
      }

      units[row.unit].total += parseInt(row.count);

      if (row.category === 'NOTEBOOK') {
        units[row.unit].notebooks.total += parseInt(row.count);
        if (row.status === 'available') units[row.unit].notebooks.available += parseInt(row.count);
        if (row.status === 'in_use') units[row.unit].notebooks.in_use += parseInt(row.count);
        if (row.status === 'maintenance') units[row.unit].notebooks.maintenance += parseInt(row.count);
      } else {
        if (!units[row.unit].peripherals[row.type]) {
          units[row.unit].peripherals[row.type] = { total: 0, available: 0, in_use: 0, maintenance: 0 };
        }
        units[row.unit].peripherals[row.type].total += parseInt(row.count);
        if (row.status === 'available') units[row.unit].peripherals[row.type].available += parseInt(row.count);
        if (row.status === 'in_use') units[row.unit].peripherals[row.type].in_use += parseInt(row.count);
        if (row.status === 'maintenance') units[row.unit].peripherals[row.type].maintenance += parseInt(row.count);
      }
    });

    res.json({ units: Object.values(units) });
  } catch (error: any) {
    console.error('Error fetching by unit view:', error);
    res.status(500).json({ error: 'Failed to fetch by unit view' });
  }
});

// ===== PEDIDOS/REQUISIÇÕES =====

// GET - Listar requisições
inventoryRouter.get('/requisitions', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT * FROM purchase_requisitions
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await database.query(query, params);
    res.json({ requisitions: result.rows, total: result.rows.length });
  } catch (error: any) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ error: 'Failed to fetch requisitions' });
  }
});

// POST - Criar requisição
inventoryRouter.post('/requisitions', async (req: Request, res: Response) => {
  try {
    const {
      requested_by_id, requester_name, requester_department, requester_unit,
      item_type, item_description, specifications, quantity, priority,
      reason, needed_by_date, estimated_value
    } = req.body;

    const request_number = await generateRequestNumber();

    const result = await database.query(`
      INSERT INTO purchase_requisitions (
        request_number, requested_by_id, requester_name, requester_department, requester_unit,
        item_type, item_description, specifications, quantity, priority,
        reason, needed_by_date, estimated_value, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
      RETURNING *
    `, [
      request_number, requested_by_id, requester_name, requester_department, requester_unit,
      item_type, item_description, specifications, quantity, priority || 'normal',
      reason, needed_by_date, estimated_value
    ]);

    res.status(201).json({ requisition: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating requisition:', error);
    res.status(500).json({ error: 'Failed to create requisition' });
  }
});

// PATCH - Aprovar requisição
inventoryRouter.patch('/requisitions/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved_by_id, approved_by_name, notes } = req.body;

    await database.query(`
      UPDATE purchase_requisitions
      SET status = 'approved',
          approved_by_id = $1,
          approved_by_name = $2,
          approval_date = CURRENT_DATE,
          notes = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [approved_by_id, approved_by_name, notes, id]);

    res.json({ message: 'Requisition approved successfully' });
  } catch (error: any) {
    console.error('Error approving requisition:', error);
    res.status(500).json({ error: 'Failed to approve requisition' });
  }
});

// PATCH - Rejeitar requisição
inventoryRouter.patch('/requisitions/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved_by_id, approved_by_name, rejection_reason } = req.body;

    await database.query(`
      UPDATE purchase_requisitions
      SET status = 'rejected',
          approved_by_id = $1,
          approved_by_name = $2,
          approval_date = CURRENT_DATE,
          rejection_reason = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [approved_by_id, approved_by_name, rejection_reason, id]);

    res.json({ message: 'Requisition rejected' });
  } catch (error: any) {
    console.error('Error rejecting requisition:', error);
    res.status(500).json({ error: 'Failed to reject requisition' });
  }
});

// PATCH - Registrar compra
inventoryRouter.patch('/requisitions/:id/purchase', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      actual_value, supplier, purchase_date,
      expected_delivery_date, invoice_file, notes
    } = req.body;

    await database.query(`
      UPDATE purchase_requisitions
      SET status = 'purchased',
          actual_value = $1,
          supplier = $2,
          purchase_date = $3,
          expected_delivery_date = $4,
          invoice_file = $5,
          notes = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [actual_value, supplier, purchase_date, expected_delivery_date, invoice_file, notes, id]);

    res.json({ message: 'Purchase registered successfully' });
  } catch (error: any) {
    console.error('Error registering purchase:', error);
    res.status(500).json({ error: 'Failed to register purchase' });
  }
});

// PATCH - Receber compra
inventoryRouter.patch('/requisitions/:id/receive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { received_by_id, received_by_name, actual_delivery_date, equipment_ids } = req.body;

    await database.query(`
      UPDATE purchase_requisitions
      SET status = 'received',
          received_by_id = $1,
          received_by_name = $2,
          received_date = $3,
          actual_delivery_date = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [received_by_id, received_by_name, actual_delivery_date, id]);

    // Vincular equipamentos criados
    if (equipment_ids && equipment_ids.length > 0) {
      for (const equipment_id of equipment_ids) {
        await database.query(`
          INSERT INTO requisition_equipment (requisition_id, equipment_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [id, equipment_id]);
      }
    }

    res.json({ message: 'Purchase received successfully' });
  } catch (error: any) {
    console.error('Error receiving purchase:', error);
    res.status(500).json({ error: 'Failed to receive purchase' });
  }
});

// ===== DASHBOARD =====

// GET - Dashboard summary
inventoryRouter.get('/dashboard/summary', async (req: Request, res: Response) => {
  try {
    const stats = await database.query(`
      SELECT 
        COUNT(*) FILTER (WHERE current_status = 'in_use') as equipment_in_use,
        COUNT(*) FILTER (WHERE current_status = 'available') as equipment_in_stock,
        COUNT(*) FILTER (WHERE current_status = 'maintenance') as equipment_in_maintenance,
        COUNT(*) FILTER (WHERE category = 'NOTEBOOK') as total_notebooks,
        COUNT(*) FILTER (WHERE category = 'PERIPHERAL') as total_peripherals
      FROM inventory_equipment
    `);

    const pendingRequisitions = await database.query(`
      SELECT COUNT(*) as count FROM purchase_requisitions WHERE status = 'pending'
    `);

    const equipmentWithoutTerms = await database.query(`
      SELECT COUNT(*) as count 
      FROM inventory_equipment ie
      LEFT JOIN responsibility_terms rt ON ie.id = rt.equipment_id AND rt.status = 'active'
      WHERE ie.current_status = 'in_use' AND rt.id IS NULL
    `);

    res.json({
      equipmentInUse: parseInt(stats.rows[0].equipment_in_use),
      equipmentInStock: parseInt(stats.rows[0].equipment_in_stock),
      equipmentInMaintenance: parseInt(stats.rows[0].equipment_in_maintenance),
      totalNotebooks: parseInt(stats.rows[0].total_notebooks),
      totalPeripherals: parseInt(stats.rows[0].total_peripherals),
      pendingPurchases: parseInt(pendingRequisitions.rows[0].count),
      equipmentWithoutTerms: parseInt(equipmentWithoutTerms.rows[0].count)
    });
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// Buscar movimentações recentes
inventoryRouter.get('/movements/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Verificar se a tabela equipment_movements existe e tem dados
    const tableCheck = await database.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'equipment_movements'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      // Tabela não existe ainda, retornar array vazio
      return res.json([]);
    }

    const result = await database.query(`
      SELECT 
        em.id,
        em.movement_type as type,
        em.movement_date as date,
        ie.internal_code as equipment_code,
        ie.type as equipment_type,
        COALESCE(em.to_user_name, em.from_user_name, 'N/A') as responsible_name,
        COALESCE(em.to_unit, em.from_unit, 'N/A') as unit
      FROM equipment_movements em
      JOIN inventory_equipment ie ON em.equipment_id = ie.id
      ORDER BY em.movement_date DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows.map((row: any) => ({
      id: row.id,
      type: row.type === 'delivery' ? 'delivery' : 'return',
      equipment_code: row.equipment_code,
      equipment_type: row.equipment_type,
      responsible_name: row.responsible_name,
      unit: row.unit,
      date: row.date
    })));
  } catch (error: any) {
    console.error('Error fetching recent movements:', error);
    // Em caso de erro, retornar array vazio ao invés de 500
    res.json([]);
  }
});

// Buscar alertas
inventoryRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const alerts: any[] = [];

    // Equipamentos em manutenção há mais de 15 dias
    const maintenanceResult = await database.query(`
      SELECT 
        ie.id,
        ie.internal_code as equipment_code,
        ie.type as equipment_type,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ie.updated_at)) as days
      FROM inventory_equipment ie
      WHERE ie.current_status = 'maintenance'
      AND ie.updated_at < CURRENT_TIMESTAMP - INTERVAL '15 days'
      ORDER BY ie.updated_at ASC
      LIMIT 5
    `);

    maintenanceResult.rows.forEach((row: any) => {
      alerts.push({
        id: `maint-${row.id}`,
        type: 'maintenance',
        severity: parseInt(row.days) > 30 ? 'high' : 'medium',
        equipment_code: row.equipment_code,
        equipment_type: row.equipment_type,
        message: 'Equipamento em manutenção prolongada',
        days: parseInt(row.days)
      });
    });

    // Equipamentos em uso há mais de 6 meses
    const longTermResult = await database.query(`
      SELECT 
        ie.id,
        ie.internal_code as equipment_code,
        ie.type as equipment_type,
        rt.issued_date,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - rt.issued_date)) as days
      FROM inventory_equipment ie
      JOIN responsibility_terms rt ON ie.id = rt.equipment_id
      WHERE ie.current_status = 'in_use'
      AND rt.status = 'active'
      AND rt.issued_date < CURRENT_TIMESTAMP - INTERVAL '180 days'
      ORDER BY rt.issued_date ASC
      LIMIT 5
    `);

    longTermResult.rows.forEach((row: any) => {
      alerts.push({
        id: `long-${row.id}`,
        type: 'long_use',
        severity: parseInt(row.days) > 365 ? 'high' : 'low',
        equipment_code: row.equipment_code,
        equipment_type: row.equipment_type,
        message: 'Equipamento em uso por período prolongado',
        days: parseInt(row.days)
      });
    });

    // Equipamentos sem termo de responsabilidade
    const noTermResult = await database.query(`
      SELECT 
        ie.id,
        ie.internal_code as equipment_code,
        ie.type as equipment_type
      FROM inventory_equipment ie
      LEFT JOIN responsibility_terms rt ON ie.id = rt.equipment_id AND rt.status = 'active'
      WHERE ie.current_status = 'in_use'
      AND rt.id IS NULL
      LIMIT 3
    `);

    noTermResult.rows.forEach((row: any) => {
      alerts.push({
        id: `noterm-${row.id}`,
        type: 'missing_term',
        severity: 'high',
        equipment_code: row.equipment_code,
        equipment_type: row.equipment_type,
        message: 'Equipamento sem termo de responsabilidade',
        days: 0
      });
    });

    res.json(alerts);
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Buscar responsabilidades (equipamentos com responsáveis)
inventoryRouter.get('/responsibilities', async (req: Request, res: Response) => {
  try {
    const result = await database.query(`
      SELECT 
        ie.id,
        ie.internal_code,
        ie.type,
        ie.brand,
        ie.model,
        ie.current_responsible_name as responsible_name,
        ie.current_responsible_id as responsible_id,
        ie.current_unit as department,
        rt.issued_date,
        ie.current_status,
        rt.status as term_status
      FROM inventory_equipment ie
      LEFT JOIN responsibility_terms rt ON ie.id = rt.equipment_id AND rt.status = 'active'
      WHERE ie.current_status = 'in_use'
        AND ie.current_responsible_name IS NOT NULL
      ORDER BY ie.current_responsible_name, ie.type
    `);

    res.json({ 
      responsibilities: result.rows.map((row: any) => ({
        id: row.id,
        internal_code: row.internal_code,
        type: row.type,
        brand: row.brand,
        model: row.model,
        responsible_name: row.responsible_name,
        responsible_id: row.responsible_id,
        department: row.department,
        issued_date: row.issued_date,
        current_status: row.current_status,
        term_status: row.term_status || 'pending'
      }))
    });
  } catch (error: any) {
    console.error('Error fetching responsibilities:', error);
    res.status(500).json({ error: 'Failed to fetch responsibilities' });
  }
});

// ===== BUSCA GLOBAL =====

inventoryRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    
    const searchTerm = `%${q.trim().toLowerCase()}%`;
    
    const results: any = {
      equipments: [],
      people: [],
      movements: []
    };
    
    // Buscar equipamentos por código, marca, modelo ou serial
    const equipmentQuery = await database.query(`
      SELECT 
        ie.id,
        ie.internal_code,
        ie.category,
        ie.type,
        ie.brand,
        ie.model,
        ie.serial_number,
        ie.current_status,
        ie.current_unit,
        iu.name as responsible_name
      FROM inventory_equipment ie
      LEFT JOIN responsibility_terms rt ON ie.id = rt.equipment_id AND rt.status = 'active'
      LEFT JOIN internal_users iu ON rt.responsible_id = iu.id
      WHERE 
        LOWER(ie.internal_code) LIKE $1
        OR LOWER(ie.brand) LIKE $1
        OR LOWER(ie.model) LIKE $1
        OR LOWER(ie.serial_number) LIKE $1
        OR LOWER(ie.type) LIKE $1
      LIMIT 20
    `, [searchTerm]);
    
    results.equipments = equipmentQuery.rows.map((row: any) => ({
      id: row.id,
      code: row.internal_code,
      category: row.category,
      type: row.type,
      brand: row.brand,
      model: row.model,
      serial_number: row.serial_number,
      status: row.current_status,
      unit: row.current_unit,
      responsible_name: row.responsible_name,
      result_type: 'equipment'
    }));
    
    // Buscar pessoas por nome, CPF, ou que tenham equipamentos
    const peopleQuery = await database.query(`
      SELECT DISTINCT  
        rt.responsible_name,
        rt.responsible_cpf,
        rt.responsible_unit,
        rt.responsible_department,
        COUNT(DISTINCT rt.equipment_id) as equipment_count
      FROM responsibility_terms rt
      WHERE rt.status = 'active'
      AND (
        LOWER(rt.responsible_name) LIKE $1
        OR LOWER(rt.responsible_cpf) LIKE $1
      )
      GROUP BY rt.responsible_name, rt.responsible_cpf, rt.responsible_unit, rt.responsible_department
      LIMIT 15
    `, [searchTerm]);
    
    results.people = peopleQuery.rows.map((row: any) => ({
      name: row.responsible_name,
      cpf: row.responsible_cpf,
      unit: row.responsible_unit,
      department: row.responsible_department,
      equipment_count: parseInt(row.equipment_count),
      result_type: 'person'
    }));
    
    // Buscar movimentações recentes relacionadas à busca
    const movementsQuery = await database.query(`
      SELECT 
        em.id,
        em.movement_number,
        em.movement_type,
        em.movement_date,
        ie.internal_code as equipment_code,
        ie.type as equipment_type,
        em.responsible_name
      FROM equipment_movements em
      JOIN inventory_equipment ie ON em.equipment_id = ie.id
      WHERE 
        LOWER(em.movement_number) LIKE $1
        OR LOWER(em.responsible_name) LIKE $1
        OR LOWER(ie.internal_code) LIKE $1
      ORDER BY em.movement_date DESC
      LIMIT 10
    `, [searchTerm]);
    
    results.movements = movementsQuery.rows.map((row: any) => ({
      id: row.id,
      movement_number: row.movement_number,
      type: row.movement_type,
      date: row.movement_date,
      equipment_code: row.equipment_code,
      equipment_type: row.equipment_type,
      responsible_name: row.responsible_name,
      result_type: 'movement'
    }));
    
    // Calcular total de resultados
    const totalResults = results.equipments.length + results.people.length + results.movements.length;
    
    res.json({
      query: q,
      totalResults,
      results
    });
    
  } catch (error: any) {
    console.error('Error performing search:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// ===== QR CODES =====

// Gerar QR Code para um equipamento
inventoryRouter.get('/equipment/:id/qrcode', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('Generating QR code for equipment:', id);
    
    // Buscar informações do equipamento
    const result = await database.query(
      'SELECT id, internal_code FROM inventory_equipment WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log('Equipment not found:', id);
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    const equipment = result.rows[0];
    console.log('Equipment found:', equipment.internal_code);
    
    // Gerar QR code
    console.log('Calling QRCodeService.generateEquipmentQRCode...');
    const qrCodeDataURL = await QRCodeService.generateEquipmentQRCode(
      equipment.internal_code,
      equipment.id
    );
    
    console.log('QR code generated successfully, length:', qrCodeDataURL.length);
    
    // Atualizar o campo qr_code no banco
    await database.query(
      'UPDATE inventory_equipment SET qr_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [qrCodeDataURL, id]
    );
    
    console.log('QR code saved to database');
    
    res.json({
      equipment_id: id,
      equipment_code: equipment.internal_code,
      qr_code: qrCodeDataURL
    });
    
  } catch (error: any) {
    console.error('Error generating equipment QR code:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to generate QR code', details: error.message });
  }
});

// Gerar QR Codes em lote
inventoryRouter.post('/qrcodes/batch', async (req: Request, res: Response) => {
  try {
    const { equipment_ids } = req.body;
    
    if (!Array.isArray(equipment_ids) || equipment_ids.length === 0) {
      return res.status(400).json({ error: 'equipment_ids array is required' });
    }
    
    const results = [];
    
    for (const id of equipment_ids) {
      try {
        const result = await database.query(
          'SELECT id, internal_code FROM inventory_equipment WHERE id = $1',
          [id]
        );
        
        if (result.rows.length === 0) {
          results.push({ id, success: false, error: 'Equipment not found' });
          continue;
        }
        
        const equipment = result.rows[0];
        const qrCodeDataURL = await QRCodeService.generateEquipmentQRCode(
          equipment.internal_code,
          equipment.id
        );
        
        await database.query(
          'UPDATE inventory_equipment SET qr_code = $1 WHERE id = $2',
          [qrCodeDataURL, id]
        );
        
        results.push({
          id,
          success: true,
          equipment_code: equipment.internal_code,
          qr_code: qrCodeDataURL
        });
      } catch (error) {
        results.push({ id, success: false, error: 'Failed to generate QR code' });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      total: equipment_ids.length,
      success: successCount,
      failed: equipment_ids.length - successCount,
      results
    });
    
  } catch (error: any) {
    console.error('Error generating batch QR codes:', error);
    res.status(500).json({ error: 'Failed to generate QR codes' });
  }
});

// ===== UPLOADS =====

// Upload de foto de equipamento
inventoryRouter.post('/equipment/:id/photo', uploadEquipmentPhoto, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verificar se equipamento existe
    const equipmentCheck = await database.query(
      'SELECT id FROM inventory_equipment WHERE id = $1',
      [id]
    );
    
    if (equipmentCheck.rows.length === 0) {
      // Deletar arquivo se equipamento não existe
      deleteFile(req.file.path);
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    // Gerar URL pública
    const photoUrl = getFileUrl(req.file.filename, 'photo');
    
    // Salvar referência no banco (assumindo que temos campo photos como array JSON)
    // Primeiro, buscar fotos existentes
    const photosResult = await database.query(
      'SELECT photos FROM inventory_equipment WHERE id = $1',
      [id]
    );
    
    let photos: string[] = [];
    if (photosResult.rows[0]?.photos) {
      photos = Array.isArray(photosResult.rows[0].photos) 
        ? photosResult.rows[0].photos 
        : JSON.parse(photosResult.rows[0].photos);
    }
    
    photos.push(photoUrl);
    
    // Atualizar no banco
    await database.query(
      'UPDATE inventory_equipment SET photos = $1 WHERE id = $2',
      [JSON.stringify(photos), id]
    );
    
    res.json({
      success: true,
      filename: req.file.filename,
      url: photoUrl,
      message: 'Photo uploaded successfully'
    });
    
  } catch (error: any) {
    // Deletar arquivo em caso de erro
    if (req.file) {
      deleteFile(req.file.path);
    }
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Obter fotos de um equipamento
inventoryRouter.get('/equipment/:id/photos', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await database.query(
      'SELECT photos FROM inventory_equipment WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    let photos: string[] = [];
    if (result.rows[0].photos) {
      photos = Array.isArray(result.rows[0].photos)
        ? result.rows[0].photos
        : JSON.parse(result.rows[0].photos);
    }
    
    res.json({ photos });
    
  } catch (error: any) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Deletar foto de equipamento
inventoryRouter.delete('/equipment/:id/photo', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    // Buscar fotos atuais
    const result = await database.query(
      'SELECT photos FROM inventory_equipment WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    let photos: string[] = [];
    if (result.rows[0].photos) {
      photos = Array.isArray(result.rows[0].photos)
        ? result.rows[0].photos
        : JSON.parse(result.rows[0].photos);
    }
    
    // Remover a foto do array
    const photoUrl = getFileUrl(filename, 'photo');
    photos = photos.filter(p => p !== photoUrl);
    
    // Atualizar no banco
    await database.query(
      'UPDATE inventory_equipment SET photos = $1 WHERE id = $2',
      [JSON.stringify(photos), id]
    );
    
    // Deletar arquivo físico
    const filePath = require('path').join(__dirname, '../../uploads/equipment-photos', filename);
    deleteFile(filePath);
    
    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Upload de documento
inventoryRouter.post('/equipment/:id/document', uploadDocument, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { document_type, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verificar se equipamento existe
    const equipmentCheck = await database.query(
      'SELECT id FROM inventory_equipment WHERE id = $1',
      [id]
    );
    
    if (equipmentCheck.rows.length === 0) {
      deleteFile(req.file.path);
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    const documentUrl = getFileUrl(req.file.filename, 'document');
    
    // Salvar referência no banco
    const result = await database.query(
      'SELECT documents FROM inventory_equipment WHERE id = $1',
      [id]
    );
    
    let documents: any[] = [];
    if (result.rows[0]?.documents) {
      documents = Array.isArray(result.rows[0].documents)
        ? result.rows[0].documents
        : JSON.parse(result.rows[0].documents);
    }
    
    documents.push({
      filename: req.file.filename,
      url: documentUrl,
      type: document_type || 'other',
      description: description || '',
      uploaded_at: new Date().toISOString(),
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    await database.query(
      'UPDATE inventory_equipment SET documents = $1 WHERE id = $2',
      [JSON.stringify(documents), id]
    );
    
    res.json({
      success: true,
      filename: req.file.filename,
      url: documentUrl,
      message: 'Document uploaded successfully'
    });
    
  } catch (error: any) {
    if (req.file) {
      deleteFile(req.file.path);
    }
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

export default inventoryRouter;
