import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import api from '../services/api';
import '../styles/InventoryDashboardPage.css';

interface DashboardData {
  equipmentInUse: number;
  equipmentInStock: number;
  equipmentInMaintenance: number;
  totalNotebooks: number;
  equipmentWithoutTerms: number;
  pendingPurchases: number;
}

interface RecentActivity {
  id: string;
  type: 'delivery' | 'return';
  equipment_code: string;
  equipment_type: string;
  responsible_name: string;
  date: string;
  unit: string;
}

interface Alert {
  id: string;
  type: 'maintenance' | 'long_use' | 'missing_term';
  severity: 'high' | 'medium' | 'low';
  equipment_code: string;
  equipment_type: string;
  message: string;
  days?: number;
}

const ALERT_META: Record<Alert['type'], { icon: string; label: (days?: number) => string }> = {
  maintenance: { icon: 'ti-tool', label: (d) => (d ? `Em manutenção há ${d} dias` : 'Em manutenção') },
  long_use: { icon: 'ti-hourglass', label: (d) => (d ? `Com a mesma pessoa há ${d} dias` : 'Uso prolongado') },
  missing_term: { icon: 'ti-file-alert', label: () => 'Sem termo assinado' },
};

const SEVERITY_BADGE: Record<Alert['severity'], string> = {
  high: 'tpg-badge--late',
  medium: 'tpg-badge--warn',
  low: 'tpg-badge--muted',
};

const SEVERITY_LABEL: Record<Alert['severity'], string> = { high: 'Urgente', medium: 'Atenção', low: 'Baixa' };

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  if (hours < 24) return `há ${hours} h`;
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return date.toLocaleDateString('pt-BR');
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function InventoryDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    // Cada bloco carrega por conta própria: um endpoint fora do ar não apaga a tela toda.
    const [summary, movements, alertList] = await Promise.allSettled([
      api.get('/inventory/dashboard/summary'),
      api.get('/inventory/movements/recent', { params: { limit: 10 } }),
      api.get('/inventory/alerts'),
    ]);
    if (summary.status === 'fulfilled') setDashboard(summary.value.data);
    else setError('Não foi possível carregar os números do inventário.');
    setActivities(movements.status === 'fulfilled' && Array.isArray(movements.value.data) ? movements.value.data : []);
    setAlerts(alertList.status === 'fulfilled' && Array.isArray(alertList.value.data) ? alertList.value.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inUse = dashboard?.equipmentInUse ?? 0;
  const inStock = dashboard?.equipmentInStock ?? 0;
  const inMaint = dashboard?.equipmentInMaintenance ?? 0;
  const withoutTerms = dashboard?.equipmentWithoutTerms ?? 0;
  const pendingPurchases = dashboard?.pendingPurchases ?? 0;
  const total = inUse + inStock + inMaint;

  const segments = [
    { key: 'in_use', label: 'Com pessoas', value: inUse, tone: 'use' },
    { key: 'available', label: 'Disponíveis', value: inStock, tone: 'stock' },
    { key: 'maintenance', label: 'Em manutenção', value: inMaint, tone: 'maint' },
  ];

  // Termos pendentes aparecem como a primeira pendência quando o backend não manda alerta próprio.
  const hasTermAlert = alerts.some((a) => a.type === 'missing_term');
  const attentionCount = alerts.length + (withoutTerms > 0 && !hasTermAlert ? 1 : 0);

  return (
    <InventoryLayout>
      <div className="tpg ivd">
        <header className="tpg-hero pub-aurora">
          <div className="tpg-hero__top">
            <div className="tpg-hero__title">
              <span className="pub-gicon" aria-hidden="true"><i className="ti ti-building-warehouse" /></span>
              <div>
                <h1>Inventário</h1>
                <p>
                  {loading && !dashboard
                    ? 'Contando os equipamentos…'
                    : total === 0
                      ? 'Nenhum equipamento cadastrado ainda.'
                      : `${plural(total, 'equipamento', 'equipamentos')}: ${inUse} com pessoas, ${inStock} prontos para entregar e ${inMaint} em manutenção.`}
                </p>
              </div>
            </div>
            <div className="tpg-hero__actions">
              <button type="button" className="tpg-btn tpg-btn--glass" onClick={() => void load()} disabled={loading}>
                <i className={`ti ti-refresh${loading ? ' ivd-spin' : ''}`} aria-hidden="true" />Atualizar
              </button>
              <button type="button" className="tpg-btn tpg-btn--sun" onClick={() => navigate('/inventario/compras/nova')}>
                <i className="ti ti-shopping-cart-plus" aria-hidden="true" />Nova compra
              </button>
            </div>
          </div>

          {total > 0 && (
            <div className="ivd-dist">
              <div className="ivd-bar" role="img" aria-label={segments.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(', ')}>
                {segments.filter((s) => s.value > 0).map((s) => (
                  <span key={s.key} className={`ivd-bar__seg ivd-bar__seg--${s.tone}`} style={{ flexGrow: s.value }} />
                ))}
              </div>
              <ul className="ivd-legend">
                {segments.map((s) => (
                  <li key={s.key}>
                    <button type="button" onClick={() => navigate(`/inventario/notebooks?status=${s.key}`)}>
                      <span className={`ivd-dot ivd-dot--${s.tone}`} aria-hidden="true" />
                      <strong>{s.value}</strong>{s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="tpg-stats" aria-label="Resumo">
            <li>
              <button type="button" className="tpg-stat" onClick={() => navigate('/inventario/notebooks')}>
                <strong>{dashboard?.totalNotebooks ?? 0}</strong>notebooks
              </button>
            </li>
            <li>
              <button type="button" className={`tpg-stat${withoutTerms > 0 ? ' is-alert' : ''}`} onClick={() => navigate('/inventario/responsabilidades')}>
                <strong>{withoutTerms}</strong>sem termo assinado
              </button>
            </li>
            <li>
              <button type="button" className="tpg-stat" onClick={() => navigate('/inventario/compras')}>
                <strong>{pendingPurchases}</strong>{pendingPurchases === 1 ? 'compra pendente' : 'compras pendentes'}
              </button>
            </li>
          </ul>
        </header>

        {error && (
          <div className="tpg-alert" role="alert">
            <i className="ti ti-alert-circle" aria-hidden="true" /><span>{error}</span>
            <button type="button" onClick={() => void load()} aria-label="Tentar de novo"><i className="ti ti-refresh" aria-hidden="true" /></button>
          </div>
        )}

        <div className="ivd-grid">
          <section className="tpg-card tpg-section ivd-attn">
            <header className="tpg-section__head">
              <h2>
                <span className="pub-gicon pub-gicon--administrativo" aria-hidden="true"><i className="ti ti-alert-triangle" /></span>
                Precisa de atenção
              </h2>
              {attentionCount > 0 && <span className="tpg-count">{attentionCount}</span>}
            </header>

            {loading && !dashboard ? (
              <div className="ivd-pad">{[0, 1, 2].map((n) => <div key={n} className="tpg-skeleton" style={{ height: 54 }} />)}</div>
            ) : attentionCount === 0 ? (
              <div className="tpg-empty ivd-calm">
                <span className="pub-gicon" aria-hidden="true"><i className="ti ti-circle-check" /></span>
                <h3>Tudo em dia</h3>
                <p>Nenhum equipamento parado em manutenção, sem termo ou há tempo demais com alguém.</p>
              </div>
            ) : (
              <ul className="tpg-rows ivd-alerts">
                {withoutTerms > 0 && !hasTermAlert && (
                  <li>
                    <button type="button" className="tpg-row ivd-alert" onClick={() => navigate('/inventario/responsabilidades')}>
                      <span className="ivd-alert__icon ivd-alert__icon--high" aria-hidden="true"><i className="ti ti-file-alert" /></span>
                      <span className="ivd-alert__body">
                        <strong>{plural(withoutTerms, 'equipamento entregue', 'equipamentos entregues')} sem termo assinado</strong>
                        <span>Colete a assinatura para registrar quem é responsável.</span>
                      </span>
                      <i className="ti ti-chevron-right ivd-alert__go" aria-hidden="true" />
                    </button>
                  </li>
                )}
                {alerts.map((alert) => {
                  const meta = ALERT_META[alert.type] ?? ALERT_META.maintenance;
                  return (
                    <li key={alert.id}>
                      <div className="tpg-row ivd-alert">
                        <span className={`ivd-alert__icon ivd-alert__icon--${alert.severity}`} aria-hidden="true"><i className={`ti ${meta.icon}`} /></span>
                        <span className="ivd-alert__body">
                          <strong><span className="ivd-code">{alert.equipment_code}</span> {alert.equipment_type}</strong>
                          <span>{alert.message || meta.label(alert.days)}</span>
                        </span>
                        <span className={`tpg-badge ${SEVERITY_BADGE[alert.severity] ?? 'tpg-badge--muted'}`}>
                          {alert.days ? `${alert.days} dias` : SEVERITY_LABEL[alert.severity] ?? 'Atenção'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="tpg-card tpg-section ivd-feed">
            <header className="tpg-section__head">
              <h2>
                <span className="pub-gicon pub-gicon--neutral" aria-hidden="true"><i className="ti ti-arrows-exchange" /></span>
                Movimentações recentes
              </h2>
            </header>

            {loading && activities.length === 0 ? (
              <div className="ivd-pad">{[0, 1, 2, 3].map((n) => <div key={n} className="tpg-skeleton" style={{ height: 48 }} />)}</div>
            ) : activities.length === 0 ? (
              <div className="tpg-empty">
                <span className="pub-gicon pub-gicon--neutral" aria-hidden="true"><i className="ti ti-arrows-exchange" /></span>
                <h3>Nada entregue ou devolvido ainda</h3>
                <p>Cada entrega e devolução registrada aparece aqui.</p>
                <button type="button" className="tpg-btn tpg-btn--primary" onClick={() => navigate('/inventario/equipamentos/entregar')}>
                  <i className="ti ti-arrow-up-right" aria-hidden="true" />Entregar equipamento
                </button>
              </div>
            ) : (
              <ol className="ivd-timeline">
                {activities.map((a) => {
                  const delivery = a.type === 'delivery';
                  return (
                    <li key={a.id} className={`ivd-tl ivd-tl--${delivery ? 'out' : 'in'}`}>
                      <span className="ivd-tl__icon" aria-hidden="true"><i className={`ti ${delivery ? 'ti-arrow-up-right' : 'ti-arrow-down-left'}`} /></span>
                      <div className="ivd-tl__body">
                        <p>
                          <span className="ivd-code">{a.equipment_code}</span>{' '}
                          {delivery ? 'entregue para' : 'devolvido por'} <strong>{a.responsible_name}</strong>
                        </p>
                        <small>{[a.equipment_type, a.unit].filter(Boolean).join(', ')}</small>
                      </div>
                      <time dateTime={a.date}>{relativeDate(a.date)}</time>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </InventoryLayout>
  );
}
