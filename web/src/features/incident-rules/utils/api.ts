import {
  k8sCreate,
  k8sDelete,
  k8sGet,
  k8sListItems,
  K8sResourceCommon,
  k8sUpdate,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';

import type { IncidentAggregationRule } from '@/features/incident-rules/types/model';
import { IncidentAggregationRuleModel } from '@/shared/console/models';

const QUERY_KEY = 'incident-aggregation-rules';

const getIncidentRules = async (): Promise<IncidentAggregationRule[]> => {
  const items = await k8sListItems<K8sResourceCommon>({
    model: IncidentAggregationRuleModel,
    queryParams: {},
  });
  return items as unknown as IncidentAggregationRule[];
};

const getIncidentRule = async (name: string): Promise<IncidentAggregationRule> => {
  const result = await k8sGet({
    model: IncidentAggregationRuleModel,
    name,
  });
  return result as unknown as IncidentAggregationRule;
};

export function useIncidentRulesList(): UseQueryResult<IncidentAggregationRule[], Error> {
  return useQuery<IncidentAggregationRule[], Error>({
    queryKey: [QUERY_KEY],
    queryFn: getIncidentRules,
  });
}

export function useIncidentRule(
  name: string | undefined,
): UseQueryResult<IncidentAggregationRule, Error> {
  return useQuery<IncidentAggregationRule, Error>({
    queryKey: [QUERY_KEY, name],
    queryFn: () => getIncidentRule(name!),
    enabled: !!name,
  });
}

const createIncidentRule = async (
  rule: IncidentAggregationRule,
): Promise<IncidentAggregationRule> => {
  const result = await k8sCreate({
    model: IncidentAggregationRuleModel,
    data: rule as unknown as K8sResourceCommon,
  });
  return result as unknown as IncidentAggregationRule;
};

export function useCreateIncidentRuleMutation(): UseMutationResult<
  IncidentAggregationRule,
  Error,
  IncidentAggregationRule
> {
  const queryClient = useQueryClient();
  return useMutation<IncidentAggregationRule, Error, IncidentAggregationRule>({
    mutationKey: [QUERY_KEY],
    mutationFn: createIncidentRule,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

const updateIncidentRule = async (
  rule: IncidentAggregationRule,
): Promise<IncidentAggregationRule> => {
  const result = await k8sUpdate({
    model: IncidentAggregationRuleModel,
    data: rule as unknown as K8sResourceCommon,
    name: rule.metadata.name,
  });
  return result as unknown as IncidentAggregationRule;
};

export function useUpdateIncidentRuleMutation(): UseMutationResult<
  IncidentAggregationRule,
  Error,
  IncidentAggregationRule
> {
  const queryClient = useQueryClient();
  return useMutation<IncidentAggregationRule, Error, IncidentAggregationRule>({
    mutationKey: [QUERY_KEY],
    mutationFn: updateIncidentRule,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

const deleteIncidentRule = async (name: string): Promise<void> => {
  await k8sDelete({
    model: IncidentAggregationRuleModel,
    resource: {
      metadata: { name },
    } as K8sResourceCommon,
  });
};

export function useDeleteIncidentRuleMutation(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationKey: [QUERY_KEY],
    mutationFn: (name: string) => {
      return deleteIncidentRule(name).then(() => name);
    },
    onSuccess: (name) => {
      queryClient.removeQueries({ queryKey: [QUERY_KEY, name] });
      return queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
