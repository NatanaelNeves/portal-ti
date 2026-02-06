import { Router, Request, Response } from "express";
import { database } from "../database/connection";
import { UserRole } from "../types/enums";
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

const informationRouter = Router();

// Public route - Get public articles only
informationRouter.get("/information-articles", async (req: Request, res: Response) => {
  try {
    const result = await database.query(
      "SELECT id, title, content, category, created_at, views_count FROM information_articles WHERE is_public = true ORDER BY created_at DESC"
    );
    res.json({ articles: result.rows });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// Public route - Get single public article
informationRouter.get("/information-articles/:id", async (req: Request, res: Response) => {
  try {
    // Increment view count
    await database.query(
      "UPDATE information_articles SET views_count = views_count + 1 WHERE id = $1",
      [req.params.id]
    );

    const result = await database.query(
      "SELECT id, title, content, category, created_at, views_count FROM information_articles WHERE id = $1 AND is_public = true",
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

// Protected routes for TI/Admin - Manage knowledge base
informationRouter.get("/knowledge", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] as string;
    
    if (!authHeader) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Only TI and Admin can access
    if (decoded.role !== UserRole.ADMIN && decoded.role !== UserRole.IT_STAFF) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const result = await database.query(
      "SELECT id, title, content, category, is_public, created_at, views_count FROM information_articles ORDER BY created_at DESC"
    );
    res.json({ articles: result.rows });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

informationRouter.post("/knowledge", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] as string;
    
    if (!authHeader) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    if (decoded.role !== UserRole.ADMIN && decoded.role !== UserRole.IT_STAFF) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { title, content, category, is_public } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Título e conteúdo são obrigatórios" });
    }

    const result = await database.query(
      "INSERT INTO information_articles (title, content, category, is_public, views_count) VALUES ($1, $2, $3, $4, 0) RETURNING *",
      [title, content, category || null, is_public !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating article:", error);
    res.status(500).json({ error: "Failed to create article" });
  }
});

informationRouter.put("/knowledge/:id", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] as string;
    
    if (!authHeader) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    if (decoded.role !== UserRole.ADMIN && decoded.role !== UserRole.IT_STAFF) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { title, content, category, is_public } = req.body;

    const result = await database.query(
      "UPDATE information_articles SET title = $1, content = $2, category = $3, is_public = $4 WHERE id = $5 RETURNING *",
      [title, content, category || null, is_public !== false, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({ error: "Failed to update article" });
  }
});

informationRouter.delete("/knowledge/:id", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] as string;
    
    if (!authHeader) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    if (decoded.role !== UserRole.ADMIN && decoded.role !== UserRole.IT_STAFF) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const result = await database.query(
      "DELETE FROM information_articles WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json({ message: "Article deleted successfully" });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({ error: "Failed to delete article" });
  }
});

export default informationRouter;