import { Timestamp } from '@openshift-console/dynamic-plugin-sdk';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  Spinner,
  Title,
  ToolbarItem,
} from '@patternfly/react-core';
import DataView from '@patternfly/react-data-view/dist/dynamic/DataView';
import {
  DataViewTable,
  type DataViewTr,
} from '@patternfly/react-data-view/dist/dynamic/DataViewTable';
import { DataViewToolbar } from '@patternfly/react-data-view/dist/dynamic/DataViewToolbar';
import { useDataViewSort } from '@patternfly/react-data-view/dist/dynamic/Hooks';
import { ActionsColumn } from '@patternfly/react-table';
import { FC, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { DeleteRuleModal } from '@/features/incident-rules/components/DeleteRuleModal';
import {
  HIDDEN_RULE_NAMES,
  type IncidentAggregationRule,
} from '@/features/incident-rules/types/model';
import {
  useDeleteIncidentRuleMutation,
  useIncidentRulesList,
} from '@/features/incident-rules/utils/api';
import {
  getLastModifiedTime,
  hasBatchSuppression,
  isDefaultRule,
  summarizeScope,
} from '@/features/incident-rules/utils/iar-utils';
import { useTableColumns } from '@/shared/components/table/hooks/useTableColumns';
import { rowFilter, useTableFilters } from '@/shared/components/table/hooks/useTableFilters';
import { useTablePagination } from '@/shared/components/table/hooks/useTablePagination';
import { directedSort, localeCompareSort } from '@/shared/components/table/sort-utils';
import {
  TableFilter,
  TableFilterOption,
  type TableFilterProps,
  TableFilters,
} from '@/shared/components/table/TableFilters';
import { ITEMS_PER_PAGE, TablePagination } from '@/shared/components/table/TablePagination';
import { TableToolbar } from '@/shared/components/table/TableToolbar';

interface RuleRow {
  name: string;
  priority: number;
  within: string;
  scopeSummary: string;
  createdAt: string | undefined;
  rule: IncidentAggregationRule;
}

interface RuleRowFilters {
  name?: string;
  type?: string[];
}

const sortRuleData = (
  data: RuleRow[],
  sortBy: string | undefined,
  direction: 'asc' | 'desc' | undefined,
): RuleRow[] => {
  if (!sortBy || !direction) return data;
  if (sortBy === rowFilter('name'))
    return [...data].sort((a, b) => localeCompareSort(a.name, b.name, direction));
  if (sortBy === rowFilter('priority'))
    return [...data].sort((a, b) => directedSort(a.priority - b.priority, direction));
  if (sortBy === rowFilter('within'))
    return [...data].sort((a, b) => localeCompareSort(a.within, b.within, direction));
  if (sortBy === rowFilter('created'))
    return [...data].sort((a, b) => localeCompareSort(a.createdAt, b.createdAt, direction));
  return data;
};

export const IncidentRulesTable: FC = () => {
  const { t } = useTranslation(process.env.I18N_NAMESPACE);
  const navigate = useNavigate();

  const { data: rules, isLoading, error } = useIncidentRulesList();
  const deleteRuleMutation = useDeleteIncidentRuleMutation();

  const [searchParams, setSearchParams] = useSearchParams();
  const { sortBy, direction, onSort } = useDataViewSort({
    searchParams,
    setSearchParams,
    initialSort: { sortBy: rowFilter('priority'), direction: 'asc' },
  });

  const { filters, onSetFilters, clearAllFilters } = useTableFilters<RuleRowFilters>({
    initialFilters: { name: '', type: [] },
  });
  const pagination = useTablePagination({ perPage: ITEMS_PER_PAGE[0] });
  const { page, perPage, onSetPage } = pagination;

  const [activeAttributeMenu, setActiveAttributeMenu] = useState<string>(t('Name'));

  const [deleteTarget, setDeleteTarget] = useState<string | undefined>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const columnKeys = useMemo(
    () => [
      { label: t('Name'), key: rowFilter('name') },
      { label: t('Priority'), key: rowFilter('priority') },
      { label: t('Within'), key: rowFilter('within') },
      { label: t('Scope'), key: rowFilter('scope') },
      { label: t('Created'), key: rowFilter('created') },
    ],
    [t],
  );

  const columns = useTableColumns(columnKeys, sortBy, direction, onSort, [3]);

  const tableRows: RuleRow[] = useMemo(() => {
    if (isLoading || !rules) return [];
    return rules
      .filter((rule) => !(HIDDEN_RULE_NAMES as readonly string[]).includes(rule.metadata.name))
      .map((rule) => ({
        name: rule.metadata.name,
        priority: rule.spec.priority,
        within: rule.spec.within,
        scopeSummary: summarizeScope(rule.spec.scope),
        createdAt: getLastModifiedTime(rule.metadata),
        rule,
      }));
  }, [rules, isLoading]);

  const sortedAndFilteredData = useMemo(
    () =>
      sortRuleData(
        tableRows.filter((item) => {
          if (
            filters.name &&
            !item.name.toLocaleLowerCase().includes(filters.name.toLocaleLowerCase())
          ) {
            return false;
          }
          if (filters.type && filters.type.length > 0) {
            const ruleType = isDefaultRule(item.name) ? 'default' : 'custom';
            if (!filters.type.includes(ruleType)) return false;
          }
          return true;
        }),
        sortBy,
        direction,
      ),
    [filters, tableRows, sortBy, direction],
  );

  const handleEdit = useCallback(
    (rule: IncidentAggregationRule) => {
      navigate(`/monitoring/aggregation-rules/${rule.metadata.name}`);
    },
    [navigate],
  );

  const handleDeleteOpen = useCallback((rule: IncidentAggregationRule) => {
    setDeleteTarget(rule.metadata.name);
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteClose = useCallback(() => {
    setIsDeleteModalOpen(false);
    setDeleteTarget(undefined);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteRuleMutation.mutate(deleteTarget, {
      onSuccess: () => handleDeleteClose(),
    });
  }, [deleteTarget, deleteRuleMutation, handleDeleteClose]);

  const pageRows: DataViewTr[] = useMemo(() => {
    return sortedAndFilteredData
      .slice((page - 1) * perPage, (page - 1) * perPage + perPage)
      .map(({ name, priority, within, scopeSummary, createdAt, rule }) => [
        <>
          {name}
          {isDefaultRule(name) && (
            <Label className="pf-v6-u-ml-sm" isCompact color="blue">
              {t('Default')}
            </Label>
          )}
          {hasBatchSuppression(rule.metadata.annotations) && (
            <Label className="pf-v6-u-ml-sm" isCompact color="orange">
              {t('Batch suppressor')}
            </Label>
          )}
        </>,
        priority,
        within,
        scopeSummary,
        createdAt ? <Timestamp timestamp={createdAt} /> : '-',
        {
          cell: (
            <ActionsColumn
              items={[
                { title: t('Edit rule'), onClick: () => handleEdit(rule) },
                { title: t('Delete rule'), onClick: () => handleDeleteOpen(rule) },
              ]}
            />
          ),
          props: { isActionCell: true },
        },
      ]);
  }, [sortedAndFilteredData, page, perPage, handleEdit, handleDeleteOpen, t]);

  const onTextFilterChange = useMemo(
    () => (filterName: keyof RuleRowFilters) => {
      return (_e: unknown, val: string) => {
        onSetFilters({ [filterName]: val });
        onSetPage(undefined, 1);
      };
    },
    [onSetFilters, onSetPage],
  );

  const onCheckboxFilterChange = useMemo(
    () => (filterName: keyof RuleRowFilters) => {
      return (_e: unknown, val: string[]) => {
        onSetFilters({ [filterName]: val });
        onSetPage(undefined, 1);
      };
    },
    [onSetFilters, onSetPage],
  );

  const typeFilterOptions = useMemo(
    () => [
      { value: 'default', label: t('Default') },
      { value: 'custom', label: t('Custom') },
    ],
    [t],
  );

  const filterItems = useMemo<TableFilterProps<never>[]>(
    () => [
      {
        filterId: 'name',
        type: TableFilterOption.TEXT,
        title: t('Name'),
        placeholder: t('Filter by name'),
        onChange: onTextFilterChange('name'),
        value: filters.name ?? '',
      },
      {
        filterId: 'type',
        type: TableFilterOption.CHECKBOX,
        title: t('Type'),
        placeholder: t('Filter by type'),
        onChange: onCheckboxFilterChange('type'),
        value: filters.type ?? [],
        options: typeFilterOptions,
      },
    ],
    [t, filters, onTextFilterChange, onCheckboxFilterChange, typeFilterOptions],
  );

  if (error) {
    return (
      <EmptyState variant={EmptyStateVariant.sm}>
        <Title headingLevel="h4" size="lg">
          {t('Error loading incident rules')}
        </Title>
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (isLoading) {
    return (
      <Bullseye>
        <Spinner aria-label={t('Loading incident rules')} />
      </Bullseye>
    );
  }

  const hasFiltersApplied = !!filters.name || (filters.type && filters.type.length > 0);
  const hasData = sortedAndFilteredData.length > 0;

  return (
    <DataView className="pf-v6-u-m-lg">
      <TableToolbar
        ouiaId="IncidentRules-DataViewHeader"
        clearAllFilters={clearAllFilters}
        pagination={<TablePagination itemCount={sortedAndFilteredData.length} {...pagination} />}
        filters={
          <TableFilters
            activeAttributeMenu={activeAttributeMenu}
            setActiveAttributeMenu={setActiveAttributeMenu}
            filterItems={filterItems}
          >
            {filterItems.map((filterItem) => (
              <TableFilter
                key={`table-filter-${filterItem.filterId}`}
                {...filterItem}
                showToolbarItem={filterItem.title === activeAttributeMenu}
              />
            ))}
          </TableFilters>
        }
        actions={
          <ToolbarItem>
            <Button
              variant="primary"
              onClick={() => navigate('/monitoring/aggregation-rules/~new')}
            >
              {t('Create rule')}
            </Button>
          </ToolbarItem>
        }
      />
      {hasData ? (
        <>
          <DeleteRuleModal
            ruleName={deleteTarget}
            isOpen={isDeleteModalOpen}
            onClose={handleDeleteClose}
            onDelete={handleDeleteConfirm}
            isDeleting={deleteRuleMutation.isPending}
          />
          <DataViewTable
            aria-label={t('Incident Rules')}
            ouiaId="IncidentRules-DataViewTable"
            columns={columns}
            rows={pageRows}
          />
        </>
      ) : (
        <EmptyState variant={EmptyStateVariant.sm}>
          <Title headingLevel="h4" size="lg">
            {hasFiltersApplied ? t('No results found') : t('No incident rules found')}
          </Title>
          <EmptyStateBody>
            {hasFiltersApplied
              ? t('No results match the filter criteria. Clear filters to show results.')
              : t('No incident rules are currently defined.')}
          </EmptyStateBody>
        </EmptyState>
      )}
      <DataViewToolbar
        ouiaId="IncidentRules-DataViewFooter"
        pagination={<TablePagination itemCount={sortedAndFilteredData.length} {...pagination} />}
      />
    </DataView>
  );
};
