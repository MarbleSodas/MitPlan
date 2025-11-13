import { memo, useState, useCallback, useMemo } from 'react';
import Tooltip from '../common/Tooltip/Tooltip';
import HealthBar from '../common/HealthBar';
import HealingHealthBar from '../common/HealingHealthBar';
import TankMitigationDisplay from '../common/TankMitigationDisplay';
import EnhancedAetherflowGauge from '../common/EnhancedAetherflowGauge/EnhancedAetherflowGauge.jsx';
import {
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable,
  calculateMitigatedDamage,
  calculateBarrierAmount,
  getHealingPotency,
  calculateHealingAmount
} from '../../utils';


import { mitigationAbilities } from '../../data';
import { useTankPositionContext } from '../../contexts';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';

const BossAction = ({ children, className = '', $isSelected, $importance, $hasAssignments, $time, $isTouched, ...rest }) => {
  const base = 'relative w-full min-h-[140px] flex flex-col mb-4 rounded-lg p-4 pt-10 shadow-sm border transition-all cursor-pointer bg-[var(--color-cardBackground)] text-[var(--color-text)]';
  const borderSel = $isSelected ? 'border-blue-500' : 'border-[var(--color-border)]';
  const leftBorder = $importance === 'critical'
    ? 'border-l-4 border-l-red-500'
    : $importance === 'high'
      ? 'border-l-4 border-l-orange-500'
      : $importance === 'medium'
        ? 'border-l-4 border-l-amber-500'
        : 'border-l-4 border-l-green-500';
  const hover = 'hover:shadow-md hover:border-blue-500';
  const prAssignments = $hasAssignments
    ? 'pr-[clamp(240px,18vw,320px)] 2xl:pr-[clamp(260px,16vw,340px)] xl:pr-[clamp(220px,15vw,300px)] md:pr-[clamp(170px,24vw,220px)] sm:pr-[clamp(120px,30vw,180px)] xs:pr-[clamp(100px,34vw,150px)]'
    : '';
  return (
    <div {...rest} className={`${base} ${borderSel} ${leftBorder} ${hover} ${prAssignments} ${className}`}>
      {children}
    </div>
  );
};


const ActionTime = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`absolute top-0 left-0 right-0 px-2 h-[30px] flex items-center justify-center text-center font-bold text-[var(--color-text)] bg-black/10 dark:bg-black/30 border-b border-[var(--color-border)] rounded-t-lg select-none z-[1] text-base sm:text-sm ${className}`}
  >
    <span className="mr-1">⏱️</span> {children}
  </div>
);


const ActionIcon = ({ children, className = '', ...rest }) => (
  <span {...rest} className={`inline-flex items-center justify-center w-8 h-8 mr-3 shrink-0 select-none md:w-[30px] md:h-[30px] md:mr-[10px] sm:w-7 sm:h-7 sm:mr-2 xs:w-6 xs:h-6 xs:mr-1.5 ${className}`}>{children}</span>
);


const ActionName = ({ children, className = '', ...rest }) => (
  <h3 {...rest} className={`m-0 font-bold select-none break-words hyphens-auto leading-snug w-full text-xl md:text-lg sm:text-base ${className}`}>{children}</h3>
);


const ActionDescription = ({ children, className = '', ...rest }) => (
  <p
    {...rest}
    className={`m-0 text-[var(--color-textSecondary)] text-base md:text-base sm:text-sm min-h-[40px] leading-relaxed pl-0.5 mb-4 break-words hyphens-auto whitespace-normal w-full ${className}`}
  >
    {children}
  </p>
);


const ContentContainer = ({ children, className = '', $hasAssignments, ...rest }) => (
  <div {...rest} className={`flex items-start my-[10px] w-full max-w-full ${className}`}>{children}</div>
);


const TextContainer = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex-1 min-w-0 break-words ${className}`}>{children}</div>
);

const MitigationPercentage = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`inline-flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/20 text-neutral-800 dark:text-neutral-100 font-bold text-base px-2.5 py-1.5 rounded mt-2 mb-3 border border-blue-500/20 dark:border-blue-500/30 select-none ${className}`}
  >
    <span className="mr-1">🛡️</span> {children}
  </div>
);

const MultiHitIndicator = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`inline-flex items-center justify-center bg-orange-500/10 dark:bg-orange-500/20 text-neutral-800 dark:text-neutral-100 font-bold text-base px-2.5 py-1.5 rounded mt-2 mr-2.5 mb-3 border border-orange-500/20 dark:border-orange-500/30 select-none ${className}`}
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
  onClick,
  children
}) => {
  // State for touch feedback
  const [isTouched] = useState(false);
  const isTouch = false;

  // Tank position context
  const { tankPositions } = useTankPositionContext();



  // Touch event handlers

  // Click handler with touch optimization
  const handleClick = useCallback((e) => {
    // Prevent default behavior to avoid double-tap zoom on mobile
    if (isTouch) {
      e.preventDefault();
    }

    // Call the original onClick handler
    onClick(e);
  }, [onClick, isTouch]);

  // Calculate if this action has any assignments (either direct or inherited)
  const directAssignments = assignments[action.id] || [];
  const activeAssignments = getActiveMitigations ? getActiveMitigations(action.id, action.time) : [];

  // Check if there are any assignments at all (regardless of job availability)
  const hasAssignments = directAssignments.length > 0 || activeAssignments.length > 0;
  // Calculate total mitigation
  const calculateMitigationInfo = (tankPosition = null) => {
    // Get directly assigned mitigations
    const directMitigations = assignments[action.id] || [];

    // Transform assignment objects to full mitigation ability objects and filter by job availability
    let filteredDirectMitigations = directMitigations
      .map(assignment => {
        // Find the full mitigation ability data
        const fullMitigation = mitigationAbilities.find(m => m.id === assignment.id);
        if (!fullMitigation) return null;

        // Return the full mitigation object with assignment metadata
        return {
          ...fullMitigation,
          ...assignment // Include assignment-specific data like tankPosition
        };
      })
      .filter(mitigation => mitigation && isMitigationAvailable(mitigation, selectedJobs));

    // If a tank position is specified, filter mitigations by tank position and targeting type
    if (tankPosition) {
      filteredDirectMitigations = filteredDirectMitigations.filter(mitigation => {
        // Get the full mitigation ability data
        const fullMitigation = mitigationAbilities.find(m => m.id === mitigation.id);
        if (!fullMitigation) return false;

        // For self-targeting abilities (like Rampart), only include if they match this tank position
        if (fullMitigation.target === 'self') {
          return mitigation.tankPosition === tankPosition;
        }

        // For single-target abilities (like Intervention, Heart of Corundum)
        // Only include if they're specifically targeted at this tank position
        if (fullMitigation.target === 'single') {
          return mitigation.tankPosition === tankPosition;
        }

        // For party-wide abilities (like Reprisal, Divine Veil), include for all tanks
        if (fullMitigation.target === 'party' || fullMitigation.target === 'area') {
          return true;
        }

        // Include mitigations specifically for this tank position
        if (mitigation.tankPosition === tankPosition) {
          return true;
        }

        // Include shared mitigations
        if (mitigation.tankPosition === 'shared') {
          return true;
        }

        return false;
      });
    }

    // Get inherited mitigations from previous actions
    const inheritedMitigations = getActiveMitigations(action.id, action.time, tankPosition)
      .map(m => {
        // Find the full mitigation data
        return mitigationAbilities.find(full => full.id === m.id);
      }).filter(Boolean);

    // Filter out inherited mitigations that don't have any corresponding selected jobs
    const filteredInheritedMitigations = inheritedMitigations.filter(mitigation =>
      isMitigationAvailable(mitigation, selectedJobs)
    );

    // If a tank position is specified, filter inherited mitigations by targeting type
    if (tankPosition) {
      const filteredByTarget = filteredInheritedMitigations.filter(mitigation => {
        // For self-targeting abilities (like Rampart), check if they were applied to this tank
        if (mitigation.target === 'self') {
          // Find the original assignment to check its tank position
          const originalAssignment = getActiveMitigations(action.id, action.time, tankPosition)
            .find(m => m.id === mitigation.id);
          return originalAssignment && originalAssignment.tankPosition === tankPosition;
        }

        // For single-target abilities, check if they were cast on this tank
        if (mitigation.target === 'single') {
          // Find the original assignment to check its tank position
          const originalAssignment = getActiveMitigations(action.id, action.time, tankPosition)
            .find(m => m.id === mitigation.id);
          return originalAssignment && originalAssignment.tankPosition === tankPosition;
        }

        // For party-wide abilities, always include
        if (mitigation.target === 'party' || mitigation.target === 'area') {
          return true;
        }

        // For abilities without a specific target, include only if they're shared or for this tank
        const originalAssignment = getActiveMitigations(action.id, action.time, tankPosition)
          .find(m => m.id === mitigation.id);
        return originalAssignment &&
          (originalAssignment.tankPosition === 'shared' || originalAssignment.tankPosition === tankPosition);
      });

      // Use the filtered list
      return {
        allMitigations: [...filteredDirectMitigations, ...filteredByTarget],
        barrierMitigations: [...filteredDirectMitigations, ...filteredByTarget].filter(m => m.type === 'barrier'),
        hasMitigations: filteredDirectMitigations.length > 0 || filteredByTarget.length > 0
      };
    }

    // Combine both types of mitigations
    const allMitigations = [...filteredDirectMitigations, ...filteredInheritedMitigations];

    // Calculate barrier amount
    const barrierMitigations = allMitigations.filter(m => m.type === 'barrier');

    return {
      allMitigations,
      barrierMitigations,
      hasMitigations: allMitigations.length > 0
    };
  };

  // Get general mitigation info (for display in the UI)
  const { allMitigations, hasMitigations } = calculateMitigationInfo();



  // Check if Scholar is selected (handle all possible formats)
  const isScholarSelected = selectedJobs && (
    selectedJobs['SCH'] || // Direct format
    (selectedJobs.healer && Array.isArray(selectedJobs.healer)) && (
      // Optimized format: ["SCH", "WHM"]
      (typeof selectedJobs.healer[0] === 'string' && selectedJobs.healer.includes('SCH')) ||
      // Legacy format: [{ id: "SCH", selected: true }]
      (typeof selectedJobs.healer[0] === 'object' &&
       selectedJobs.healer.some(job => job && job.id === 'SCH' && job.selected))
    )
  );

  // Get the current boss's base health values
  // Use baseHealth from props (provided by RealtimeBossContext) or fallback to default
  const defaultBaseHealth = { party: 143000, tank: 225000 }; // Level 100 defaults
  const effectiveBaseHealth = baseHealth || defaultBaseHealth;
  const { realtimePlan } = useRealtimePlan();
  const healthSettings = realtimePlan?.healthSettings || {};
  const mainTankBaseMaxHealth = (healthSettings.tankMaxHealth && healthSettings.tankMaxHealth.mainTank) || effectiveBaseHealth.tank;
  const offTankBaseMaxHealth = (healthSettings.tankMaxHealth && healthSettings.tankMaxHealth.offTank) || effectiveBaseHealth.tank;
  const partyBaseMaxHealth = (healthSettings.partyMinHealth) || effectiveBaseHealth.party;


  // Parse the unmitigated damage value
  const parseUnmitigatedDamage = () => {
    if (!action.unmitigatedDamage) return 0;

    // Extract numeric value from string (e.g., "~81,436" -> 81436)
    const damageString = action.unmitigatedDamage.replace(/[^0-9]/g, '');
    return parseInt(damageString, 10) || 0;
  };

  const unmitigatedDamage = parseUnmitigatedDamage();

  // Calculate general mitigation percentage (for display in the UI)
  const mitigationPercentage = calculateTotalMitigation(allMitigations, action.damageType, currentBossLevel);




  // Calculate tank-specific mitigation percentages
  // Get the mitigation info for each tank position
  const mainTankMitigationInfo = (action.isTankBuster || action.isDualTankBuster) ?
    calculateMitigationInfo('mainTank') : { allMitigations: [], barrierMitigations: [] };
  // For dual tank busters, always calculate off tank mitigation (party-wide abilities should apply)
  const offTankMitigationInfo = (action.isDualTankBuster) ?
    calculateMitigationInfo('offTank') : { allMitigations: [], barrierMitigations: [] };



  // Extract the mitigations for each tank
  const mainTankMitigations = mainTankMitigationInfo.allMitigations;
  const offTankMitigations = offTankMitigationInfo.allMitigations;

  // Calculate the mitigation percentages for each tank
  // Always calculate from the filtered mitigations, never fall back to the general percentage
  const mainTankMitigationPercentage = calculateTotalMitigation(mainTankMitigations, action.damageType, currentBossLevel);
  const offTankMitigationPercentage = calculateTotalMitigation(offTankMitigations, action.damageType, currentBossLevel);

  // Calculate the mitigated damage for each tank (values unused in UI; omit to reduce warnings)

  // For health bar visuals, restrict shields and heals to abilities assigned to THIS action only
  // Build direct-only mitigations (full ability objects) from assignments for this action
  const directMitigationsFull = (assignments[action.id] || [])
    .map(assignment => {
      const fullMitigation = mitigationAbilities.find(m => m.id === assignment.id);
      if (!fullMitigation) return null;
      return { ...fullMitigation, ...assignment };
    })
    .filter(mitigation => mitigation && isMitigationAvailable(mitigation, selectedJobs));

  // Compute per-job healing potency bonuses present on this action (for healing-based barriers)
  const healingBuffsByJob = useMemo(() => {
    const buffs = {};
    directMitigationsFull.forEach(a => {
      const job = Array.isArray(a.jobs) && a.jobs.length > 0 ? a.jobs[0] : null;
      if (!job) return;
      const bonus = a.healingPotencyBonus || null;
      let value = 0;
      let stackMode = 'multiplicative';
      if (bonus) {
        if (typeof bonus === 'number') {
          value = bonus;
        } else if (typeof bonus === 'object' && bonus.value !== undefined) {
          value = bonus.value;
          if (bonus.stackMode) stackMode = bonus.stackMode;
        }
        if (!buffs[job]) buffs[job] = { additive: 0, multiplicative: 1 };
        if (stackMode === 'additive') {
          buffs[job].additive += value;
        } else {
          buffs[job].multiplicative *= (1 + value);
        }
      }
    });
    return buffs;
  }, [directMitigationsFull]);

  const computeHealingModifierForAbility = (ability) => {
    const job = Array.isArray(ability.jobs) && ability.jobs.length > 0 ? ability.jobs[0] : null;
    if (!job || !healingBuffsByJob[job]) return 1;
    const add = healingBuffsByJob[job].additive || 0;
    const mult = healingBuffsByJob[job].multiplicative || 1;
    return (1 + add) * mult;
  };

  const withAdjustedBarrierPotency = (mitigation) => {
    // Only scale healing-based barriers. We detect those as either explicit flag or type 'healing'
    if ((mitigation.scaleBarrierWithHealing || mitigation.type === 'healing') && mitigation.barrierFlatPotency && mitigation.barrierFlatPotency > 0) {
      const modifier = computeHealingModifierForAbility(mitigation);
      if (modifier !== 1) {
        return { ...mitigation, barrierFlatPotency: mitigation.barrierFlatPotency * modifier };
      }
    }
    return mitigation;
  };
  // Include healing abilities that grant barriers (e.g., Adloquium, Succor)
const directBarrierMitigations = directMitigationsFull.filter(m => m.type === 'barrier' || (m.type === 'healing' && (m.barrierPotency || m.barrierFlatPotency)));

  // Calculate barrier amounts for party and tanks (direct-only)
  const healingPotencyPer100 = getHealingPotency(currentBossLevel);
  const partyBarrierAmount = directBarrierMitigations.reduce((total, mitigation) => {
    // accept both % and flat potency barriers

    // Only count party/area barriers for party health bar
    if (mitigation.target === 'party' || mitigation.target === 'area') {
      return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), partyBaseMaxHealth, healingPotencyPer100);
    }

    return total;
  }, 0);

  // Generic tank barrier amount for when no tank positions are assigned (direct-only)
  const tankBarrierAmount = directBarrierMitigations.reduce((total, mitigation) => {
    // Party/area barriers apply to tanks as well
    if (mitigation.target === 'party' || mitigation.target === 'area') {
      return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), baseHealth.tank, healingPotencyPer100);
    }

    // For self-targeting barriers, only include if explicitly shared (unknown target tank in generic case)
    if (mitigation.target === 'self' && mitigation.tankPosition) {
      if (mitigation.tankPosition === 'shared') {
        return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), baseHealth.tank, healingPotencyPer100);
      }
      return total;
    }

    // For single-target barriers, only include if explicitly shared (unknown target tank in generic case)
    if (mitigation.target === 'single' && mitigation.tankPosition) {
      if (mitigation.tankPosition === 'shared') {
        return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), baseHealth.tank, healingPotencyPer100);
      }
      return total;
    }

    // For other barriers that explicitly target tanks
    if (mitigation.targetsTank) {
      return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), baseHealth.tank, healingPotencyPer100);
    }

    return total;
  }, 0);

  // Calculate barrier amounts for main tank using direct-only barriers
  const mainTankBarrierAmount = action.isTankBuster && tankPositions.mainTank ?
    directBarrierMitigations.reduce((total, mitigation) => {
      if (!(mitigation.barrierPotency > 0 || mitigation.barrierFlatPotency > 0)) return total;

      // For self-targeting barriers, only include if they match this tank position
      if (mitigation.target === 'self') {
        if (mitigation.tankPosition === 'mainTank') {
          return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), mainTankBaseMaxHealth, healingPotencyPer100);
        }
        return total;
      }

      // For single-target barriers, only include if they're targeted at this tank
      if (mitigation.target === 'single') {
        if (mitigation.tankPosition === 'mainTank') {
          return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), mainTankBaseMaxHealth, healingPotencyPer100);
        }
        return total;
      }

      // For party-wide/area barriers, include for all tanks
      if (mitigation.target === 'party' || mitigation.target === 'area') {
        return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), mainTankBaseMaxHealth, healingPotencyPer100);
      }

      // Include barriers specifically for this tank position
      if (mitigation.tankPosition === 'mainTank' || mitigation.tankPosition === 'shared') {
        return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), mainTankBaseMaxHealth, healingPotencyPer100);
      }

      return total;
    }, 0) : tankBarrierAmount;

  // Calculate barrier amounts for off tank using direct-only barriers
  const offTankBarrierAmount = action.isTankBuster && tankPositions.offTank ?
    directBarrierMitigations.reduce((total, mitigation) => {
      if (!(mitigation.barrierPotency > 0 || mitigation.barrierFlatPotency > 0)) return total;

      // For self-targeting barriers, only include if they match this tank position
      if (mitigation.target === 'self') {
        if (mitigation.tankPosition === 'offTank') {
          return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), offTankBaseMaxHealth, healingPotencyPer100);
        }
        return total;
      }

      // For single-target barriers, only include if they're targeted at this tank
      if (mitigation.target === 'single') {
        if (mitigation.tankPosition === 'offTank') {
          return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), offTankBaseMaxHealth, healingPotencyPer100);
        }
        return total;
      }

      // For party-wide/area barriers, include for all tanks
      if (mitigation.target === 'party' || mitigation.target === 'area') {
        return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), offTankBaseMaxHealth, healingPotencyPer100);
      }

      // Include barriers specifically for this tank position
      if (mitigation.tankPosition === 'offTank' || mitigation.tankPosition === 'shared') {
        return total + calculateBarrierAmount(withAdjustedBarrierPotency(mitigation), offTankBaseMaxHealth, healingPotencyPer100);
      }

      return total;
    }, 0) : tankBarrierAmount;

  // Compute visual max HP increases from direct assignments
  const computeHpIncreaseForTank = (tankPos) => {
    return directMitigationsFull.reduce((sum, mitigation) => {
      const inc = mitigation.maxHpIncrease || 0;
      if (!inc) return sum;

      if (mitigation.target === 'party' || mitigation.target === 'area') return sum + inc; // affects everyone
      if (mitigation.tankPosition === 'shared') return sum + inc; // shared applies to both

      if (mitigation.target === 'self') {
        return mitigation.tankPosition === tankPos ? sum + inc : sum;
      }
      if (mitigation.target === 'single') {
        return mitigation.tankPosition === tankPos ? sum + inc : sum;
      }
      return sum;
    }, 0);
  };

  const mainTankHpIncrease = computeHpIncreaseForTank('mainTank');
  const offTankHpIncrease = computeHpIncreaseForTank('offTank');

  const mainTankMaxHealthEffective = Math.round(mainTankBaseMaxHealth * (1 + mainTankHpIncrease));
  const offTankMaxHealthEffective = Math.round(offTankBaseMaxHealth * (1 + offTankHpIncrease));

  // Calculate healing amounts (direct-only)
  const healingPotency = getHealingPotency(currentBossLevel);

  // Direct healing abilities and healing potency buffs assigned to this action
  // Include:
  // - healing abilities (type === 'healing')
  // - abilities with regen effects (regenPotency)
  // - abilities that provide healing potency bonuses (healingPotencyBonus)
  const directHealingAbilitiesAll = directMitigationsFull.filter(m => (
    m.type === 'healing' ||
    (m.healingPotency && m.healingPotency > 0) ||
    (m.regenPotency && m.regenPotency > 0) ||
    (m.healingPotencyBonus !== undefined) ||
    // Include max HP increase abilities so their instant heal (amount increased) is applied
    (m.maxHpIncrease && m.maxHpIncrease > 0)
  ));

  // Party healing: include party/area heals, plus any healing potency buffs present on this action (regardless of target)
  const partyHealingAbilities = directHealingAbilitiesAll.filter(m => (
    (m.target === 'party' || m.target === 'area') || (m.healingPotencyBonus !== undefined)
  ));

  // Tank-specific healing abilities for each tank (include party/area heals as they benefit both)
  const mainTankHealingAbilities = directHealingAbilitiesAll.filter(m => {
    if (m.target === 'self') return m.tankPosition === 'mainTank';
    if (m.target === 'single') return m.tankPosition === 'mainTank';
    if (m.target === 'party' || m.target === 'area') return true;
    if (m.tankPosition === 'mainTank' || m.tankPosition === 'shared') return true;
    return false;
  });

  const offTankHealingAbilities = directHealingAbilitiesAll.filter(m => {
    if (m.target === 'self') return m.tankPosition === 'offTank';
    if (m.target === 'single') return m.tankPosition === 'offTank';
    if (m.target === 'party' || m.target === 'area') return true;
    if (m.tankPosition === 'offTank' || m.tankPosition === 'shared') return true;
    return false;
  });

  // Include any healing potency buff abilities to ensure they influence calculations for tanks
  const healingBuffs = directHealingAbilitiesAll.filter(m => m.healingPotencyBonus !== undefined);
  const dedupById = (arr) => {
    const seen = new Set();
    return arr.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };
  const mainTankHealingWithBuffs = dedupById([...mainTankHealingAbilities, ...healingBuffs]);
  const offTankHealingWithBuffs = dedupById([...offTankHealingAbilities, ...healingBuffs]);

  // Calculate healing amounts
  const partyHealingAmount = calculateHealingAmount(partyHealingAbilities, healingPotency, currentBossLevel, partyBaseMaxHealth);
  const mainTankHealingAmount = calculateHealingAmount(mainTankHealingWithBuffs, healingPotency, currentBossLevel, mainTankBaseMaxHealth);
  const offTankHealingAmount = calculateHealingAmount(offTankHealingWithBuffs, healingPotency, currentBossLevel, offTankBaseMaxHealth);

  // --- Liturgy of the Bell support (triggered heal per hit and across actions) ---
  const LITURGY_ID = 'liturgy_of_the_bell';
  const liturgyAbility = mitigationAbilities.find(m => m.id === LITURGY_ID) || null;
  const liturgyPotency = liturgyAbility && typeof liturgyAbility.healingPotency === 'number' ? liturgyAbility.healingPotency : 400;
  const liturgyHealModifier = liturgyAbility ? computeHealingModifierForAbility(liturgyAbility) : 1;
  const liturgyHealPerStack = ((liturgyPotency * liturgyHealModifier) / 100) * healingPotency;
  const hitCount = (action.isMultiHit && action.hitCount) ? action.hitCount : 1;
  const interHitHealsCount = Math.max(0, hitCount - 1);

  // Detect whether Liturgy is active on this action (either directly assigned or inherited from a previous action)
  const hasLiturgyDirect = directMitigationsFull.some(m => m.id === LITURGY_ID);
  const hasLiturgyInheritedParty = (typeof getActiveMitigations === 'function' ? (getActiveMitigations(action.id, action.time) || []) : []).some(m => m.id === LITURGY_ID);
  const hasLiturgyInheritedMT = (typeof getActiveMitigations === 'function' ? (getActiveMitigations(action.id, action.time, 'mainTank') || []) : []).some(m => m.id === LITURGY_ID);
  const hasLiturgyInheritedOT = (typeof getActiveMitigations === 'function' ? (getActiveMitigations(action.id, action.time, 'offTank') || []) : []).some(m => m.id === LITURGY_ID);
  const liturgyActiveParty = hasLiturgyDirect || hasLiturgyInheritedParty;
  const liturgyActiveMT = hasLiturgyDirect || hasLiturgyInheritedMT;
  const liturgyActiveOT = hasLiturgyDirect || hasLiturgyInheritedOT;

  // Adjust HealingHealthBar inputs to account for triggered heals between hits (all but last)
  const partyRemainingBase = Math.max(0, partyBaseMaxHealth - Math.max(0, unmitigatedDamage - partyBarrierAmount) * (1 - mitigationPercentage));
  const partyRemainingAfterDamageWithLiturgy = liturgyActiveParty
    ? Math.min(partyBaseMaxHealth, partyRemainingBase + interHitHealsCount * liturgyHealPerStack)
    : partyRemainingBase;

  const mainTankRemainingBaseDual = Math.max(0, mainTankMaxHealthEffective - Math.max(0, unmitigatedDamage - mainTankBarrierAmount) * (1 - mainTankMitigationPercentage));
  const mainTankRemainingAfterDamageWithLiturgy = liturgyActiveMT
    ? Math.min(mainTankMaxHealthEffective, mainTankRemainingBaseDual + interHitHealsCount * liturgyHealPerStack)
    : mainTankRemainingBaseDual;

  const offTankRemainingBaseDual = Math.max(0, offTankMaxHealthEffective - Math.max(0, unmitigatedDamage - offTankBarrierAmount) * (1 - offTankMitigationPercentage));
  const offTankRemainingAfterDamageWithLiturgy = liturgyActiveOT
    ? Math.min(offTankMaxHealthEffective, offTankRemainingBaseDual + interHitHealsCount * liturgyHealPerStack)
    : offTankRemainingBaseDual;

  // For single-target TB path, the applied barrier/mitigation can differ when no MT is selected
  const singleMainBarrier = tankPositions.mainTank ? mainTankBarrierAmount : tankBarrierAmount;
  const singleMainMitigation = tankPositions.mainTank ? mainTankMitigationPercentage : mitigationPercentage;
  const mainTankRemainingBaseSingle = Math.max(0, mainTankMaxHealthEffective - Math.max(0, unmitigatedDamage - singleMainBarrier) * (1 - singleMainMitigation));
  const mainTankRemainingAfterDamageWithLiturgySingle = liturgyActiveMT
    ? Math.min(mainTankMaxHealthEffective, mainTankRemainingBaseSingle + interHitHealsCount * liturgyHealPerStack)
    : mainTankRemainingBaseSingle;

  // Ensure the final heal from the last hit appears in the After Healing bar even if Liturgy was precast (inherited)
  const liturgyDirectOnParty = partyHealingAbilities.some(m => m.id === LITURGY_ID);
  const liturgyDirectOnMainTank = mainTankHealingAbilities.some(m => m.id === LITURGY_ID);
  const liturgyDirectOnOffTank = offTankHealingAbilities.some(m => m.id === LITURGY_ID);

  const partyHealingAmountAdjusted = partyHealingAmount + ((liturgyActiveParty && !liturgyDirectOnParty) ? liturgyHealPerStack : 0);
  const mainTankHealingAmountAdjusted = mainTankHealingAmount + ((liturgyActiveMT && !liturgyDirectOnMainTank) ? liturgyHealPerStack : 0);
  const offTankHealingAmountAdjusted = offTankHealingAmount + ((liturgyActiveOT && !liturgyDirectOnOffTank) ? liturgyHealPerStack : 0);


  return (
    <BossAction
      $time={action.time}
      $importance={action.importance}
      $isSelected={isSelected}
      $hasAssignments={hasAssignments}
      $isTouched={isTouched}
      onClick={handleClick}
    >
      <ActionTime>{action.time} seconds</ActionTime>
      <ContentContainer $hasAssignments={hasAssignments}>
        <ActionIcon>
          {action.icon}
        </ActionIcon>
        <TextContainer>
          <ActionName>{action.name}</ActionName>
          <ActionDescription>
            {action.description}
          </ActionDescription>
        </TextContainer>
      </ContentContainer>

      {/* Display multi-hit indicator for multi-hit tank busters and raid-wide abilities */}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {action.isMultiHit && action.hitCount > 1 && (
          <Tooltip content={`This ${action.isTankBuster ? 'tank buster' : 'ability'} consists of ${action.hitCount} hits ${action.originalDamagePerHit ? `with ${action.originalDamagePerHit} damage per hit` : ''}`}>
            <MultiHitIndicator>
              {action.hitCount}-Hit {action.isTankBuster ? 'Tank Buster' : 'Ability'}
            </MultiHitIndicator>
          </Tooltip>
        )}

        {action.unmitigatedDamage && (
          <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
            Unmitigated Damage: {action.unmitigatedDamage}
            {action.isMultiHit && action.originalDamagePerHit && (
              <span style={{ fontSize: '0.9em', marginLeft: '5px', fontWeight: 'normal' }}>
                ({action.hitCount} × {action.originalDamagePerHit})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Display mitigation percentage if there are any mitigations */}
      {hasMitigations && (
        <>
          {/* For dual tank busters, show separate mitigation displays for each tank */}
          {action.isDualTankBuster ? (
            <TankMitigationDisplay
              mainTankMitigations={mainTankMitigations}
              offTankMitigations={offTankMitigations}
              damageType={action.damageType}
              bossLevel={currentBossLevel}
              mainTankJob={tankPositions.mainTank}
              offTankJob={tankPositions.offTank}
            />
          ) : (
            /* For non-dual tank busters, show the standard mitigation display */
            <Tooltip
              content={generateMitigationBreakdown(allMitigations, action.damageType, currentBossLevel)}
            >
              <MitigationPercentage>
                Damage Mitigated: {formatMitigation(mitigationPercentage)}
              </MitigationPercentage>
            </Tooltip>
          )}
        </>
      )}
      {/* Display health bars if we have unmitigated damage */}
      {unmitigatedDamage > 0 && (
        <>
          {/* Show tank or party health bar, with AetherflowGauge adjacent if selected and Scholar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {action.isTankBuster || action.isDualTankBuster ? (
              <>
                {/* For dual tank busters */}
                {action.isDualTankBuster ? (
                  <>
                    {/* Main Tank - show "N/A" if no tank is selected */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <HealthBar
                        label={`MT (${tankPositions.mainTank || 'N/A'})`}
                        maxHealth={mainTankMaxHealthEffective}
                        currentHealth={mainTankMaxHealthEffective}
                        damageAmount={unmitigatedDamage}
                        barrierAmount={mainTankBarrierAmount}
                        isTankBuster={true}
                        tankPosition="mainTank"
                        isDualTankBuster={true}
                        applyBarrierFirst={true}
                        mitigationPercentage={mainTankMitigationPercentage}
                      />
                      {/* Main Tank Healing Health Bar - Always show */}
                      <HealingHealthBar
                        label={`MT (${tankPositions.mainTank || 'N/A'})`}
                        maxHealth={mainTankMaxHealthEffective}
                        remainingHealth={mainTankRemainingAfterDamageWithLiturgy}
                        healingAmount={mainTankHealingAmountAdjusted}
                        barrierAmount={0} // Barriers are already accounted for in remaining health
                        isTankBuster={true}
                        tankPosition="mainTank"
                        isDualTankBuster={true}
                      />
                      {isSelected && isScholarSelected && (
                        <EnhancedAetherflowGauge selectedBossAction={action} />
                      )}
                    </div>

                    {/* Off Tank - show "N/A" if no tank is selected */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <HealthBar
                        label={`OT (${tankPositions.offTank || 'N/A'})`}
                        maxHealth={offTankMaxHealthEffective}
                        currentHealth={offTankMaxHealthEffective}
                        damageAmount={unmitigatedDamage}
                        barrierAmount={offTankBarrierAmount}
                        isTankBuster={true}
                        tankPosition="offTank"
                        isDualTankBuster={true}
                        applyBarrierFirst={true}
                        mitigationPercentage={offTankMitigationPercentage}
                      />
                      {/* Off Tank Healing Health Bar - Always show */}
                      <HealingHealthBar
                        label={`OT (${tankPositions.offTank || 'N/A'})`}
                        maxHealth={offTankMaxHealthEffective}
                        remainingHealth={offTankRemainingAfterDamageWithLiturgy}
                        healingAmount={offTankHealingAmountAdjusted}
                        barrierAmount={0} // Barriers are already accounted for in remaining health
                        isTankBuster={true}
                        tankPosition="offTank"
                        isDualTankBuster={true}
                      />
                    </div>
                  </>
                ) : (
                  /* For single-target tank busters, only show the Main Tank health bar */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <HealthBar
                      label={`MT (${tankPositions.mainTank || 'N/A'})`}
                      maxHealth={mainTankMaxHealthEffective}
                      currentHealth={mainTankMaxHealthEffective}
                      damageAmount={unmitigatedDamage}
                      barrierAmount={tankPositions.mainTank ? mainTankBarrierAmount : tankBarrierAmount}
                      isTankBuster={true}
                      tankPosition="mainTank"
                      applyBarrierFirst={true}
                      mitigationPercentage={tankPositions.mainTank ? mainTankMitigationPercentage : mitigationPercentage}
                    />
                    {/* Main Tank Healing Health Bar for single tank busters - Always show */}
                    <HealingHealthBar
                      label={`MT (${tankPositions.mainTank || 'N/A'})`}
                      maxHealth={mainTankMaxHealthEffective}
                      remainingHealth={mainTankRemainingAfterDamageWithLiturgySingle}
                      healingAmount={mainTankHealingAmountAdjusted}
                      barrierAmount={0} // Barriers are already accounted for in remaining health
                      isTankBuster={true}
                      tankPosition="mainTank"
                    />
                    {isSelected && isScholarSelected && (
                      <EnhancedAetherflowGauge selectedBossAction={action} />
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <HealthBar
                  label="After Damage"
                  maxHealth={partyBaseMaxHealth}
                  currentHealth={partyBaseMaxHealth}
                  damageAmount={unmitigatedDamage}
                  barrierAmount={partyBarrierAmount}
                  isTankBuster={false}
                  applyBarrierFirst={true}
                  mitigationPercentage={mitigationPercentage}
                />
                {/* Party Healing Health Bar - Always show */}
                <HealingHealthBar
                  label="After Healing"
                  maxHealth={partyBaseMaxHealth}
                  remainingHealth={partyRemainingAfterDamageWithLiturgy}
                  healingAmount={partyHealingAmountAdjusted}
                  barrierAmount={0} // Barriers are already accounted for in remaining health
                  isTankBuster={false}
                />
                {isSelected && isScholarSelected && (
                  <EnhancedAetherflowGauge selectedBossAction={action} />
                )}
              </div>
            )}
          </div>
        </>
      )}



      {/* Display Aetherflow gauge if Scholar is selected and this is the selected boss action */}
      {/* (Moved next to tank health bar for tank busters) */}

      {/* Render children (assigned mitigations) */}
      {children}
    </BossAction>
  );
});

BossActionItem.displayName = 'BossActionItem';

export default BossActionItem;
