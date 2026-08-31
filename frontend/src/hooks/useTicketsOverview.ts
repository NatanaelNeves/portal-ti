import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

export interface TicketsOverview {
  scope: {
    department: 'ti' | 'rh' | 'administrativo' | null;
    canSelectDepartment: boolean;
    label: string;
  };
  status: {
    total: number;
    open: number;
    inProgress: number;
    waitingUser: number;
    awaitingConfirmation: number;
    resolved: number;
    closed: number;
  };
  priority: { urgent: number; high: number; medium: number; low: number };
  today: { created: number; resolved: number };
  attention: { unassigned: number; unassignedOver24h: number; overdue: number };
  /** Chamados parados por dependência externa — SLA congelado. */
  paused: {
    procurement: number;
    thirdParty: number;
    total: number;
    avgProcurementMinutes: number | null;
    avgThirdPartyMinutes: number | null;
    longestMinutes: number | null;
  };
  timing: {
    firstResponseMinutes: number | null;
    resolutionMinutes: number | null;
    resolutionDeltaPct: number | null;
  };
  trend: { thisWeek: number; lastWeek: number; deltaPct: number | null };
  byDepartment: Array<{ department: string; label: string; total: number; open: number }>;
  topCategories: Array<{ category: string; total: number }>;
  workload: Array<{ userId: string; name: string; open: number }>;
}

/**
 * Carrega o panorama agregado da Central de Chamados.
 *
 * O backend calcula sobre o conjunto inteiro visível ao usuário, não sobre a
 * página atual da lista — por isso os indicadores não vêm daqui somando os 20
 * chamados que estão na tela, o que daria números errados a partir da página
 * 2. O escopo de setor é decidido no servidor pelo papel do usuário; o
 * parâmetro `department` só tem efeito para admin e gestor.
 */
export function useTicketsOverview(department: string, enabled: boolean) {
  const [overview, setOverview] = useState<TicketsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const alive = useRef(true);
  const requestVersion = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; requestVersion.current += 1; inFlight.current = false; };
  }, []);

  /**
   * Uma alteração dispara duas coisas ao mesmo tempo: o recarregamento
   * explícito de quem fez a ação e o evento de websocket que volta do
   * servidor. Sem a trava, o mesmo agregado seria pedido duas vezes.
   */
  const load = useCallback(async () => {
    if (!enabled || inFlight.current) return;
    inFlight.current = true;
    const version = ++requestVersion.current;
    try {
      setError('');
      const params = department ? `?department=${encodeURIComponent(department)}` : '';
      const { data } = await api.get(`/tickets/overview${params}`, { timeout: 15000 });
      if (alive.current && version === requestVersion.current) setOverview(data);
    } catch (err: any) {
      if (alive.current && version === requestVersion.current) {
        setError(err?.response?.data?.error || 'Não foi possível carregar o panorama');
      }
    } finally {
      if (version === requestVersion.current) {
        inFlight.current = false;
        if (alive.current) setLoading(false);
      }
    }
  }, [department, enabled]);

  useEffect(() => {
    requestVersion.current += 1;
    inFlight.current = false;
    setOverview(null);
    setLoading(true);
    load();
  }, [load]);

  // A fila recebe eventos em tempo real; o panorama acompanha os mesmos.
  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    // Acao em lote emite um evento por chamado; agrupamos numa recarga so.
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(load, 400);
    };
    const events = ['ticket:new', 'ticket:updated', 'ticket:resolved', 'ticket:reopened'];
    events.forEach((name) => window.addEventListener(name, refresh));
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, refresh));
    };
  }, [enabled, load]);

  return { overview, loading, error, reload: load };
}

export default useTicketsOverview;
