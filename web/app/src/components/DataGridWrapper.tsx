import * as React from 'react';
import { DataGrid, DataGridProps, GridRowSelectionModel } from '@mui/x-data-grid';

type DataGridWrapperProps = Omit<DataGridProps, 'rows' | 'columns'> & {
  rows: any[];
  columns: any[];
  selected: string[];
  onSelectionChange: (selected: GridRowSelectionModel) => void;
};

export default function DataGridWrapper({
  rows,
  columns,
  selected = [],
  onSelectionChange,
  ...props
}: DataGridWrapperProps) {
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      checkboxSelection
      disableRowSelectionOnClick
      onRowSelectionModelChange={onSelectionChange}
      rowSelectionModel={selected}
      {...props}
    />
  );
}
