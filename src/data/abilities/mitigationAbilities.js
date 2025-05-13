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
 */

export const mitigationAbilities = [
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
    target: 'area',
    forTankBusters: true,
    forRaidWide: true,
    isRoleShared: true // Can be provided by multiple tanks
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
    forRaidWide: false
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
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    target: 'area',
    forTankBusters: false,
    forRaidWide: true
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
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
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
    cooldown: 5,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/holy_sheltron.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    damageType: 'both',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    cooldown: 10,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/intervention.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    levelMitigationValues: {
      62: 0.10, // At level 62, mitigation is 10%
      82: 0.10  // At level 82, mitigation is 10% with healing over time
    },
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
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
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
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
    damageType: 'both',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
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
    damageType: 'both',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'dark_missionary',
    name: 'Dark Missionary',
    description: 'Reduces magic damage taken by party members by 10%',
    levelRequirement: 66,
    levelDescriptions: {
      66: 'Reduces magic damage taken by party members by 10% for 15s'
    },
    duration: 15,
    cooldown: 90,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/dark_missionary.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'magical',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
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
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
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
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
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
    damageType: 'magical',
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
  },
  {
    id: 'heart_of_light',
    name: 'Heart of Light',
    description: 'Reduces magic damage taken by party members by 10%',
    levelRequirement: 64,
    levelDescriptions: {
      64: 'Reduces magic damage taken by party members by 10% for 15s'
    },
    duration: 15,
    cooldown: 90,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/heart_of_light.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'magical',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
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
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
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
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
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
    target: 'self',
    forTankBusters: true,
    forRaidWide: false
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
    icon: '/abilities-gamerescape/aurora.png',
    type: 'healing',
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
    barrierPotency: 0.15, // Approximately 15% of max HP based on 500 potency
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
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
    forRaidWide: true
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
    icon: '/abilities-gamerescape/liturgy_of_the_bell.png',
    type: 'healing',
    mitigationValue: 0, // Healing, not direct mitigation
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
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
    forRaidWide: false,
    targetsTank: true
  },
  {
    id: 'divine_caress',
    name: 'Divine Caress',
    description: 'Grants healing and creates a barrier that absorbs damage',
    levelRequirement: 100,
    levelDescriptions: {
      100: 'Grants healing and creates a barrier that absorbs damage for 30s'
    },
    duration: 30,
    cooldown: 30,
    count: 2, // Has 2 charges
    jobs: ['WHM'],
    icon: '/abilities-gamerescape/divine_caress.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierPotency: 0.20, // Approximately 20% of max HP
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
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
    damageType: 'both',
    target: 'area',
    forTankBusters: true,
    forRaidWide: true
  },
  {
    id: 'fey_illumination',
    name: 'Fey Illumination',
    description: 'Increases healing magic potency by 10% and reduces magic damage taken by 5%',
    levelRequirement: 40,
    levelDescriptions: {
      40: 'Increases healing magic potency by 10% and reduces magic damage taken by 5% for 20s'
    },
    duration: 20,
    cooldown: 120,
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/fey_illumination.png',
    type: 'mitigation',
    mitigationValue: 0.05,
    damageType: 'magical',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },

  {
    id: 'seraphic_illumination',
    name: 'Seraphic Illumination',
    description: 'Increases healing potency by 10% and reduces damage taken by party members by 10%',
    levelRequirement: 80,
    levelDescriptions: {
      80: 'Increases healing potency by 10% and reduces damage taken by party members by 10% for 20s'
    },
    duration: 20,
    cooldown: 120, // Part of Summon Seraph which has 120s cooldown
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/seraphic_illumination.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'expedient',
    name: 'Expedient',
    description: 'Increases movement speed and reduces damage taken by 10%',
    levelRequirement: 90,
    levelDescriptions: {
      90: 'Increases movement speed and reduces damage taken by 10% for 20s'
    },
    duration: 20,
    cooldown: 120,
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/expedient.png',
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
    description: 'Increases healing magic potency by 20% and grants a barrier that absorbs damage equal to 10% of HP healed',
    levelRequirement: 100,
    levelDescriptions: {
      100: 'Increases healing magic potency by 20% and grants a barrier that absorbs damage equal to 10% of HP healed for 20s'
    },
    duration: 20,
    cooldown: 180,
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/seraphism.png',
    type: 'healing',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
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
    icon: '/abilities-gamerescape/collective_unconscious.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both',
    target: 'area',
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
    icon: '/abilities-gamerescape/exaltation.png',
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
    icon: '/abilities-gamerescape/macrocosmos.png',
    type: 'healing',
    mitigationValue: 0,
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
  },
  {
    id: 'neutral_sect',
    name: 'Neutral Sect',
    description: 'Increases healing magic potency by 20% and erects a magicked barrier when casting Aspected Benefic or Helios Conjunction',
    levelRequirement: 80,
    levelDescriptions: {
      80: 'Increases healing magic potency by 20% for 20s and erects a magicked barrier when casting Aspected Benefic or Helios Conjunction for 30s'
    },
    duration: 20,
    cooldown: 120,
    jobs: ['AST'],
    icon: '/abilities-gamerescape/neutral_sect.png',
    type: 'healing',
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
    icon: '/abilities-gamerescape/celestial_intersection.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierPotency: 0.15, // Approximately 15% of max HP
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
    targetsTank: true
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
    icon: '/abilities-gamerescape/sun_sign.png',
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
    icon: '/abilities-gamerescape/kerachole.png',
    type: 'mitigation',
    mitigationValue: 0.10,
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
    icon: '/abilities-gamerescape/holos.png',
    type: 'mitigation',
    mitigationValue: 0.10,
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
    icon: '/abilities-gamerescape/haima.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierPotency: 0.30, // Approximately 30% of max HP (multiple barriers)
    damageType: 'both',
    target: 'single',
    forTankBusters: true,
    forRaidWide: false,
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
    icon: '/abilities-gamerescape/panhaima.png',
    type: 'barrier',
    mitigationValue: 0, // Shield, not direct mitigation
    barrierPotency: 0.20, // Approximately 20% of max HP (multiple barriers)
    damageType: 'both',
    target: 'party',
    forTankBusters: false,
    forRaidWide: true
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
    icon: '/abilities-gamerescape/taurochole.png',
    type: 'mitigation',
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
    icon: '/abilities-gamerescape/zoe.png',
    type: 'healing',
    mitigationValue: 0,
    damageType: 'both',
    target: 'self',
    forTankBusters: false,
    forRaidWide: false
  },
  {
    id: 'philosophia',
    name: 'Philosophia',
    description: 'Increases healing magic potency by 20% and grants a barrier that absorbs damage equal to 10% of HP healed',
    levelRequirement: 100,
    levelDescriptions: {
      100: 'Increases healing magic potency by 20% and grants a barrier that absorbs damage equal to 10% of HP healed for 20s'
    },
    duration: 20,
    cooldown: 180,
    jobs: ['SGE'],
    icon: '/abilities-gamerescape/philosophia.png',
    type: 'healing',
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
    icon: '/abilities-gamerescape/natures_minne.png',
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
