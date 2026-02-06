import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { database } from '../database/connection';

const router = express.Router();

// Generate a random token for public user
function generateUserToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Register/Access as public user (without login)
router.post('/public-access', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: 'Email and name are required' });
      return;
    }

    // Check if user already exists
    let user = await database.query(
      'SELECT * FROM public_users WHERE email = $1',
      [email]
    );

    if (user.rows.length > 0) {
      // User exists, return their token
      const existingUser = user.rows[0];
      res.json({
        user_token: existingUser.user_token,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          user_token: existingUser.user_token
        },
        message: 'Welcome back!',
      });
      return;
    }

    // Create new public user
    const userToken = generateUserToken();
    const result = await database.query(
      `INSERT INTO public_users (email, name, user_token, last_access)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, email, name, user_token`,
      [email, name, userToken]
    );

    res.status(201).json({
      user_token: result.rows[0].user_token,
      user: result.rows[0],
      message: 'Access granted. Check your email for more information.',
    });
  } catch (error) {
    console.error('Error in public access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify public user token
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { user_token } = req.body;

    if (!user_token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const result = await database.query(
      `UPDATE public_users 
       SET last_access = CURRENT_TIMESTAMP 
       WHERE user_token = $1 
       RETURNING id, email, name, user_token, created_at`,
      [user_token]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Invalid or expired token' });
      return;
    }

    res.json({
      user: result.rows[0],
      authenticated: true,
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public user info
router.get('/public-user/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const result = await database.query(
      `SELECT id, email, name, created_at FROM public_users 
       WHERE user_token = $1 AND is_active = true`,
      [token]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error getting public user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
