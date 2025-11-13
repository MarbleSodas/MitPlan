import { useState, useEffect } from 'react';
import { useRealtimeBossContext } from '../../../contexts/RealtimeBossContext';
import { useTheme } from '../../../contexts/ThemeContext';

// Default healing potency values for 100 potency heals
const HEALING_POTENCY_VALUES = {
  90: 5000,
  100: 6000,
};

const HealingPotencyInput = () => {
  const { theme } = useTheme();
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

  return (
    <div className="flex items-center gap-2 rounded-md text-sm px-3 py-1.5 bg-[var(--color-secondary)]">
      <span className="whitespace-nowrap font-medium text-[var(--color-text)]">
        Healing (Lv.
      </span>
      <span className="font-semibold min-w-[20px] text-[var(--color-primary)]">
        {currentBossLevel}
      </span>
      <span className="whitespace-nowrap font-medium text-[var(--color-text)]">
        per 100 Cure Potency):
      </span>
      <input
        type="number"
        min="1"
        max="99999"
        value={healingPotency}
        onChange={(e) => setHealingPotency(Number(e.target.value))}
        placeholder={(HEALING_POTENCY_VALUES[currentBossLevel] || HEALING_POTENCY_VALUES[100]).toString()}
        className="w-[60px] text-center rounded text-sm p-0.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
      />
    </div>
  );
};

export default HealingPotencyInput;
