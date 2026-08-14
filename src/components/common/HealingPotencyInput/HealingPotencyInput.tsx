import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRealtimeBossContext } from '../../../contexts/RealtimeBossContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const HEALING_POTENCY_VALUES: Record<number, number> = {
  90: 5000,
  100: 6000,
};

const HealingPotencyInput = ({ className = '' }: { className?: string }) => {
  const { currentBossLevel } = useRealtimeBossContext();

  const [healingPotency, setHealingPotency] = useState(HEALING_POTENCY_VALUES[currentBossLevel] || HEALING_POTENCY_VALUES[100]);

  useEffect(() => {
    const savedPotency = localStorage.getItem(`mitplan-healing-potency-${currentBossLevel}`);
    if (savedPotency) {
      const potencyNum = parseInt(savedPotency, 10);
      if (potencyNum > 0) setHealingPotency(potencyNum);
    } else {
      setHealingPotency(HEALING_POTENCY_VALUES[currentBossLevel] || HEALING_POTENCY_VALUES[100]);
    }
  }, [currentBossLevel]);

  useEffect(() => {
    localStorage.setItem(`mitplan-healing-potency-${currentBossLevel}`, healingPotency.toString());
  }, [healingPotency, currentBossLevel]);

  const defaultValue = HEALING_POTENCY_VALUES[currentBossLevel] || HEALING_POTENCY_VALUES[100];

  const handleReset = () => {
    setHealingPotency(defaultValue);
    localStorage.removeItem(`mitplan-healing-potency-${currentBossLevel}`);
  };

  return (
    <div className={cn('flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm', className)}>
      <span className="shrink-0 whitespace-nowrap font-medium text-foreground">
        Healing / 100
        <span className="hidden 2xl:inline"> potency</span>
        <span className="ml-1 text-xs font-semibold text-primary">Lv. {currentBossLevel}</span>
      </span>
      <Input
        type="number"
        variant="compact"
        min={1}
        max={99999}
        value={healingPotency}
        onChange={(e) => setHealingPotency(Number(e.target.value))}
        placeholder={defaultValue.toString()}
        aria-label="Healing per 100 cure potency"
        className="min-w-0 flex-1"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            aria-label="Reset cure potency to default"
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
          >
            <RefreshCw size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset to default</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default HealingPotencyInput;
