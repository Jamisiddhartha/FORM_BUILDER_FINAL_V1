'use client';

import React, { useState, useMemo } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import { MasterColumnDefinition } from '@/hooks/master/useColumnDefinitions';
import { DynamicFormField } from './DynamicFormField';

// ============================================================================
// DUMMY DATA - Hierarchical structure for Country → State → District → Block
// ============================================================================

// Country data
const DUMMY_COUNTRIES = [
  { id: '1', name: 'India', code: 'IN' },
  { id: '2', name: 'USA', code: 'US' },
  { id: '3', name: 'Canada', code: 'CA' },
];

// State data (filtered by country_id)
const DUMMY_STATES = [
  // India states
  { id: '101', name: 'Rajasthan', code: 'RJ', country_id: '1' },
  { id: '102', name: 'Madhya Pradesh', code: 'MP', country_id: '1' },
  { id: '103', name: 'Gujarat', code: 'GJ', country_id: '1' },
  // USA states
  { id: '201', name: 'California', code: 'CA', country_id: '2' },
  { id: '202', name: 'Texas', code: 'TX', country_id: '2' },
  { id: '203', name: 'New York', code: 'NY', country_id: '2' },
  // Canada provinces
  { id: '301', name: 'Ontario', code: 'ON', country_id: '3' },
  { id: '302', name: 'Quebec', code: 'QC', country_id: '3' },
  { id: '303', name: 'British Columbia', code: 'BC', country_id: '3' },
];

// District data (filtered by state_id)
const DUMMY_DISTRICTS = [
  // Rajasthan districts
  { id: '1001', name: 'Jaipur', code: 'JPR', state_id: '101' },
  { id: '1002', name: 'Jodhpur', code: 'JDH', state_id: '101' },
  { id: '1003', name: 'Udaipur', code: 'UDH', state_id: '101' },
  // Madhya Pradesh districts
  { id: '1004', name: 'Bhopal', code: 'BPL', state_id: '102' },
  { id: '1005', name: 'Indore', code: 'IDR', state_id: '102' },
  { id: '1006', name: 'Gwalior', code: 'GWL', state_id: '102' },
  // Gujarat districts
  { id: '1007', name: 'Ahmedabad', code: 'AMD', state_id: '103' },
  { id: '1008', name: 'Surat', code: 'SRT', state_id: '103' },
  { id: '1009', name: 'Vadodara', code: 'VDR', state_id: '103' },
  // California counties
  { id: '2001', name: 'Los Angeles', code: 'LA', state_id: '201' },
  { id: '2002', name: 'San Francisco', code: 'SF', state_id: '201' },
  { id: '2003', name: 'San Diego', code: 'SD', state_id: '201' },
  // Texas counties
  { id: '2004', name: 'Harris', code: 'Harris', state_id: '202' },
  { id: '2005', name: 'Dallas', code: 'Dallas', state_id: '202' },
  { id: '2006', name: 'Tarrant', code: 'Tarrant', state_id: '202' },
];

// Block/Taluk data (filtered by district_id)
const DUMMY_BLOCKS = [
  // Jaipur blocks
  { id: '10001', name: 'City Block', code: 'CB', district_id: '1001' },
  { id: '10002', name: 'Rural Block 1', code: 'RB1', district_id: '1001' },
  { id: '10003', name: 'Rural Block 2', code: 'RB2', district_id: '1001' },
  // Jodhpur blocks
  { id: '10004', name: 'Jodhpur North', code: 'JN', district_id: '1002' },
  { id: '10005', name: 'Jodhpur South', code: 'JS', district_id: '1002' },
  // Udaipur blocks
  { id: '10006', name: 'Udaipur East', code: 'UE', district_id: '1003' },
  // Bhopal blocks
  { id: '10007', name: 'Bhopal Central', code: 'BC', district_id: '1004' },
  { id: '10008', name: 'Bhopal South', code: 'BS', district_id: '1004' },
  // Los Angeles blocks
  { id: '20001', name: 'Downtown LA', code: 'DLA', district_id: '2001' },
  { id: '20002', name: 'Santa Monica', code: 'SM', district_id: '2001' },
];

// ============================================================================
// COLUMN DEFINITIONS with cascading relationships
// ============================================================================

const DEMO_COLUMN_DEFINITIONS: MasterColumnDefinition[] = [
  {
    id: 1,
    masterId: 999, // dummy
    columnKey: 'country_id',
    columnLabel: 'Country',
    displayName: 'Country',
    dataType: 'SELECT',
    isRequired: true,
    isUnique: false,
    isSearchable: true,
    isListable: true,
    isFilterable: true,
    displayOrder: 1,
    placeholder: 'Select a country...',
    options: {
      source: 'STATIC',
      items: DUMMY_COUNTRIES.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as MasterColumnDefinition,
  {
    id: 2,
    masterId: 999,
    columnKey: 'state_id',
    columnLabel: 'State',
    displayName: 'State',
    dataType: 'SELECT',
    isRequired: true,
    isUnique: false,
    isSearchable: true,
    isListable: true,
    isFilterable: true,
    displayOrder: 2,
    placeholder: 'Select a state...',
    options: {
      source: 'STATIC',
      filter_by: 'country_id', // Cascades from country_id
      items: DUMMY_STATES.map((item) => ({
        value: item.id,
        label: item.name,
        country_id: item.country_id,
      })),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as MasterColumnDefinition,
  {
    id: 3,
    masterId: 999,
    columnKey: 'district_id',
    columnLabel: 'District',
    displayName: 'District',
    dataType: 'SELECT',
    isRequired: false,
    isUnique: false,
    isSearchable: true,
    isListable: true,
    isFilterable: true,
    displayOrder: 3,
    placeholder: 'Select a district...',
    options: {
      source: 'STATIC',
      filter_by: 'state_id', // Cascades from state_id
      items: DUMMY_DISTRICTS.map((item) => ({
        value: item.id,
        label: item.name,
        state_id: item.state_id,
      })),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as MasterColumnDefinition,
  {
    id: 4,
    masterId: 999,
    columnKey: 'block_id',
    columnLabel: 'Block',
    displayName: 'Block',
    dataType: 'SELECT',
    isRequired: false,
    isUnique: false,
    isSearchable: true,
    isListable: true,
    isFilterable: true,
    displayOrder: 4,
    placeholder: 'Select a block...',
    options: {
      source: 'STATIC',
      filter_by: 'district_id', // Cascades from district_id
      items: DUMMY_BLOCKS.map((item) => ({
        value: item.id,
        label: item.name,
        district_id: item.district_id,
      })),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as MasterColumnDefinition,
];

// ============================================================================
// Helper functions
// ============================================================================

interface StaticItem {
  value: unknown;
  label: string;
  [key: string]: unknown;
}

/**
 * Filter static options based on cascading filter_by field
 */
const filterStaticOptions = (
  items: StaticItem[],
  filterBy: string | undefined,
  filterValue: unknown,
): StaticItem[] => {
  if (!filterBy) {
    return items;
  }

  if (!filterValue && filterValue !== 0) {
    return [];
  }

  return items.filter((item) => String(item[filterBy] || '') === String(filterValue || ''));
};

/**
 * Get the display label for a selected value
 */
const getSelectedLabel = (
  columnKey: string,
  value: unknown,
  column: MasterColumnDefinition,
): string => {
  if (!value) return '—';

  const optionConfig = column.options && typeof column.options === 'object' ? column.options : undefined;
  const items = Array.isArray(optionConfig?.items) ? optionConfig.items : [];

  const selected = items.find((item) => String(item.value) === String(value));
  return selected?.label ? String(selected.label) : String(value);
};

// ============================================================================
// Main Demo Component
// ============================================================================

export const HierarchicalCascadingDemo: React.FC = () => {
  const [formData, setFormData] = useState<Record<string, unknown>>({
    country_id: '',
    state_id: '',
    district_id: '',
    block_id: '',
  });

  const columns = DEMO_COLUMN_DEFINITIONS.sort((a, b) => a.displayOrder - b.displayOrder);

  const handleFieldChange = (columnKey: string, value: unknown) => {
    // Update the field
    const updatedData = { ...formData, [columnKey]: value };

    // Clear dependent fields when parent changes
    if (columnKey === 'country_id') {
      updatedData.state_id = '';
      updatedData.district_id = '';
      updatedData.block_id = '';
    } else if (columnKey === 'state_id') {
      updatedData.district_id = '';
      updatedData.block_id = '';
    } else if (columnKey === 'district_id') {
      updatedData.block_id = '';
    }

    setFormData(updatedData);
  };

  const handleReset = () => {
    setFormData({
      country_id: '',
      state_id: '',
      district_id: '',
      block_id: '',
    });
  };

  // Create enhanced columns that include cascading options filtering
  const enhancedColumns = useMemo(
    () =>
      columns.map((column) => {
        const optionConfig = column.options && typeof column.options === 'object' ? column.options : undefined;
        const filterBy = optionConfig?.filter_by;
        const filterValue = filterBy ? formData[filterBy] : undefined;

        if (optionConfig?.source === 'STATIC' && filterBy) {
          // Filter STATIC items based on parent value
          const items = Array.isArray(optionConfig.items) ? optionConfig.items : [];
          const filteredItems = filterStaticOptions(items, filterBy, filterValue);

          return {
            ...column,
            options: {
              ...optionConfig,
              items: filteredItems,
            },
          } as MasterColumnDefinition;
        }

        return column;
      }),
    [columns, formData],
  );

  const countryLabel = getSelectedLabel('country_id', formData.country_id, columns[0]!);
  const stateLabel = getSelectedLabel('state_id', formData.state_id, columns[1]!);
  const districtLabel = getSelectedLabel('district_id', formData.district_id, columns[2]!);
  const blockLabel = getSelectedLabel('block_id', formData.block_id, columns[3]!);

  return (
    <div className="p-4">
      <Card title="Hierarchical Cascading Dropdown Demo" className="mb-4">
        <p className="text-muted mb-3">
          Test the cascading behavior: Select a Country → Available States filter to that country →
          Select a State → Available Districts filter to that state → Select a District → Available
          Blocks filter to that district.
        </p>

        <form className="space-y-4">
          {enhancedColumns.map((column) => (
            <div key={column.columnKey} className="form-group">
              <label className="block mb-2 font-semibold">
                {column.columnLabel}
                {column.isRequired && <span className="text-danger ms-2">*</span>}
              </label>

              <DynamicFormField
                column={column}
                value={formData[column.columnKey]}
                onChange={(value) => handleFieldChange(column.columnKey, value)}
                formData={formData}
              />

              <small className="text-muted d-block mt-1">
                {column.columnKey === 'state_id' && formData.country_id
                  ? `Showing states for selected country`
                  : column.columnKey === 'district_id' && formData.state_id
                    ? `Showing districts for selected state`
                    : column.columnKey === 'block_id' && formData.district_id
                      ? `Showing blocks for selected district`
                      : null}
              </small>
            </div>
          ))}

          <div className="flex gap-2 pt-3">
            <Button label="Reset Form" icon="pi pi-refresh" onClick={handleReset} severity="secondary" />
          </div>
        </form>
      </Card>

      <Card title="Selected Values Summary" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border-l-4 border-blue-500 pl-3">
            <p className="text-muted small mb-1">Country</p>
            <p className="font-semibold text-lg">
              {countryLabel}
              {formData.country_id ? <Tag value={String(formData.country_id)} severity="info" className="ms-2" /> : null}
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-3">
            <p className="text-muted small mb-1">State</p>
            <p className="font-semibold text-lg">
              {stateLabel}
              {formData.state_id ? <Tag value={String(formData.state_id)} severity="success" className="ms-2" /> : null}
            </p>
          </div>

          <div className="border-l-4 border-orange-500 pl-3">
            <p className="text-muted small mb-1">District</p>
            <p className="font-semibold text-lg">
              {districtLabel}
              {formData.district_id ? <Tag value={String(formData.district_id)} severity="warning" className="ms-2" /> : null}
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-3">
            <p className="text-muted small mb-1">Block</p>
            <p className="font-semibold text-lg">
              {blockLabel}
              {formData.block_id ? <Tag value={String(formData.block_id)} severity="danger" className="ms-2" /> : null}
            </p>
          </div>
        </div>

        <Divider />

        <div className="bg-light p-3 rounded">
          <p className="text-muted small mb-2">Full JSON Output:</p>
          <pre className="bg-dark text-light p-3 rounded" style={{ fontSize: '0.85rem', overflow: 'auto' }}>
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      </Card>

      <Card title="Demo Information">
        <div className="space-y-2 text-sm">
          <p>
            <strong>Countries:</strong> {DUMMY_COUNTRIES.length} (India, USA, Canada)
          </p>
          <p>
            <strong>States/Provinces:</strong> {DUMMY_STATES.length} total (filtered by country)
          </p>
          <p>
            <strong>Districts:</strong> {DUMMY_DISTRICTS.length} total (filtered by state)
          </p>
          <p>
            <strong>Blocks/Counties:</strong> {DUMMY_BLOCKS.length} total (filtered by district)
          </p>
          <p className="text-muted mt-3">
            💡 <strong>Tip:</strong> Open browser DevTools to inspect the form data structure and see how
            cascading filter_by relationships work with STATIC data sources.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default HierarchicalCascadingDemo;
