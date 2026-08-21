/**
 * Esqueleto dos indicadores.
 *
 * Repete a geometria real do MetricCard — marca do ícone, rótulo curto,
 * número alto, rodapé — para que a tela não salte quando os dados chegam.
 */
export default function MetricSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="tk-metrics" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="tk-metric tk-metric--skeleton" key={index} style={{ animationDelay: `${index * 45}ms` }}>
          <span className="tk-sk tk-sk-mark" />
          <span className="tk-sk tk-sk-label" />
          <span className="tk-sk tk-sk-value" />
          <span className="tk-sk tk-sk-foot" />
        </div>
      ))}
    </div>
  );
}
