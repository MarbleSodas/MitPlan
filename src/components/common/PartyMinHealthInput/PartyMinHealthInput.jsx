import { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRealtimePlan } from '../../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../../contexts/RealtimeBossContext';
import { bosses } from '../../../data';
import { baseHealthValues } from '../../../data/bosses/bossData';

const PartyMinHealthInput = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
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
    <div className="flex items-center gap-2 rounded-md text-sm" style={{ padding: '6px 12px', backgroundColor: colors.secondary }}>
      <span className="whitespace-nowrap font-medium" style={{ color: colors.text }}>Party Min HP:</span>
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
        className="w-[80px] text-center rounded text-sm"
        style={{ padding: '2px', border: `1px solid ${colors.border}`, background: colors.background, color: colors.text }}
      />
      <button
        type="button"
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
        className="flex items-center justify-center h-7 w-7 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-2 text-blue-500 hover:text-white hover:bg-blue-500"
      >
        <span aria-hidden="true" className="text-base leading-none">⟳</span>
      </button>
    </div>
  );
};

export default PartyMinHealthInput;

