export type TankPosition = 'mainTank' | 'offTank';

type TankPositionStyle = {
  label: string;
  shortLabel: string;
  badgeClass: string;
  solidClass: string;
  softButtonClass: string;
  borderLeftClass: string;
  mitigationPillClass: string;
};

export const TANK_POSITION_STYLES: Record<TankPosition, TankPositionStyle> = {
  mainTank: {
    label: 'Main Tank',
    shortLabel: 'MT',
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200',
    solidClass: 'bg-blue-600 text-white shadow-sm hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400',
    softButtonClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200 dark:hover:bg-blue-400/15',
    borderLeftClass: 'border-l-blue-500 dark:border-l-blue-400',
    mitigationPillClass: 'border-blue-500/25 bg-blue-500/10 text-blue-800 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-100',
  },
  offTank: {
    label: 'Off Tank',
    shortLabel: 'OT',
    badgeClass: 'border-red-500/30 bg-red-500/10 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200',
    solidClass: 'bg-red-600 text-white shadow-sm hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400',
    softButtonClass: 'border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200 dark:hover:bg-red-400/15',
    borderLeftClass: 'border-l-red-500 dark:border-l-red-400',
    mitigationPillClass: 'border-red-500/25 bg-red-500/10 text-red-800 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-100',
  },
};

export const getTankPositionStyles = (position?: string | null) => {
  if (position !== 'mainTank' && position !== 'offTank') return null;
  return TANK_POSITION_STYLES[position];
};

export const getTankPositionShortLabel = (position?: string | null) => (
  getTankPositionStyles(position)?.shortLabel || ''
);

export const getTankPositionLabel = (position?: string | null) => (
  getTankPositionStyles(position)?.label || ''
);
