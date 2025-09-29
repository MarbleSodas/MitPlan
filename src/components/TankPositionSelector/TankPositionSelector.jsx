import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTankPositionContext } from '../../contexts/TankPositionContext';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../contexts/RealtimeBossContext';
import { baseHealthValues } from '../../data/bosses/bossData';


/**
 * Component for selecting tank positions (MT/OT)
 * Only visible when exactly 2 tank jobs are selected
 */
const TankPositionSelector = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const {
    tankPositions,
    assignTankPosition,
    selectedTankJobs,
  } = useTankPositionContext();

  const { realtimePlan, batchUpdateRealtime } = useRealtimePlan();
  const { currentBossLevel } = useRealtimeBossContext();

  const defaultTankHp = baseHealthValues[currentBossLevel]?.tank || baseHealthValues[100].tank;
  const existingMainHp = realtimePlan?.healthSettings?.tankMaxHealth?.mainTank;
  const existingOffHp = realtimePlan?.healthSettings?.tankMaxHealth?.offTank;

  const [mtMaxHp, setMtMaxHp] = useState(existingMainHp || defaultTankHp);
  const [otMaxHp, setOtMaxHp] = useState(existingOffHp || defaultTankHp);

  useEffect(() => {
    if (!existingMainHp) setMtMaxHp(defaultTankHp);
    if (!existingOffHp) setOtMaxHp(defaultTankHp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBossLevel]);

  const persistTankHp = (key, value) => {
    const safe = Math.max(1, Number(value) || 0);
    const current = realtimePlan?.healthSettings?.tankMaxHealth || {};
    const updated = {
      healthSettings: {
        ...(realtimePlan?.healthSettings || {}),
        tankMaxHealth: {
          ...current,
          [key]: safe,
        },
      },
    };
    batchUpdateRealtime(updated);
  };

  const resetTankHpToDefault = (key) => {
    const value = defaultTankHp;
    if (key === 'mainTank') {
      setMtMaxHp(value);
    } else {
      setOtMaxHp(value);
    }
    persistTankHp(key, value);
  };

  if (selectedTankJobs.length !== 2) return null;

  const containerStyle = { backgroundColor: colors.secondary };
  const titleBorderStyle = { borderBottomColor: colors.border, color: colors.text };
  const cardStyle = { backgroundColor: colors.cardBackground };

  const renderTankCard = (title, roleKey) => (
    <div className="rounded-md p-4 flex flex-col items-center shadow-sm" style={cardStyle}>
      <h4 className="m-0 mb-2 text-center" style={{ color: colors.text }}>{title}</h4>
      <div className="w-full flex items-center justify-center">
        <div className="flex flex-wrap justify-center gap-2">
          {selectedTankJobs.map((tank) => {
            const selected = tankPositions[roleKey] === tank.id;
            const disabled = tankPositions[roleKey === 'mainTank' ? 'offTank' : 'mainTank'] === tank.id;
            const optStyle = {
              backgroundColor: selected ? colors.primary : colors.background,
              opacity: disabled ? 0.5 : 1,
            };
            return (
              <div
                key={`${roleKey}-${tank.id}`}
                className="flex flex-col items-center p-2 rounded-md w-20 transition-all cursor-pointer hover:brightness-105"
                style={optStyle}
                onClick={() => assignTankPosition(tank.id, roleKey)}
              >
                <div className="w-12 h-12 mb-1 flex items-center justify-center">
                  {typeof tank.icon === 'string' && tank.icon.startsWith('/') ? (
                    <img src={tank.icon} alt={tank.name} style={{ maxHeight: '48px', maxWidth: '48px' }} />
                  ) : (
                    tank.icon
                  )}
                </div>
                <div className="text-center text-sm" style={{ color: selected ? colors.buttonText : colors.text }}>
                  {tank.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-md p-4 mb-5 shadow-md transition-colors" style={containerStyle}>
      <h3 className="m-0 mb-4 pb-2 border-b" style={titleBorderStyle}>Tank Positions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {renderTankCard('Main Tank (MT)', 'mainTank')}
        {renderTankCard('Off Tank (OT)', 'offTank')}
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 place-items-center">
        <div className="flex items-center gap-2 justify-center">
          <span className="text-xs opacity-70" style={{ color: colors.text }}>MT Max HP</span>
          <input
            type="number"
            min={1}
            step={100}
            value={mtMaxHp}
            onChange={(e) => setMtMaxHp(Number(e.target.value))}
            onBlur={() => persistTankHp('mainTank', mtMaxHp)}
            className="w-28 px-2 py-1 rounded border text-right"
            aria-label={`Main Tank max HP`}
          />
          <button
            type="button"
            onClick={() => resetTankHpToDefault('mainTank')}
            aria-label={`Reset Main Tank HP to default`}
            title="Reset to default"
            className="flex items-center justify-center h-7 w-7 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-2 text-blue-500 hover:text-white hover:bg-blue-500"
          >
            <span aria-hidden="true" className="text-base leading-none">⟳</span>
          </button>
        </div>
        <div className="flex items-center gap-2 justify-center">
          <span className="text-xs opacity-70" style={{ color: colors.text }}>OT Max HP</span>
          <input
            type="number"
            min={1}
            step={100}
            value={otMaxHp}
            onChange={(e) => setOtMaxHp(Number(e.target.value))}
            onBlur={() => persistTankHp('offTank', otMaxHp)}
            className="w-28 px-2 py-1 rounded border text-right"
            aria-label={`Off Tank max HP`}
          />
          <button
            type="button"
            onClick={() => resetTankHpToDefault('offTank')}
            aria-label={`Reset Off Tank HP to default`}
            title="Reset to default"
            className="flex items-center justify-center h-7 w-7 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-2 text-blue-500 hover:text-white hover:bg-blue-500"
          >
            <span aria-hidden="true" className="text-base leading-none">⟳</span>
          </button>
        </div>
      </div>

    </div>
  );
};


export default TankPositionSelector;
