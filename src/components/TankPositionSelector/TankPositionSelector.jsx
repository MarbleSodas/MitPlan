import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTankPositionContext } from '../../contexts/TankPositionContext';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../contexts/RealtimeBossContext';
import { baseHealthValues } from '../../data/bosses/bossData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Component for selecting tank positions (MT/OT)
 * Only visible when exactly 2 tank jobs are selected
 */
const TankPositionSelector = () => {
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

  const renderTankCard = (title, roleKey) => (
    <Card className="shadow-sm bg-card border border-border">
      <div className="p-4 flex flex-col items-center">
        <h4 className="m-0 mb-2 text-center font-medium text-foreground">{title}</h4>
        <div className="w-full flex items-center justify-center">
          <div className="flex flex-wrap justify-center gap-2">
            {selectedTankJobs.map((tank) => {
              const selected = tankPositions[roleKey] === tank.id;
              const assignedToOther = tankPositions[roleKey === 'mainTank' ? 'offTank' : 'mainTank'] === tank.id;
              
              return (
                <div
                  key={`${roleKey}-${tank.id}`}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-md w-20 transition-all cursor-pointer border-2 hover:brightness-105",
                    selected 
                      ? "bg-primary/20 border-primary" 
                      : assignedToOther
                        ? "bg-muted/50 border-muted-foreground/30 hover:border-primary/50"
                        : "bg-background border-transparent hover:border-primary/50"
                  )}
                  onClick={() => assignTankPosition(tank.id, roleKey)}
                  title={assignedToOther ? `Click to swap ${tank.name} to ${title}` : `Assign ${tank.name} as ${title}`}
                >
                  <div className="w-12 h-12 mb-1 flex items-center justify-center">
                    {typeof tank.icon === 'string' && tank.icon.startsWith('/') ? (
                      <img src={tank.icon} alt={tank.name} className="max-h-12 max-w-12 object-contain" />
                    ) : (
                      tank.icon
                    )}
                  </div>
                  <div className={cn(
                    "text-center text-sm font-medium",
                    selected ? "text-primary" : assignedToOther ? "text-muted-foreground" : "text-muted-foreground"
                  )}>
                    {tank.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <Card className="mb-5 bg-card border-border">
      <CardHeader className="pb-2 border-b border-border">
        <CardTitle className="text-lg font-semibold text-foreground">Tank Positions</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderTankCard('Main Tank (MT)', 'mainTank')}
          {renderTankCard('Off Tank (OT)', 'offTank')}
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 place-items-center">
          <div className="flex items-center gap-2 justify-center w-full">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap w-20 text-right">MT Max HP</span>
            <Input
              type="number"
              min={1}
              step={100}
              value={mtMaxHp}
              onChange={(e) => setMtMaxHp(Number(e.target.value))}
              onBlur={() => persistTankHp('mainTank', mtMaxHp)}
              className="min-w-[18px] w-auto mx-[2px] text-right bg-background h-8 [field-sizing:content] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Main Tank max HP"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => resetTankHpToDefault('mainTank')}
              title="Reset to default"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            >
              <RefreshCw size={14} />
            </Button>
          </div>

          <div className="flex items-center gap-2 justify-center w-full">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap w-20 text-right">OT Max HP</span>
            <Input
              type="number"
              min={1}
              step={100}
              value={otMaxHp}
              onChange={(e) => setOtMaxHp(Number(e.target.value))}
              onBlur={() => persistTankHp('offTank', otMaxHp)}
              className="min-w-[18px] w-auto mx-[2px] text-right bg-background h-8 [field-sizing:content] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Off Tank max HP"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => resetTankHpToDefault('offTank')}
              title="Reset to default"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TankPositionSelector;
