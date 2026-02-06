import { Router, Request, Response } from 'express';

const router = Router();

// Create purchase request
router.post('/', async (req: Request, res: Response) => {
  try {
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get all purchases
router.get('/', async (req: Request, res: Response) => {
    try {
      res.status(501).json({ message: 'Not implemented yet' });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }
);

export default router;
