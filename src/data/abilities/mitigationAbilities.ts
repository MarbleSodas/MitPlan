/**
 * FFXIV mitigation abilities data
 *
 * target property values:
 * - 'self': Only affects the caster
 * - 'single': Can be cast on a single target
 * - 'party': Affects the entire party
 * - 'area': Affects players in a specific area
 *
 * count property:
 * - Specifies the number of charges an ability has (default: 1)
 * - For abilities with multiple charges, each charge has its own cooldown
 * - An ability can only be used once per boss action, regardless of available charges
 *
 * isRoleShared property:
 * - When true, this ability can be provided by multiple players of the same role
 * - The number of available instances depends on how many players of the relevant role are selected
 * - Each instance has its own cooldown tracking
 * - Only one instance of a specific ability can be used per boss action
 *
 * consumesAetherflow property:
 * - When true, this ability consumes one Aetherflow stack when used
 * - Only relevant for Scholar abilities that use the Aetherflow resource
 *
 * isAetherflowProvider property:
 * - When true, this ability provides Aetherflow stacks (Aetherflow ability)
 * - Refreshes all Aetherflow stacks to maximum (3)
 *
 * sharedCooldownGroup property:
 * - When present, this ability shares its cooldown with other abilities in the same group
 * - When one ability in the group is used, all abilities in the group go on cooldown
 * - Example: Bloodwhetting and Nascent Flash share the same cooldown group
 *
 * healingPotency property:
 * - For healing abilities, specifies the instant healing potency
 * - For abilities with regen effects, this is only the instant component
 *
 * regenPotency property:
 * - For abilities with regen effects, specifies the healing potency per tick
 * - Total regen healing = (duration / 3) * regenPotency
 * - Total healing = healingPotency + total regen healing
 */

import type { MitigationAbility } from '../../types';

export const mitigationAbilities: MitigationAbility[] = [
  // Tank invulnerability abilities
  {
    id: 'hallowed_ground',
    name: 'Hallowed Ground',
    description: 'Renders you impervious to most attacks',
    levelRequirement: 50,
    levelDescriptions: {
      50: 'Renders you impervious to most attacks for 10s'
    },
    duration: 10,
    cooldown: 420,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/hallowed_ground.png',
    type: 'invulnerability',
    mitigationValue: 1.0, // 100% mitigation
    damageType: 'both',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'holmgang',
    name: 'Holmgang',
    description: 'Prevents most attacks from reducing your HP to less than 1',
    levelRequirement: 42,
    levelDescriptions: {
      42: 'Prevents most attacks from reducing your HP to less than 1 for 10s'
    },
    duration: 10,
    cooldown: 240,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/holmgang.png',
    type: 'invulnerability',
    mitigationValue: 1.0, // 100% mitigation
    damageType: 'both',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'living_dead',
    name: 'Living Dead',
    description: 'When HP is reduced to 0, instead of becoming KO\'d, your status will change to Walking Dead',
    levelRequirement: 50,
    levelDescriptions: {
      50: 'When HP is reduced to 0, instead of becoming KO\'d, your status will change to Walking Dead for 10s. Restores HP with each weaponskill or spell cast.'
    },
    duration: 10,
    cooldown: 300,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/living_dead.png',
    type: 'invulnerability',
    mitigationValue: 1.0, // 100% mitigation
    damageType: 'both',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'superbolide',
    name: 'Superbolide',
    description: 'Reduces HP by 50% of maximum and renders you impervious to most attacks',
    levelRequirement: 50,
    levelDescriptions: {
      50: 'Reduces HP by 50% of maximum and renders you impervious to most attacks for 10s'
    },
    duration: 10,
    cooldown: 360,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/superbolide.png',
    type: 'invulnerability',
    mitigationValue: 1.0, // 100% mitigation
    damageType: 'both',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
  },

  // Tank role abilities
  {
    id: 'reprisal',
    name: 'Reprisal',
    description: 'Reduces damage dealt by nearby enemies by 10%',
    levelRequirement: 22,
    // Description is the same at all levels
    levelDescriptions: {
      22: 'Reduces damage dealt by nearby enemies by 10% for 10s',
      98: 'Reduces damage dealt by nearby enemies by 10% for 15s'
    },
    duration: 15,
    cooldown: 60,
    jobs: ['PLD', 'WAR', 'DRK', 'GNB'],
    icon: '/abilities-gamerescape/reprisal.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    // Mitigation value is always 10% at all levels
    levelMitigationValues: {
      22: 0.10, // At level 22, mitigation is 10%
      98: 0.10  // At level 98, mitigation is 10% with extended duration
    },
    damageType: 'both',
    target: 'area', // Area effect that affects all enemies in range
    forTankBusters: true, // Works for tank busters
    forRaidWide: true, // Works for raid-wide damage
    isRoleShared: true, // Can be provided by multiple tanks
    count: 1 // Each tank has 1 charge of Reprisal
  },
  {
    id: 'rampart',
    name: 'Rampart',
    description: 'Reduces damage taken by 20%',
    levelRequirement: 8,
    // Description is the same at all levels
    levelDescriptions: {
      8: 'Reduces damage taken by 20% for 20s',
      94: 'Reduces damage taken by 20% for 20s and increases HP recovery via healing actions by 15%'
    },
    duration: 20,
    cooldown: 90,
    jobs: ['PLD', 'WAR', 'DRK', 'GNB'],
    icon: '/abilities-gamerescape/rampart.png',
    type: 'mitigation',
    mitigationValue: 0.20,
    // Mitigation value is always 20% at all levels
    levelMitigationValues: {
      8: 0.20,  // At level 8, mitigation is 20%
      94: 0.20  // At level 94, mitigation is 20% with healing bonus
    },
    damageType: 'both',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false,
    // Each tank has their own Rampart, but it's not a charge-based ability
    isRoleShared: true, // This allows tracking separate instances per tank
    count: 1 // Rampart has only 1 charge per tank
  },

  // Paladin specific
  {
    id: 'sentinel',
    name: 'Sentinel',
    description: 'Reduces damage taken by 30%',
    levelRequirement: 38,
    levelDescriptions: {
      38: 'Reduces damage taken by 30% for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/sentinel.png',
    type: 'mitigation',
    mitigationValue: 0.30,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true,
    forRaidWide: false,
    count: 1, // Has 1 charge
    upgradedBy: 'guardian' // Replaced by Guardian at level 92
  },
  {
    id: 'passage',
    name: 'Passage of Arms',
    description: 'Reduces damage taken by party members behind you by 15%',
    levelRequirement: 70,
    levelDescriptions: {
      70: 'Increases block rate to 100% and reduces damage taken by party members behind you by 15% for 18s'
    },
    duration: 18,
    cooldown: 120,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/passage_of_arms.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    damageType: 'both',
    target: 'party', // Affects all party members behind the PLD
    forTankBusters: false, // Not typically used for tank busters
    forRaidWide: true, // Primarily used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'divine_veil',
    name: 'Divine Veil',
    description: 'Creates a barrier around self and nearby party members that absorbs damage',
    levelRequirement: 56,
    levelDescriptions: {
      56: 'Creates a barrier around self and nearby party members that absorbs damage for 30s',
      88: 'Creates a barrier around self and nearby party members that absorbs damage and restores HP for 30s'
    },
    duration: 30,
    cooldown: 90,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/divine_veil.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierPotency: 0.10, // Barrier absorbs 10% of max HP
    damageType: 'both',
    target: 'party', // Affects all party members
    forTankBusters: false, // Not typically used for tank busters
    forRaidWide: true, // Primarily used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'holy_sheltron',
    name: 'Holy Sheltron',
    description: 'Reduces damage taken by 15% and grants a healing over time effect',
    levelRequirement: 82,
    levelDescriptions: {
      82: 'Reduces damage taken by 15% and grants a healing over time effect for 8s'
    },
    duration: 8,
    cooldown: 5, // Uses oath gauge, not a traditional cooldown
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/holy_sheltron.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    regenPotency: 250, // 250 potency per tick for healing over time
    regenDuration: 8,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1 // Has 1 charge (uses oath gauge)
  },
  {
    id: 'intervention',
    name: 'Intervention',
    description: 'Reduces target party member\'s damage taken by 10% and grants healing over time',
    levelRequirement: 62,
    levelDescriptions: {
      62: 'Reduces target party member\'s damage taken by 10% for 6s',
      82: 'Reduces target party member\'s damage taken by 10% for 8s and grants healing over time for 12s'
    },
    duration: 8,
    cooldown: 10, // Uses oath gauge, not a traditional cooldown
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/intervention.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    levelMitigationValues: {
      62: 0.10, // At level 62, mitigation is 10%
      82: 0.10  // At level 82, mitigation is 10% with healing over time
    },
    regenPotency: 250, // 250 potency per tick for healing over time (level 82+)
    regenDuration: 12, // Healing over time lasts for 12s at level 82+
    damageType: 'both',
    target: 'single', // Can be cast on another player
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    targetsTank: true, // Can target other tanks
    count: 1 // Has 1 charge (uses oath gauge)
  },
  {
    id: 'guardian',
    name: 'Guardian',
    description: 'Reduces damage taken by 40%',
    levelRequirement: 92,
    levelDescriptions: {
      92: 'Reduces damage taken by 40% for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/guardian.png',
    type: 'mitigation',
    mitigationValue: 0.40,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Primarily used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    description: 'Blocks all incoming attacks for 10 seconds',
    levelRequirement: 52,
    levelDescriptions: {
      52: 'Increases block rate to 100% for 10s (approximately 20% physical damage reduction per blocked attack)'
    },
    duration: 10,
    cooldown: 90,
    jobs: ['PLD'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/01_PLD/Bulwark.png',
    type: 'mitigation',
    mitigationValue: 0.20,
    damageType: 'physical',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false,
    count: 1
  },

  // Warrior specific
  {
    id: 'vengeance',
    name: 'Vengeance',
    description: 'Reduces damage taken by 30%',
    levelRequirement: 38,
    levelDescriptions: {
      38: 'Reduces damage taken by 30% for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/vengeance.png',
    type: 'mitigation',
    mitigationValue: 0.30,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Primarily used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1, // Has 1 charge
    upgradedBy: 'damnation' // This ability is replaced by Damnation at level 92
  },
  {
    id: 'shake',
    name: 'Shake It Off',
    description: 'Creates a barrier around self and nearby party members that absorbs damage and applies regen',
    levelRequirement: 68,
    levelDescriptions: {
      68: 'Creates a barrier around self and nearby party members that absorbs damage for 30s',
      76: 'Creates a barrier around self and nearby party members that absorbs damage and applies regen for 30s'
    },
    duration: 30,
    cooldown: 90,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/shake_it_off.png',
    type: 'barrier',
    mitigationValue: 0, // Changed to 0 since this is a barrier, not direct mitigation
    barrierPotency: 0.15, // 15% max HP barrier
    damageType: 'both',
    target: 'party', // Affects all party members
    forTankBusters: false, // Not typically used for tank busters
    forRaidWide: true, // Primarily used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'bloodwhetting',
    name: 'Bloodwhetting',
    description: 'Reduces damage taken by 10% and grants healing over time',
    levelRequirement: 82,
    levelDescriptions: {
      82: 'Reduces damage taken by 10% and grants healing over time for 8s'
    },
    duration: 8,
    cooldown: 25,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/bloodwhetting.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    regenPotency: 400, // 400 potency per tick for healing over time
    regenDuration: 8,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1, // Has 1 charge
    sharedCooldownGroup: 'war_bloodwhetting_nascent' // Shares cooldown with Nascent Flash
  },
  {
    id: 'nascent_flash',
    name: 'Nascent Flash',
    description: 'Reduces damage taken by a party member by 10% and grants healing over time',
    levelRequirement: 76,
    levelDescriptions: {
      76: 'Reduces damage taken by a party member by 10% and grants healing over time for 8s'
    },
    duration: 8,
    cooldown: 25,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/nascent_flash.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    regenPotency: 400, // 400 potency per tick for healing over time
    regenDuration: 8,
    damageType: 'both',
    target: 'single', // Can be cast on another player
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    targetsTank: true, // Can target other tanks
    count: 1, // Has 1 charge
    sharedCooldownGroup: 'war_bloodwhetting_nascent' // Shares cooldown with Bloodwhetting
  },
  {
    id: 'thrill_of_battle',
    name: 'Thrill of Battle',
    description: 'Increases maximum HP by 20% and restores the amount increased',
    levelRequirement: 30,
    levelDescriptions: {
      30: 'Increases maximum HP by 20% and restores the amount increased for 10s'
    },
    duration: 10,
    cooldown: 90,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/thrill_of_battle.png',
    type: 'mitigation',
    mitigationValue: 0.20, // Effective mitigation through HP increase
    maxHpIncrease: 0.20, // Visual max HP increase for health bars
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'damnation',
    name: 'Damnation',
    description: 'Reduces damage taken by 40%',
    levelRequirement: 92,
    levelDescriptions: {
      92: 'Reduces damage taken by 40% for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/damnation.png',
    type: 'mitigation',
    mitigationValue: 0.40,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Primarily used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1 // Has 1 charge
  },

  // Dark Knight specific
  {
    id: 'shadow_wall',
    name: 'Shadow Wall',
    description: 'Reduces damage taken by 30%',
    levelRequirement: 38,
    levelDescriptions: {
      38: 'Reduces damage taken by 30% for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/shadow_wall.png',
    type: 'mitigation',
    mitigationValue: 0.30,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Primarily used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'dark_missionary',
    name: 'Dark Missionary',
    description: 'Reduces magic damage taken by party members by 10% and physical damage by 5%',
    levelRequirement: 66,
    levelDescriptions: {
      66: 'Reduces magic damage taken by party members by 10% and physical damage by 5% for 15s'
    },
    duration: 15,
    cooldown: 90,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/dark_missionary.png',
    type: 'mitigation',
    mitigationValue: { magical: 0.10, physical: 0.05 },
    damageType: 'both',
    target: 'party', // Affects all party members
    forTankBusters: false, // Not typically used for tank busters
    forRaidWide: true, // Primarily used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'oblation',
    name: 'Oblation',
    description: 'Reduces damage taken by self or a party member by 10%',
    levelRequirement: 82,
    levelDescriptions: {
      82: 'Reduces damage taken by self or a party member by 10% for 10s'
    },
    duration: 10,
    cooldown: 60,
    count: 2, // Has 2 charges
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/oblation.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'single', // Can be cast on self or another player
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    targetsTank: true // Can target other tanks
  },
  {
    id: 'the_blackest_night',
    name: 'The Blackest Night',
    description: 'Creates a barrier that absorbs damage equal to 25% of maximum HP',
    levelRequirement: 70,
    levelDescriptions: {
      70: 'Creates a barrier that absorbs damage equal to 25% of maximum HP for 7s'
    },
    duration: 7,
    cooldown: 15,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/the_blackest_night.png',
    type: 'barrier',
    mitigationValue: 0, // Changed to 0 since this is a barrier, not direct mitigation
    barrierPotency: 0.25, // 25% max HP barrier
    damageType: 'both',
    target: 'single', // Can be cast on self or another player
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    targetsTank: true, // Can target other tanks
    count: 1 // Has 1 charge
  },
  {
    id: 'dark_mind',
    name: 'Dark Mind',
    description: 'Reduces magic vulnerability by 20%',
    levelRequirement: 45,
    levelDescriptions: {
      45: 'Reduces magic vulnerability by 20% for 10s'
    },
    duration: 10,
    cooldown: 60,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/dark_mind.png',
    type: 'mitigation',
    mitigationValue: 0.20,
    damageType: 'magical', // Only works on magic damage
    target: 'self', // Can only be used on self
    forTankBusters: true, // Commonly used for magic tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'shadowed_vigil',
    name: 'Shadowed Vigil',
    description: 'Reduces damage taken by 40%',
    levelRequirement: 92,
    levelDescriptions: {
      92: 'Reduces damage taken by 40% for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/shadowed_vigil.png',
    type: 'mitigation',
    mitigationValue: 0.40,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Primarily used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1 // Has 1 charge
  },

  // Gunbreaker specific
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Reduces damage taken by 30%',
    levelRequirement: 38,
    levelDescriptions: {
      38: 'Reduces damage taken by 30% for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/nebula.png',
    type: 'mitigation',
    mitigationValue: 0.30,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Primarily used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'heart_of_light',
    name: 'Heart of Light',
    description: 'Reduces magic damage taken by party members by 10% and physical damage by 5%',
    levelRequirement: 64,
    levelDescriptions: {
      64: 'Reduces magic damage taken by party members by 10% and physical damage by 5% for 15s'
    },
    duration: 15,
    cooldown: 90,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/heart_of_light.png',
    type: 'mitigation',
    mitigationValue: { magical: 0.10, physical: 0.05 },
    damageType: 'both',
    target: 'party', // Affects all party members
    forTankBusters: false, // Not typically used for tank busters
    forRaidWide: true, // Primarily used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'heart_of_corundum',
    name: 'Heart of Corundum',
    description: 'Reduces damage taken by 15% and grants healing over time',
    levelRequirement: 82,
    levelDescriptions: {
      82: 'Reduces damage taken by 15% and grants healing over time for 8s'
    },
    duration: 8,
    cooldown: 25,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/heart_of_corundum.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    regenPotency: 250, // 250 potency per tick for healing over time
    regenDuration: 8,
    damageType: 'both',
    target: 'single', // Can be cast on self or another player
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    targetsTank: true, // Can target other tanks
    count: 1 // Has 1 charge
  },
  {
    id: 'heart_of_stone',
    name: 'Heart of Stone',
    description: 'Reduces damage taken by 15%',
    levelRequirement: 68,
    levelDescriptions: {
      68: 'Reduces damage taken by 15% for 7s'
    },
    duration: 7,
    cooldown: 25,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/heart_of_stone.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    damageType: 'both',
    target: 'single', // Can be cast on self or another player
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    targetsTank: true, // Can target other tanks
    count: 1 // Has 1 charge
  },
  {
    id: 'camouflage',
    name: 'Camouflage',
    description: 'Reduces damage taken by 10% and increases parry rate by 50%',
    levelRequirement: 6,
    levelDescriptions: {
      6: 'Reduces damage taken by 10% and increases parry rate by 50% for 20s'
    },
    duration: 20,
    cooldown: 90,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/camouflage.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'self', // Can only be used on self
    forTankBusters: true, // Commonly used for tank busters
    forRaidWide: false, // Not used for raid-wide damage
    count: 1 // Has 1 charge
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Grants healing over time to self or target party member',
    levelRequirement: 45,
    levelDescriptions: {
      45: 'Grants healing over time to self or target party member for 18s'
    },
    duration: 18,
    cooldown: 60,
    count: 2, // Has 2 charges
    jobs: ['GNB'],
    icon: '/abilities-official/aurora.png',
    type: 'healing',
    healingPotency: 0, // Pure regen, no instant healing
    regenPotency: 200, // 200 potency per tick
    healingType: 'regen',
    regenDuration: 18,
    // Total healing = 0 + (18/3 * 200) = 1200 potency
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: false,
    forRaidWide: false
  },
  {
    id: 'great_nebula',
    name: 'Great Nebula',
    description: 'Reduces damage taken by 40%',
    levelRequirement: 92,
    levelDescriptions: {
      92: 'Reduces damage taken by 40% for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/great_nebula.png',
    type: 'mitigation',
    mitigationValue: 0.40,
    damageType: 'both',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
  },

  // Healer abilities
  {
    id: 'divine_benison',
    name: 'Divine Benison',
    description: 'Creates a barrier that absorbs damage',
    levelRequirement: 66,
    levelDescriptions: {
      66: 'Creates a barrier that absorbs damage equivalent to a heal of 500 potency for 15s'
    },
    duration: 15,
    cooldown: 30,
    count: 2, // Has 2 charges
    jobs: ['WHM'],
    icon: '/abilities-gamerescape/divine_benison.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierFlatPotency: 500, // Official: absorbs damage equivalent to a heal of 500 potency
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true,
    scaleBarrierWithHealing: true // This shield scales with healing potency buffs
  },
  {
    id: 'temperance',
    name: 'Temperance',
    description: 'Reduces damage taken by party members by 10%',
    levelRequirement: 80,
    levelDescriptions: {
      80: 'Reduces damage taken by party members by 10% for 20s',
      100: 'Reduces damage taken by party members by 10% for 20s and grants Divine Grace for 30s'
    },
    duration: 20,
    cooldown: 120,
    jobs: ['WHM'],
    icon: '/abilities-gamerescape/temperance.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    // Increases caster's healing magic potency
    healingPotencyBonus: { value: 0.20, stackMode: 'multiplicative' }
  },
  {
    id: 'liturgy_of_the_bell',
    name: 'Liturgy of the Bell',
    description: 'Creates healing bells that activate when you take damage, healing you and nearby party members',
    levelRequirement: 90,
    levelDescriptions: {
      90: 'Creates healing bells that activate when you take damage, healing you and nearby party members for 20s'
    },
    duration: 20,
    cooldown: 180,
    jobs: ['WHM'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/18_WHM/Liturgy_of_the_Bell.png',
    type: 'healing',
    healingPotency: 400, // Estimated healing potency
    healingType: 'triggered',
    mitigationValue: 0, // Healing, not direct mitigation
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'plenary_indulgence',
    name: 'Plenary Indulgence',
    description: 'Grants Confession to self and nearby party members, reducing damage taken by 10% and adding 200 potency to AoE heals',
    levelRequirement: 70,
    levelDescriptions: {
      70: 'Grants Confession to nearby party members for 10s. Effect: Adds 200 potency to Medica, Medica III, Cure III, and Afflatus Rapture. Also reduces damage taken by 10%.'
    },
    duration: 10,
    cooldown: 60,
    jobs: ['WHM'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/18_WHM/Plenary_Indulgence.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    healingPotencyBonus: { value: 200, stackMode: 'additive' }
  },

  // WHITE MAGE HEALING ABILITIES
  {
    id: 'cure',
    name: 'Cure',
    description: 'Restores target\'s HP',
    levelRequirement: 2,
    levelDescriptions: {
      2: 'Restores target\'s HP with 500 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['WHM'],
    icon: '/abilities-official/cure.png',
    type: 'healing',
    healingPotency: 500,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'cure_ii',
    name: 'Cure II',
    description: 'Restores target\'s HP',
    levelRequirement: 30,
    levelDescriptions: {
      30: 'Restores target\'s HP with 800 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['WHM'],
    icon: '/abilities-official/cure_ii.png',
    type: 'healing',
    healingPotency: 800,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'medica',
    name: 'Medica',
    description: 'Restores own HP and the HP of all nearby party members',
    levelRequirement: 10,
    levelDescriptions: {
      10: 'Restores own HP and the HP of all nearby party members with 400 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['WHM'],
    icon: '/abilities-official/medica.png',
    type: 'healing',
    healingPotency: 400,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'medica_ii',
    name: 'Medica II',
    description: 'Restores own HP and the HP of all nearby party members and grants regen',
    levelRequirement: 50,
    levelDescriptions: {
      50: 'Restores own HP and the HP of all nearby party members with 250 potency and grants 150 potency regen for 15s'
    },
    duration: 15,
    cooldown: 2.5,
    jobs: ['WHM'],
    icon: '/abilities-official/medica_ii.png',
    type: 'healing',
    healingPotency: 250, // Instant healing component
    regenPotency: 150, // 150 potency per tick
    healingType: 'instant',
    regenDuration: 15,
    // Total healing = 250 + (15/3 * 150) = 250 + 750 = 1000 potency
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    upgradedBy: 'medica_iii' // Replaced by Medica III at level 96
  },
  {
    id: 'medica_iii',
    name: 'Medica III',
    description: 'Restores own HP and the HP of all nearby party members and grants a stronger regen',
    levelRequirement: 96,
    levelDescriptions: {
      96: 'Restores own HP and the HP of all nearby party members with 250 potency and grants 175 potency regen for 15s'
    },
    duration: 15,
    cooldown: 2.5,
    jobs: ['WHM'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/18_WHM/Medica_III.png',
    type: 'healing',
    healingPotency: 250, // Instant heal component remains 250
    regenPotency: 175, // Upgraded regen potency
    healingType: 'instant',
    regenDuration: 15,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'regen',
    name: 'Regen',
    description: 'Grants healing over time to target',
    levelRequirement: 35,
    levelDescriptions: {
      35: 'Grants healing over time with 250 potency over 18s'
    },
    duration: 18,
    cooldown: 2.5,
    jobs: ['WHM'],
    icon: '/abilities-official/regen.png',
    type: 'healing',
    healingPotency: 0, // Pure regen, no instant healing
    regenPotency: 250, // 250 potency per tick
    healingType: 'regen',
    regenDuration: 18,
    // Total healing = 0 + (18/3 * 250) = 1500 potency
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'benediction',
    name: 'Benediction',
    description: 'Restores all of target\'s HP',
    levelRequirement: 50,
    levelDescriptions: {
      50: 'Restores all of target\'s HP'
    },
    duration: 0,
    cooldown: 180,
    jobs: ['WHM'],
    icon: '/abilities-official/benediction.png',
    type: 'healing',
    healingPotency: 0, // Full heal
    healingType: 'fullHeal',
    isFullHeal: true,
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'tetragrammaton',
    name: 'Tetragrammaton',
    description: 'Restores target\'s HP',
    levelRequirement: 60,
    levelDescriptions: {
      60: 'Restores target\'s HP with 700 potency'
    },
    duration: 0,
    cooldown: 60,
    count: 2,
    jobs: ['WHM'],
    icon: '/abilities-official/tetragrammaton.png',
    type: 'healing',
    healingPotency: 700,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'aquaveil',
    name: 'Aquaveil',
    description: 'Reduces damage taken by target party member by 15%',
    levelRequirement: 86,
    levelDescriptions: {
      86: 'Reduces damage taken by target party member by 15% for 8s'
    },
    duration: 8,
    cooldown: 60,
    jobs: ['WHM'],
    icon: '/abilities-gamerescape/aquaveil.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'divine_caress',
    name: 'Divine Caress',
    description: 'Grants healing and creates a barrier that absorbs damage',
    levelRequirement: 100,
    levelDescriptions: {
      100: 'Grants healing and creates a barrier that absorbs damage. Barrier duration: 10s. Can only be executed while Divine Grace is active.'
    },
    duration: 10,
    cooldown: 1,
    jobs: ['WHM'],
    icon: '/abilities-gamerescape/divine_caress.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierFlatPotency: 400, // Official: barrier equivalent to a heal of 400 potency (plus instant heal)
    healingPotency: 400, // Official: restores HP with 400 potency
    healingType: 'instant',
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true,
    scaleBarrierWithHealing: true, // This shield scales with healing potency buffs
    requiresActiveWindow: { abilityId: 'temperance', windowDuration: 30 } // Can only be used during Divine Grace (30s after Temperance)
  },

  {
    id: 'asylum',
    name: 'Asylum',
    description: 'Envelops a designated area in a field of healing.',
    levelRequirement: 52,
    levelDescriptions: {
      52: 'Creates a healing area that restores HP over time for 24s'
    },
    duration: 24,
    cooldown: 90,
    jobs: ['WHM'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/18_WHM/Asylum.png',
    type: 'healing',
    healingPotency: 0,
    regenPotency: 100,
    healingType: 'regen',
    regenDuration: 24,
    mitigationValue: 0,
    damageType: 'both',
    target: 'area',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'cure_iii',
    name: 'Cure III',
    description: 'Restores target and nearby party members\' HP with a potent cure',
    levelRequirement: 40,
    levelDescriptions: {
      40: 'Restores HP of target and nearby party members with 600 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['WHM'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/18_WHM/Cure_III.png',
    type: 'healing',
    healingPotency: 600,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'afflatus_solace',
    name: 'Afflatus Solace',
    description: 'Restores target\'s HP. Can only be executed while in possession of a Lily.',
    levelRequirement: 52,
    levelDescriptions: {
      52: 'Restores target\'s HP with 800 potency. Consumes 1 Lily.'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['WHM'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/18_WHM/Afflatus_Solace.png',
    type: 'healing',
    healingPotency: 800,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    consumesLily: true
  },
  {
    id: 'afflatus_rapture',
    name: 'Afflatus Rapture',
    description: 'Restores own HP and that of all nearby party members. Consumes a Lily.',
    levelRequirement: 76,
    levelDescriptions: {
      76: 'Restores own HP and the HP of all nearby party members with 400 potency. Consumes 1 Lily.'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['WHM'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/18_WHM/Afflatus_Rapture.png',
    type: 'healing',
    healingPotency: 400,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    consumesLily: true
  },
  {
    id: 'assize',
    name: 'Assize',
    description: 'Restores own HP and the HP of all nearby party members.',
    levelRequirement: 56,
    levelDescriptions: {
      56: 'Restores own HP and the HP of all nearby party members with 400 potency'
    },
    duration: 0,
    cooldown: 40,
    jobs: ['WHM'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/18_WHM/Assize.png',
    type: 'healing',
    healingPotency: 400,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },

  {
    id: 'aetherflow',
    name: 'Aetherflow',
    description: 'Restores 3 Aetherflow stacks',
    levelRequirement: 45,
    levelDescriptions: {
      45: 'Restores 3 Aetherflow stacks'
    },
    duration: 0, // Not a buff
    cooldown: 60,
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/aetherflow.png',
    type: 'utility',
    mitigationValue: 0,
    damageType: 'both',
    target: 'self',
    forTankBusters: false,
    forRaidWide: false,
    isAetherflowProvider: true
  },
  {
    id: 'energy_drain',
    name: 'Energy Drain',
    description: 'Deals damage and restores MP',
    levelRequirement: 45,
    levelDescriptions: {
      45: 'Deals damage and restores MP'
    },
    duration: 0, // Not a buff
    cooldown: 1, // Effectively no cooldown, limited by Aetherflow stacks
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/energy_drain.png',
    type: 'utility',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: false,
    forRaidWide: false,
    consumesAetherflow: true
  },
  // SCHOLAR HEALING ABILITIES
  {
    id: 'physick',
    name: 'Physick',
    description: 'Restores target\'s HP',
    levelRequirement: 4,
    levelDescriptions: {
      4: 'Restores target\'s HP with 450 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['SCH'],
    icon: '/abilities-official/physick.png',
    type: 'healing',
    healingPotency: 450,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'adloquium',
    name: 'Adloquium',
    description: 'Restores target\'s HP and grants barrier',
    levelRequirement: 30,
    levelDescriptions: {
      30: 'Restores target\'s HP with 300 potency and grants barrier equivalent to 180% of healing done'
    },
    duration: 30,
    cooldown: 2.5,
    jobs: ['SCH'],
    icon: '/abilities-official/adloquium.png',
    type: 'healing',
    healingPotency: 300,
    healingType: 'instant',
    barrierFlatPotency: 540, // 180% of healing as barrier → 300 * 1.8 = 540 potency
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'succor',
    name: 'Succor',
    description: 'Restores own HP and the HP of all nearby party members and grants barrier',
    levelRequirement: 35,
    levelDescriptions: {
      35: 'Restores own HP and the HP of all nearby party members with 200 potency and grants barrier equivalent to 160% of healing done'
    },
    duration: 30,
    cooldown: 2.5,
    jobs: ['SCH'],
    icon: '/abilities-official/succor.png',
    type: 'healing',
    healingPotency: 200,
    healingType: 'instant',
    barrierFlatPotency: 320, // 160% of healing as barrier → 200 * 1.6 = 320 potency
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    upgradedBy: 'concitation' // Replaced by Concitation at level 96
  },
  {
    id: 'concitation',
    name: 'Concitation',
    description: 'Restores own HP and the HP of all nearby party members and grants a stronger barrier',
    levelRequirement: 96,
    levelDescriptions: {
      96: 'Restores own HP and the HP of all nearby party members with 200 potency and grants a barrier equivalent to 180% of the HP restored'
    },
    duration: 30,
    cooldown: 2.5,
    jobs: ['SCH'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/19_SCH/Concitation.png',
    type: 'healing',
    healingPotency: 200,
    healingType: 'instant',
    barrierFlatPotency: 360, // 180% of healing as barrier → 200 * 1.8 = 360 potency
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'lustrate',
    name: 'Lustrate',
    description: 'Restores target\'s HP',
    levelRequirement: 45,
    levelDescriptions: {
      45: 'Restores target\'s HP with 600 potency'
    },
    duration: 0,
    cooldown: 1,
    jobs: ['SCH'],
    icon: '/abilities-official/lustrate.png',
    type: 'healing',
    healingPotency: 600,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    consumesAetherflow: true
  },
  {
    id: 'indomitability',
    name: 'Indomitability',
    description: 'Restores HP of all nearby party members',
    levelRequirement: 52,
    levelDescriptions: {
      52: 'Restores HP of all nearby party members with 400 potency'
    },
    duration: 0,
    cooldown: 30,
    jobs: ['SCH'],
    icon: '/abilities-official/indomitability.png',
    type: 'healing',
    healingPotency: 400,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    consumesAetherflow: true
  },
  {
    id: 'excogitation',
    name: 'Excogitation',
    description: 'Grants healing effect that activates when HP falls below 50% or effect expires',
    levelRequirement: 62,
    levelDescriptions: {
      62: 'Grants healing effect that activates when HP falls below 50% or effect expires with 800 potency'
    },
    duration: 45,
    cooldown: 45,
    jobs: ['SCH'],
    icon: '/abilities-official/excogitation.png',
    type: 'healing',
    healingPotency: 800,
    healingType: 'triggered',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    consumesAetherflow: true
  },
  {
    id: 'sacred_soil',
    name: 'Sacred Soil',
    description: 'Creates an area that reduces damage taken by 10% and applies regen',
    levelRequirement: 50,
    levelDescriptions: {
      50: 'Creates an area that reduces damage taken by 10% for 15s',
      78: 'Creates an area that reduces damage taken by 10% and applies regen for 15s'
    },
    duration: 15,
    cooldown: 30,
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/sacred_soil.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    regenPotency: 100, // 100 potency per tick for regen (level 78+)
    regenDuration: 15,
    damageType: 'both',
    target: 'area',
    forTankBusters: true,
    forRaidWide: true,
    consumesAetherflow: true
  },
  {
    id: 'protraction',
    name: 'Protraction',
    description: 'Increases target\'s maximum HP by 10% and increases HP recovery via healing actions by 10%. Also restores HP by the amount increased.',
    levelRequirement: 86,
    levelDescriptions: {
      86: 'Increases target\'s maximum HP by 10% and increases HP recovery via healing actions by 10% for 10s. Also restores HP by the amount increased.'
    },
    duration: 10,
    cooldown: 60,
    jobs: ['SCH'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/19_SCH/Protraction.png',
    type: 'mitigation',
    mitigationValue: 0.10, // Model as effective 10% mitigation (EHP increase)
    maxHpIncrease: 0.10, // Visual max HP increase for health bars
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true,
    count: 1
  },
  {
    id: 'whispering_dawn',
    name: 'Whispering Dawn',
    description: 'Gradually restores the HP of all nearby party members',
    levelRequirement: 20,
    levelDescriptions: {
      20: 'Gradually restores the HP of all nearby party members with a potency of 80 for 21s'
    },
    duration: 21,
    cooldown: 60,
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/whispering_dawn.png',
    type: 'healing',
    healingPotency: 0,
    regenPotency: 80,
    healingType: 'regen',
    regenDuration: 21,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'fey_illumination',
    name: 'Fey/Seraphic Illumination',
    description: 'Increases healing potency by 10% and reduces magic damage taken by party members by 5% for 20s',
    levelRequirement: 40,
    levelDescriptions: {
      40: 'Increases healing potency by 10% and reduces magic damage taken by party members by 5% for 20s',
    },
    duration: 20,
    cooldown: 120,
    count: 1,
    jobs: ['SCH'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/19_SCH/Fey_Illumination.png',
    type: 'mitigation',
    mitigationValue: 0.05,
    damageType: 'magical',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    // Healing potency bonus for Scholar heals on same action
    healingPotencyBonus: { value: 0.10, stackMode: 'multiplicative' }
  },
  {
    id: 'summon_seraph',
    name: 'Summon Seraph',
    description: 'Summons Seraph to fight at your side. Seraph uses Seraphic Veil and grants access to Consolation.',
    levelRequirement: 80,
    levelDescriptions: {
      80: 'Summons Seraph to fight at your side for 22s. Grants access to Consolation.'
    },
    duration: 22,
    cooldown: 120,
    jobs: ['SCH'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/19_SCH/Summon_Seraph.png',
    type: 'utility',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    count: 1
  },
  {
    id: 'consolation',
    name: 'Consolation',
    description: 'Restores own HP and the HP of all nearby party members. Also grants a barrier.',
    levelRequirement: 80,
    levelDescriptions: {
      80: 'Restores HP of all nearby party members with 250 potency and grants a barrier equivalent to 250 potency. 2 charges. Usable while Seraph is summoned.'
    },
    duration: 30,
    cooldown: 30,
    count: 2,
    jobs: ['SCH'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/19_SCH/Consolation.png',
    type: 'healing',
    healingPotency: 250,
    healingType: 'instant',
    barrierFlatPotency: 250,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    scaleBarrierWithHealing: true,
    requiresActiveWindow: { abilityId: 'summon_seraph' }
  },
  {
    id: 'expedient',
    name: 'Expedient',
    description: 'Increases movement speed for 10s and reduces damage taken by 10%',
    levelRequirement: 90,
    levelDescriptions: {
      90: 'Increases movement speed for 10s and reduces damage taken by 10% for 20s'
    },
    duration: 20,
    cooldown: 120,
    jobs: ['SCH'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/19_SCH/Expedient.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'seraphism',
    name: 'Seraphism',
    description: 'Gradually restores the HP of self and all party members within a radius of 50 yalms.',
    levelRequirement: 100,
    levelDescriptions: {
      100: 'Gradually restores the HP of self and all party members within a radius of 50 yalms.'
    },
    duration: 20,
    cooldown: 180,
    jobs: ['SCH'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/19_SCH/Seraphism.png',
    type: 'healing',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    // Increases Scholar healing potency
    healingPotencyBonus: { value: 0.20, stackMode: 'multiplicative' }
  },

  {
    id: 'collective_unconscious',
    name: 'Collective Unconscious',
    description: 'Creates an area that reduces damage taken by 10% and applies regen',
    levelRequirement: 58,
    levelDescriptions: {
      58: 'Creates an area that reduces damage taken by 10% and applies regen for 15s'
    },
    duration: 15,
    cooldown: 60,
    jobs: ['AST'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/20_AST/Collective_Unconscious.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    regenPotency: 100, // 100 potency per tick for regen
    regenDuration: 15,
    damageType: 'both',
    target: 'area',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'celestial_opposition',
    name: 'Celestial Opposition',
    description: 'Restores own HP and the HP of all nearby party members and grants regen',
    levelRequirement: 60,
    levelDescriptions: {
      60: 'Restores own HP and the HP of all nearby party members with 200 potency and grants 100 potency regen for 15s'
    },
    duration: 15,
    cooldown: 60,
    jobs: ['AST'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/20_AST/Celestial_Opposition.png',
    type: 'healing',
    healingPotency: 200,
    regenPotency: 100,
    healingType: 'instant',
    regenDuration: 15,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'horoscope',
    name: 'Horoscope',
    description: 'Applies a healing effect to nearby party members that triggers when duration expires or when manually activated',
    levelRequirement: 76,
    levelDescriptions: {
      76: 'Grants Horoscope to nearby party members. Effect: 200 potency heal when triggered. Casting Helios/Helios Conjunction upgrades to 400 potency. Duration: 10s (30s if upgraded)'
    },
    duration: 10,
    cooldown: 60,
    jobs: ['AST'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/20_AST/Horoscope_1.png',
    type: 'healing',
    healingPotency: 400, // Modeling the upgraded version for endgame planning
    healingType: 'triggered',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'exaltation',
    name: 'Exaltation',
    description: 'Reduces damage taken by a party member by 10% and delivers healing after effect expires',
    levelRequirement: 86,
    levelDescriptions: {
      86: 'Reduces damage taken by a party member by 10% and delivers healing after effect expires for 8s'
    },
    duration: 8,
    cooldown: 60,
    jobs: ['AST'],
    icon: '/abilities-official/exaltation.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
  },
  {
    id: 'macrocosmos',
    name: 'Macrocosmos',
    description: 'Records damage taken by party members and then delivers healing based on the amount recorded',
    levelRequirement: 90,
    levelDescriptions: {
      90: 'Records damage taken by party members and then delivers healing based on the amount recorded for 15s'
    },
    duration: 15,
    cooldown: 180,
    jobs: ['AST'],
    icon: '/abilities-official/macrocosmos.png',
    type: 'healing',
    healingPotency: 400, // Base healing plus recorded damage
    healingType: 'triggered',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'neutral_sect',
    name: 'Neutral Sect',
    description: 'Increases healing magic potency by 20%. Grants Suntouched and erects barriers on Aspected Benefic/Helios Conjunction.',
    levelRequirement: 80,
    levelDescriptions: {
      80: 'Increases healing magic potency by 20% for 20s. Additional Effect: When casting Aspected Benefic or Helios Conjunction, erects a magicked barrier which nullifies damage (Aspected Benefic: 250% of HP restored, Helios Conjunction: 125% of HP restored) for 30s. Additional Effect: Grants Suntouched for 30s.'
    },
    duration: 20,
    cooldown: 120,
    jobs: ['AST'],
    icon: '/abilities-official/neutral_sect.png',
    type: 'healing',
    healingPotency: 0, // Healing boost, not direct healing
    healingType: 'boost',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    // Increases AST healing potency for the caster's healing actions
    healingPotencyBonus: { value: 0.20, stackMode: 'multiplicative' }
  },
  {
    id: 'neutral_sect_aspected_benefic',
    name: 'Aspected Benefic (Neutral)',
    description: 'Restores target\'s HP and grants regen and a barrier (Neutral Sect)',
    levelRequirement: 80,
    levelDescriptions: {
      80: 'Restores target\'s HP with 250 potency, grants 250 potency regen, and erects a barrier (250% of heal) for 30s'
    },
    duration: 30,
    cooldown: 2.5,
    jobs: ['AST'],
    icon: '/abilities-official/aspected_benefic.png',
    type: 'healing',
    healingPotency: 250,
    regenPotency: 250,
    healingType: 'instant',
    regenDuration: 15,
    mitigationValue: 0,
    barrierFlatPotency: 625,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    scaleBarrierWithHealing: true,
    requiresActiveWindow: { abilityId: 'neutral_sect', windowDuration: 30 }
  },
  {
    id: 'neutral_sect_helios_conjunction',
    name: 'Helios Conjunction (Neutral)',
    description: 'Restores party HP, grants regen, and erects a barrier (Neutral Sect)',
    levelRequirement: 96,
    levelDescriptions: {
      96: 'Restores party HP with 250 potency, grants 175 potency regen, and erects a barrier (125% of heal) for 30s'
    },
    duration: 30,
    cooldown: 2.5,
    jobs: ['AST'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/20_AST/Helios_Conjunction.png',
    type: 'healing',
    healingPotency: 250,
    regenPotency: 175,
    healingType: 'instant',
    regenDuration: 15,
    mitigationValue: 0,
    barrierFlatPotency: 312.5,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    scaleBarrierWithHealing: true,
    requiresActiveWindow: { abilityId: 'neutral_sect', windowDuration: 30 }
  },

  // ASTROLOGIAN HEALING ABILITIES
  {
    id: 'benefic',
    name: 'Benefic',
    description: 'Restores target\'s HP',
    levelRequirement: 2,
    levelDescriptions: {
      2: 'Restores target\'s HP with 500 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['AST'],
    icon: '/abilities-official/benefic.png',
    type: 'healing',
    healingPotency: 500,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'benefic_ii',
    name: 'Benefic II',
    description: 'Restores target\'s HP',
    levelRequirement: 26,
    levelDescriptions: {
      26: 'Restores target\'s HP with 800 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['AST'],
    icon: '/abilities-official/benefic_ii.png',
    type: 'healing',
    healingPotency: 800,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'helios',
    name: 'Helios',
    description: 'Restores own HP and the HP of all nearby party members',
    levelRequirement: 10,
    levelDescriptions: {
      10: 'Restores own HP and the HP of all nearby party members with 400 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['AST'],
    icon: '/abilities-official/helios.png',
    type: 'healing',
    healingPotency: 400,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'aspected_helios',
    name: 'Aspected Helios',
    description: 'Restores own HP and the HP of all nearby party members and grants regen',
    levelRequirement: 40,
    levelDescriptions: {
      40: 'Restores own HP and the HP of all nearby party members with 250 potency and grants 150 potency regen for 15s'
    },
    duration: 15,
    cooldown: 2.5,
    jobs: ['AST'],
    icon: '/abilities-official/aspected_helios.png',
    type: 'healing',
    healingPotency: 250,
    regenPotency: 150,
    healingType: 'instant',
    regenDuration: 15,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    upgradedBy: 'helios_conjunction' // Replaced by Helios Conjunction at level 96
  },
  {
    id: 'helios_conjunction',
    name: 'Helios Conjunction',
    description: 'Restores own HP and the HP of all nearby party members and grants a stronger regen',
    levelRequirement: 96,
    levelDescriptions: {
      96: 'Restores own HP and the HP of all nearby party members with 250 potency and grants 175 potency regen for 15s'
    },
    duration: 15,
    cooldown: 2.5,
    jobs: ['AST'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/20_AST/Helios_Conjunction.png',
    type: 'healing',
    healingPotency: 250,
    regenPotency: 175,
    healingType: 'instant',
    regenDuration: 15,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },

  {
    id: 'essential_dignity',
    name: 'Essential Dignity',
    description: 'Restores target\'s HP with potency that increases as target\'s HP decreases',
    levelRequirement: 15,
    levelDescriptions: {
      15: 'Restores target\'s HP with 400-900 potency based on current HP'
    },
    duration: 0,
    cooldown: 40,
    count: 3,
    jobs: ['AST'],
    icon: '/abilities-official/essential_dignity.png',
    type: 'healing',
    healingPotency: 650, // Average potency
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'aspected_benefic',
    name: 'Aspected Benefic',
    description: 'Restores target\'s HP and grants regen',
    levelRequirement: 34,
    levelDescriptions: {
      34: 'Restores target\'s HP with 250 potency and grants 250 potency regen for 15s'
    },
    duration: 15,
    cooldown: 2.5,
    jobs: ['AST'],
    icon: '/abilities-official/aspected_benefic.png',
    type: 'healing',
    healingPotency: 250, // Instant healing component
    regenPotency: 250, // 250 potency per tick
    healingType: 'instant',
    regenDuration: 15,
    // Total healing = 250 + (15/3 * 250) = 250 + 1250 = 1500 potency
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'earthly_star',
    name: 'Earthly Star',
    description: 'Deploys a star that heals when detonated',
    levelRequirement: 62,
    levelDescriptions: {
      62: 'Deploys a star that heals with 540-720 potency when detonated'
    },
    duration: 20,
    cooldown: 60,
    jobs: ['AST'],
    icon: '/abilities-official/earthly_star.png',
    type: 'healing',
    healingPotency: 630, // Average of 540-720
    healingType: 'triggered',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'celestial_intersection',
    name: 'Celestial Intersection',
    description: 'Restores HP and erects a magicked barrier which nullifies damage',
    levelRequirement: 74,
    levelDescriptions: {
      74: 'Restores HP and erects a magicked barrier which nullifies damage for 30s'
    },
    duration: 30,
    cooldown: 30,
    count: 2, // Has 2 charges
    jobs: ['AST'],
    icon: '/abilities-official/celestial_intersection.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierFlatPotency: 400, // Official: absorbs damage equivalent to a heal of 400 potency
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true,
    scaleBarrierWithHealing: true
  },
  {
    id: 'sun_sign',
    name: 'Sun Sign',
    description: 'Reduces damage taken by 10%',
    levelRequirement: 100,
    levelDescriptions: {
      100: 'Reduces damage taken by 10% for 15s'
    },
    duration: 15,
    cooldown: 1,
    jobs: ['AST'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/20_AST/Sun_Sign.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'kerachole',
    name: 'Kerachole',
    description: 'Reduces damage taken by 10% in an area and applies regen',
    levelRequirement: 50,
    levelDescriptions: {
      50: 'Reduces damage taken by 10% in an area for 15s',
      78: 'Reduces damage taken by 10% in an area and applies regen for 15s'
    },
    duration: 15,
    cooldown: 30,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Kerachole.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    regenPotency: 100, // 100 potency per tick for regen (level 78+)
    regenDuration: 15,
    damageType: 'both',
    target: 'area',
    forTankBusters: false,
    forRaidWide: true
  },

  {
    id: 'holos',
    name: 'Holos',
    description: 'Reduces damage taken by 10% and grants barrier',
    levelRequirement: 76,
    levelDescriptions: {
      76: 'Reduces damage taken by 10% and grants barrier for 20s'
    },
    duration: 20,
    cooldown: 120,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Holos.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    barrierFlatPotency: 300, // Official: barrier equivalent to a heal of 300 potency
    scaleBarrierWithHealing: true
  },
  {
    id: 'eukrasian_diagnosis',
    name: 'Eukrasian Diagnosis',
    description: 'Restores target\'s HP and erects a barrier equal to 180% of the HP restored',
    levelRequirement: 30,
    levelDescriptions: {
      30: 'Restores target\'s HP with 300 potency and erects a barrier equal to 180% of the HP restored'
    },
    duration: 30,
    cooldown: 2.5,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Eukrasian_Diagnosis.png',
    type: 'healing',
    healingPotency: 300,
    healingType: 'instant',
    isSpell: true,
    mitigationValue: 0,
    barrierFlatPotency: 540, // Barrier equals 180% of HP restored → 300 * 1.8 = 540 potency
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
  },
  {
    id: 'eukrasian_prognosis',
    name: 'Eukrasian Prognosis',
    description: 'Restores own HP and the HP of all nearby party members and erects a barrier equal to 160% of the HP restored',
    levelRequirement: 30,
    levelDescriptions: {
      30: 'Restores party HP with 200 potency and erects a barrier equal to 160% of the HP restored'
    },
    duration: 30,
    cooldown: 2.5,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Eukrasian_Prognosis.png',
    type: 'healing',
    healingPotency: 200,
    healingType: 'instant',
    isSpell: true,
    mitigationValue: 0,
    barrierFlatPotency: 320, // Barrier equals 160% of HP restored → 200 * 1.6 = 320 potency
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    upgradedBy: 'eukrasian_prognosis_ii' // Replaced by Eukrasian Prognosis II at level 96 per job guide
  },
  {
    id: 'eukrasian_prognosis_ii',
    name: 'Eukrasian Prognosis II',
    description: 'Restores party HP and erects a stronger barrier than Eukrasian Prognosis',
    levelRequirement: 96,
    levelDescriptions: {
      96: 'Restores party HP with 100 potency and erects a barrier equal to 360% of the HP restored'
    },
    duration: 30,
    cooldown: 2.5,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Eukrasian_Prognosis_II.png',
    type: 'healing',
    healingPotency: 100,
    healingType: 'instant',
    isSpell: true,
    mitigationValue: 0,
    barrierFlatPotency: 360, // 360% of HP restored per job guide at 96
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'haima',
    name: 'Haima',
    description: 'Creates a barrier that absorbs damage and grants additional barriers when consumed',
    levelRequirement: 70,
    levelDescriptions: {
      70: 'Creates a barrier that absorbs damage and grants additional barriers when consumed for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Haima.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierFlatPotency: 300, // Healing-based barrier per stack (5 stacks total). For single-hit visualization, use 1 stack.
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    scaleBarrierWithHealing: true,
    targetsTank: true
  },
  {
    id: 'panhaima',
    name: 'Panhaima',
    description: 'Creates barriers around party members that absorb damage',
    levelRequirement: 80,
    levelDescriptions: {
      80: 'Creates barriers around party members that absorb damage for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Panhaima.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierFlatPotency: 200, // Healing-based barrier per stack (5 stacks total). For single-hit visualization, use 1 stack.
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    scaleBarrierWithHealing: true
  },
  {
    id: 'taurochole',
    name: 'Taurochole',
    description: 'Restores HP and reduces damage taken by 10%',
    levelRequirement: 62,
    levelDescriptions: {
      62: 'Restores HP and reduces damage taken by 10% for 15s'
    },
    duration: 15,
    cooldown: 45,
    jobs: ['SGE'],
    icon: '/abilities-official/taurochole.png',
    type: 'mitigation',
    healingPotency: 700,
    healingType: 'instant',
    consumesAddersgall: true,
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
  },
  {
    id: 'zoe',
    name: 'Zoe',
    description: 'Increases healing magic potency of your next healing spell by 50%',
    levelRequirement: 56,
    levelDescriptions: {
      56: 'Increases healing magic potency of your next healing spell by 50% for 30s'
    },
    duration: 30,
    cooldown: 90,
    jobs: ['SGE'],
    icon: '/abilities-official/zoe.png',
    type: 'healing',
    healingPotency: 0, // Healing boost, not direct healing
    healingType: 'boost',
    mitigationValue: 0,
    damageType: 'both',
    target: 'self',
    forTankBusters: false,
    forRaidWide: false,
    // Increases SGE healing potency for caster's next healing spell
    healingPotencyBonus: { value: 0.50, stackMode: 'multiplicative' }
  },
  {
    id: 'philosophia',
    name: 'Philosophia',
    description: 'Increases healing magic potency by 20%. Duration: 20s Additional Effect: Grants self and nearby party members the effect of Eudaimonia, restoring HP after landing spells Duration: 20s',
    levelRequirement: 100,
    levelDescriptions: {
      100: 'Increases healing magic potency by 20%. Duration: 20s Additional Effect: Grants self and nearby party members the effect of Eudaimonia, restoring HP after landing spells Duration: 20s'
    },
    duration: 20,
    cooldown: 180,
    jobs: ['SGE'],
    icon: '/abilities-gamerescape/philosophia.png',
    type: 'healing',
    healingPotency: 0, // Healing boost, not direct healing
    healingType: 'boost',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    // Increases SGE healing potency for duration
    healingPotencyBonus: { value: 0.20, stackMode: 'multiplicative' }
  },
  {
    id: 'physis',
    name: 'Physis',
    description: 'Gradually restores own HP and the HP of all nearby party members',
    levelRequirement: 20,
    levelDescriptions: {
      20: 'Grants regen to self and nearby party members for 15s'
    },
    duration: 15,
    cooldown: 60,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Physis.png',
    type: 'healing',
    healingPotency: 0,
    regenPotency: 100,
    healingType: 'regen',
    regenDuration: 15,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    upgradedBy: 'physis_ii'
  },
  {
    id: 'physis_ii',
    name: 'Physis II',
    description: 'Gradually restores own HP and the HP of all nearby party members and increases HP recovered by healing actions by 10%',
    levelRequirement: 60,
    levelDescriptions: {
      60: 'Grants regen to self and nearby party members for 15s and increases HP recovered by healing actions by 10%'
    },
    duration: 15,
    cooldown: 60,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Physis_II.png',
    type: 'healing',
    healingPotency: 0,
    regenPotency: 130,
    healingType: 'regen',
    regenDuration: 15,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    healingPotencyBonus: { value: 0.10, stackMode: 'multiplicative' }
  },
  {
    id: 'krasis',
    name: 'Krasis',
    description: 'Increases HP recovered by healing actions for a party member by 20%',
    levelRequirement: 86,
    levelDescriptions: {
      86: 'Increases HP recovered by healing actions for target by 20% for 10s'
    },
    duration: 10,
    cooldown: 60,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Krasis.png',
    type: 'healing',
    healingPotency: 0,
    healingType: 'boost',
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true,
    healingPotencyBonus: { value: 0.20, stackMode: 'multiplicative' }
  },

  // SAGE HEALING ABILITIES
  {
    id: 'diagnosis',
    name: 'Diagnosis',
    description: 'Restores target\'s HP',
    levelRequirement: 2,
    levelDescriptions: {
      2: 'Restores target\'s HP with 450 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Diagnosis.png',
    type: 'healing',
    healingPotency: 450,
    healingType: 'instant',
    isSpell: true,
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'prognosis',
    name: 'Prognosis',
    description: 'Restores own HP and the HP of all nearby party members',
    levelRequirement: 10,
    levelDescriptions: {
      10: 'Restores own HP and the HP of all nearby party members with 300 potency'
    },
    duration: 0,
    cooldown: 2.5,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Prognosis.png',
    type: 'healing',
    healingPotency: 300,
    healingType: 'instant',
    isSpell: true,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'pneuma',
    name: 'Pneuma',
    description: 'Deals unaspected damage in a line and restores HP to self and nearby party members',
    levelRequirement: 90,
    levelDescriptions: {
      90: 'Restores own HP and the HP of all nearby party members with 600 potency'
    },
    duration: 0,
    cooldown: 120,
    jobs: ['SGE'],
    icon: '/icons/pve/FFXIVIcons Battle(PvE)/21_SGE/Pneuma.png',
    type: 'healing',
    healingPotency: 600,
    healingType: 'instant',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    isSpell: true
  },
  {
    id: 'druochole',
    name: 'Druochole',
    description: 'Restores target\'s HP',
    levelRequirement: 45,
    levelDescriptions: {
      45: 'Restores target\'s HP with 600 potency'
    },
    duration: 0,
    cooldown: 1,
    jobs: ['SGE'],
    icon: '/abilities-official/druochole.png',
    type: 'healing',
    healingPotency: 600,
    healingType: 'instant',
    consumesAddersgall: true,
    mitigationValue: 0,
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'ixochole',
    name: 'Ixochole',
    description: 'Restores own HP and the HP of all nearby party members',
    levelRequirement: 52,
    levelDescriptions: {
      52: 'Restores own HP and the HP of all nearby party members with 400 potency'
    },
    duration: 0,
    cooldown: 30,
    jobs: ['SGE'],
    icon: '/abilities-official/ixochole.png',
    type: 'healing',
    healingPotency: 400,
    healingType: 'instant',
    consumesAddersgall: true,
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },


  // DPS role abilities
  {
    id: 'feint',
    name: 'Feint',
    description: 'Reduces physical damage dealt by target by 10% and magic damage by 5%',
    levelRequirement: 22,
    levelDescriptions: {
      22: 'Reduces target\'s physical damage dealt by 10% for 10s',
      98: 'Reduces target\'s physical damage dealt by 10% and magic damage dealt by 5% for 15s'
    },
    duration: 15,
    cooldown: 90,
    jobs: ['MNK', 'DRG', 'NIN', 'SAM', 'RPR', 'VPR'],
    icon: '/abilities-gamerescape/feint.png',
    type: 'mitigation',
    mitigationValue: { physical: 0.10, magical: 0.05 },
    levelMitigationValues: {
      22: { physical: 0.10, magical: 0.00 },
      98: { physical: 0.10, magical: 0.05 }
    },
    damageType: 'both',
    target: 'area',
    forTankBusters: true,
    forRaidWide: true,
    isRoleShared: true // Can be provided by multiple melee DPS
  },
  {
    id: 'addle',
    name: 'Addle',
    description: 'Reduces magic damage dealt by target by 10% and physical damage by 5%',
    levelRequirement: 8,
    levelDescriptions: {
      8: 'Reduces target\'s magic damage dealt by 10% for 10s',
      98: 'Reduces target\'s magic damage dealt by 10% and physical damage dealt by 5% for 15s'
    },
    duration: 15,
    cooldown: 90,
    jobs: ['BLM', 'SMN', 'RDM', 'PCT'],
    icon: '/abilities-gamerescape/addle.png',
    type: 'mitigation',
    mitigationValue: { magical: 0.10, physical: 0.05 },
    levelMitigationValues: {
      8: { magical: 0.10, physical: 0.00 },
      98: { magical: 0.10, physical: 0.05 }
    },
    damageType: 'both',
    target: 'area',
    forTankBusters: true,
    forRaidWide: true,
    isRoleShared: true // Can be provided by multiple caster DPS
  },
  {
    id: 'troubadour',
    name: 'Troubadour',
    description: 'Reduces damage taken by party members by 15%',
    levelRequirement: 62,
    levelDescriptions: {
      62: 'Reduces damage taken by party members by 10% for 15s',
      98: 'Reduces damage taken by party members by 15% for 15s'
    },
    duration: 15,
    cooldown: 90,
    jobs: ['BRD'],
    icon: '/abilities-gamerescape/troubadour.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    levelMitigationValues: {
      62: 0.10,
      98: 0.15
    },
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    isRoleShared: true // Functionally equivalent to Tactician and Shield Samba
  },
  {
    id: 'natures_minne',
    name: 'Nature\'s Minne',
    description: 'Increases HP recovery via healing actions by 15% for self and nearby party members',
    levelRequirement: 66,
    levelDescriptions: {
      66: 'Increases HP recovery via healing actions by 15% for self and nearby party members for 15s'
    },
    duration: 15,
    cooldown: 120,
    jobs: ['BRD'],
    icon: '/abilities-official/natures_minne.png',
    type: 'healing',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'tactician',
    name: 'Tactician',
    description: 'Reduces damage taken by party members by 15%',
    levelRequirement: 62,
    levelDescriptions: {
      62: 'Reduces damage taken by party members by 10% for 15s',
      98: 'Reduces damage taken by party members by 15% for 15s'
    },
    duration: 15,
    cooldown: 90,
    jobs: ['MCH'],
    icon: '/abilities-gamerescape/tactician.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    levelMitigationValues: {
      62: 0.10,
      98: 0.15
    },
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    isRoleShared: true // Functionally equivalent to Troubadour and Shield Samba
  },
  {
    id: 'dismantle',
    name: 'Dismantle',
    description: 'Lowers target\'s damage dealt by 10%',
    levelRequirement: 62,
    levelDescriptions: {
      62: 'Lowers target\'s damage dealt by 10% for 10s'
    },
    duration: 10,
    cooldown: 120,
    jobs: ['MCH'],
    icon: '/abilities-gamerescape/dismantle.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'area', // Targets enemy to reduce their damage output
    forTankBusters: true,
    forRaidWide: true,
    count: 1
  },
  {
    id: 'shield_samba',
    name: 'Shield Samba',
    description: 'Reduces damage taken by party members by 15%',
    levelRequirement: 62,
    levelDescriptions: {
      62: 'Reduces damage taken by party members by 10% for 15s',
      98: 'Reduces damage taken by party members by 15% for 15s'
    },
    duration: 15,
    cooldown: 90,
    jobs: ['DNC'],
    icon: '/abilities-gamerescape/shield_samba.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    levelMitigationValues: {
      62: 0.10,
      98: 0.15
    },
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true,
    isRoleShared: true // Functionally equivalent to Troubadour and Tactician
  },
  {
    id: 'magick_barrier',
    name: 'Magick Barrier',
    description: 'Reduces magic damage taken by 10% and increases healing received by 5%',
    levelRequirement: 86,
    levelDescriptions: {
      86: 'Reduces magic damage taken by 10% and increases healing received by 5% for 10s'
    },
    duration: 10,
    cooldown: 120,
    jobs: ['RDM'],
    icon: '/abilities-gamerescape/magick_barrier.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'magical',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'tempera_coat',
    name: 'Tempera Coat',
    description: 'Creates a barrier around self that absorbs damage totaling 20% of maximum HP',
    levelRequirement: 10,
    levelDescriptions: {
      10: 'Creates a barrier around self that absorbs damage totaling 20% of maximum HP for 10s'
    },
    duration: 10,
    cooldown: 120,
    jobs: ['PCT'],
    icon: '/abilities-gamerescape/tempera_coat.png',
    type: 'barrier',
    mitigationValue: 0, // Changed to 0 since this is a barrier, not direct mitigation
    barrierPotency: 0.20, // 20% max HP barrier
    damageType: 'both',
    target: 'self',
    forTankBusters: false,
    forRaidWide: false
  },
  {
    id: 'tempera_grassa',
    name: 'Tempera Grassa',
    description: 'Creates a barrier that absorbs damage equal to 10% of maximum HP',
    levelRequirement: 88,
    levelDescriptions: {
      88: 'Creates a barrier that absorbs damage equal to 10% of maximum HP for 10s'
    },
    duration: 10,
    cooldown: 90,
    jobs: ['PCT'],
    icon: '/abilities-gamerescape/tempera_grassa.png',
    type: 'barrier',
    mitigationValue: 0, // Changed to 0 since this is a barrier, not direct mitigation
    barrierPotency: 0.10, // 10% max HP barrier
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'arcane_crest',
    name: 'Arcane Crest',
    description: 'Creates a barrier on self that heals nearby party members when broken',
    levelRequirement: 64,
    levelDescriptions: {
      64: 'Creates a barrier on self that absorbs damage equal to 10% of maximum HP for 30s and heals nearby party members when broken'
    },
    duration: 30,
    cooldown: 60,
    jobs: ['RPR'],
    icon: '/abilities-gamerescape/arcane_crest.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierPotency: 0.10, // 10% max HP barrier
    damageType: 'both',
    target: 'self',
    forTankBusters: false,
    forRaidWide: false
  },
  {
    id: 'arms_length',
    name: 'Arm\'s Length',
    description: 'Creates a barrier preventing knockback and most draw-in effects',
    levelRequirement: 32,
    // Description is the same at all levels
    levelDescriptions: {
      32: 'Creates a barrier preventing knockback and most draw-in effects for 6s'
    },
    duration: 6,
    cooldown: 120,
    jobs: ['MNK', 'DRG', 'NIN', 'SAM', 'RPR', 'VPR', 'BRD', 'MCH', 'DNC', 'PLD', 'WAR', 'DRK', 'GNB'],
    icon: '/abilities-gamerescape/arms_length.png',
    type: 'utility',
    mitigationValue: 0, // Utility, not direct mitigation
    damageType: 'both',
    target: 'self',
    forTankBusters: false,
    forRaidWide: false
  }
];

export default mitigationAbilities;
