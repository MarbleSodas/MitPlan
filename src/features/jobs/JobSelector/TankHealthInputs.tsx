import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRealtimePlan } from '../../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../../contexts/RealtimeBossContext';
import { baseHealthValues } from '../../../data/bosses/bossData';
import {
  getPlanTimelineLayout,
  getPlanTimelineMirrorFields,
  normalizePlanTimelineLayout,
} from '../../../utils/timeline/planTimelineLayoutUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TankHealthInputsProps {
  className?: string;
}

const TankHealthInputs = ({ className = '' }: TankHealthInputsProps) => {
  const { realtimePlan, batchUpdateRealtime } = useRealtimePlan();
  const { currentBossLevel } = useRealtimeBossContext();
  const planTimelineLayout = useMemo(
    () => getPlanTimelineLayout(realtimePlan),
    [realtimePlan]
  );

  const defaultTankHp = planTimelineLayout?.healthConfig?.defaultTank
    ?? planTimelineLayout?.bossMetadata?.baseHealth?.tank
    ?? baseHealthValues[currentBossLevel]?.tank
    ?? baseHealthValues[100].tank;
  const existingMainHp = planTimelineLayout?.healthConfig?.mainTank
    ?? realtimePlan?.healthSettings?.tankMaxHealth?.mainTank;
  const existingOffHp = planTimelineLayout?.healthConfig?.offTank
    ?? realtimePlan?.healthSettings?.tankMaxHealth?.offTank;

  const [mtMaxHp, setMtMaxHp] = useState(existingMainHp || defaultTankHp);
  const [otMaxHp, setOtMaxHp] = useState(existingOffHp || defaultTankHp);

  useEffect(() => {
    const nextMainHp = existingMainHp ?? defaultTankHp;
    const nextOffHp = existingOffHp ?? defaultTankHp;

    setMtMaxHp((previous) => (previous === nextMainHp ? previous : nextMainHp));
    setOtMaxHp((previous) => (previous === nextOffHp ? previous : nextOffHp));
  }, [defaultTankHp, existingMainHp, existingOffHp]);

  const persistTankHp = useCallback((key: 'mainTank' | 'offTank', value: number) => {
    const safe = Math.max(1, Number(value) || 0);

    if (planTimelineLayout) {
      const nextLayout = normalizePlanTimelineLayout({
        ...planTimelineLayout,
        healthConfig: {
          ...planTimelineLayout.healthConfig,
          [key]: safe,
        },
      });

      batchUpdateRealtime(getPlanTimelineMirrorFields(nextLayout));
      return;
    }

    batchUpdateRealtime({
      healthSettings: {
        ...(realtimePlan?.healthSettings || {}),
        tankMaxHealth: {
          ...(realtimePlan?.healthSettings?.tankMaxHealth || {}),
          [key]: safe,
        },
      },
    });
  }, [batchUpdateRealtime, planTimelineLayout, realtimePlan]);

  const resetTankHp = useCallback((key: 'mainTank' | 'offTank') => {
    if (key === 'mainTank') {
      setMtMaxHp(defaultTankHp);
    } else {
      setOtMaxHp(defaultTankHp);
    }
    persistTankHp(key, defaultTankHp);
  }, [defaultTankHp, persistTankHp]);

  const renderTankField = (
    label: string,
    value: number,
    onChange: (next: number) => void,
    onReset: () => void,
    ariaLabel: string,
  ) => (
    <label className="flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <Input
        type="number"
        variant="compact"
        min={1}
        step={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onBlur={() => {
          const safeValue = Math.max(1, Number(value) || 0);
          onChange(safeValue);
          persistTankHp(label === 'MT' ? 'mainTank' : 'offTank', safeValue);
        }}
        aria-label={ariaLabel}
        className="h-8 w-16 min-w-0 text-sm font-semibold"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onReset}
        title="Reset to default"
        aria-label={`Reset ${label} HP to default`}
        className="h-6 w-6 shrink-0 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <RefreshCw size={13} />
      </Button>
    </label>
  );

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-sm', className)}>
      <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-foreground">Tank HP</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 lg:flex-nowrap">
        {renderTankField('MT', mtMaxHp, setMtMaxHp, () => resetTankHp('mainTank'), 'Main tank HP')}
        {renderTankField('OT', otMaxHp, setOtMaxHp, () => resetTankHp('offTank'), 'Off tank HP')}
      </div>
    </div>
  );
};

export default TankHealthInputs;
