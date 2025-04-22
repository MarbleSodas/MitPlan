// Sample data for bosses, boss actions, and mitigation abilities

export const bosses = [
  {
    id: 'ketuduke',
    name: 'Ketuduke',
    description: 'The Soul of the South Seas, final boss of Another Aloalo Island (Savage).',
    icon: '🌊',
    level: 90
  },
];

export const bossActionsMap = {
  ketuduke: [
    {
      id: 'tidal_roar_1',
      name: 'Tidal Roar',
      time: 10,
      description: 'High party-wide magical damage that inflicts Dropsy. Requires mitigation and healing.',
      damageType: 'magical',
      importance: 'high',
      icon: '⭕'
    },
    {
      id: 'bubble_net_1',
      name: 'Bubble Net',
      time: 30,
      description: 'Party-wide magical damage and assigns Bubble Weave or Foamy Fetters debuffs to players.',
      damageType: 'magical',
      importance: 'high',
      icon: '⭕'
    },
    {
      id: 'hydrobullet_hydrofall_1',
      name: 'Hydrobullet/Hydrofall',
      time: 60,
      description: 'Crystal line AoEs resolve at the same time as stack/spread debuffs. Avoid both simultaneously.',
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'hydrobullet_hydrofall_2',
      name: 'Hydrobullet/Hydrofall',
      time: 80,
      description: 'Assigns spread or stack debuffs to players that will resolve during Blowing Bubbles.',
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'hydrofall_2',
      name: 'Hydrofall',
      time: 130,
      description: 'Gives stack debuffs to two players that will resolve during Strewn Bubbles.',
      damageType: 'magical',
      importance: 'high',
      icon: '💧'
    },
    {
      id: 'bubble_net_2',
      name: 'Bubble Net',
      time: 160,
      description: 'Party-wide magical damage and assigns Bubble Weave or Foamy Fetters debuffs to players.',
      damageType: 'magical',
      importance: 'high',
      icon: '⭕'
    },
    {
      id: 'angry_seas',
      name: 'Angry Seas',
      time: 210,
      description: 'Spawns a lethal line AoE in the middle and horizontal knockbacks on both sides. Long durations benefit here.',
      damageType: 'magical',
      importance: 'high',
      icon: '🌊'
    },
    {
      id: 'bubble_net_3',
      name: 'Bubble Net',
      time: 220,
      description: 'Party-wide magical damage and assigns Bubble Weave or Foamy Fetters debuffs to players.',
      damageType: 'magical',
      importance: 'high',
      icon: '⭕'
    },
    {
      id: 'bubble_net_4',
      name: 'Bubble Net',
      time: 250,
      description: 'Party-wide magical damage and assigns Bubble Weave or Foamy Fetters debuffs to players.',
      damageType: 'magical',
      importance: 'high',
      icon: '⭕'
    },
    {
      id: 'hydrobullet_hydrofall_3',
      name: 'Hydrobullet/Hydrofall',
      time: 280,
      description: 'Assigns spread or stack debuffs to players that will resolve during Blowing Bubbles.',
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'hydrofall_3',
      name: 'Hydrofall',
      time: 310,
      description: 'Gives stack debuffs to two players that will resolve during Strewn Bubbles.',
      damageType: 'magical',
      importance: 'high',
      icon: '💧'
    },
    {
      id: 'tidal_roar_2',
      name: 'Tidal Roar',
      time: 320,
      description: 'High party-wide magical damage that inflicts Dropsy. Requires mitigation and healing.',
      damageType: 'magical',
      importance: 'high',
      icon: '⭕'
    },
    {
      id: 'tidal_roar_enrage',
      name: 'Tidal Roar (enrage)',
      time: 330,
      description: 'Wipe',
      damageType: 'magical',
      importance: 'critical',
      icon: '💀'
    },
  ]
};

// For backward compatibility
export const bossActions = bossActionsMap.ketuduke;

// FFXIV Jobs organized by role
export const ffxivJobs = {
  tank: [
    {
      id: 'PLD',
      name: 'Paladin',
      icon: '/jobs-new/paladin.png',
      selected: false
    },
    {
      id: 'WAR',
      name: 'Warrior',
      icon: '/jobs-new/warrior.png',
      selected: false
    },
    {
      id: 'DRK',
      name: 'Dark Knight',
      icon: '/jobs-new/darkknight.png',
      selected: false
    },
    {
      id: 'GNB',
      name: 'Gunbreaker',
      icon: '/jobs-new/gunbreaker.png',
      selected: false
    }
  ],
  healer: [
    {
      id: 'WHM',
      name: 'White Mage',
      icon: '/jobs-new/whitemage.png',
      selected: false
    },
    {
      id: 'SCH',
      name: 'Scholar',
      icon: '/jobs-new/scholar.png',
      selected: false
    },
    {
      id: 'AST',
      name: 'Astrologian',
      icon: '/jobs-new/astrologian.png',
      selected: false
    },
    {
      id: 'SGE',
      name: 'Sage',
      icon: '/jobs-new/sage.png',
      selected: false
    }
  ],
  melee: [
    {
      id: 'MNK',
      name: 'Monk',
      icon: '/jobs-new/monk.png',
      selected: false
    },
    {
      id: 'DRG',
      name: 'Dragoon',
      icon: '/jobs-new/dragoon.png',
      selected: false
    },
    {
      id: 'NIN',
      name: 'Ninja',
      icon: '/jobs-new/ninja.png',
      selected: false
    },
    {
      id: 'SAM',
      name: 'Samurai',
      icon: '/jobs-new/samurai.png',
      selected: false
    },
    {
      id: 'RPR',
      name: 'Reaper',
      icon: '/jobs-new/reaper.png',
      selected: false
    }
  ],
  ranged: [
    {
      id: 'BRD',
      name: 'Bard',
      icon: '/jobs-new/bard.png',
      selected: false
    },
    {
      id: 'MCH',
      name: 'Machinist',
      icon: '/jobs-new/machinist.png',
      selected: false
    },
    {
      id: 'DNC',
      name: 'Dancer',
      icon: '/jobs-new/dancer.png',
      selected: false
    }
  ],
  caster: [
    {
      id: 'BLM',
      name: 'Black Mage',
      icon: '/jobs-new/blackmage.png',
      selected: false
    },
    {
      id: 'SMN',
      name: 'Summoner',
      icon: '/jobs-new/summoner.png',
      selected: false
    },
    {
      id: 'RDM',
      name: 'Red Mage',
      icon: '/jobs-new/redmage.png',
      selected: false
    }
  ]
};

// Job-specific mitigation abilities
// Only includes abilities that reduce damage taken or dealt
// Each ability includes level requirements and level-specific descriptions
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
    damageType: 'both'
  },
  {
    id: 'holmgang',
    name: 'Holmgang',
    description: 'Prevents your HP from falling below 1',
    levelRequirement: 42,
    levelDescriptions: {
      42: 'Prevents your HP from falling below 1 for 6s',
      70: 'Prevents your HP from falling below 1 for 8s',
      90: 'Prevents your HP from falling below 1 for 10s'
    },
    duration: 10,
    cooldown: 240,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/holmgang.png',
    type: 'invulnerability',
    mitigationValue: 0, // Not direct mitigation, prevents death
    damageType: 'both'
  },
  {
    id: 'living_dead',
    name: 'Living Dead',
    description: 'Grants Walking Dead when HP is reduced to 0, preventing you from dying for 10s',
    levelRequirement: 50,
    levelDescriptions: {
      50: 'Grants Walking Dead when HP is reduced to 0, preventing you from dying for 10s',
      90: 'Grants Walking Dead when HP is reduced to 0, preventing you from dying for 10s and healing you for 100% of your max HP'
    },
    duration: 10,
    cooldown: 300,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/living_dead.png',
    type: 'invulnerability',
    mitigationValue: 0, // Not direct mitigation, prevents death
    damageType: 'both'
  },
  {
    id: 'superbolide',
    name: 'Superbolide',
    description: 'Reduces HP to 1 and renders you impervious to most attacks',
    levelRequirement: 50,
    levelDescriptions: {
      50: 'Reduces HP to 1 and renders you impervious to most attacks for 8s',
      90: 'Reduces HP to 1 and renders you impervious to most attacks for 10s'
    },
    duration: 10,
    cooldown: 360,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/superbolide.png',
    type: 'invulnerability',
    mitigationValue: 1.0, // 100% mitigation
    damageType: 'both'
  },

  // Tank shared abilities
  {
    id: 'reprisal',
    name: 'Reprisal',
    description: 'Reduces damage dealt by nearby enemies by 10%',
    levelRequirement: 22,
    levelDescriptions: {
      22: 'Reduces damage dealt by target by 10% for 5s',
      70: 'Reduces damage dealt by target by 10% for 10s',
      80: 'Reduces damage dealt by nearby enemies by 10% for 10s',
      94: 'Reduces damage dealt by nearby enemies by 10% for 15s'
    },
    duration: 15,
    levelDurations: {
      22: 5,  // At level 22, duration is 5s
      70: 10, // At level 70, duration is 10s
      94: 15  // At level 94, duration is 15s
    },
    cooldown: 60,
    levelCooldowns: {
      22: 120, // At level 22, cooldown is 120s
      60: 90,  // At level 60, cooldown is 90s
      80: 60   // At level 80, cooldown is 60s
    },
    jobs: ['PLD', 'WAR', 'DRK', 'GNB'],
    icon: '/abilities-gamerescape/reprisal.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    // Mitigation value is always 10% at all levels
    levelMitigationValues: {
      22: 0.10 // At level 22, mitigation is 10% (from description)
    },
    damageType: 'both'
  },
  {
    id: 'rampart',
    name: 'Rampart',
    description: 'Reduces damage taken by 20%',
    levelRequirement: 8,
    // Description is the same at all levels
    levelDescriptions: {
      8: 'Reduces damage taken by 20% for 20s'
    },
    duration: 20,
    cooldown: 90,
    levelCooldowns: {
      8: 120,  // At level 8, cooldown is 120s
      70: 90   // At level 70, cooldown is 90s
    },
    jobs: ['PLD', 'WAR', 'DRK', 'GNB'],
    icon: '/abilities-gamerescape/rampart.png',
    type: 'mitigation',
    mitigationValue: 0.20,
    // Mitigation value is always 20% at all levels
    levelMitigationValues: {
      8: 0.20  // At level 8, mitigation is 20% (matches description)
    },
    damageType: 'both'
  },

  // Paladin specific
  {
    id: 'passage',
    name: 'Passage of Arms',
    description: 'Reduces damage taken by party members behind you by 15%',
    duration: 18,
    cooldown: 120,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/passage_of_arms.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    damageType: 'both'
  },
  {
    id: 'divine_veil',
    name: 'Divine Veil',
    description: 'Creates a barrier around self and nearby party members that absorbs damage',
    duration: 30,
    cooldown: 90,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/divine_veil.png',
    type: 'mitigation',
    mitigationValue: 0, // Shield, not direct mitigation
    damageType: 'both'
  },
  {
    id: 'holy_sheltron',
    name: 'Holy Sheltron',
    description: 'Reduces damage taken by 15% and grants a healing over time effect',
    duration: 8,
    cooldown: 25,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/holy_sheltron.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    damageType: 'both'
  },
  {
    id: 'guardian',
    name: 'Guardian',
    description: 'Reduces damage taken by a party member by 15% and grants healing over time',
    duration: 8,
    cooldown: 60,
    jobs: ['PLD'],
    icon: '/abilities-gamerescape/guardian.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    damageType: 'both'
  },

  // Warrior specific
  {
    id: 'shake',
    name: 'Shake It Off',
    description: 'Creates a barrier around self and nearby party members that absorbs damage',
    duration: 30,
    cooldown: 90,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/shake_it_off.png',
    type: 'mitigation',
    mitigationValue: 0, // Shield, not direct mitigation
    damageType: 'both'
  },
  {
    id: 'bloodwhetting',
    name: 'Bloodwhetting',
    description: 'Reduces damage taken by 10% and grants healing over time',
    duration: 8,
    cooldown: 25,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/bloodwhetting.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both'
  },
  {
    id: 'nascent_flash',
    name: 'Nascent Flash',
    description: 'Reduces damage taken by a party member by 10% and grants healing over time',
    duration: 8,
    cooldown: 25,
    jobs: ['WAR'],
    icon: '/abilities-gamerescape/nascent_flash.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both'
  },

  // Dark Knight specific
  {
    id: 'dark_missionary',
    name: 'Dark Missionary',
    description: 'Reduces magic damage taken by party members by 10%',
    duration: 15,
    cooldown: 90,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/dark_missionary.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'magical'
  },
  {
    id: 'oblation',
    name: 'Oblation',
    description: 'Reduces damage taken by self or a party member by 10%',
    duration: 10,
    cooldown: 60,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/oblation.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both'
  },
  {
    id: 'the_blackest_night',
    name: 'The Blackest Night',
    description: 'Creates a barrier that absorbs damage equal to 25% of maximum HP',
    duration: 7,
    cooldown: 15,
    jobs: ['DRK'],
    icon: '/abilities-gamerescape/the_blackest_night.png',
    type: 'mitigation',
    mitigationValue: 0, // Shield, not direct mitigation
    damageType: 'both'
  },

  // Gunbreaker specific
  {
    id: 'heart_of_light',
    name: 'Heart of Light',
    description: 'Reduces magic damage taken by party members by 10%',
    duration: 15,
    cooldown: 90,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/heart_of_light.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'magical'
  },
  {
    id: 'heart_of_corundum',
    name: 'Heart of Corundum',
    description: 'Reduces damage taken by 15% and grants healing over time',
    duration: 8,
    cooldown: 25,
    jobs: ['GNB'],
    icon: '/abilities-gamerescape/heart_of_corundum.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    damageType: 'both'
  },

  // Healer abilities
  {
    id: 'divine_benison',
    name: 'Divine Benison',
    description: 'Creates a barrier that absorbs damage',
    duration: 15,
    cooldown: 30,
    jobs: ['WHM'],
    icon: '/abilities-gamerescape/divine_benison.png',
    type: 'mitigation',
    mitigationValue: 0, // Shield, not direct mitigation
    damageType: 'both'
  },
  {
    id: 'temperance',
    name: 'Temperance',
    description: 'Reduces damage taken by party members by 15%',
    duration: 20,
    cooldown: 120,
    jobs: ['WHM'],
    icon: '/abilities-gamerescape/temperance.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    damageType: 'both'
  },
  {
    id: 'liturgy_of_the_bell',
    name: 'Liturgy of the Bell',
    description: 'Creates healing bells that activate when you take damage, healing you and nearby party members',
    duration: 20,
    cooldown: 180,
    jobs: ['WHM'],
    icon: '/abilities-gamerescape/liturgy_of_the_bell.png',
    type: 'healing',
    mitigationValue: 0, // Healing, not direct mitigation
    damageType: 'both'
  },
  {
    id: 'sacred_soil',
    name: 'Sacred Soil',
    description: 'Creates an area that reduces damage taken by 10% and applies regen',
    duration: 15,
    cooldown: 30,
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/sacred_soil.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both'
  },
  {
    id: 'expedient',
    name: 'Expedient',
    description: 'Increases movement speed and reduces damage taken by 10%',
    duration: 20,
    cooldown: 120,
    jobs: ['SCH'],
    icon: '/abilities-gamerescape/expedient.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both'
  },

  {
    id: 'collective_unconscious',
    name: 'Collective Unconscious',
    description: 'Creates an area that reduces damage taken by 10% and applies regen',
    duration: 15,
    cooldown: 60,
    jobs: ['AST'],
    icon: '/abilities-gamerescape/collective_unconscious.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both'
  },
  {
    id: 'exaltation',
    name: 'Exaltation',
    description: 'Reduces damage taken by a party member by 10% and delivers healing after effect expires',
    duration: 8,
    cooldown: 60,
    jobs: ['AST'],
    icon: '/abilities-gamerescape/exaltation.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both'
  },
  {
    id: 'macrocosmos',
    name: 'Macrocosmos',
    description: 'Records damage taken by party members and then delivers healing based on the amount recorded',
    duration: 15,
    cooldown: 180,
    jobs: ['AST'],
    icon: '/abilities-gamerescape/macrocosmos.png',
    type: 'healing'
  },
  {
    id: 'kerachole',
    name: 'Kerachole',
    description: 'Reduces damage taken by 10% in an area and applies regen',
    duration: 15,
    cooldown: 30,
    jobs: ['SGE'],
    icon: '/abilities-gamerescape/kerachole.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both'
  },

  {
    id: 'holos',
    name: 'Holos',
    description: 'Reduces damage taken by 10% and grants healing over time',
    duration: 20,
    cooldown: 120,
    jobs: ['SGE'],
    icon: '/abilities-gamerescape/holos.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    damageType: 'both'
  },
  {
    id: 'haima',
    name: 'Haima',
    description: 'Creates a barrier that absorbs damage and grants additional barriers when consumed',
    duration: 15,
    cooldown: 120,
    jobs: ['SGE'],
    icon: '/abilities-gamerescape/haima.png',
    type: 'mitigation',
    mitigationValue: 0, // Shield, not direct mitigation
    damageType: 'both'
  },
  {
    id: 'panhaima',
    name: 'Panhaima',
    description: 'Creates barriers around party members that absorb damage',
    duration: 15,
    cooldown: 120,
    jobs: ['SGE'],
    icon: '/abilities-gamerescape/panhaima.png',
    type: 'mitigation',
    mitigationValue: 0, // Shield, not direct mitigation
    damageType: 'both'
  },

  // DPS abilities
  {
    id: 'feint',
    name: 'Feint',
    description: 'Reduces physical damage dealt by target by 10% and magic damage by 5%',
    levelRequirement: 22,
    levelDescriptions: {
      22: 'Reduces target\'s physical damage dealt by 10% for 10s',
      80: 'Reduces target\'s physical damage dealt by 10% and magic damage dealt by 5% for 10s',
      94: 'Reduces target\'s physical damage dealt by 10% and magic damage dealt by 5% for 15s'
    },
    duration: 10, // Base duration, increases to 15s at level 94
    levelDurations: {
      22: 10, // At level 22, duration is 10s
      80: 10, // At level 80, duration is 10s
      94: 15  // At level 94, duration is 15s
    },
    cooldown: 90,
    levelCooldowns: {
      22: 120, // At level 22, cooldown is 120s
      70: 90   // At level 70, cooldown is 90s
    },
    jobs: ['MNK', 'DRG', 'NIN', 'SAM', 'RPR', 'VPR'],
    icon: '/abilities-gamerescape/feint.png',
    type: 'mitigation',
    mitigationValue: { physical: 0.10, magical: 0.05 },
    levelMitigationValues: {
      22: { physical: 0.10, magical: 0.00 }, // At level 22, only physical mitigation
      80: { physical: 0.10, magical: 0.05 }  // At level 80, added magical mitigation
    },
    damageType: 'both'
  },
  {
    id: 'addle',
    name: 'Addle',
    description: 'Reduces magic damage dealt by target by 10% and physical damage by 5%',
    levelRequirement: 8,
    levelDescriptions: {
      8: 'Reduces target\'s magic damage dealt by 10% for 10s',
      80: 'Reduces target\'s magic damage dealt by 10% and physical damage dealt by 5% for 10s',
      90: 'Reduces target\'s magic damage dealt by 10% and physical damage dealt by 5% for 15s'
    },
    duration: 10, // Base duration, increases to 15s at level 90
    levelDurations: {
      8: 10,  // At level 8, duration is 10s
      90: 15  // At level 90, duration is 15s
    },
    cooldown: 90,
    levelCooldowns: {
      8: 120,  // At level 8, cooldown is 120s
      70: 90   // At level 70, cooldown is 90s
    },
    jobs: ['BLM', 'SMN', 'RDM', 'PCM'],
    icon: '/abilities-gamerescape/addle.png',
    type: 'mitigation',
    mitigationValue: { magical: 0.10, physical: 0.05 },
    levelMitigationValues: {
      8: { magical: 0.10, physical: 0.00 },  // At level 8, only magical mitigation
      80: { magical: 0.10, physical: 0.05 }  // At level 80, added physical mitigation
    },
    damageType: 'both'
  },
  {
    id: 'troubadour',
    name: 'Troubadour',
    description: 'Reduces damage taken by party members by 15%',
    levelRequirement: 62,
    levelDescriptions: {
      62: 'Reduces damage taken by party members by 10% for 15s',
      94: 'Reduces damage taken by party members by 15% for 15s'
    },
    duration: 15,
    cooldown: 90,
    levelCooldowns: {
      62: 180, // At level 62, cooldown is 180s
      80: 120, // At level 80, cooldown is 120s
      94: 90   // At level 94, cooldown is 90s
    },
    jobs: ['BRD'],
    icon: '/abilities-gamerescape/troubadour.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    levelMitigationValues: {
      62: 0.10, // At level 62, mitigation is 10%
      94: 0.15  // At level 94, mitigation is 15%
    },
    damageType: 'both'
  },
  {
    id: 'tactician',
    name: 'Tactician',
    description: 'Reduces damage taken by party members by 15%',
    levelRequirement: 56,
    levelDescriptions: {
      56: 'Reduces damage taken by party members by 10% for 15s',
      94: 'Reduces damage taken by party members by 15% for 15s'
    },
    duration: 15,
    cooldown: 90,
    levelCooldowns: {
      56: 180, // At level 56, cooldown is 180s
      80: 120, // At level 80, cooldown is 120s
      94: 90   // At level 94, cooldown is 90s
    },
    jobs: ['MCH'],
    icon: '/abilities-gamerescape/tactician.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    levelMitigationValues: {
      56: 0.10, // At level 56, mitigation is 10%
      94: 0.15  // At level 94, mitigation is 15%
    },
    damageType: 'both'
  },
  {
    id: 'shield_samba',
    name: 'Shield Samba',
    description: 'Reduces damage taken by party members by 15%',
    levelRequirement: 56,
    levelDescriptions: {
      56: 'Reduces damage taken by party members by 10% for 15s',
      94: 'Reduces damage taken by party members by 15% for 15s'
    },
    duration: 15,
    cooldown: 90,
    levelCooldowns: {
      56: 180, // At level 56, cooldown is 180s
      80: 120, // At level 80, cooldown is 120s
      94: 90   // At level 94, cooldown is 90s
    },
    jobs: ['DNC'],
    icon: '/abilities-gamerescape/shield_samba.png',
    type: 'mitigation',
    mitigationValue: 0.15,
    levelMitigationValues: {
      56: 0.10, // At level 56, mitigation is 10%
      94: 0.15  // At level 94, mitigation is 15%
    },
    damageType: 'both'
  },
  {
    id: 'magick_barrier',
    name: 'Magick Barrier',
    description: 'Reduces magic damage taken by 10% and increases healing received by 5%',
    levelRequirement: 86,
    levelDescriptions: {
      86: 'Reduces magic damage taken by 10% and increases healing received by 5% for 10s',
      94: 'Reduces magic damage taken by 10% and increases healing received by 5% for 15s'
    },
    duration: 10, // Base duration, increases to 15s at level 94
    levelDurations: {
      86: 10, // At level 86, duration is 10s
      94: 15  // At level 94, duration is 15s
    },
    cooldown: 120,
    levelCooldowns: {
      86: 120 // At level 86, cooldown is 120s
    },
    jobs: ['RDM'],
    icon: '/abilities-gamerescape/magick_barrier.png',
    type: 'mitigation',
    mitigationValue: 0.10,
    levelMitigationValues: {
      86: 0.10 // At level 86, mitigation is 10%
    },
    damageType: 'magical'
  },
  {
    id: 'arcane_crest',
    name: 'Arcane Crest',
    description: 'Creates a barrier on self that heals nearby party members when broken',
    levelRequirement: 40,
    levelDescriptions: {
      40: 'Creates a barrier on self that absorbs damage equal to 10% of maximum HP for 30s',
      82: 'Creates a barrier on self that absorbs damage equal to 10% of maximum HP for 30s and heals nearby party members when broken'
    },
    duration: 30,
    cooldown: 60,
    jobs: ['RPR'],
    icon: '/abilities-gamerescape/arcane_crest.png',
    type: 'mitigation',
    mitigationValue: 0, // Shield, not direct mitigation
    damageType: 'both'
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
    damageType: 'both'
  }
];

// Initial assignments (empty)
export const initialAssignments = {};
