import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, generateToken } from '../middleware/auth';
import { userModel } from '../models/User';
import { UserRole } from '../types/enums';

const router = Router();

// Login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await userModel.verifyPassword(email, password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
    });

    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register
router.post('/register', async (req, res: Response) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ error: 'Email, name and password required' });
      return;
    }

    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const user = await userModel.create(email, name, password, UserRole.FINAL_USER);

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
    });

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json(req.user);
});

export default router;
