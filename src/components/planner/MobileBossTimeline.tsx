import { memo, useCallback, useMemo } from 'react';
import { mitigationAbilities } from '../../data';
import { isMitigationAvailable, calculateTotalMitigation, calculateBarrierAmount, getHealingPotency, calculateHealingAmount, parseUnmitigatedDamage } from '../../utils';
import { cn } from '@/lib/utils';
import HealthBar from '../common/HealthBar';
import HealingHealthBar from '../common/HealingHealthBar';
import { getBossActionTypeLabel } from '../../utils/boss/bossActionUtils';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { getPlanTimelineLayout } from '../../utils/timeline/planTimelineLayoutUtils';
import type { BossAction, PhaseOverride, ResolvedTimelinePhaseSummary } from '../../types';
import PhaseOverrideTimeStrip from './PhaseOverridesPanel';

interface MobileBossTimelineProps {
  sortedBossActions: BossAction[];
  selectedBossAction: any;
  assignments: any;
  getActiveMitigations: any;
  selectedJobs: any;
  currentBossLevel: number;
  baseHealth: any;
  phaseSummaryByAnchorActionId: Map<string, ResolvedTimelinePhaseSummary>;
  skippedActionsByPhaseId: Record<string, BossAction[]>;
  phaseOverrides: Record<string, PhaseOverride>;
  disabled?: boolean;
  onSelectAction: (action: any) => void;
  onPhaseOverrideChange?: (nextPhaseOverrides: Record<string, PhaseOverride>) => void;
}

const MobileBossTimeline = memo(({
  sortedBossActions,
  selectedBossAction,
  assignments,
  getActiveMitigations,
  selectedJobs,
  currentBossLevel,
  baseHealth,
  phaseSummaryByAnchorActionId,
  skippedActionsByPhaseId,
  phaseOverrides,
  disabled = false,
  onSelectAction,
  onPhaseOverrideChange,
}: MobileBossTimelineProps) => {
  const { realtimePlan } = useRealtimePlan();
  const handleSelect = useCallback((action: any) => {
    onSelectAction(action);
  }, [onSelectAction]);

  const effectiveBaseHealth = baseHealth || { party: 143000, tank: 225000 };
  const planTimelineLayout = useMemo(
    () => getPlanTimelineLayout(realtimePlan),
    [realtimePlan?.timelineLayout]
  );
  const healthConfig = planTimelineLayout?.healthConfig;
  const legacyHealthSettings = realtimePlan?.healthSettings || {};
  const partyBaseMaxHealth = healthConfig?.party
    || legacyHealthSettings.partyMinHealth
    || effectiveBaseHealth.party;
  const mainTankBaseMaxHealth = healthConfig?.mainTank
    || healthConfig?.defaultTank
    || legacyHealthSettings.tankMaxHealth?.mainTank
    || effectiveBaseHealth.tank;
  const offTankBaseMaxHealth = healthConfig?.offTank
    || healthConfig?.defaultTank
    || legacyHealthSettings.tankMaxHealth?.offTank
    || effectiveBaseHealth.tank;

  const calculateMitigationInfo = useCallback((action: any) => {
    const directAssignments = assignments[action.id] || [];
    let filteredDirectMitigations = directAssignments
      .map((assignment: any) => {
        const fullMitigation = mitigationAbilities.find(m => m.id === assignment.id);
        if (!fullMitigation) return null;
        return { ...fullMitigation, ...assignment };
      })
      .filter((mitigation: any) => mitigation && isMitigationAvailable(mitigation, selectedJobs));

    const inheritedMitigations = getActiveMitigations
      ? getActiveMitigations(action.id, action.time)
          .map((m: any) => mitigationAbilities.find((full: any) => full.id === m.id))
          .filter(Boolean)
      : [];

    const filteredInheritedMitigations = inheritedMitigations.filter((mitigation: any) =>
      isMitigationAvailable(mitigation, selectedJobs)
    );

    const allMitigations = [...filteredDirectMitigations, ...filteredInheritedMitigations];
    return {
      allMitigations,
      barrierMitigations: allMitigations.filter((m: any) => m.type === 'barrier'),
      hasMitigations: allMitigations.length > 0
    };
  }, [assignments, getActiveMitigations, selectedJobs]);

  const getMitigationSummary = useCallback((action: any) => {
    const directAssignments = assignments[action.id] || [];
    const activeAssignments = getActiveMitigations 
      ? getActiveMitigations(action.id, action.time)
      : [];
    const total = directAssignments.length + activeAssignments.length;
    return total;
  }, [assignments, getActiveMitigations]);

  const getDamageTypeLabel = (action: any) => {
    const baseLabel = getBossActionTypeLabel(action);
    if (action.isMultiHit) {
      const hitLabel = action.hitCount && action.hitCount > 1 ? `${action.hitCount}-Hit` : 'Multi-hit';
      return `${baseLabel} • ${hitLabel}`;
    }
    if (action.hasDot) {
      return `${baseLabel} • DoT`;
    }
    return baseLabel;
  };

  const getDamageTypeIcon = (action: any) => {
    if (action.isTankBuster || action.isDualTankBuster) return '🎯';
    if (action.classification === 'small_parties') return '👥';
    if (action.isMultiHit) return '💥';
    return '🌊';
  };

  const unmitigatedDamage = (action: any) => {
    return parseUnmitigatedDamage(action.unmitigatedDamage);
  };

  return (
    <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
      {sortedBossActions.map((action, index) => {
        const phaseSummary = phaseSummaryByAnchorActionId.get(action.id) || null;
        const phaseSkippedActions = phaseSummary
          ? skippedActionsByPhaseId[phaseSummary.phaseId] || []
          : [];
        const isSelected = selectedBossAction?.id === action.id;
        const mitigationCount = getMitigationSummary(action);
        const mitigationInfo = calculateMitigationInfo(action);
        const damage = unmitigatedDamage(action);
        
        const mitigationPercentage = calculateTotalMitigation(mitigationInfo.allMitigations, action.damageType, currentBossLevel);
        const healingPotency = getHealingPotency(currentBossLevel);
        
        const directBarrierMitigations = mitigationInfo.allMitigations.filter((m: any) => m.type === 'barrier' || (m.type === 'healing' && (m.barrierPotency || m.barrierFlatPotency)));
        
        const calcBarrier = (target: string, maxHp: number) => directBarrierMitigations.reduce((sum: number, m: any) => {
          if (m.target === 'party' || m.target === 'area' || m.targetsTank || (target !== 'party' && (m.tankPosition === 'shared' || m.tankPosition === target))) {
            return sum + calculateBarrierAmount(m, maxHp, healingPotency);
          }
          return sum;
        }, 0);

        const partyBarrierAmount = calcBarrier('party', partyBaseMaxHealth);
        const mtBarrierAmount = calcBarrier('mainTank', mainTankBaseMaxHealth);
        const otBarrierAmount = calcBarrier('offTank', offTankBaseMaxHealth);
        
        const calcRemaining = (maxHp: number, barrier: number, mit: number) => Math.max(0, maxHp - Math.max(0, damage - barrier) * (1 - mit));
        
        const partyRem = calcRemaining(partyBaseMaxHealth, partyBarrierAmount, mitigationPercentage);
        const mtRem = calcRemaining(mainTankBaseMaxHealth, mtBarrierAmount, mitigationPercentage);
        const otRem = calcRemaining(offTankBaseMaxHealth, otBarrierAmount, mitigationPercentage);
        
        const calcHealing = (targetMaxHp: number) => {
          const healingMits = mitigationInfo.allMitigations.filter((m: any) => 
            m.type === 'healing' || m.healingPotency || m.regenPotency || m.healingPotencyBonus || m.maxHpIncrease
          );
          return calculateHealingAmount(healingMits, healingPotency, currentBossLevel, targetMaxHp);
        };
        
        const partyHealAmt = calcHealing(partyBaseMaxHealth);
        const mtHealAmt = calcHealing(mainTankBaseMaxHealth);
        const otHealAmt = calcHealing(offTankBaseMaxHealth);
        
        return (
          <div
            key={`${action.id}-${index}`}
            data-testid={`mobile-action-${action.id}-${index}`}
            onClick={() => handleSelect(action)}
            className={cn(
              "relative w-full rounded-lg border-2 transition-all cursor-pointer bg-card overflow-hidden",
              isSelected 
                ? "border-primary shadow-md" 
                : "border-border hover:border-primary/50"
            )}
          >
            <PhaseOverrideTimeStrip
              time={action.time}
              summary={phaseSummary}
              phaseOverrides={phaseOverrides}
              skippedActions={phaseSkippedActions}
              disabled={disabled}
              onChange={onPhaseOverrideChange}
            />

            <div className="p-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                {action.icon && typeof action.icon === 'string' && action.icon.startsWith('/') ? (
                  <img src={action.icon} alt="" className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-xl">{action.icon}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate text-foreground">
                    {action.name}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {getDamageTypeIcon(action)} {getDamageTypeLabel(action)}
                  </span>
                  {action.unmitigatedDamage && (
                    <span className="text-xs text-muted-foreground">
                      Est. {action.unmitigatedDamage}
                    </span>
                  )}
                </div>

                {mitigationCount > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {mitigationCount} mitigation{mitigationCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="absolute -right-1 -top-1 w-3 h-3 bg-primary rounded-full" />
              )}
            </div>

            {damage > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                {action.isTankBuster || action.isDualTankBuster ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <HealthBar 
                        label="MT" 
                        maxHealth={mainTankBaseMaxHealth} 
                        currentHealth={mainTankBaseMaxHealth} 
                        damageAmount={damage} 
                        barrierAmount={mtBarrierAmount} 
                        isTankBuster 
                        tankPosition="mainTank" 
                        isDualTankBuster={action.isDualTankBuster} 
                        applyBarrierFirst 
                        mitigationPercentage={mitigationPercentage} 
                      />
                      <HealingHealthBar 
                        label="MT" 
                        maxHealth={mainTankBaseMaxHealth} 
                        remainingHealth={mtRem} 
                        healingAmount={mtHealAmt} 
                        isTankBuster 
                        tankPosition="mainTank" 
                        isDualTankBuster={action.isDualTankBuster} 
                      />
                    </div>
                    {action.isDualTankBuster && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <HealthBar 
                          label="OT" 
                          maxHealth={offTankBaseMaxHealth} 
                          currentHealth={offTankBaseMaxHealth} 
                          damageAmount={damage} 
                          barrierAmount={otBarrierAmount} 
                          isTankBuster 
                          tankPosition="offTank" 
                          isDualTankBuster 
                          applyBarrierFirst 
                          mitigationPercentage={mitigationPercentage} 
                        />
                        <HealingHealthBar 
                          label="OT" 
                          maxHealth={offTankBaseMaxHealth} 
                          remainingHealth={otRem} 
                          healingAmount={otHealAmt} 
                          isTankBuster 
                          tankPosition="offTank" 
                          isDualTankBuster 
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <HealthBar 
                      label="Dmg" 
                      maxHealth={partyBaseMaxHealth} 
                      currentHealth={partyBaseMaxHealth} 
                      damageAmount={damage} 
                      barrierAmount={partyBarrierAmount} 
                      applyBarrierFirst 
                      mitigationPercentage={mitigationPercentage} 
                    />
                    <HealingHealthBar 
                      label="Heal" 
                      maxHealth={partyBaseMaxHealth} 
                      remainingHealth={partyRem} 
                      healingAmount={partyHealAmt} 
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {action.description}
              </p>
            </div>
            </div>
          </div>
        );
      })}
      
      {sortedBossActions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No boss actions yet</p>
          <p className="text-xs mt-1">Use Edit Timeline to add or rearrange actions</p>
        </div>
      )}
    </div>
  );
});

MobileBossTimeline.displayName = 'MobileBossTimeline';

export default MobileBossTimeline;
