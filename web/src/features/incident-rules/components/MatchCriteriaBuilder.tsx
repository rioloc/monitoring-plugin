import { Button, FormGroup, Grid, GridItem, NumberInput, TextInput } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { FC, useCallback } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { MatchType } from '@/features/incident-rules/types/model';

const MATCH_TYPE_OPTIONS: { value: MatchType; label: string; description: string }[] = [
  { value: 'exact', label: 'Exact', description: 'All labels must be identical' },
  { value: 'allOf', label: 'All Of', description: 'All listed labels must match' },
  { value: 'anyOf', label: 'Any Of', description: 'At least one listed label must match' },
  { value: 'nOf', label: 'N of M', description: 'At least N of the listed labels must match' },
  { value: 'and', label: 'Composite (And)', description: 'All sub-criteria must be satisfied' },
];

interface MatchCriteriaFormValues {
  matchType: MatchType;
  keys: string;
  nOfMin: number;
  andCriteria: Array<{
    matchType: Exclude<MatchType, 'and'>;
    keys: string;
    nOfMin: number;
  }>;
}

export const matchFormToSpec = (values: MatchCriteriaFormValues): Record<string, unknown> => {
  switch (values.matchType) {
    case 'exact':
      return { exact: true };
    case 'allOf':
      return { allOf: parseKeys(values.keys) };
    case 'anyOf':
      return { anyOf: parseKeys(values.keys) };
    case 'nOf':
      return { nOf: { keys: parseKeys(values.keys), min: values.nOfMin } };
    case 'and':
      return {
        and: (values.andCriteria || []).map((sub) => {
          switch (sub.matchType) {
            case 'exact':
              return { exact: true };
            case 'allOf':
              return { allOf: parseKeys(sub.keys) };
            case 'anyOf':
              return { anyOf: parseKeys(sub.keys) };
            case 'nOf':
              return { nOf: { keys: parseKeys(sub.keys), min: sub.nOfMin } };
            default:
              return {};
          }
        }),
      };
    default:
      return {};
  }
};

export const specToMatchForm = (match: Record<string, unknown>): MatchCriteriaFormValues => {
  if (!match || Object.keys(match).length === 0) {
    return { matchType: 'exact', keys: '', nOfMin: 1, andCriteria: [] };
  }
  if (match.exact) {
    return { matchType: 'exact', keys: '', nOfMin: 1, andCriteria: [] };
  }
  if (match.allOf) {
    return {
      matchType: 'allOf',
      keys: (match.allOf as string[]).join(', '),
      nOfMin: 1,
      andCriteria: [],
    };
  }
  if (match.anyOf) {
    return {
      matchType: 'anyOf',
      keys: (match.anyOf as string[]).join(', '),
      nOfMin: 1,
      andCriteria: [],
    };
  }
  if (match.nOf) {
    const nOf = match.nOf as { keys: string[]; min: number };
    return { matchType: 'nOf', keys: nOf.keys.join(', '), nOfMin: nOf.min, andCriteria: [] };
  }
  if (match.and) {
    const andArray = match.and as Array<Record<string, unknown>>;
    return {
      matchType: 'and',
      keys: '',
      nOfMin: 1,
      andCriteria: andArray.map((sub) => {
        if (sub.exact) return { matchType: 'exact' as const, keys: '', nOfMin: 1 };
        if (sub.allOf)
          return {
            matchType: 'allOf' as const,
            keys: (sub.allOf as string[]).join(', '),
            nOfMin: 1,
          };
        if (sub.anyOf)
          return {
            matchType: 'anyOf' as const,
            keys: (sub.anyOf as string[]).join(', '),
            nOfMin: 1,
          };
        if (sub.nOf) {
          const nOf = sub.nOf as { keys: string[]; min: number };
          return { matchType: 'nOf' as const, keys: nOf.keys.join(', '), nOfMin: nOf.min };
        }
        return { matchType: 'allOf' as const, keys: '', nOfMin: 1 };
      }),
    };
  }
  return { matchType: 'exact', keys: '', nOfMin: 1, andCriteria: [] };
};

const parseKeys = (keys: string): string[] =>
  keys
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

interface SubCriterionFieldsProps {
  prefix: string;
  allowAnd?: boolean;
}

const SubCriterionFields: FC<SubCriterionFieldsProps> = ({ prefix, allowAnd = true }) => {
  const { t } = useTranslation(process.env.I18N_NAMESPACE);
  const { control, watch } = useFormContext();

  const matchType = watch(`${prefix}.matchType`);

  const typeOptions = allowAnd
    ? MATCH_TYPE_OPTIONS
    : MATCH_TYPE_OPTIONS.filter((o) => o.value !== 'and');

  return (
    <Grid hasGutter>
      <GridItem span={3}>
        <Controller
          control={control}
          name={`${prefix}.matchType`}
          render={({ field }) => (
            <FormGroup label={t('Match type')} fieldId={`${prefix}-match-type`}>
              <select
                className="pf-v6-c-form-control"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.label)}
                  </option>
                ))}
              </select>
            </FormGroup>
          )}
        />
      </GridItem>
      <GridItem span={9}>
        {matchType === 'exact' && (
          <FormGroup label={t('Match type')} fieldId={`${prefix}-exact-info`}>
            <p className="pf-v6-u-color-200 pf-v6-u-font-size-sm">
              {t('All labels on both alerts must be identical')}
            </p>
          </FormGroup>
        )}
        {(matchType === 'allOf' || matchType === 'anyOf') && (
          <Controller
            control={control}
            name={`${prefix}.keys`}
            render={({ field }) => (
              <FormGroup
                label={matchType === 'allOf' ? t('All of these keys') : t('Any of these keys')}
                fieldId={`${prefix}-keys`}
              >
                <TextInput
                  {...field}
                  placeholder={t('Comma-separated label keys (e.g. namespace, alertname)')}
                />
              </FormGroup>
            )}
          />
        )}
        {matchType === 'nOf' && (
          <Grid hasGutter>
            <GridItem span={8}>
              <Controller
                control={control}
                name={`${prefix}.keys`}
                render={({ field }) => (
                  <FormGroup label={t('Keys')} fieldId={`${prefix}-nof-keys`}>
                    <TextInput {...field} placeholder={t('Comma-separated label keys')} />
                  </FormGroup>
                )}
              />
            </GridItem>
            <GridItem span={4}>
              <Controller
                control={control}
                name={`${prefix}.nOfMin`}
                render={({ field }) => (
                  <FormGroup label={t('Minimum matches')} fieldId={`${prefix}-nof-min`}>
                    <NumberInput
                      value={field.value}
                      min={1}
                      onMinus={() => field.onChange(Math.max(1, field.value - 1))}
                      onPlus={() => field.onChange(field.value + 1)}
                      onChange={(event) => {
                        const val = Number((event.target as HTMLInputElement).value);
                        if (!isNaN(val) && val >= 1) field.onChange(val);
                      }}
                      inputAriaLabel={t('Minimum number of matching keys')}
                    />
                  </FormGroup>
                )}
              />
            </GridItem>
          </Grid>
        )}
      </GridItem>
    </Grid>
  );
};

export const MatchCriteriaBuilder: FC = () => {
  const { t } = useTranslation(process.env.I18N_NAMESPACE);
  const { control, watch } = useFormContext();

  const matchType = watch('matchType');

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'andCriteria',
  });

  const handleAddSubCriterion = useCallback(() => {
    append({ matchType: 'allOf', keys: '', nOfMin: 1 });
  }, [append]);

  if (matchType === 'and') {
    return (
      <FormGroup label={t('Match criteria (AND)')} fieldId="match-criteria-and">
        {fields.map((field, index) => (
          <Grid hasGutter key={field.id} className="pf-v6-u-mb-md pf-v6-u-pl-lg">
            <GridItem span={11}>
              <SubCriterionFields prefix={`andCriteria.${index}`} allowAnd={false} />
            </GridItem>
            <GridItem span={1}>
              <Button
                variant="plain"
                aria-label={t('Remove sub-criterion')}
                onClick={() => remove(index)}
              >
                <MinusCircleIcon />
              </Button>
            </GridItem>
          </Grid>
        ))}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAddSubCriterion}>
          {t('Add sub-criterion')}
        </Button>
      </FormGroup>
    );
  }

  return <SubCriterionFields prefix="" allowAnd />;
};
