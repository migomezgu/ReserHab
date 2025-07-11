import { useState, useCallback } from 'react';
import { GridRowId, GridRowSelectionModel } from '@mui/x-data-grid';

type UseGridSelectionReturn = {
  selected: GridRowId[];
  handleSelectionChange: (selection: GridRowSelectionModel) => void;
  clearSelection: () => void;
  setSelected: React.Dispatch<React.SetStateAction<GridRowId[]>>;
};

export function useGridSelection(initialSelection: GridRowId[] = []): UseGridSelectionReturn {
  const [selected, setSelected] = useState<GridRowId[]>(initialSelection);

  const handleSelectionChange = useCallback((newSelection: GridRowSelectionModel) => {
    setSelected(newSelection);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  return {
    selected,
    handleSelectionChange,
    clearSelection,
    setSelected
  };
}
