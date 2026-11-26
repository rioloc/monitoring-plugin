import { Alert, AlertStates, K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

import {
  getAlertFingerprintPrefix,
  getAlertmanagerFingerprint,
  matchesAgenticRun,
} from '@/shared/hooks/agentic-runs/alert-identifier';
import { computeAlertFingerprint } from '@/shared/utils/alerts/alert-fingerprint';

const makeAlert = (labels: Record<string, string>): Alert =>
  ({
    labels: { alertname: 'TestAlert', ...labels },
    annotations: {},
    state: AlertStates.Firing,
    rule: { id: '1', alerts: [], labels: {}, name: 'TestAlert', query: '', duration: 0 },
  }) as unknown as Alert;

const makeAgenticRun = (labels: Record<string, string>): K8sResourceCommon => ({
  apiVersion: 'agentic.openshift.io/v1alpha1',
  kind: 'AgenticRun',
  metadata: {
    name: 'test-proposal',
    namespace: 'openshift-lightspeed',
    labels,
  },
});

describe('getAlertmanagerFingerprint', () => {
  it('matches the Alertmanager fingerprint for a platform alert without mutating its labels', () => {
    const alert = makeAlert({
      alertname: 'ClusterVersionOperatorDown',
      namespace: 'openshift-cluster-version',
      prometheus: 'openshift-monitoring/k8s',
      severity: 'critical',
    });
    alert.rule.labels = { prometheus: 'openshift-monitoring/k8s' };
    const originalLabels = { ...alert.labels };

    expect(getAlertmanagerFingerprint(alert)).toBe('2791febb43f8cde6');
    expect(getAlertFingerprintPrefix(alert)).toBe('2791febb');
    expect(alert.labels).toEqual(originalLabels);
  });

  it('uses the user source from the rule', () => {
    const alert = makeAlert({ namespace: 'my-app' });
    alert.rule.sourceId = 'user';

    expect(getAlertmanagerFingerprint(alert)).toBe(
      computeAlertFingerprint({ ...alert.labels, openshift_io_alert_source: 'user' }),
    );
  });

  it('preserves an existing source label over the inferred source', () => {
    const alert = makeAlert({ openshift_io_alert_source: 'platform' });
    alert.rule.sourceId = 'user';

    expect(getAlertmanagerFingerprint(alert)).toBe(computeAlertFingerprint(alert.labels));
  });
});

describe('getAlertFingerprintPrefix', () => {
  it('returns the first 8 characters of the Alertmanager fingerprint', () => {
    const alert = makeAlert({});
    const fp = getAlertmanagerFingerprint(alert);
    const prefix = getAlertFingerprintPrefix(alert);
    expect(prefix).toHaveLength(8);
    expect(fp.startsWith(prefix)).toBe(true);
  });
});

describe('matchesProposal', () => {
  it('matches by fingerprint prefix', () => {
    const alert = makeAlert({ severity: 'critical' });
    const fp8 = getAlertFingerprintPrefix(alert);
    const proposal = makeAgenticRun({
      'agentic.openshift.io/alert-fingerprint': fp8,
      'agentic.openshift.io/source': 'alertmanager',
    });
    expect(matchesAgenticRun(alert, proposal)).toBe(true);
  });

  it('does not match when fingerprint differs', () => {
    const alert = makeAlert({ severity: 'critical' });
    const proposal = makeAgenticRun({
      'agentic.openshift.io/alert-fingerprint': 'deadbeef',
      'agentic.openshift.io/source': 'alertmanager',
    });
    expect(matchesAgenticRun(alert, proposal)).toBe(false);
  });

  it('does not match when proposal has no fingerprint label', () => {
    const alert = makeAlert({ severity: 'warning' });
    const proposal = makeAgenticRun({
      'agentic.openshift.io/alert-name': 'testalert',
      'agentic.openshift.io/alert-severity': 'warning',
    });
    expect(matchesAgenticRun(alert, proposal)).toBe(false);
  });
});
