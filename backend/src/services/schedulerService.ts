import cron from 'node-cron';
import { database } from '../database/connection';

// ─── Configuração ────────────────────────────────────────────────────────────
// Dias sem atividade para fechar automaticamente tickets resolvidos
const DAYS_TO_AUTO_CLOSE = 7;

// ─── Job: Fechar tickets resolvidos sem interação há X dias ──────────────────
async function autoCloseResolvedTickets(): Promise<void> {
  try {
    console.log(`[SCHEDULER] Verificando tickets resolvidos há mais de ${DAYS_TO_AUTO_CLOSE} dias...`);

    const result = await database.query(
      `UPDATE tickets
       SET status = 'closed', updated_at = NOW()
       WHERE status = 'resolved'
         AND updated_at < NOW() - INTERVAL '${DAYS_TO_AUTO_CLOSE} days'
       RETURNING id, title, updated_at`,
    );

    if (result.rows.length === 0) {
      console.log('[SCHEDULER] Nenhum ticket fechado automaticamente.');
    } else {
      console.log(`[SCHEDULER] ${result.rows.length} ticket(s) fechado(s) automaticamente:`);
      result.rows.forEach((t: { id: string; title: string }) => {
        console.log(`  - #${t.id}: "${t.title}"`);
      });
    }
  } catch (err) {
    console.error('[SCHEDULER] Erro ao fechar tickets automaticamente:', err);
  }
}

// ─── Registrar jobs ──────────────────────────────────────────────────────────
export function initializeScheduler(): void {
  // Roda todo dia às 03:00 (horário do servidor / UTC)
  cron.schedule('0 3 * * *', () => {
    autoCloseResolvedTickets();
  });

  console.log(
    `✓ Scheduler iniciado: tickets resolvidos serão fechados automaticamente após ${DAYS_TO_AUTO_CLOSE} dias sem interação (job diário às 03:00 UTC)`,
  );
}
