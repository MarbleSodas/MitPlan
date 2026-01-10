import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRealtimePlan } from '../../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../../contexts/RealtimeBossContext';
import { bosses } from '../../../data';
import { baseHealthValues } from '../../../data/bosses/bossData';
import { Button } from '@/components/ui/button';

const PartyMinHealthInput = () => {
  const { realtimePlan, batchUpdateRealtime } = useRealtimePlan();
  const { currentBossId, currentBossLevel } = useRealtimeBossContext();

  const currentBoss = bosses.find(b => b.id === currentBossId) || null;
  const defaultPartyHp = (currentBoss?.baseHealth?.party)
    ?? (baseHealthValues[currentBossLevel]?.party)
    ?? baseHealthValues[100].party;

  const existing = realtimePlan?.healthSettings?.partyMinHealth;
  const [partyMinHealth, setPartyMinHealth] = useState(existing ?? defaultPartyHp);

  // Autofill from boss base HP ONLY if not already saved in plan; otherwise, keep the saved value
  useEffect(() => {
    const saved = realtimePlan?.healthSettings?.partyMinHealth;
    if (saved == null) {
      const desired = defaultPartyHp;
      if (partyMinHealth !== desired) setPartyMinHealth(desired);
      batchUpdateRealtime({
        healthSettings: {
          ...(realtimePlan?.healthSettings || {}),
          partyMinHealth: desired,
        },
      });
    } else if (partyMinHealth !== saved) {
      setPartyMinHealth(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBossId, realtimePlan?.healthSettings?.partyMinHealth]);

  const onBlur = () => {
    const value = Math.max(1, Number(partyMinHealth) || 0);
    const updated = {
      healthSettings: {
        ...(realtimePlan?.healthSettings || {}),
        partyMinHealth: value,
      },
    };
    batchUpdateRealtime(updated);
  };

  return (
    <div className="flex items-center gap-2 rounded-md text-sm px-3 py-1.5 bg-card border border-border">
      <span className="whitespace-nowrap font-medium text-foreground">Party Min HP:</span>
      <input
        type="number"
        min="1"
        max="9999999"
        step="100"
        value={partyMinHealth}
        onChange={(e) => setPartyMinHealth(Number(e.target.value))}
        onBlur={onBlur}
        placeholder={defaultPartyHp.toString()}
        aria-label="Minimum party health threshold"
        className="min-w-[18px] w-auto mx-[2px] text-center rounded text-sm p-0.5 border border-border bg-background text-foreground [field-sizing:content] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setPartyMinHealth(defaultPartyHp);
          batchUpdateRealtime({
            healthSettings: {
              ...(realtimePlan?.healthSettings || {}),
              partyMinHealth: defaultPartyHp,
            },
          });
        }}
        aria-label="Reset party min HP to default"
        title="Reset to default"
        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
      >
        <RefreshCw size={14} />
      </Button>
    </div>
  );
};

export default PartyMinHealthInput;

