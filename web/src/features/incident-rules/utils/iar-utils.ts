import {
  BATCH_SUPPRESSION_ANNOTATION,
  DEFAULT_RULE_NAMES,
  type IARMetadata,
  type MatchCriteria,
  type ScopeFilter,
} from '@/features/incident-rules/types/model';

export const isDefaultRule = (name: string): boolean =>
  (DEFAULT_RULE_NAMES as readonly string[]).includes(name);

export const hasBatchSuppression = (annotations?: Record<string, string>): boolean =>
  annotations?.[BATCH_SUPPRESSION_ANNOTATION] === 'true';

export const getLastModifiedTime = (metadata: IARMetadata): string | undefined => {
  if (!metadata.managedFields?.length) {
    return metadata.creationTimestamp;
  }
  return metadata.managedFields.reduce<string | undefined>((latest, field) => {
    if (!field.time) return latest;
    if (!latest) return field.time;
    return field.time > latest ? field.time : latest;
  }, undefined);
};

const summarizeScopeFilter = (key: string, filter: ScopeFilter): string => {
  if (filter.equals !== undefined) return `${key} = "${filter.equals}"`;
  if (filter.in) return `${key} in [${filter.in.join(', ')}]`;
  if (filter.notIn) return `${key} notIn [${filter.notIn.join(', ')}]`;
  if (filter.regex) return `${key} =~ "${filter.regex}"`;
  if (filter.exists !== undefined) return filter.exists ? `${key} exists` : `${key} absent`;
  return key;
};

export const summarizeScope = (scope?: Record<string, ScopeFilter>): string => {
  if (!scope || Object.keys(scope).length === 0) return 'All alerts';
  return Object.entries(scope)
    .map(([k, v]) => summarizeScopeFilter(k, v))
    .join(', ');
};

const summarizeMatchInner = (match: MatchCriteria): string => {
  if (match.exact) return 'exact';
  if (match.allOf) return `allOf: [${match.allOf.join(', ')}]`;
  if (match.anyOf) return `anyOf: [${match.anyOf.join(', ')}]`;
  if (match.nOf) return `${match.nOf.min} of [${match.nOf.keys.join(', ')}]`;
  if (match.and) return match.and.map(summarizeMatchInner).join(' AND ');
  return 'time-proximity';
};

export const summarizeMatch = (match: MatchCriteria): string => {
  if (!match || Object.keys(match).length === 0) return 'Time proximity (no label match)';
  return summarizeMatchInner(match);
};

export const IAR_API_BASE_URL =
  '/apis/monitoring.openshift.io/v1alpha1/incidentaggregationrules' as const;
