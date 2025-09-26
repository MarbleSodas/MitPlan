import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { getAbilityDescriptionForLevel } from '../../../utils';

const DragPreview = ({ item, currentBossLevel }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  if (!item) return null;

  const description = getAbilityDescriptionForLevel(item, currentBossLevel);
  const truncatedDescription = description.length > 50 ? `${description.substring(0, 50)}...` : description;

  return (
    <div
      className="pointer-events-none flex items-center gap-2 scale-90 opacity-90 shadow-xl z-[9999]"
      style={{ backgroundColor: colors.cardBackground, borderLeft: `4px solid ${colors.primary}`, borderRadius: theme.borderRadius?.medium, padding: theme.spacing?.medium, maxWidth: 300 }}
    >
      <div className="flex items-center justify-center w-6 h-6 shrink-0">
        {typeof item.icon === 'string' && item.icon.startsWith('/') ? (
          <img src={item.icon} alt={item.name} style={{ maxHeight: '24px', maxWidth: '24px' }} />
        ) : (
          item.icon
        )}
      </div>
      <div className="flex flex-col">
        <div className="font-bold text-[14px] mb-[2px]" style={{ color: colors.text }}>{item.name}</div>
        <div className="text-[12px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" style={{ color: colors.lightText }}>{truncatedDescription}</div>
      </div>
    </div>
  );
};

export default DragPreview;