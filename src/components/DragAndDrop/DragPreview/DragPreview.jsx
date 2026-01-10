import React from 'react';
import { getAbilityDescriptionForLevel } from '../../../utils';

const DragPreview = ({ item, currentBossLevel }) => {
  if (!item) return null;

  const description = getAbilityDescriptionForLevel(item, currentBossLevel);
  const truncatedDescription = description.length > 50 ? `${description.substring(0, 50)}...` : description;

  return (
    <div
      className="pointer-events-none flex items-center gap-2 scale-90 opacity-90 shadow-xl z-[9999] bg-card border-l-4 border-primary rounded-md p-4 max-w-[300px]"
    >
      <div className="flex items-center justify-center w-6 h-6 shrink-0">
        {typeof item.icon === 'string' && item.icon.startsWith('/') ? (
          <img src={item.icon} alt={item.name} className="max-h-[24px] max-w-[24px]" />
        ) : (
          item.icon
        )}
      </div>
      <div className="flex flex-col">
        <div className="font-bold text-[14px] mb-[2px] text-foreground">{item.name}</div>
        <div className="text-[12px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] text-muted-foreground">{truncatedDescription}</div>
      </div>
    </div>
  );
};

export default DragPreview;
