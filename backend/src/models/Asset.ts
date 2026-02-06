import { database } from '../database/connection';
import { AssetStatus, MovementType } from '../types/enums';
import { v4 as uuid } from 'uuid';

export interface Asset {
  id: string;
  name: string;
  assetType: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  status: AssetStatus;
  assignedToId?: string;
  departmentId?: string;
  location?: string;
  acquisitionDate?: Date;
  warrantyExpiration?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AssetModel {
  async create(
    name: string,
    assetType: string,
    serialNumber?: string,
    manufacturer?: string,
    model?: string,
    acquisitionDate?: Date,
    warrantyExpiration?: Date
  ): Promise<Asset> {
    const id = uuid();

    const result = await database.query(
      `INSERT INTO assets (id, name, asset_type, serial_number, manufacturer, model, acquisition_date, warranty_expiration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, asset_type, serial_number, manufacturer, model, status, assigned_to_id, 
                 department_id, location, acquisition_date, warranty_expiration, notes, created_at, updated_at`,
      [id, name, assetType, serialNumber, manufacturer, model, acquisitionDate, warrantyExpiration]
    );

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<Asset | null> {
    const result = await database.query(
      `SELECT id, name, asset_type, serial_number, manufacturer, model, status, assigned_to_id, 
              department_id, location, acquisition_date, warranty_expiration, notes, created_at, updated_at 
       FROM assets WHERE id = $1 AND is_deleted = false`,
      [id]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByStatus(status: AssetStatus, skip = 0, limit = 20): Promise<{ assets: Asset[]; total: number }> {
    const countResult = await database.query(
      'SELECT COUNT(*) as count FROM assets WHERE status = $1 AND is_deleted = false',
      [status]
    );

    const result = await database.query(
      `SELECT id, name, asset_type, serial_number, manufacturer, model, status, assigned_to_id, 
              department_id, location, acquisition_date, warranty_expiration, notes, created_at, updated_at 
       FROM assets WHERE status = $1 AND is_deleted = false 
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [status, limit, skip]
    );

    return {
      assets: result.rows.map((row: any) => this.mapRow(row)),
      total: parseInt(countResult.rows[0].count),
    };
  }

  async updateStatus(id: string, status: AssetStatus): Promise<Asset | null> {
    const result = await database.query(
      `UPDATE assets SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND is_deleted = false
       RETURNING id, name, asset_type, serial_number, manufacturer, model, status, assigned_to_id, 
                 department_id, location, acquisition_date, warranty_expiration, notes, created_at, updated_at`,
      [status, id]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async assign(id: string, userId: string, departmentId?: string, location?: string): Promise<Asset | null> {
    const result = await database.query(
      `UPDATE assets SET assigned_to_id = $1, department_id = $2, location = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND is_deleted = false
       RETURNING id, name, asset_type, serial_number, manufacturer, model, status, assigned_to_id, 
                 department_id, location, acquisition_date, warranty_expiration, notes, created_at, updated_at`,
      [userId, departmentId, location, AssetStatus.IN_USE, id]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async recordMovement(
    assetId: string,
    movementType: MovementType,
    fromUserId: string | null,
    toUserId: string | null,
    responsibleId: string,
    description?: string
  ): Promise<void> {
    const id = uuid();

    await database.query(
      `INSERT INTO asset_movements (id, asset_id, movement_type, from_user_id, to_user_id, description, responsible_id, movement_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)`,
      [id, assetId, movementType, fromUserId, toUserId, description, responsibleId]
    );
  }

  private mapRow(row: any): Asset {
    return {
      id: row.id,
      name: row.name,
      assetType: row.asset_type,
      serialNumber: row.serial_number,
      manufacturer: row.manufacturer,
      model: row.model,
      status: row.status,
      assignedToId: row.assigned_to_id,
      departmentId: row.department_id,
      location: row.location,
      acquisitionDate: row.acquisition_date,
      warrantyExpiration: row.warranty_expiration,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const assetModel = new AssetModel();
