import React from 'react';
import { useFilterContext } from '../../../contexts';
import { useTheme } from '../../../contexts/ThemeContext';

const PrecastToggle = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { showPrecastOptions, togglePrecastOptions } = useFilterContext();
  const checked = !!showPrecastOptions;
  const knobTranslate = checked ? 24 : 0;

  return (
    <div className="flex items-center rounded-md shadow-sm" style={{ padding: '8px 12px', backgroundColor: colors.secondary }}>
      <span className="mr-2 whitespace-nowrap" style={{ fontSize: theme.fontSizes?.medium, color: colors.text }}>Show Precast Options:</span>
      <label className="relative inline-block" style={{ width: 48, height: 24 }}>
        <input type="checkbox" className="sr-only" checked={checked} onChange={togglePrecastOptions} />
        <span className="absolute inset-0 rounded-full transition-colors" style={{ backgroundColor: checked ? colors.primary : colors.border }} />
        <span className="absolute rounded-full transition-transform" style={{ height: 18, width: 18, left: 3, bottom: 3, backgroundColor: '#fff', transform: `translateX(${knobTranslate}px)` }} />
      </label>
      <div className="ml-2 text-sm" style={{ color: colors.lightText }}>
        {showPrecastOptions ? 'Including precast values' : 'Hiding precast values'}
      </div>
    </div>
  );
};

export default PrecastToggle;
