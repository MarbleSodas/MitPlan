import React from 'react';
import Tooltip from '../Tooltip/Tooltip';
import { useTheme } from '../../../contexts/ThemeContext';
import { formatMitigation, generateMitigationBreakdown, calculateTotalMitigation } from '../../../utils';

const TankMitigationDisplay = ({
  mainTankMitigations,
  offTankMitigations,
  damageType,
  bossLevel,
  mainTankJob,
  offTankJob,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const bg = theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : 'rgba(51, 153, 255, 0.1)';
  const border = theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(51, 153, 255, 0.2)';

  const Pill = ({ value }) => (
    <div
      className="inline-flex items-center justify-center font-bold px-2.5 py-1.5 rounded border select-none min-h-9 flex-1 text-base bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/30 text-neutral-900 dark:text-neutral-100"
    >
      <span className="mr-1">🛡️</span>
      {formatMitigation(value)}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 mt-2 mb-3">
      <div className="flex items-center gap-2">
        <div className="font-bold text-base min-w-[120px] truncate">{`Main Tank${mainTankJob ? ` (${mainTankJob})` : ''}:`}</div>
        <Tooltip content={generateMitigationBreakdown(mainTankMitigations, damageType, bossLevel)}>
          <Pill value={mainTankMitigations.length > 0 ? calculateTotalMitigation(mainTankMitigations, damageType, bossLevel) : 0} />
        </Tooltip>
      </div>

      <div className="flex items-center gap-2">
        <div className="font-bold text-base min-w-[120px] truncate">{`Off Tank${offTankJob ? ` (${offTankJob})` : ''}:`}</div>
        <Tooltip content={generateMitigationBreakdown(offTankMitigations, damageType, bossLevel)}>
          <Pill value={offTankMitigations.length > 0 ? calculateTotalMitigation(offTankMitigations, damageType, bossLevel) : 0} />
        </Tooltip>
      </div>
    </div>
  );
};

export default TankMitigationDisplay;
