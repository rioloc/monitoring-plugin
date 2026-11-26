import { Alert, consoleFetchJSON, useToast } from '@openshift-console/dynamic-plugin-sdk';
import { AlertVariant } from '@patternfly/react-core';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getAlertmanagerFingerprint } from '@/shared/hooks/agentic-runs/alert-identifier';

export const INVESTIGATIONS_URL =
  '/api/proxy/plugin/lightspeed-agentic-console-plugin/alerts-adapter/api/v1/investigations';

// Cached for the session: the Lightspeed agentic plugin may not be installed.
let adapterUnavailable = false;
const fingerprintsInFlight = new Set<string>();

type InvestigationResponse = { namespace?: string; name?: string };
type InvestigationError = { error?: { code?: string; message?: string } };

/**
 * Triggers an on-demand AI investigation (AgenticRun) for an alert via the
 * Lightspeed alerts adapter exposed through the console plugin proxy.
 */
export const useInvestigateAlert = (alert: Alert) => {
  const { t } = useTranslation(process.env.I18N_NAMESPACE);
  const { addToast } = useToast();
  const [isSubmitting, setSubmitting] = useState(false);
  const [isAvailable, setAvailable] = useState(!adapterUnavailable);

  const investigate = useCallback(async () => {
    const fingerprint = getAlertmanagerFingerprint(alert);
    if (adapterUnavailable || fingerprintsInFlight.has(fingerprint)) {
      return;
    }
    fingerprintsInFlight.add(fingerprint);
    setSubmitting(true);
    try {
      const run: InvestigationResponse = await consoleFetchJSON.post(INVESTIGATIONS_URL, {
        fingerprint,
      });
      addToast({
        title: t('Investigation started'),
        variant: AlertVariant.success,
        content: run?.name ? t('AgenticRun {{name}}', { name: run.name }) : undefined,
        dismissible: true,
      });
    } catch (e) {
      const err = e as { code?: number; json?: InvestigationError };
      const code = err?.json?.error?.code;
      const message = err?.json?.error?.message;
      if (err?.code === 404 && !code) {
        // Proxy path not found: the Lightspeed agentic plugin is not installed.
        adapterUnavailable = true;
        setAvailable(false);
        return;
      }
      const fallback =
        code === 'forbidden'
          ? t('You are not allowed to trigger investigations')
          : t('Failed to start the AI investigation');
      addToast({
        title:
          code === 'investigation_in_progress'
            ? t('Investigation already in progress')
            : t('Investigation failed to start'),
        variant: code === 'investigation_in_progress' ? AlertVariant.info : AlertVariant.danger,
        content: message ?? fallback,
        dismissible: true,
      });
    } finally {
      fingerprintsInFlight.delete(fingerprint);
      setSubmitting(false);
    }
  }, [alert, t, addToast]);

  return { investigate, isSubmitting, isAvailable };
};
