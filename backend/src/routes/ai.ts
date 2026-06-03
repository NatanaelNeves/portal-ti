import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { database } from '../database/connection';
import { classifyTicket, suggestArticles, summarizeTicket, isAIEnabled } from '../services/aiService';

const router = express.Router();

// GET /api/ai/status — verifica se IA está habilitada
router.get('/status', (_req: Request, res: Response) => {
  res.json({ enabled: isAIEnabled() });
});

// POST /api/ai/classify — classifica tipo/categoria/prioridade de um chamado
// Público (chamado pelo frontend no momento da criação, sem login)
router.post('/classify', async (req: Request, res: Response) => {
  const { title, description, department } = req.body;

  if (!title || !description) {
    res.status(400).json({ error: 'title e description são obrigatórios' });
    return;
  }

  if (!isAIEnabled()) {
    res.status(503).json({ error: 'IA não configurada' });
    return;
  }

  const result = await classifyTicket(title, description, department || 'ti');
  if (!result) {
    res.status(500).json({ error: 'Falha na classificação' });
    return;
  }

  res.json(result);
});

// POST /api/ai/suggest-articles — sugere artigos da KB com base na descrição do chamado
// Público
router.post('/suggest-articles', async (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query || query.trim().length < 20) {
    res.json({ suggestions: [] });
    return;
  }

  if (!isAIEnabled()) {
    res.json({ suggestions: [] });
    return;
  }

  try {
    const articlesResult = await database.query(
      `SELECT id, title, category, LEFT(content, 300) AS content
       FROM information_articles
       WHERE is_public = true
       ORDER BY views_count DESC
       LIMIT 30`,
    );

    const suggestions = await suggestArticles(query, articlesResult.rows);
    res.json({ suggestions });
  } catch (err) {
    console.error('[AI route] suggest-articles error:', err);
    res.json({ suggestions: [] });
  }
});

// POST /api/ai/summarize/:ticketId — gera resumo de um chamado (interno)
router.post('/summarize/:ticketId', authMiddleware, async (req: Request, res: Response) => {
  const { ticketId } = req.params;

  if (!isAIEnabled()) {
    res.status(503).json({ error: 'IA não configurada' });
    return;
  }

  try {
    const ticketResult = await database.query(
      'SELECT title, description FROM tickets WHERE id = $1',
      [ticketId],
    );

    if (!ticketResult.rows.length) {
      res.status(404).json({ error: 'Chamado não encontrado' });
      return;
    }

    const messagesResult = await database.query(
      `SELECT author_type, message, created_at
       FROM ticket_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [ticketId],
    );

    const { title, description } = ticketResult.rows[0];
    const summary = await summarizeTicket(title, description, messagesResult.rows);

    if (!summary) {
      res.status(500).json({ error: 'Falha ao gerar resumo' });
      return;
    }

    res.json(summary);
  } catch (err) {
    console.error('[AI route] summarize error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/ai/chat — chatbot com contexto da KB
router.post('/chat', async (req: Request, res: Response) => {
  const { message, history } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: 'message obrigatório' }); return; }
  if (!isAIEnabled()) { res.status(503).json({ error: 'IA não configurada' }); return; }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Busca artigos relevantes da KB como contexto
    const articlesResult = await database.query(
      `SELECT title, content FROM information_articles WHERE is_public = true ORDER BY views_count DESC LIMIT 15`,
    );
    const kbContext = articlesResult.rows
      .map((a: any) => `## ${a.title}\n${a.content.slice(0, 400)}`)
      .join('\n\n');

    const systemPrompt = `Você é um assistente do Portal de TI da organização "O Pequeno Nazareno". Seu papel é responder dúvidas simples dos colaboradores sobre suporte técnico, procedimentos internos e uso dos sistemas.

Use os artigos da Base de Conhecimento abaixo como referência:

${kbContext}

Regras:
- Responda em português brasileiro de forma clara e direta
- Se souber a resposta com base nos artigos, responda diretamente
- Se não souber ou for muito específico, oriente o usuário a abrir um chamado
- Nunca invente informações técnicas
- Resposta máxima: 3 parágrafos curtos`;

    const messages = [
      ...((history || []) as Array<{ role: string; content: string }>).slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    res.json({ reply });
  } catch (err) {
    console.error('[AI chat]', err);
    res.status(500).json({ error: 'Falha ao processar mensagem' });
  }
});

export default router;
