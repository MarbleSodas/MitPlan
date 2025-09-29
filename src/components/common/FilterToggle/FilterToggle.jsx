import React from 'react';
import { useFilterContext } from '../../../contexts';
import { useTheme } from '../../../contexts/ThemeContext';
import Tooltip from '../Tooltip/Tooltip';

const FilterToggle = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { showAllMitigations, toggleFilterMode } = useFilterContext();
  const checked = !showAllMitigations;

  const knobTranslate = checked ? 24 : 0; // px

  const tooltipText = showAllMitigations ? 'Showing all mitigations' : 'Showing only relevant mitigations for each boss action';

  return (
    <Tooltip content={tooltipText}>
      <div className="flex items-center rounded-md shadow-sm" style={{ padding: '8px 12px', backgroundColor: colors.secondary }}>
        <span className="mr-2" style={{ fontSize: theme.fontSizes?.medium, color: colors.text }}>Filter Mitigations:</span>
        <label className="relative inline-block" style={{ width: 48, height: 24 }}>
          <input type="checkbox" className="sr-only" checked={checked} onChange={toggleFilterMode} />
          <span className="absolute inset-0 rounded-full transition-colors" style={{ backgroundColor: checked ? colors.primary : colors.border }} />
          <span className="absolute rounded-full transition-transform" style={{ height: 18, width: 18, left: 3, bottom: 3, backgroundColor: '#fff', transform: `translateX(${knobTranslate}px)` }} />
        </label>
      </div>
    </Tooltip>
  );
};

export default FilterToggle;
