import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { database } from '../database/connection';
import { config } from '../config/environment';
import { validate, loginSchema, registerSchema } from '../middleware/validation';

const router = express.Router();

interface InternalUser {
  id: string;
  email: string;
  name: string;
  role: 'it_staff' | 'manager' | 'admin';
}

// Login for internal staff
router.post('/internal-login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user in internal_users
    const result = await database.query(
      `SELECT id, email, name, password_hash, role FROM internal_users 
       WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT token (7 dias - sem refresh token)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        type: 'internal',
      },
      config.jwt.secret as string,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in internal login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create internal user (admin and IT staff)
router.post('/internal-register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, name, password, role = 'it_staff' } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify who is creating the user
    const decoded = jwt.verify(token, config.jwt.secret as string) as InternalUser & {
      role: string;
    };

    // Admin e TI podem criar usuários
    if (decoded.role !== 'admin' && decoded.role !== 'it_staff') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // TI só pode criar outros TI, não pode criar admin ou gestor
    if (decoded.role === 'it_staff' && role !== 'it_staff') {
      res.status(403).json({ error: 'TI staff can only create other IT staff members' });
      return;
    }

    if (!email || !name || !password) {
      res.status(400).json({ error: 'Email, name, and password are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await database.query(
      'SELECT id FROM internal_users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await database.query(
      `INSERT INTO internal_users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [email, name, passwordHash, role]
    );

    res.status(201).json({
      user: result.rows[0],
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error creating internal user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify JWT token
router.post('/verify-internal-token', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret as string) as InternalUser & {
      type: string;
    };

    if (decoded.type !== 'internal') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    res.json({
      user: decoded,
      authenticated: true,
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Endpoint de refresh removido - usando JWT de 7 dias sem renovação

// Get all internal users (admin only)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret as string) as InternalUser & {
        role: string;
      };

      // Admins, IT staff, and managers can list users
      if (decoded.role !== 'admin' && decoded.role !== 'it_staff' && decoded.role !== 'manager') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const result = await database.query(
        `SELECT id, email, name, role, is_active, created_at 
         FROM internal_users 
         ORDER BY created_at DESC`
      );

      res.json(result.rows);
    } catch (jwtError: any) {
      // Se o erro for token expirado ou inválido, retornar 401
      if (jwtError.name === 'TokenExpiredError' || jwtError.name === 'JsonWebTokenError') {
        res.status(401).json({ error: 'Token expired or invalid' });
        return;
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = req.params.id;
    const { name, email, role } = req.body;

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret as string) as InternalUser & {
      role: string;
    };

    // Only admins can update users
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can update users' });
      return;
    }

    const result = await database.query(
      `UPDATE internal_users 
       SET name = $1, email = $2, role = $3 
       WHERE id = $4 
       RETURNING id, email, name, role, is_active, created_at`,
      [name, email, role, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle user active status (admin only)
router.patch('/users/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = req.params.id;

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret as string) as InternalUser & {
      role: string;
    };

    // Only admins can toggle user status
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can change user status' });
      return;
    }

    const result = await database.query(
      `UPDATE internal_users 
       SET is_active = NOT is_active 
       WHERE id = $1 
       RETURNING id, email, name, role, is_active, created_at`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password (admin only)
router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret as string) as InternalUser & {
      role: string;
    };

    // Only admins can reset passwords
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can reset passwords' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await database.query(
      `UPDATE internal_users 
       SET password_hash = $1 
       WHERE id = $2 
       RETURNING id, email, name`,
      [hashedPassword, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'Password reset successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout - sem necessidade de revogar token (frontend apenas limpa localStorage)
router.post('/logout', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
