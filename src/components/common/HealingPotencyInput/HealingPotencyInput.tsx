import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRealtimeBossContext } from '../../../contexts/RealtimeBossContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Tooltip from '../Tooltip/Tooltip';

const HEALING_POTENCY_VALUES: Record<number, number> = {
  90: 5000,
  100: 6000,
};

const HealingPotencyInput = () => {
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
    <div className="flex items-center gap-2 rounded-lg text-sm px-3 py-2 bg-card border border-border">
      <span className="whitespace-nowrap font-medium text-foreground">
        Healing (Lv.
      </span>
      <span className="font-semibold min-w-[20px] text-primary">
        {currentBossLevel}
      </span>
      <span className="whitespace-nowrap font-medium text-foreground">
        per 100 Cure Potency):
      </span>
      <Input
        type="number"
        variant="compact"
        min={1}
        max={99999}
        value={healingPotency}
        onChange={(e) => setHealingPotency(Number(e.target.value))}
        placeholder={defaultValue.toString()}
      />
      <Tooltip content="Reset to default">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          aria-label="Reset cure potency to default"
          title="Reset to default"
          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
        >
          <RefreshCw size={14} />
        </Button>
      </Tooltip>
    </div>
  );
};

export default HealingPotencyInput;
