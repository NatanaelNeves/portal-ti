import type { TicketsOverview } from '../../hooks/useTicketsOverview';

interface Insight {
  key: string;
  icon: string;
  tone: 'info' | 'warning' | 'positive';
  text: string;
}

/**
 * Leituras curtas derivadas do panorama.
 *
 * Cada frase sai de um número que o backend já calculou — nada é estimado
 * nem preenchido quando falta base. Uma leitura só entra quando ela mudaria
 * o que a pessoa faz a seguir; por isso todas têm limiar, e num dia calmo a
 * faixa simplesmente não aparece.
 */
function buildInsights(o: TicketsOverview): Insight[] {
  const insights: Insight[] = [];
  const openTotal =
    o.status.open + o.status.inProgress + o.status.waitingUser + o.status.awaitingConfirmation;

  if (o.attention.unassignedOver24h > 0) {
    insights.push({
      key: 'unassigned',
      icon: 'ti-user-question',
      tone: 'warning',
      text: `${o.attention.unassignedOver24h} ${
        o.attention.unassignedOver24h === 1 ? 'chamado está' : 'chamados estão'
      } sem responsável há mais de 24h.`,
    });
  }

  if (o.attention.overdue > 0) {
    insights.push({
      key: 'overdue',
      icon: 'ti-alarm',
      tone: 'warning',
      text: `${o.attention.overdue} ${
        o.attention.overdue === 1 ? 'chamado passou' : 'chamados passaram'
      } do prazo previsto para a prioridade.`,
    });
  }

  // Concentração por setor só é notícia para quem enxerga mais de um.
  if (o.byDepartment.length > 1 && openTotal > 0) {
    const top = [...o.byDepartment].sort((a, b) => b.open - a.open)[0];
    const share = Math.round((top.open / openTotal) * 100);
    if (share >= 50) {
      insights.push({
        key: 'concentration',
        icon: 'ti-chart-pie',
        tone: 'info',
        text: `${top.label} concentra ${share}% dos chamados em aberto.`,
      });
    }
  }

  if (o.trend.deltaPct !== null && Math.abs(o.trend.deltaPct) >= 15) {
    const up = o.trend.deltaPct > 0;
    insights.push({
      key: 'trend',
      icon: up ? 'ti-trending-up' : 'ti-trending-down',
      tone: up ? 'warning' : 'positive',
      text: `Volume de chamados ${up ? 'aumentou' : 'caiu'} ${Math.abs(
        o.trend.deltaPct,
      )}% em relação à semana anterior.`,
    });
  }

  if (o.timing.resolutionDeltaPct !== null && o.timing.resolutionDeltaPct <= -10) {
    insights.push({
      key: 'resolution',
      icon: 'ti-clock-check',
      tone: 'positive',
      text: `Tempo médio de resolução caiu ${Math.abs(o.timing.resolutionDeltaPct)}% em 30 dias.`,
    });
  }

  if (o.topCategories.length > 0 && openTotal >= 5) {
    const top = o.topCategories[0];
    const share = Math.round((top.total / openTotal) * 100);
    if (share >= 25) {
      insights.push({
        key: 'category',
        icon: 'ti-tag',
        tone: 'info',
        text: `“${top.category}” responde por ${share}% da fila em aberto.`,
      });
    }
  }

  return insights.slice(0, 3);
}

export default function InsightStrip({ overview }: { overview: TicketsOverview }) {
  const insights = buildInsights(overview);
  if (insights.length === 0) return null;

  return (
    <section className="tk-insights" aria-label="Leituras da operação">
      {insights.map((insight, index) => (
        <article
          key={insight.key}
          className={`tk-insight tk-insight--${insight.tone}`}
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <i className={`ti ${insight.icon}`} aria-hidden="true" />
          <p>{insight.text}</p>
        </article>
      ))}
    </section>
  );
}

export { buildInsights };
