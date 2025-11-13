import React from 'react';
import { useFilterContext } from '../../../contexts';
import { useTheme } from '../../../contexts/ThemeContext';
import Tooltip from '../Tooltip/Tooltip';

const FilterToggle = () => {
  const { theme } = useTheme();
  const { showAllMitigations, toggleFilterMode } = useFilterContext();
  const checked = !showAllMitigations;

  const tooltipText = showAllMitigations ? 'Showing all mitigations' : 'Showing only relevant mitigations for each boss action';

  return (
    <Tooltip content={tooltipText}>
      <div className="flex items-center rounded-md shadow-sm px-3 py-2 bg-[var(--color-secondary)]">
        <span className="mr-2 text-[var(--color-text)]">
          Filter Mitigations:
        </span>
        <label className="relative inline-block w-12 h-6 cursor-pointer">
          <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={toggleFilterMode}
          />
          <span
            className={`
              absolute inset-0 rounded-full transition-colors duration-200
              ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}
            `.trim().replace(/\s+/g, ' ')}
          />
          <span
            className={`
              absolute h-[18px] w-[18px] left-[3px] bottom-[3px]
              bg-white rounded-full transition-transform duration-200
              ${checked ? 'translate-x-6' : 'translate-x-0'}
            `.trim().replace(/\s+/g, ' ')}
          />
        </label>
      </div>
    </Tooltip>
  );
};

export default FilterToggle;
