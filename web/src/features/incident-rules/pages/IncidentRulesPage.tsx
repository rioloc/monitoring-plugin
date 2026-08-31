import { DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { PageSection } from '@patternfly/react-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { IncidentRulesTable } from '@/features/incident-rules/components/IncidentRulesTable';
import withFallback from '@/shared/console/console-shared/error/fallbacks/WithFallback';
import { MonitoringProvider } from '@/shared/contexts/MonitoringContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const IncidentRulesPage: FC = () => {
  const { t } = useTranslation(process.env.I18N_NAMESPACE);
  const title = t('Incident Rules');

  return (
    <>
      <DocumentTitle>{title}</DocumentTitle>
      <PageSection hasBodyWrapper={false}>
        <IncidentRulesTable />
      </PageSection>
    </>
  );
};

const IncidentRulesPageWithFallback = withFallback(IncidentRulesPage);

export const McpCmoAlertingPage: FC = () => {
  return (
    <MonitoringProvider
      monitoringContext={{ plugin: 'monitoring-console-plugin', prometheus: 'cmo' }}
    >
      <QueryClientProvider client={queryClient}>
        <IncidentRulesPageWithFallback />
      </QueryClientProvider>
    </MonitoringProvider>
  );
};
