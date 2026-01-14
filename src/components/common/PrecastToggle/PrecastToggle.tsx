import React from 'react';
import { useFilterContext } from '../../../contexts';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const PrecastToggle = () => {
  const { showPrecastOptions, togglePrecastOptions } = useFilterContext();
  const checked = !!showPrecastOptions;
  
  const tooltipText = showPrecastOptions ? 'Including precast values' : 'Hiding precast values';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center rounded-md shadow-sm px-3 py-2 bg-card border border-border">
          <span className="mr-2 whitespace-nowrap text-sm font-medium text-foreground">Show Precast Options:</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={togglePrecastOptions} />
            <div className="w-11 h-6 bg-muted-foreground/30 dark:bg-muted-foreground/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
};

export default PrecastToggle;
