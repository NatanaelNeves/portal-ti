import useAnimatedCount from '../../hooks/useAnimatedCount';
import type { MetricSpec } from './sectorProfiles';

interface Props {
  metric: MetricSpec;
  index?: number;
}

/**
 * Um indicador da Central: ícone, rótulo, número, contexto e tendência.
 *
 * Quando o backend não tem base para o número (nenhum chamado resolvido no
 * período, por exemplo), o valor chega `null` e o cartão mostra "sem dados"
 * em vez de um zero — zero e "não sei" significam coisas diferentes para
 * quem está decidindo onde agir.
 */
export default function MetricCard({ metric, index = 0 }: Props) {
  const animated = useAnimatedCount(metric.value ?? 0);
  const hasValue = metric.value !== null && metric.value !== undefined;
  const shown = metric.format ? metric.format(metric.value ?? 0) : String(animated);

  const delta = metric.deltaPct;
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta) && delta !== 0;
  // Para tempo de resolução, cair é bom; para volume, subir é que chama atenção.
  const deltaIsGood = hasDelta ? (metric.lowerIsBetter ? delta! < 0 : delta! > 0) : false;

  return (
    <article
      className={`tk-metric tk-metric--${metric.tone ?? 'neutral'}`}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      {/* Tooltip próprio em vez do `title` nativo: o do navegador demora ~1s
          para aparecer e não segue a tipografia do sistema. */}
      <span className="tk-hint" role="tooltip">{metric.hint}</span>
      <span className="tk-metric-icon" aria-hidden="true">
        <i className={`ti ${metric.icon}`} />
      </span>

      <h3 className="tk-metric-label">{metric.label}</h3>

      <p className="tk-metric-value">
        {hasValue ? shown : <span className="tk-metric-empty">sem dados</span>}
      </p>

      <div className="tk-metric-foot">
        {hasDelta && (
          <span className={`tk-metric-delta ${deltaIsGood ? 'is-good' : 'is-bad'}`}>
            <i className={`ti ${delta! < 0 ? 'ti-trending-down' : 'ti-trending-up'}`} aria-hidden="true" />
            {Math.abs(delta!)}%
          </span>
        )}
        {metric.detail && <span className="tk-metric-detail">{metric.detail}</span>}
      </div>
    </article>
  );
}
