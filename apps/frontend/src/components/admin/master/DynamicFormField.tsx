import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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

interface DynamicFormFieldProps {
  column: MasterColumnDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  tenantId?: number | null;
  formData?: Record<string, unknown>;
}

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
  const masterCode = isMasterOptionSource ? optionConfig.master_code : undefined;
  const filterBy = isMasterOptionSource ? optionConfig.filter_by : undefined;
  const filterValue = filterBy ? formData?.[filterBy] : undefined;

  const definitionLookup = useQuery({
    queryKey: ['mdm', 'v2', 'field-definition-options', tenantId ?? 'all', masterCode ?? 'none'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tenantId !== undefined && tenantId !== null) {
        params.append('tenantId', String(tenantId));
      }

      const response = await apiClient.get(
        `/master/master-data-management/v2/definitions?${params.toString()}`,
      );

      return response.data as Array<{ id: number; code: string }>;
    },
    enabled: isMasterOptionSource && !!masterCode,
    staleTime: 1000 * 60 * 5,
  });

  const referencedMasterId = useMemo(
    () =>
      definitionLookup.data?.find((definition) => definition.code === masterCode)?.id,
    [definitionLookup.data, masterCode],
  );

  const masterOptionsQuery = useQuery({
    queryKey: ['mdm', 'v2', 'field-master-options', referencedMasterId ?? 'none', tenantId ?? 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tenantId !== undefined && tenantId !== null) {
        params.append('tenantId', String(tenantId));
      }
      params.append('isActive', 'true');

      const response = await apiClient.get(
        `/master/master-data-management/v2/masters/${referencedMasterId}/data?${params.toString()}`,
      );

      return response.data as Array<{ id: string; data: Record<string, unknown> }>;
    },
    enabled: isMasterOptionSource && !!referencedMasterId,
    staleTime: 1000 * 60 * 5,
  });

  const getEntryValue = (
    entry: { id: string; data: Record<string, unknown> },
    key: string,
  ) => {
    if (key === 'id') {
      return entry.id;
    }

    return entry.data?.[key];
  };

  const resolvedOptions = useMemo(() => {
    if (optionConfig?.source === 'STATIC') {
      const items = Array.isArray(optionConfig.items) ? optionConfig.items : [];
      return items.map((item: any) => ({
        label: String(item.label ?? item.value ?? ''),
        value: item.value,
      }));
    }

    if (optionConfig?.source === 'MASTER') {
      const labelKey = String(optionConfig.label_col || 'name');
      const valueKey = String(optionConfig.value_col || 'id');
      const sourceRows = Array.isArray(masterOptionsQuery.data) ? masterOptionsQuery.data : [];

      const filteredRows =
        filterBy && isEmpty(filterValue)
          ? []
          : sourceRows.filter((entry) => {
              if (!filterBy) {
                return true;
              }

              return (
                String(getEntryValue(entry, String(filterBy)) ?? '') ===
                String(filterValue)
              );
            });

      return filteredRows.map((entry) => ({
        label: String(getEntryValue(entry, labelKey) ?? entry.id),
        value: getEntryValue(entry, valueKey),
      }));
    }

    if (Array.isArray(column.options)) {
      return column.options.map((option: any) => ({
        label: typeof option === 'string' ? option : option.label || option.name,
        value: typeof option === 'string' ? option : option.value || option.code,
      }));
    }

    return Object.entries(column.options || {}).map(([key, val]) => ({
      label: String(val),
      value: key,
    }));
  }, [column.options, filterBy, filterValue, masterOptionsQuery.data, optionConfig]);

  const renderField = () => {
    const commonProps = {
      className: 'w-100',
      placeholder: column.placeholder || '',
      disabled: false,
    };

    switch (column.dataType) {
      case 'TEXT':
        return (
          <InputText
            {...commonProps}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'NUMBER':
        return (
          <InputNumber
            {...commonProps}
            value={value || null}
            onValueChange={(e) => onChange(e.value)}
            useGrouping={false}
          />
        );

      case 'BOOLEAN':
        return (
          <div className="form-check">
            <Checkbox
              inputId={`field-${column.id}`}
              checked={value === true || value === 'true'}
              onChange={(e) => onChange(e.checked)}
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
            onChange={(e) => onChange(e.value ? e.value.toISOString().split('T')[0] : null)}
            dateFormat="yy-mm-dd"
            showIcon
          />
        );

      case 'SELECT':
        return (
          <Dropdown
            {...commonProps}
            value={value || null}
            onChange={(e) => onChange(e.value)}
            options={resolvedOptions}
            optionLabel="label"
            optionValue="value"
            showClear={!column.isRequired}
            filter
          />
        );

      case 'MULTI_SELECT':
        return (
          <MultiSelect
            {...commonProps}
            value={value || []}
            onChange={(e) => onChange(e.value)}
            options={resolvedOptions}
            optionLabel="label"
            optionValue="value"
            showClear={!column.isRequired}
            filter
          />
        );

      case 'FILE':
        return (
          <FileUpload
            name="file"
            auto
            customUpload
            onSelect={(e) => onChange(e.files[0])}
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
            onChange={(e) => onChange(e.target.value)}
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
          Select {String(filterBy).replace(/_/g, ' ')} first to load options.
        </small>
      )}
    </div>
  );
};

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);
