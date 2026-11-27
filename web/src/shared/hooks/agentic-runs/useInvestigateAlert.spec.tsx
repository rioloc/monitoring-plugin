/** @vitest-environment jsdom */

import type { Alert } from '@openshift-console/dynamic-plugin-sdk';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  consoleFetchJSON: { post: mocks.post },
  useToast: () => ({ addToast: mocks.addToast }),
}));

import type { useInvestigateAlert as UseInvestigateAlert } from '@/shared/hooks/agentic-runs/useInvestigateAlert';

// Fresh module per test so the session-level availability/in-flight cache resets.
const loadHook = async () => {
  vi.resetModules();
  return (await import('@/shared/hooks/agentic-runs/useInvestigateAlert'))
    .useInvestigateAlert as typeof UseInvestigateAlert;
};

const alert = {
  labels: {
    alertname: 'ClusterVersionOperatorDown',
    namespace: 'openshift-cluster-version',
    prometheus: 'openshift-monitoring/k8s',
    severity: 'critical',
  },
  rule: { sourceId: 'platform' },
} as unknown as Alert;
const investigationError = (code: number, body?: object) => ({
  code,
  json: body,
});

describe('useInvestigateAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the Alertmanager fingerprint including source and shows a success toast', async () => {
    mocks.post.mockResolvedValue({ namespace: 'ns', name: 'run-1' });
    const useInvestigateAlert = await loadHook();

    const { result } = renderHook(() => useInvestigateAlert(alert));
    await act(() => result.current.investigate());

    expect(mocks.post).toHaveBeenCalledWith(expect.any(String), {
      fingerprint: '2791febb43f8cde6',
    });
    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Investigation started' }),
    );
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });

  it('shows an info toast for investigation_in_progress', async () => {
    mocks.post.mockRejectedValue(
      investigationError(409, {
        error: { code: 'investigation_in_progress', message: 'already exists' },
      }),
    );
    const useInvestigateAlert = await loadHook();

    const { result } = renderHook(() => useInvestigateAlert(alert));
    await act(() => result.current.investigate());

    const toast = mocks.addToast.mock.calls[0][0];
    expect(toast.content).toBe('already exists');
    expect(toast.variant).toBe('info');
  });

  it('shows a danger toast with the adapter message for other errors', async () => {
    mocks.post.mockRejectedValue(
      investigationError(403, {
        error: { code: 'forbidden', message: 'no RBAC' },
      }),
    );

    const useInvestigateAlert = await loadHook();

    const { result } = renderHook(() => useInvestigateAlert(alert));
    await act(() => result.current.investigate());

    const toast = mocks.addToast.mock.calls[0][0];
    expect(toast.content).toBe('no RBAC');
    expect(toast.variant).toBe('danger');
  });

  it('falls back to a translated message when the adapter sends none', async () => {
    mocks.post.mockRejectedValue(investigationError(500, { error: { code: 'internal_error' } }));
    const useInvestigateAlert = await loadHook();

    const { result } = renderHook(() => useInvestigateAlert(alert));
    await act(() => result.current.investigate());

    expect(mocks.addToast.mock.calls[0][0].content).toBe('Failed to start the AI investigation');
  });

  it('marks the adapter unavailable and stays silent on a proxy 404', async () => {
    mocks.post.mockRejectedValue(investigationError(404));
    const useInvestigateAlert = await loadHook();

    const { result } = renderHook(() => useInvestigateAlert(alert));
    await act(() => result.current.investigate());

    expect(mocks.addToast).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isAvailable).toBe(false));

    // A newly mounted hook inherits the cached unavailability.
    const second = renderHook(() => useInvestigateAlert(alert));
    expect(second.result.current.isAvailable).toBe(false);
  });

  it('prevents duplicate concurrent submissions for the same fingerprint', async () => {
    let resolvePost: (value: object) => void;
    mocks.post.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );

    const useInvestigateAlert = await loadHook();

    const { result } = renderHook(() => useInvestigateAlert(alert));
    const first = act(() => result.current.investigate());
    await act(() => result.current.investigate());

    expect(mocks.post).toHaveBeenCalledTimes(1);
    resolvePost!({ name: 'run-2' });
    await first;
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });
});
