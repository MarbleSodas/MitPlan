import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import { formatMitigation, generateMitigationBreakdown, calculateTotalMitigation } from '../../../utils';

const TankMitigationDisplay = ({
  mainTankMitigations,
  offTankMitigations,
  damageType,
  bossLevel,
  mainTankJob,
  offTankJob,
  showOffTank = true,
  label = null,
}) => {

  const Pill = ({ value }) => (
    <div
      className="inline-flex items-center justify-center font-bold px-2.5 py-1 rounded border select-none min-h-8 text-sm bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/30 text-neutral-900 dark:text-neutral-100"
    >
      <span className="mr-1">🛡️</span>
      {formatMitigation(value)}
    </div>
  );

  const displayLabel = label || 'Tank';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="font-bold text-sm min-w-[100px] truncate">{`${displayLabel}${mainTankJob ? ` (${mainTankJob})` : ''}:`}</div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Pill value={mainTankMitigations.length > 0 ? calculateTotalMitigation(mainTankMitigations, damageType, bossLevel) : 0} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="whitespace-pre-line">{generateMitigationBreakdown(mainTankMitigations, damageType, bossLevel)}</TooltipContent>
        </Tooltip>
      </div>

      {showOffTank && (
        <div className="flex items-center gap-2">
          <div className="font-bold text-sm min-w-[100px] truncate">{`Off Tank${offTankJob ? ` (${offTankJob})` : ''}:`}</div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Pill value={offTankMitigations.length > 0 ? calculateTotalMitigation(offTankMitigations, damageType, bossLevel) : 0} />
              </div>
            </TooltipTrigger>
            <TooltipContent className="whitespace-pre-line">{generateMitigationBreakdown(offTankMitigations, damageType, bossLevel)}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default TankMitigationDisplay;
