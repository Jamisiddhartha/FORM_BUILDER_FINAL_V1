import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { FileUpload } from 'primereact/fileupload';
import { Checkbox } from 'primereact/checkbox';
import { Calendar } from 'primereact/calendar';
import apiClient from '@/lib/api-client';
import { MasterColumnDefinition } from '@/hooks/master/useColumnDefinitions';

type FieldOption = {
  label: string;
  value: unknown;
};

type StaticOptionItem = {
  label?: string;
  value?: unknown;
  name?: string;
  code?: string;
};

type ReferencedDefinition = {
  id: number;
  code: string;
};

type ReferencedMasterRow = {
  id: string;
  data?: Record<string, unknown>;
};

interface DynamicFormFieldProps {
  column: MasterColumnDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  tenantId?: number | null;
  formData?: Record<string, unknown>;
}

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const getStaticOptions = (
  column: MasterColumnDefinition,
  filterBy?: string | undefined,
  filterValue?: unknown,
): FieldOption[] => {
  const optionConfig =
    column.options && typeof column.options === 'object' ? column.options : undefined;

  if (optionConfig?.source === 'STATIC') {
    let items = Array.isArray(optionConfig.items) ? optionConfig.items : [];

    // Apply cascading filter if filter_by is specified and filterValue exists
    if (filterBy && (filterValue || filterValue === 0 || filterValue === '0')) {
      items = items.filter((item: StaticOptionItem) => {
        const itemFilterValue = item[filterBy];
        return String(itemFilterValue || '') === String(filterValue || '');
      });
    } else if (filterBy && !filterValue && filterValue !== 0) {
      // If filter_by is specified but no filter value, return empty
      items = [];
    }

    return items.map((item: StaticOptionItem) => ({
      label: String(item.label ?? item.value ?? ''),
      value: item.value,
    }));
  }

  if (Array.isArray(column.options)) {
    return column.options.map((option: string | StaticOptionItem) => ({
      label: typeof option === 'string' ? option : option.label || option.name,
      value: typeof option === 'string' ? option : option.value || option.code,
    }));
  }

  return Object.entries(column.options || {}).map(([key, val]) => ({
    label: String(val),
    value: key,
  }));
};

export const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  column,
  value,
  onChange,
  error,
  tenantId,
  formData,
}) => {
  const optionConfig =
    column.options && typeof column.options === 'object' ? column.options : undefined;
  const isMasterOptionSource = optionConfig?.source === 'MASTER';
  const masterCode = isMasterOptionSource ? String(optionConfig.master_code || '') : '';
  const filterBy = String(optionConfig?.filter_by || ''); // Extract for both STATIC and MASTER
  const filterValue = filterBy ? formData?.[filterBy] : undefined;
  const staticOptions = useMemo(
    () => getStaticOptions(column, filterBy, filterValue),
    [column, filterBy, filterValue],
  );

  const [dynamicOptions, setDynamicOptions] = useState<FieldOption[]>(staticOptions);
  const [hasLoadedDynamicOptions, setHasLoadedDynamicOptions] = useState(
    !isMasterOptionSource,
  );
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (!isMasterOptionSource) {
      setDynamicOptions(staticOptions);
      setHasLoadedDynamicOptions(true);
    } else {
      setDynamicOptions([]);
      setHasLoadedDynamicOptions(false);
    }
  }, [isMasterOptionSource, masterCode, staticOptions]);

  const fetchDynamicOptions = useCallback(async () => {
    if (!isMasterOptionSource || !masterCode) {
      return;
    }

    setIsLoadingOptions(true);

    try {
      const definitionParams = new URLSearchParams();
      if (tenantId !== undefined && tenantId !== null) {
        definitionParams.append('tenantId', String(tenantId));
      }

      const definitionsResponse = await apiClient.get(
        `/master/master-data-management/v2/definitions?${definitionParams.toString()}`,
      );
      const definitions = Array.isArray(definitionsResponse.data)
        ? (definitionsResponse.data as ReferencedDefinition[])
        : [];
      const referencedMaster = definitions.find((definition) => definition.code === masterCode);

      if (!referencedMaster?.id) {
        setDynamicOptions([]);
        return;
      }

      const dataParams = new URLSearchParams();
      if (tenantId !== undefined && tenantId !== null) {
        dataParams.append('tenantId', String(tenantId));
      }
      dataParams.append('isActive', 'true');

      const dataResponse = await apiClient.get(
        `/master/master-data-management/v2/masters/${referencedMaster.id}/data?${dataParams.toString()}`,
      );
      const rows = Array.isArray(dataResponse.data)
        ? (dataResponse.data as ReferencedMasterRow[])
        : [];

      const filteredRows =
        filterBy && isEmpty(filterValue)
          ? []
          : rows.filter((entry) => {
              if (!filterBy) {
                return true;
              }

              return String(entry.data?.[filterBy] ?? '') === String(filterValue ?? '');
            });

      const labelKey = String(optionConfig?.label_col || 'name');
      const valueKey = String(optionConfig?.value_col || 'id');

      setDynamicOptions(
        filteredRows.map((entry) => ({
          label: String(entry.data?.[labelKey] ?? entry.id),
          value: valueKey === 'id' ? entry.id : entry.data?.[valueKey],
        })),
      );
    } catch {
      setDynamicOptions([]);
    } finally {
      setIsLoadingOptions(false);
      setHasLoadedDynamicOptions(true);
    }
  }, [filterBy, filterValue, isMasterOptionSource, masterCode, optionConfig, tenantId]);

  useEffect(() => {
    if (isMasterOptionSource && hasLoadedDynamicOptions) {
      void fetchDynamicOptions();
    }
  }, [fetchDynamicOptions, hasLoadedDynamicOptions, isMasterOptionSource]);

  const handleOptionFocus = () => {
    if (isMasterOptionSource && !hasLoadedDynamicOptions) {
      void fetchDynamicOptions();
    }
  };

  const commonProps = {
    className: 'w-100',
    placeholder: column.placeholder || '',
    disabled: Boolean(isMasterOptionSource && filterBy && isEmpty(filterValue)),
  };

  const renderField = () => {
    switch (column.dataType) {
      case 'TEXT':
        return column.columnKey.toLowerCase().includes('description') ? (
          <InputTextarea
            {...commonProps}
            rows={3}
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <InputText
            {...commonProps}
            type="text"
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
          />
        );

      case 'NUMBER':
        return (
          <InputNumber
            {...commonProps}
            value={value || null}
            onValueChange={(event) => onChange(event.value)}
            useGrouping={false}
          />
        );

      case 'BOOLEAN':
        return (
          <div className="form-check">
            <Checkbox
              inputId={`field-${column.id}`}
              checked={value === true || value === 'true'}
              onChange={(event) => onChange(event.checked)}
            />
            <label htmlFor={`field-${column.id}`} className="form-check-label">
              {column.columnLabel}
            </label>
          </div>
        );

      case 'DATE':
        return (
          <Calendar
            {...commonProps}
            value={value ? new Date(value) : null}
            onChange={(event) =>
              onChange(event.value ? event.value.toISOString().split('T')[0] : null)
            }
            dateFormat="yy-mm-dd"
            showIcon
          />
        );

      case 'SELECT':
        return (
          <Dropdown
            {...commonProps}
            value={value || null}
            onChange={(event) => onChange(event.value)}
            onFocus={handleOptionFocus}
            onShow={handleOptionFocus}
            options={isMasterOptionSource ? dynamicOptions : staticOptions}
            optionLabel="label"
            optionValue="value"
            showClear={!column.isRequired}
            filter
            loading={isLoadingOptions}
          />
        );

      case 'MULTI_SELECT':
        return (
          <MultiSelect
            {...commonProps}
            value={value || []}
            onChange={(event) => onChange(event.value)}
            onFocus={handleOptionFocus}
            onShow={handleOptionFocus}
            options={isMasterOptionSource ? dynamicOptions : staticOptions}
            optionLabel="label"
            optionValue="value"
            showClear={!column.isRequired}
            filter
            loading={isLoadingOptions}
          />
        );

      case 'FILE':
        return (
          <FileUpload
            name="file"
            auto
            customUpload
            onSelect={(event) => onChange(event.files[0])}
            accept="*"
            maxFileSize={5000000}
          />
        );

      default:
        return (
          <InputText
            {...commonProps}
            type="text"
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
          />
        );
    }
  };

  return (
    <div className="mb-3">
      <label className={`form-label ${column.isRequired ? 'fw-bold' : ''}`}>
        {column.columnLabel}
        {column.isRequired && <span className="text-danger ms-1">*</span>}
      </label>
      {renderField()}
      {error && <small className="form-text text-danger d-block mt-1">{error}</small>}
      {column.validation?.hint && (
        <small className="form-text text-muted d-block mt-1">{column.validation.hint}</small>
      )}
      {optionConfig?.source === 'MASTER' && filterBy && isEmpty(filterValue) && (
        <small className="form-text text-muted d-block mt-1">
          Select {filterBy.replace(/_/g, ' ')} first to load options.
        </small>
      )}
    </div>
  );
};
