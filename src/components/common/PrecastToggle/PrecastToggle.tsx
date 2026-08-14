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
        <div className="flex items-center rounded-md shadow-sm px-2 sm:px-3 py-2 bg-card border border-border">
          <span className="mr-2 whitespace-nowrap text-sm font-medium text-foreground hidden sm:inline">Show Precast Options:</span>
          <span className="mr-2 whitespace-nowrap text-sm font-medium text-foreground sm:hidden">Precast:</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={togglePrecastOptions} />
            <div className="peer h-6 w-11 rounded-full bg-muted-foreground/30 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 dark:bg-muted-foreground/40"></div>
          </label>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
};

export default PrecastToggle;
