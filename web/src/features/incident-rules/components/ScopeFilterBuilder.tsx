import {
  Button,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  Switch,
  TextInput,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { FC, useCallback } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { COMMON_LABEL_KEYS, type ScopeFilterType } from '@/features/incident-rules/types/model';

const FILTER_TYPE_OPTIONS: { value: ScopeFilterType; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'in', label: 'In' },
  { value: 'notIn', label: 'Not In' },
  { value: 'regex', label: 'Regex' },
  { value: 'exists', label: 'Exists' },
];

interface ScopeEntry {
  labelKey: string;
  filterType: ScopeFilterType;
  value: string;
  existsValue: boolean;
}

export const scopeEntriesToSpec = (
  entries: ScopeEntry[],
): Record<string, Record<string, unknown>> | undefined => {
  if (!entries || entries.length === 0) return undefined;

  const scope: Record<string, Record<string, unknown>> = {};
  for (const entry of entries) {
    if (!entry.labelKey) continue;
    if (entry.filterType === 'exists') {
      scope[entry.labelKey] = { exists: entry.existsValue };
    } else if (entry.filterType === 'in' || entry.filterType === 'notIn') {
      const values = entry.value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      scope[entry.labelKey] = { [entry.filterType]: values };
    } else {
      scope[entry.labelKey] = { [entry.filterType]: entry.value };
    }
  }
  return Object.keys(scope).length > 0 ? scope : undefined;
};

export type { ScopeEntry };

export const specToScopeEntries = (
  scope?: Record<string, Record<string, unknown>>,
): ScopeEntry[] => {
  if (!scope) return [];
  return Object.entries(scope).map(([labelKey, filter]) => {
    if (filter.equals !== undefined)
      return {
        labelKey,
        filterType: 'equals' as const,
        value: filter.equals as string,
        existsValue: true,
      };
    if (filter.in)
      return {
        labelKey,
        filterType: 'in' as const,
        value: (filter.in as string[]).join(', '),
        existsValue: true,
      };
    if (filter.notIn)
      return {
        labelKey,
        filterType: 'notIn' as const,
        value: (filter.notIn as string[]).join(', '),
        existsValue: true,
      };
    if (filter.regex)
      return {
        labelKey,
        filterType: 'regex' as const,
        value: filter.regex as string,
        existsValue: true,
      };
    if (filter.exists !== undefined)
      return {
        labelKey,
        filterType: 'exists' as const,
        value: '',
        existsValue: filter.exists as boolean,
      };
    return { labelKey, filterType: 'equals' as const, value: '', existsValue: true };
  });
};

export const ScopeFilterBuilder: FC = () => {
  const { t } = useTranslation(process.env.I18N_NAMESPACE);
  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'scopeEntries',
  });

  const handleAdd = useCallback(() => {
    append({ labelKey: '', filterType: 'equals', value: '', existsValue: true });
  }, [append]);

  return (
    <FormGroup label={t('Scope filters')} fieldId="scope-filters">
      {fields.map((field, index) => (
        <Grid hasGutter key={field.id} className="pf-v6-u-mb-sm">
          <GridItem span={3}>
            <Controller
              control={control}
              name={`scopeEntries.${index}.labelKey`}
              render={({ field: f }) => (
                <TextInput
                  {...f}
                  aria-label={t('Label key')}
                  placeholder={t('Label key (e.g. alertname)')}
                  list={`label-keys-${index}`}
                />
              )}
            />
            <datalist id={`label-keys-${index}`}>
              {COMMON_LABEL_KEYS.map((key) => (
                <option key={key} value={key} />
              ))}
            </datalist>
          </GridItem>
          <GridItem span={2}>
            <Controller
              control={control}
              name={`scopeEntries.${index}.filterType`}
              render={({ field: f }) => (
                <FormSelect
                  {...f}
                  aria-label={t('Filter type')}
                  onChange={(_event, val) => f.onChange(val)}
                >
                  {FILTER_TYPE_OPTIONS.map((opt) => (
                    <FormSelectOption key={opt.value} value={opt.value} label={t(opt.label)} />
                  ))}
                </FormSelect>
              )}
            />
          </GridItem>
          <GridItem span={6}>
            <Controller
              control={control}
              name={`scopeEntries.${index}.filterType`}
              render={({ field: filterTypeField }) =>
                filterTypeField.value === 'exists' ? (
                  <Controller
                    control={control}
                    name={`scopeEntries.${index}.existsValue`}
                    render={({ field: f }) => (
                      <Switch
                        id={`scope-exists-${index}`}
                        label={f.value ? t('Must exist') : t('Must be absent')}
                        isChecked={f.value}
                        onChange={(_event, checked) => f.onChange(checked)}
                      />
                    )}
                  />
                ) : (
                  <Controller
                    control={control}
                    name={`scopeEntries.${index}.value`}
                    render={({ field: f }) => (
                      <TextInput
                        {...f}
                        aria-label={t('Filter value')}
                        placeholder={
                          filterTypeField.value === 'in' || filterTypeField.value === 'notIn'
                            ? t('Comma-separated values')
                            : t('Value')
                        }
                      />
                    )}
                  />
                )
              }
            />
          </GridItem>
          <GridItem span={1}>
            <Button variant="plain" aria-label={t('Remove filter')} onClick={() => remove(index)}>
              <MinusCircleIcon />
            </Button>
          </GridItem>
        </Grid>
      ))}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAdd}>
        {t('Add scope filter')}
      </Button>
    </FormGroup>
  );
};
