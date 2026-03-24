import cron from 'node-cron';
import { database } from '../database/connection';
import { EmailService } from './emailService';
import { getWebSocketService } from './websocketService';

// ─── Configuração ────────────────────────────────────────────────────────────
const DAYS_TO_AUTO_CLOSE = 2;
const WARNING_HOURS_BEFORE_CLOSE = 24;

// ─── Job: Avisar usuário 24h antes do encerramento automático ────────────────
async function notifyTicketsNearAutoClose(): Promise<void> {
  try {
    console.log('[SCHEDULER] Verificando tickets aguardando confirmação com fechamento em < 24h...');

    const result = await database.query(
      `SELECT t.id, t.title, pu.email AS requester_email, pu.name AS requester_name
       FROM tickets t
       JOIN public_users pu ON t.requester_type = 'public' AND pu.id = t.requester_id
       WHERE t.status = 'aguardando_confirmacao'
         AND t.confirmation_requested_at IS NOT NULL
         AND t.auto_close_warning_sent_at IS NULL
         AND t.confirmation_requested_at <= NOW() - INTERVAL '1 day'
         AND t.confirmation_requested_at > NOW() - INTERVAL '2 days'`,
    );

    for (const row of result.rows) {
      await EmailService.notifyAutoCloseWarning(
        row.id,
        row.title,
        row.requester_email,
        row.requester_name || 'Usuário',
      );

      await database.query(
        `UPDATE tickets
         SET auto_close_warning_sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [row.id],
      );

      await database.query(
        `INSERT INTO ticket_history (
          ticket_id, action, changed_by_type, changed_by_id, old_value, new_value, metadata
        ) VALUES ($1, 'auto_close_warning_sent', 'system', NULL, NULL, NULL, $2::jsonb)`,
        [row.id, JSON.stringify({ hours_remaining: WARNING_HOURS_BEFORE_CLOSE })],
      ).catch(() => undefined);

      const ws = getWebSocketService();
      ws?.getIO().emit('ticket:auto_close_warning', {
        ticketId: row.id,
        title: row.title,
        action: 'auto_close_warning',
        hoursRemaining: WARNING_HOURS_BEFORE_CLOSE,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[SCHEDULER] Avisos enviados: ${result.rows.length}`);
  } catch (err) {
    console.error('[SCHEDULER] Erro ao enviar avisos de auto fechamento:', err);
  }
}

// ─── Job: Fechar automaticamente tickets sem confirmação em 2 dias ───────────
async function autoCloseAwaitingConfirmationTickets(): Promise<void> {
  try {
    console.log(`[SCHEDULER] Verificando tickets aguardando confirmação há mais de ${DAYS_TO_AUTO_CLOSE} dias...`);

    const result = await database.query(
      `UPDATE tickets
       SET status = 'closed',
           resolved_at = COALESCE(resolved_at, NOW()),
           auto_closed = true,
           closed_at = NOW(),
           confirmation_response_at = COALESCE(confirmation_response_at, NOW()),
           updated_at = NOW()
       WHERE status = 'aguardando_confirmacao'
         AND confirmation_requested_at <= NOW() - INTERVAL '${DAYS_TO_AUTO_CLOSE} days'
       RETURNING id, title, updated_at`,
    );

    for (const row of result.rows) {
      await database.query(
        `INSERT INTO ticket_history (
          ticket_id, action, changed_by_type, changed_by_id, old_value, new_value, metadata
        ) VALUES ($1, 'auto_closed_after_confirmation_timeout', 'system', NULL, 'aguardando_confirmacao', 'closed', $2::jsonb)`,
        [row.id, JSON.stringify({ auto_closed: true, reason: 'timeout_2_days' })],
      ).catch(() => undefined);

      const ws = getWebSocketService();
      ws?.getIO().emit('ticket:updated', {
        ticketId: row.id,
        action: 'auto_closed',
        oldStatus: 'aguardando_confirmacao',
        status: 'closed',
        auto_closed: true,
        timestamp: new Date().toISOString(),
      });
    }

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
    notifyTicketsNearAutoClose();
    autoCloseAwaitingConfirmationTickets();
  });

  console.log(
    `✓ Scheduler iniciado: tickets em aguardando_confirmacao recebem aviso em 24h e são fechados após ${DAYS_TO_AUTO_CLOSE} dias (job diário às 03:00 UTC)`,
  );
}
