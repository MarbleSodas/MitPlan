import { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRealtimePlan } from '../../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../../contexts/RealtimeBossContext';
import { bosses } from '../../../data';
import { baseHealthValues } from '../../../data/bosses/bossData';
import {
  getPlanTimelineLayout,
  getPlanTimelineMirrorFields,
  normalizePlanTimelineLayout,
} from '../../../utils/timeline/planTimelineLayoutUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PartyMinHealthInput = () => {
  const { realtimePlan, batchUpdateRealtime } = useRealtimePlan();
  const { currentBossId, currentBossLevel } = useRealtimeBossContext();
  const planTimelineLayout = useMemo(
    () => getPlanTimelineLayout(realtimePlan),
    [realtimePlan?.timelineLayout]
  );

  const currentBoss = bosses.find(b => b.id === currentBossId) || null;
  const defaultPartyHp = (planTimelineLayout?.bossMetadata?.baseHealth?.party)
    ?? (currentBoss?.baseHealth?.party)
    ?? (baseHealthValues[currentBossLevel]?.party)
    ?? baseHealthValues[100].party;

  const existing = planTimelineLayout?.healthConfig?.party
    ?? realtimePlan?.healthSettings?.partyMinHealth;
  const [partyMinHealth, setPartyMinHealth] = useState(existing ?? defaultPartyHp);

  useEffect(() => {
    const saved = realtimePlan?.healthSettings?.partyMinHealth;
    const desiredSavedValue = planTimelineLayout?.healthConfig?.party ?? saved;
    if (desiredSavedValue == null) {
      const desired = defaultPartyHp;
      if (partyMinHealth !== desired) setPartyMinHealth(desired);
      if (planTimelineLayout) {
        const nextLayout = normalizePlanTimelineLayout({
          ...planTimelineLayout,
          healthConfig: {
            ...planTimelineLayout.healthConfig,
            party: desired,
          },
        });
        batchUpdateRealtime(getPlanTimelineMirrorFields(nextLayout));
      } else {
        batchUpdateRealtime({
          healthSettings: {
            ...(realtimePlan?.healthSettings || {}),
            partyMinHealth: desired,
          },
        });
      }
    } else if (partyMinHealth !== desiredSavedValue) {
      setPartyMinHealth(desiredSavedValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBossId, realtimePlan?.timelineLayout, realtimePlan?.healthSettings?.partyMinHealth]);

  const onBlur = () => {
    const value = Math.max(1, Number(partyMinHealth) || 0);
    setPartyMinHealth(value);

    if (planTimelineLayout) {
      const nextLayout = normalizePlanTimelineLayout({
        ...planTimelineLayout,
        healthConfig: {
          ...planTimelineLayout.healthConfig,
          party: value,
        },
      });
      batchUpdateRealtime(getPlanTimelineMirrorFields(nextLayout));
      return;
    }

    batchUpdateRealtime({
      healthSettings: {
        ...(realtimePlan?.healthSettings || {}),
        partyMinHealth: value,
      },
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-lg text-sm px-3 py-2 bg-card border border-border">
      <span className="whitespace-nowrap font-medium text-foreground">Party Min HP:</span>
      <Input
        type="number"
        variant="compact"
        min={1}
        max={9999999}
        step={100}
        value={partyMinHealth}
        onChange={(e) => setPartyMinHealth(Number(e.target.value))}
        onBlur={onBlur}
        placeholder={defaultPartyHp.toString()}
        aria-label="Minimum party health threshold"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setPartyMinHealth(defaultPartyHp);
          if (planTimelineLayout) {
            const nextLayout = normalizePlanTimelineLayout({
              ...planTimelineLayout,
              healthConfig: {
                ...planTimelineLayout.healthConfig,
                party: defaultPartyHp,
              },
            });
            batchUpdateRealtime(getPlanTimelineMirrorFields(nextLayout));
            return;
          }

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
