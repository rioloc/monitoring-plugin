import { Alert, K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

import {
  AGENTIC_RUN_LABEL_FINGERPRINT,
  FINGERPRINT_PREFIX_LEN,
} from '@/shared/hooks/agentic-runs/constants';
import { computeAlertFingerprint } from '@/shared/utils/alerts/alert-fingerprint';
import { alertSource } from '@/shared/utils/alerts/alert-source';

export const getAlertmanagerFingerprint = (alert: Alert): string =>
  computeAlertFingerprint({
    ...alert.labels,
    // Prometheus/Thanos omit the source label present in Alertmanager.
    openshift_io_alert_source: alert.labels.openshift_io_alert_source ?? alertSource(alert),
  });

export const getAlertFingerprintPrefix = (alert: Alert): string =>
  getAlertmanagerFingerprint(alert).slice(0, FINGERPRINT_PREFIX_LEN);

export const matchesAgenticRun = (alert: Alert, proposal: K8sResourceCommon): boolean => {
  const proposalFp = proposal.metadata?.labels?.[AGENTIC_RUN_LABEL_FINGERPRINT];
  if (!proposalFp) {
    return false;
  }
  return proposalFp === getAlertFingerprintPrefix(alert);
};
