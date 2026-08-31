import { StrictMode, type PropsWithChildren } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import useTicketsOverview from './useTicketsOverview';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('panorama de chamados', () => {
  it('carrega corretamente com a montagem dupla do StrictMode', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { scope: { department: 'ti' } } });
    const { result } = renderHook(() => useTicketsOverview('ti', true), {
      wrapper: ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>,
    });
    await act(async () => {});
    expect(result.current.overview?.scope.department).toBe('ti');
    expect(result.current.loading).toBe(false);
  });

  it('ignora o panorama antigo quando a equipe muda com uma consulta pendente', async () => {
    let finishOld!: (value: unknown) => void;
    vi.mocked(api.get).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    const { result, rerender } = renderHook(({ department }) => useTicketsOverview(department, true), { initialProps: { department: 'ti' } });
    vi.mocked(api.get).mockResolvedValue({ data: { scope: { department: 'rh' } } });
    rerender({ department: 'rh' });
    await act(async () => {});
    await act(async () => { finishOld({ data: { scope: { department: 'ti' } } }); });
    expect(result.current.overview?.scope.department).toBe('rh');
    expect(result.current.loading).toBe(false);
  });
});
