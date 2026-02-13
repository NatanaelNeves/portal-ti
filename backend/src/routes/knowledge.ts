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
    console.log('\n🔍 GET /knowledge - Início');
    const authHeader = req.headers['authorization'] as string;
    
    if (!authHeader) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    console.log('Token extraído:', token.substring(0, 20) + '...');
    
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as any;
    } catch (tokenError: any) {
      if (tokenError.name === 'TokenExpiredError') {
        console.log('❌ Token expirado');
        return res.status(401).json({ error: "Token expirado" });
      }
      console.log('❌ Token inválido:', tokenError.message);
      return res.status(401).json({ error: "Token inválido" });
    }
    
    console.log('Token decodificado:', { id: decoded.id, email: decoded.email, role: decoded.role, type: decoded.type });
    
    // Only TI and Admin can access
    if (decoded.role !== UserRole.ADMIN && decoded.role !== UserRole.IT_STAFF) {
      console.log('❌ Acesso negado - Role:', decoded.role, 'Expected:', UserRole.ADMIN, 'or', UserRole.IT_STAFF);
      return res.status(403).json({ error: "Acesso negado" });
    }

    console.log('✅ Buscando artigos...');
    const result = await database.query(
      "SELECT id, title, content, category, is_public, created_at, views_count FROM information_articles ORDER BY created_at DESC"
    );
    console.log(`✅ ${result.rows.length} artigos encontrados`);
    res.json({ articles: result.rows });
  } catch (error) {
    console.error("❌ Error fetching articles:", error);
    console.error("Stack:", error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ error: "Failed to fetch articles", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

informationRouter.post("/knowledge", async (req: Request, res: Response) => {
  try {
    console.log('\n🔍 POST /knowledge - Início');
    console.log('Headers:', req.headers.authorization);
    
    const authHeader = req.headers['authorization'] as string;
    
    if (!authHeader) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    console.log('Token extraído:', token.substring(0, 20) + '...');
    
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as any;
    } catch (tokenError: any) {
      if (tokenError.name === 'TokenExpiredError') {
        console.log('❌ Token expirado');
        return res.status(401).json({ error: "Token expirado" });
      }
      console.log('❌ Token inválido:', tokenError.message);
      return res.status(401).json({ error: "Token inválido" });
    }
    console.log('Token decodificado:', { id: decoded.id, email: decoded.email, role: decoded.role });
    
    if (decoded.role !== UserRole.ADMIN && decoded.role !== UserRole.IT_STAFF) {
      console.log('❌ Acesso negado - Role:', decoded.role);
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { title, content, category, is_public } = req.body;
    console.log('Body:', { title, content: content?.substring(0, 50) + '...', category, is_public });

    if (!title || !content) {
      console.log('❌ Título ou conteúdo faltando');
      return res.status(400).json({ error: "Título e conteúdo são obrigatórios" });
    }

    console.log('Executando INSERT...', { title, category, is_public, created_by_id: decoded.id });
    const result = await database.query(
      "INSERT INTO information_articles (title, content, category, is_public, created_by_id, views_count) VALUES ($1, $2, $3, $4, $5, 0) RETURNING *",
      [title, content, category || null, is_public !== false, decoded.id]
    );

    console.log('✅ Artigo criado com sucesso:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error creating article:", error);
    console.error("Stack:", error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ error: "Failed to create article", details: error instanceof Error ? error.message : 'Unknown error' });
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