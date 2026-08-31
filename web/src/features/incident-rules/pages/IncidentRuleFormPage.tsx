import { zodResolver } from '@hookform/resolvers/zod';
import { DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import {
  ActionGroup,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  PageSection,
  Spinner,
  TextInput,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import {
  MatchCriteriaBuilder,
  matchFormToSpec,
  specToMatchForm,
} from '@/features/incident-rules/components/MatchCriteriaBuilder';
import {
  scopeEntriesToSpec,
  type ScopeEntry,
  ScopeFilterBuilder,
  specToScopeEntries,
} from '@/features/incident-rules/components/ScopeFilterBuilder';
import {
  type IncidentAggregationRule,
  WITHIN_PRESETS,
} from '@/features/incident-rules/types/model';
import {
  useCreateIncidentRuleMutation,
  useIncidentRule,
  useUpdateIncidentRuleMutation,
} from '@/features/incident-rules/utils/api';
import { iarFormSchema } from '@/features/incident-rules/utils/validations';
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

interface FormValues {
  name: string;
  priority: number;
  within: string;
  scopeEntries: ScopeEntry[];
  matchType: string;
  keys: string;
  nOfMin: number;
  andCriteria: Array<{ matchType: string; keys: string; nOfMin: number }>;
}

const defaultFormValues: FormValues = {
  name: '',
  priority: 50,
  within: '1h',
  scopeEntries: [],
  matchType: 'allOf',
  keys: '',
  nOfMin: 1,
  andCriteria: [],
};

const IncidentRuleFormPage: FC = () => {
  const { t } = useTranslation(process.env.I18N_NAMESPACE);
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();

  const isEdit = !!name && name !== '~new';

  const { data: existingRule, isLoading: isLoadingRule } = useIncidentRule(
    isEdit ? name : undefined,
  );

  const createMutation = useCreateIncidentRuleMutation();
  const updateMutation = useUpdateIncidentRuleMutation();

  const schema = useMemo(() => iarFormSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    mode: 'onBlur',
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (isEdit && existingRule) {
      const matchForm = specToMatchForm(existingRule.spec.match as Record<string, unknown>);
      form.reset({
        name: existingRule.metadata.name,
        priority: existingRule.spec.priority,
        within: existingRule.spec.within,
        scopeEntries: specToScopeEntries(
          existingRule.spec.scope as Record<string, Record<string, unknown>> | undefined,
        ),
        matchType: matchForm.matchType,
        keys: matchForm.keys,
        nOfMin: matchForm.nOfMin,
        andCriteria: matchForm.andCriteria,
      });
    }
  }, [isEdit, existingRule, form]);

  const onSubmit = (values: FormValues) => {
    const matchSpec = matchFormToSpec({
      matchType: values.matchType as 'exact' | 'allOf' | 'anyOf' | 'nOf' | 'and',
      keys: values.keys,
      nOfMin: values.nOfMin,
      andCriteria: values.andCriteria.map((c) => ({
        ...c,
        matchType: c.matchType as 'exact' | 'allOf' | 'anyOf' | 'nOf',
      })),
    });

    const scopeSpec = scopeEntriesToSpec(values.scopeEntries);

    const rule: IncidentAggregationRule = {
      apiVersion: 'monitoring.openshift.io/v1alpha1',
      kind: 'IncidentAggregationRule',
      metadata: {
        name: values.name,
        ...(isEdit && existingRule
          ? { resourceVersion: existingRule.metadata.resourceVersion }
          : {}),
      },
      spec: {
        priority: values.priority,
        within: values.within,
        ...(scopeSpec ? { scope: scopeSpec } : {}),
        match: matchSpec,
      },
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(rule, {
      onSuccess: () => navigate('/monitoring/alerts/aggregation-rules'),
    });
  };

  const title = isEdit ? t('Edit Aggregation Rule') : t('Create Aggregation Rule');
  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;

  if (isEdit && isLoadingRule) {
    return (
      <Bullseye>
        <Spinner aria-label={t('Loading rule')} />
      </Bullseye>
    );
  }

  return (
    <>
      <DocumentTitle>{title}</DocumentTitle>
      <PageSection hasBodyWrapper={false}>
        <Breadcrumb className="pf-v6-u-mb-md">
          <BreadcrumbItem>
            <Link to="/monitoring/alerts/aggregation-rules">{t('Aggregation Rules')}</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{isEdit ? name : t('Create')}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" className="pf-v6-u-mb-lg">
          {title}
        </Title>
        <FormProvider {...form}>
          <Form onSubmit={form.handleSubmit(onSubmit)} style={{ maxWidth: '800px' }}>
            {/* Name */}
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormGroup label={t('Name')} isRequired fieldId="iar-name">
                  <TextInput
                    {...field}
                    id="iar-name"
                    isRequired
                    isDisabled={isEdit}
                    placeholder={t('my-aggregation-rule')}
                    validated={fieldState.error ? ValidatedOptions.error : ValidatedOptions.default}
                  />
                  {fieldState.error && (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                          {fieldState.error.message}
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  )}
                </FormGroup>
              )}
            />

            {/* Priority */}
            <Controller
              control={form.control}
              name="priority"
              render={({ field, fieldState }) => (
                <FormGroup label={t('Priority')} isRequired fieldId="iar-priority">
                  <NumberInput
                    id="iar-priority"
                    value={field.value}
                    min={0}
                    max={999}
                    onMinus={() => field.onChange(Math.max(0, field.value - 1))}
                    onPlus={() => field.onChange(Math.min(999, field.value + 1))}
                    onChange={(event) => {
                      const val = Number((event.target as HTMLInputElement).value);
                      if (!isNaN(val)) field.onChange(val);
                    }}
                    inputAriaLabel={t('Priority value')}
                    validated={fieldState.error ? ValidatedOptions.error : ValidatedOptions.default}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem
                        variant={fieldState.error ? 'error' : 'default'}
                        {...(fieldState.error ? { icon: <ExclamationCircleIcon /> } : {})}
                      >
                        {fieldState.error
                          ? fieldState.error.message
                          : t(
                              'Lower value = higher priority. Defaults: 0 (exact), 10 (subset), 20 (fuzzy), 100 (time-proximity), 999 (batch suppressor)',
                            )}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              )}
            />

            {/* Within */}
            <Controller
              control={form.control}
              name="within"
              render={({ field, fieldState }) => (
                <FormGroup label={t('Within (time window)')} isRequired fieldId="iar-within">
                  <ToggleGroup aria-label={t('Duration presets')} className="pf-v6-u-mb-sm">
                    {WITHIN_PRESETS.map((preset) => (
                      <ToggleGroupItem
                        key={preset}
                        text={preset}
                        isSelected={field.value === preset}
                        onChange={() => field.onChange(preset)}
                      />
                    ))}
                  </ToggleGroup>
                  <TextInput
                    {...field}
                    id="iar-within"
                    placeholder={t('e.g. 1h30m, 45m, 2h')}
                    validated={fieldState.error ? ValidatedOptions.error : ValidatedOptions.default}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem
                        variant={fieldState.error ? 'error' : 'default'}
                        {...(fieldState.error ? { icon: <ExclamationCircleIcon /> } : {})}
                      >
                        {fieldState.error
                          ? fieldState.error.message
                          : t(
                              'Alerts firing within this duration of each other can be grouped together',
                            )}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              )}
            />

            {/* Scope */}
            <ScopeFilterBuilder />

            {/* Match */}
            <MatchCriteriaBuilder />

            {/* Error */}
            {mutationError && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                    {mutationError.message}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}

            {/* Actions */}
            <ActionGroup>
              <Button variant="primary" type="submit" isDisabled={isPending} isLoading={isPending}>
                {isEdit ? t('Save') : t('Create')}
              </Button>
              <Button
                variant="link"
                onClick={() => navigate('/monitoring/alerts/aggregation-rules')}
              >
                {t('Cancel')}
              </Button>
            </ActionGroup>
          </Form>
        </FormProvider>
      </PageSection>
    </>
  );
};

const IncidentRuleFormPageWithFallback = withFallback(IncidentRuleFormPage);

export const McpCmoAlertingPage: FC = () => {
  return (
    <MonitoringProvider
      monitoringContext={{ plugin: 'monitoring-console-plugin', prometheus: 'cmo' }}
    >
      <QueryClientProvider client={queryClient}>
        <IncidentRuleFormPageWithFallback />
      </QueryClientProvider>
    </MonitoringProvider>
  );
};
