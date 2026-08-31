export interface ScopeFilter {
  equals?: string;
  in?: string[];
  notIn?: string[];
  regex?: string;
  exists?: boolean;
}

export interface NOfCriteria {
  keys: string[];
  min: number;
}

export interface MatchCriteria {
  exact?: boolean;
  allOf?: string[];
  anyOf?: string[];
  nOf?: NOfCriteria;
  and?: MatchCriteria[];
}

export interface IARSpec {
  priority: number;
  within: string;
  scope?: Record<string, ScopeFilter>;
  match: MatchCriteria;
}

export interface IARMetadata {
  name: string;
  creationTimestamp?: string;
  resourceVersion?: string;
  managedFields?: Array<{ time?: string }>;
  annotations?: Record<string, string>;
}

export interface IncidentAggregationRule {
  apiVersion: 'monitoring.openshift.io/v1alpha1';
  kind: 'IncidentAggregationRule';
  metadata: IARMetadata;
  spec: IARSpec;
}

export interface IncidentAggregationRuleList {
  apiVersion: string;
  kind: string;
  metadata: { resourceVersion?: string };
  items: IncidentAggregationRule[];
}

export type ScopeFilterType = 'equals' | 'in' | 'notIn' | 'regex' | 'exists';

export type MatchType = 'exact' | 'allOf' | 'anyOf' | 'nOf' | 'and';

export const BATCH_SUPPRESSION_ANNOTATION =
  'monitoring.openshift.io/suppress-batch-grouping' as const;

export const DEFAULT_RULE_NAMES = [
  'exact-match',
  'subset-match',
  'fuzzy-match',
  'time-proximity',
  'watchdog-batch-suppressor',
] as const;

export const HIDDEN_RULE_NAMES = ['watchdog-batch-suppressor'] as const;

export const COMMON_LABEL_KEYS = [
  'alertname',
  'namespace',
  'severity',
  'node',
  'service',
  'job',
  'container',
  'condition',
  'pod',
  'endpoint',
] as const;

export const WITHIN_PRESETS = ['15m', '30m', '1h', '2h', '6h', '12h', '24h', '48h', '120h'];
