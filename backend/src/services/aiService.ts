import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5-20251001';

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface TicketClassification {
  type: 'incident' | 'request' | 'change' | 'problem';
  category: string;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface ArticleSuggestion {
  id: string;
  title: string;
  category: string;
  relevance: number;
}

export interface TicketSummary {
  summary: string;
  keyPoints: string[];
  suggestedNextStep: string;
}

// ── Classificação automática de chamado ──────────────────────────────────────

export async function classifyTicket(
  title: string,
  description: string,
  department: string,
): Promise<TicketClassification | null> {
  const client = getClient();
  if (!client) return null;

  const prompt = `Você é um assistente de TI. Classifique o chamado abaixo.

Departamento destino: ${department}
Título: ${title}
Descrição: ${description}

Responda APENAS com JSON válido neste formato:
{
  "type": "incident" | "request" | "change" | "problem",
  "category": string (máximo 30 chars, ex: "Internet/Rede", "Computador/Hardware", "Sistema/Software", "Impressora", "Acesso/Senha", "Email", "Equipamento", "Outro"),
  "priority": "low" | "medium" | "high",
  "reasoning": string (1 frase explicando o motivo da prioridade)
}

Critérios de prioridade:
- high: sistema parado, múltiplos afetados, urgente, bloqueio total
- medium: problema que atrapalha mas não impede trabalho
- low: dúvida, melhoria, sem urgência`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as TicketClassification;
    if (!parsed.type || !parsed.priority) return null;
    return parsed;
  } catch (err) {
    console.error('[AI] classifyTicket error:', err);
    return null;
  }
}

// ── Sugestão de artigos da KB ─────────────────────────────────────────────────

export async function suggestArticles(
  query: string,
  articles: Array<{ id: string; title: string; category: string; content: string }>,
): Promise<ArticleSuggestion[]> {
  if (!articles.length) return [];

  const client = getClient();
  if (!client) return [];

  const articleList = articles
    .slice(0, 30)
    .map((a, i) => `[${i}] ID:${a.id} | ${a.category} | ${a.title}`)
    .join('\n');

  const prompt = `Usuário está abrindo um chamado de TI com o seguinte problema:
"${query.slice(0, 300)}"

Artigos disponíveis na base de conhecimento:
${articleList}

Retorne APENAS JSON com os índices dos até 3 artigos mais relevantes, do mais para o menos relevante:
{"matches": [0, 2, 5]}

Se nenhum for relevante, retorne: {"matches": []}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 64,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as { matches: number[] };
    if (!Array.isArray(parsed.matches)) return [];

    return parsed.matches
      .filter(i => i >= 0 && i < articles.length)
      .slice(0, 3)
      .map((i, rank) => ({
        id: articles[i].id,
        title: articles[i].title,
        category: articles[i].category,
        relevance: 3 - rank,
      }));
  } catch (err) {
    console.error('[AI] suggestArticles error:', err);
    return [];
  }
}

// ── Resumo de chamado ─────────────────────────────────────────────────────────

export async function summarizeTicket(
  title: string,
  description: string,
  messages: Array<{ author_type: string; message: string; created_at: string }>,
): Promise<TicketSummary | null> {
  const client = getClient();
  if (!client) return null;

  const conversation = messages
    .slice(-20)
    .map(m => `[${m.author_type === 'public' ? 'Usuário' : 'Atendente'}]: ${m.message}`)
    .join('\n');

  const prompt = `Analise este chamado de TI e forneça um resumo executivo.

Título: ${title}
Descrição inicial: ${description}

Histórico de mensagens:
${conversation || '(sem mensagens ainda)'}

Responda APENAS com JSON:
{
  "summary": "resumo em 2-3 frases do problema e situação atual",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3"],
  "suggestedNextStep": "próxima ação recomendada para o atendente"
}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as TicketSummary;
  } catch (err) {
    console.error('[AI] summarizeTicket error:', err);
    return null;
  }
}

export const isAIEnabled = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);
