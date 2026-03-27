import { memo, useState, useCallback, useMemo } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import HealthBar from '../common/HealthBar';
import HealingHealthBar from '../common/HealingHealthBar';
import TankMitigationDisplay from '../common/TankMitigationDisplay';
import HealerGaugeDisplay from '../common/HealerGaugeDisplay/HealerGaugeDisplay';
import SelectionBorder from '../collaboration/SelectionBorder';
import {
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable,
  calculateBarrierAmount,
  getHealingPotency,
  calculateHealingAmount,
  parseUnmitigatedDamage
} from '../../utils';


import { mitigationAbilities } from '../../data';
import { useTankPositionContext } from '../../contexts';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { getPlanTimelineLayout } from '../../utils/timeline/planTimelineLayoutUtils';
import type {
  BossAction as BossActionType,
  PhaseOverride,
  ResolvedTimelinePhaseSummary,
} from '../../types';
import PhaseOverrideTimeStrip from '../planner/PhaseOverridesPanel';

type BossActionItemProps = {
  action: BossActionType;
  isSelected: boolean;
  assignments: Record<string, unknown[]>;
  getActiveMitigations: (...args: any[]) => any[];
  selectedJobs: any;
  currentBossLevel: number;
  baseHealth: any;
  phaseSummary?: ResolvedTimelinePhaseSummary | null;
  phaseOverrides?: Record<string, PhaseOverride>;
  skippedActions?: BossActionType[];
  phaseOverridesDisabled?: boolean;
  onPhaseOverrideChange?: (nextPhaseOverrides: Record<string, PhaseOverride>) => void;
  onClick: (event?: unknown) => void;
  children?: React.ReactNode;
};

const BossAction = ({ children, className = '', $isSelected, $importance, $hasAssignments, $time, $isTouched, ...rest }) => {
  const base = 'relative w-full min-h-0 flex flex-col mb-2 rounded-lg shadow-sm border transition-all cursor-pointer bg-card text-foreground overflow-hidden';
  const borderSel = $isSelected ? 'border-blue-500 ring-1 ring-blue-500/10' : 'border-border';
  const leftBorder = $importance === 'critical'
    ? 'border-l-4 border-l-red-500'
    : $importance === 'high'
      ? 'border-l-4 border-l-orange-500'
      : $importance === 'medium'
        ? 'border-l-4 border-l-amber-500'
        : 'border-l-4 border-l-green-500';
  const hover = 'hover:shadow-md hover:border-blue-500';
  
  return (
    <div {...rest} className={`${base} ${borderSel} ${leftBorder} ${hover} ${className}`}>
      {children}
    </div>
  );
};


const ActionIcon = ({ children, className = '', ...rest }) => (
  <span {...rest} className={`inline-flex items-center justify-center w-6 h-6 mr-2 shrink-0 select-none md:w-[24px] md:h-[24px] sm:w-5 sm:h-5 xs:w-4 xs:h-4 ${className}`}>{children}</span>
);


const ActionName = ({ children, className = '', ...rest }) => (
  <h3 {...rest} className={`m-0 font-bold select-none break-words hyphens-auto leading-tight w-full text-lg md:text-base text-foreground ${className}`}>{children}</h3>
);


const ActionDescription = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`m-0 text-muted-foreground text-base leading-normal break-words hyphens-auto whitespace-normal w-full ${className}`}
  >
    {children}
  </div>
);


const ContentContainer = ({ children, className = '', $hasAssignments, ...rest }) => (
  <div {...rest} className={`flex items-start my-2 w-full max-w-full ${className}`}>{children}</div>
);


const TextContainer = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex-1 min-w-0 break-words flex flex-col gap-1.5 ${className}`}>{children}</div>
);

const MitigationPercentage = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`inline-flex items-center justify-center bg-blue-100 dark:bg-blue-500/10 text-blue-900 dark:text-blue-100 font-bold text-sm px-2.5 py-1.5 rounded border border-blue-200 dark:border-blue-500/20 select-none ${className}`}
  >
    <span className="mr-1">🛡️</span> {children}
  </div>
);

const MultiHitIndicator = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`inline-flex items-center justify-center bg-orange-100 dark:bg-orange-500/10 text-orange-900 dark:text-orange-100 font-bold text-sm px-2.5 py-1.5 rounded mr-2 border border-orange-200 dark:border-orange-500/20 select-none ${className}`}
  >
    <span className="mr-1">💥</span> {children}
  </div>
);


const BossActionItem = memo(({
  action,
  isSelected,
  assignments,
  getActiveMitigations,
  selectedJobs,
  currentBossLevel,
  baseHealth,
  phaseSummary = null,
  phaseOverrides = {},
  skippedActions = [],
  phaseOverridesDisabled = false,
  onPhaseOverrideChange,
  onClick,
  children
}: BossActionItemProps) => {
  const [isTouched] = useState(false);
  const isTouch = false;
  const { tankPositions } = useTankPositionContext();

  const handleClick = useCallback((e) => {
    if (isTouch) e.preventDefault();
    onClick(e);
  }, [onClick, isTouch]);

  const directAssignments = assignments[action.id] || [];
  const activeAssignments = getActiveMitigations ? getActiveMitigations(action.id, action.time) : [];
  const hasAssignments = directAssignments.length > 0 || activeAssignments.length > 0;

  const calculateMitigationInfo = (tankPosition = null) => {
    const directMitigations = assignments[action.id] || [];
    let filteredDirectMitigations = directMitigations
      .map(assignment => {
        const fullMitigation = mitigationAbilities.find(m => m.id === assignment.id);
        if (!fullMitigation) return null;
        return { ...fullMitigation, ...assignment };
      })
      .filter(mitigation => mitigation && isMitigationAvailable(mitigation, selectedJobs));

    if (tankPosition) {
      filteredDirectMitigations = filteredDirectMitigations.filter(mitigation => {
        if (mitigation.target === 'self') return mitigation.tankPosition === tankPosition;
        if (mitigation.target === 'single') return mitigation.tankPosition === tankPosition;
        if (mitigation.target === 'party' || mitigation.target === 'area') return true;
        if (mitigation.tankPosition === tankPosition || mitigation.tankPosition === 'shared') return true;
        return false;
      });
    }

    const inheritedMitigations = getActiveMitigations(action.id, action.time, tankPosition)
      .map(m => mitigationAbilities.find(full => full.id === m.id))
      .filter(Boolean);

    const filteredInheritedMitigations = inheritedMitigations.filter(mitigation =>
      isMitigationAvailable(mitigation, selectedJobs)
    );

    if (tankPosition) {
      const filteredByTarget = filteredInheritedMitigations.filter(mitigation => {
        const originalAssignment = getActiveMitigations(action.id, action.time, tankPosition)
          .find(m => m.id === mitigation.id);
        if (!originalAssignment) return false;
        
        if (mitigation.target === 'self' || mitigation.target === 'single') {
          return originalAssignment.tankPosition === tankPosition;
        }
        if (mitigation.target === 'party' || mitigation.target === 'area') return true;
        return originalAssignment.tankPosition === 'shared' || originalAssignment.tankPosition === tankPosition;
      });

      return {
        allMitigations: [...filteredDirectMitigations, ...filteredByTarget],
        barrierMitigations: [...filteredDirectMitigations, ...filteredByTarget].filter(m => m.type === 'barrier'),
        hasMitigations: filteredDirectMitigations.length > 0 || filteredByTarget.length > 0
      };
    }

    const allMitigations = [...filteredDirectMitigations, ...filteredInheritedMitigations];
    return {
      allMitigations,
      barrierMitigations: allMitigations.filter(m => m.type === 'barrier'),
      hasMitigations: allMitigations.length > 0
    };
  };

  const { allMitigations, hasMitigations } = calculateMitigationInfo();

  const isScholarSelected = selectedJobs && (
    selectedJobs['SCH'] || 
    (selectedJobs.healer && Array.isArray(selectedJobs.healer) && 
     (typeof selectedJobs.healer[0] === 'string' ? selectedJobs.healer.includes('SCH') : 
      selectedJobs.healer.some(job => job?.id === 'SCH' && job.selected)))
  );

  const effectiveBaseHealth = baseHealth || { party: 143000, tank: 225000 };
  const { realtimePlan } = useRealtimePlan();
  const planTimelineLayout = useMemo(
    () => getPlanTimelineLayout(realtimePlan),
    [realtimePlan?.timelineLayout]
  );
  const healthConfig = planTimelineLayout?.healthConfig;
  const legacyHealthSettings = realtimePlan?.healthSettings || {};
  const mainTankBaseMaxHealth = healthConfig?.mainTank
    || healthConfig?.defaultTank
    || legacyHealthSettings.tankMaxHealth?.mainTank
    || effectiveBaseHealth.tank;
  const offTankBaseMaxHealth = healthConfig?.offTank
    || healthConfig?.defaultTank
    || legacyHealthSettings.tankMaxHealth?.offTank
    || effectiveBaseHealth.tank;
  const partyBaseMaxHealth = healthConfig?.party
    || legacyHealthSettings.partyMinHealth
    || effectiveBaseHealth.party;

  const unmitigatedDamage = parseUnmitigatedDamage(action.unmitigatedDamage);
  const mitigationPercentage = calculateTotalMitigation(allMitigations, action.damageType, currentBossLevel);

  const mainTankMitigationInfo = (action.isTankBuster || action.isDualTankBuster) ? calculateMitigationInfo('mainTank') : { allMitigations: [], barrierMitigations: [] };
  const offTankMitigationInfo = action.isDualTankBuster ? calculateMitigationInfo('offTank') : { allMitigations: [], barrierMitigations: [] };

  const mainTankMitigationPercentage = calculateTotalMitigation(mainTankMitigationInfo.allMitigations, action.damageType, currentBossLevel);
  const offTankMitigationPercentage = calculateTotalMitigation(offTankMitigationInfo.allMitigations, action.damageType, currentBossLevel);

  const mainTankMitigations = mainTankMitigationInfo.allMitigations;
  const offTankMitigations = offTankMitigationInfo.allMitigations;

  const directMitigationsFull = (assignments[action.id] || [])
    .map(assignment => {
      const fullMitigation = mitigationAbilities.find(m => m.id === assignment.id);
      return fullMitigation ? { ...fullMitigation, ...assignment } : null;
    })
    .filter(mitigation => mitigation && isMitigationAvailable(mitigation, selectedJobs));

  const healingBuffsByJob = useMemo(() => {
    const buffs = {};
    directMitigationsFull.forEach(a => {
      const job = a.jobs?.[0];
      if (!job || !a.healingPotencyBonus) return;
      const val = typeof a.healingPotencyBonus === 'number' ? a.healingPotencyBonus : a.healingPotencyBonus.value || 0;
      const mode = a.healingPotencyBonus.stackMode || 'multiplicative';
      if (!buffs[job]) buffs[job] = { additive: 0, multiplicative: 1 };
      if (mode === 'additive') buffs[job].additive += val;
      else buffs[job].multiplicative *= (1 + val);
    });
    return buffs;
  }, [directMitigationsFull]);

  const withAdjustedBarrierPotency = (mitigation) => {
    if ((mitigation.scaleBarrierWithHealing || mitigation.type === 'healing') && mitigation.barrierFlatPotency) {
      const job = mitigation.jobs?.[0];
      const buffs = healingBuffsByJob[job];
      if (buffs) {
        const mod = (1 + buffs.additive) * buffs.multiplicative;
        return { ...mitigation, barrierFlatPotency: mitigation.barrierFlatPotency * mod };
      }
    }
    return mitigation;
  };

  const directBarrierMitigations = directMitigationsFull.filter(m => m.type === 'barrier' || (m.type === 'healing' && (m.barrierPotency || m.barrierFlatPotency)));
  const healingPotencyPer100 = getHealingPotency(currentBossLevel);
  
  const calcBarrier = (target, maxHp) => directBarrierMitigations.reduce((sum, m) => {
    if (m.target === 'party' || m.target === 'area' || m.targetsTank || (target !== 'party' && (m.tankPosition === 'shared' || m.tankPosition === target))) {
       return sum + calculateBarrierAmount(withAdjustedBarrierPotency(m), maxHp, healingPotencyPer100);
    }
    return sum;
  }, 0);

  const partyBarrierAmount = calcBarrier('party', partyBaseMaxHealth);
  const mainTankBarrierAmount = calcBarrier('mainTank', mainTankBaseMaxHealth);
  const offTankBarrierAmount = calcBarrier('offTank', offTankBaseMaxHealth);

  const computeHpInc = (pos) => directMitigationsFull.reduce((sum, m) => {
    if (m.target === 'party' || m.target === 'area' || m.tankPosition === 'shared' || ((m.target === 'self' || m.target === 'single') && m.tankPosition === pos)) {
      return sum + (m.maxHpIncrease || 0);
    }
    return sum;
  }, 0);

  const mtHpInc = computeHpInc('mainTank');
  const otHpInc = computeHpInc('offTank');
  const mainTankMaxHealthEffective = Math.round(mainTankBaseMaxHealth * (1 + mtHpInc));
  const offTankMaxHealthEffective = Math.round(offTankBaseMaxHealth * (1 + otHpInc));

  const healingPotency = getHealingPotency(currentBossLevel);
  const getHeals = (pos) => directMitigationsFull.filter(m => {
    if (!(m.type === 'healing' || m.healingPotency || m.regenPotency || m.healingPotencyBonus || m.maxHpIncrease)) return false;
    if (pos === 'party') return m.target === 'party' || m.target === 'area' || m.healingPotencyBonus;
    return m.target === 'party' || m.target === 'area' || m.tankPosition === pos || m.tankPosition === 'shared' || m.healingPotencyBonus;
  });

  const partyHealAmt = calculateHealingAmount(getHeals('party'), healingPotency, currentBossLevel, partyBaseMaxHealth);
  const mtHealAmt = calculateHealingAmount(getHeals('mainTank'), healingPotency, currentBossLevel, mainTankBaseMaxHealth);
  const otHealAmt = calculateHealingAmount(getHeals('offTank'), healingPotency, currentBossLevel, offTankBaseMaxHealth);

  const LITURGY_ID = 'liturgy_of_the_bell';
  const hasLiturgy = (pos) => directMitigationsFull.some(m => m.id === LITURGY_ID) || (getActiveMitigations(action.id, action.time, pos === 'party' ? null : pos) || []).some(m => m.id === LITURGY_ID);
  
  const hitCount = (action.isMultiHit && action.hitCount) ? action.hitCount : 1;
  const liturgyAbility = mitigationAbilities.find(m => m.id === LITURGY_ID);
  const litMod = liturgyAbility ? (1 + (healingBuffsByJob[liturgyAbility.jobs?.[0]]?.additive || 0)) * (healingBuffsByJob[liturgyAbility.jobs?.[0]]?.multiplicative || 1) : 1;
  const litHeal = (( (liturgyAbility?.healingPotency || 400) * litMod) / 100) * healingPotency;

  const calcRemaining = (maxHp, barrier, mit) => Math.max(0, maxHp - Math.max(0, unmitigatedDamage - barrier) * (1 - mit));
  
  const partyRem = calcRemaining(partyBaseMaxHealth, partyBarrierAmount, mitigationPercentage) + (hasLiturgy('party') ? Math.max(0, hitCount - 1) * litHeal : 0);
  const mtRem = calcRemaining(mainTankMaxHealthEffective, mainTankBarrierAmount, mainTankMitigationPercentage) + (hasLiturgy('mainTank') ? Math.max(0, hitCount - 1) * litHeal : 0);
  const otRem = calcRemaining(offTankMaxHealthEffective, offTankBarrierAmount, offTankMitigationPercentage) + (hasLiturgy('offTank') ? Math.max(0, hitCount - 1) * litHeal : 0);

  return (
    <SelectionBorder elementType="bossAction" elementId={action.id} showIndicator indicatorPosition="top-right" className="rounded-lg">
      <BossAction $time={action.time} $importance={action.importance} $isSelected={isSelected} $hasAssignments={hasAssignments} $isTouched={isTouched} onClick={handleClick}>
        <PhaseOverrideTimeStrip
          time={action.time}
          summary={phaseSummary}
          phaseOverrides={phaseOverrides}
          skippedActions={skippedActions}
          disabled={phaseOverridesDisabled}
          onChange={onPhaseOverrideChange}
        />
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 w-full">
          <div className="flex-1 flex flex-col p-2.5 min-w-0 overflow-hidden gap-2">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <ContentContainer $hasAssignments={hasAssignments}>
                  <ActionIcon>{action.icon}</ActionIcon>
                  <TextContainer>
                    <ActionName>{action.name}</ActionName>
                    <ActionDescription>{action.description}</ActionDescription>
                  </TextContainer>
                </ContentContainer>

                <div className="flex flex-wrap items-start gap-2 mt-1">
                  <div className="flex flex-col items-start gap-1.5">
                    {hasMitigations && (
                      <div>
                        {action.isDualTankBuster ? (
                          <TankMitigationDisplay 
                            mainTankMitigations={mainTankMitigations} 
                            offTankMitigations={offTankMitigations} 
                            damageType={action.damageType} 
                            bossLevel={currentBossLevel} 
                            mainTankJob={tankPositions.mainTank} 
                            offTankJob={tankPositions.offTank}
                            showOffTank={true}
                          />
                        ) : action.isTankBuster ? (
                          <TankMitigationDisplay 
                            mainTankMitigations={mainTankMitigations} 
                            offTankMitigations={[]} 
                            damageType={action.damageType} 
                            bossLevel={currentBossLevel} 
                            mainTankJob={tankPositions.mainTank} 
                            offTankJob={tankPositions.offTank}
                            showOffTank={false}
                            label="Tank"
                          />
                        ) : (
                          <TankMitigationDisplay 
                            mainTankMitigations={allMitigations} 
                            offTankMitigations={[]} 
                            damageType={action.damageType} 
                            bossLevel={currentBossLevel} 
                            mainTankJob={null}
                            offTankJob={null}
                            showOffTank={false}
                            label="Party"
                          />
                        )}
                      </div>
                    )}
                    {action.unmitigatedDamage && <div className="text-sm font-bold opacity-80">Est. Dmg: {action.unmitigatedDamage}</div>}
                  </div>
                  <div className="ml-auto flex flex-col items-end gap-1">
                    {action.isMultiHit && action.hitCount > 1 && (
                      <Tooltip>
                        <TooltipTrigger asChild><MultiHitIndicator>{action.hitCount}-Hit</MultiHitIndicator></TooltipTrigger>
                        <TooltipContent>Multi-hit: {action.hitCount} hits</TooltipContent>
                      </Tooltip>
                    )}
                    {action.hasDot && (
                      <div className="inline-flex items-center justify-center bg-cyan-100 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-100 font-bold text-sm px-2.5 py-1.5 rounded border border-cyan-200 dark:border-cyan-500/20 select-none">
                        <span className="mr-1">☣️</span> DoT
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <HealerGaugeDisplay selectedBossAction={action} />
              </div>
            </div>

            {unmitigatedDamage > 0 && (
              <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-border/10">
                {action.isTankBuster || action.isDualTankBuster ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <HealthBar label="MT" maxHealth={mainTankMaxHealthEffective} currentHealth={mainTankMaxHealthEffective} damageAmount={unmitigatedDamage} barrierAmount={mainTankBarrierAmount} isTankBuster tankPosition="mainTank" isDualTankBuster={action.isDualTankBuster} applyBarrierFirst mitigationPercentage={mainTankMitigationPercentage} />
                      <HealingHealthBar label="MT" maxHealth={mainTankMaxHealthEffective} remainingHealth={mtRem} healingAmount={mtHealAmt} isTankBuster tankPosition="mainTank" isDualTankBuster={action.isDualTankBuster} />
                    </div>
                    {action.isDualTankBuster && (
                      <div className="flex flex-wrap items-center gap-2">
                        <HealthBar label="OT" maxHealth={offTankMaxHealthEffective} currentHealth={offTankMaxHealthEffective} damageAmount={unmitigatedDamage} barrierAmount={offTankBarrierAmount} isTankBuster tankPosition="offTank" isDualTankBuster applyBarrierFirst mitigationPercentage={offTankMitigationPercentage} />
                        <HealingHealthBar label="OT" maxHealth={offTankMaxHealthEffective} remainingHealth={otRem} healingAmount={otHealAmt} isTankBuster tankPosition="offTank" isDualTankBuster />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <HealthBar label="Dmg" maxHealth={partyBaseMaxHealth} currentHealth={partyBaseMaxHealth} damageAmount={unmitigatedDamage} barrierAmount={partyBarrierAmount} applyBarrierFirst mitigationPercentage={mitigationPercentage} />
                    <HealingHealthBar label="Heal" maxHealth={partyBaseMaxHealth} remainingHealth={partyRem} healingAmount={partyHealAmt} />
                  </div>
                )}
              </div>
            )}
          </div>
          {children}
        </div>
      </BossAction>
    </SelectionBorder>
  );
});

BossActionItem.displayName = 'BossActionItem';
export default BossActionItem;
