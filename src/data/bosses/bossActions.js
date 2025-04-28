/**
 * Boss actions data for the application
 */

export const bossActionsMap = {
  ketuduke: [
    {
      id: 'tidal_roar_1',
      name: 'Tidal Roar',
      time: 10, // 0 + 10
      description: 'High party-wide magical damage that inflicts Dropsy debuff, requiring mitigation and healing. Also applies a DoT effect (initial hit: ~81,436, total DoT damage: ~82,755).',
      unmitigatedDamage: '~81,436',
      damageType: 'magical',
      importance: 'high',
      icon: '⭕'
    },
    {
      id: 'bubble_net_1',
      name: 'Bubble Net',
      time: 29, // 19 + 10
      description: 'Party-wide magical damage that assigns Bubble Weave or Foamy Fetters debuffs to players. Bubble Weave lifts players in bubbles making them susceptible to knockbacks, while Foamy Fetters binds players in place.',
      unmitigatedDamage: '~71,090',
      damageType: 'magical',
      importance: 'high',
      icon: '🫧'
    },
    {
      id: 'hydro_combo_1',
      name: 'Hydrofall || Hydrobullet',
      time: 59, // 49 + 10
      description: 'Moderate party-wide magical damage with either stack (Hydrofall) or spread (Hydrobullet) mechanics. Players receive debuffs that resolve after a delay, requiring proper positioning.',
      unmitigatedDamage: '~42,098', // Using the value from Hydrofall
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'hydro_combo_2',
      name: 'Hydrofall || Hydrobullet',
      time: 97, // 87 + 10
      description: 'Moderate party-wide magical damage with either stack (Hydrofall) or spread (Hydrobullet) mechanics. Players receive debuffs that resolve after a delay, requiring proper positioning.',
      unmitigatedDamage: '~43,461', // Using the value from Hydrofall_2
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'hydrofall_3',
      name: 'Hydrofall',
      time: 128, // 118 + 10
      description: 'Moderate party-wide magical damage with stack mechanics. Players must group together to split the damage and avoid lethal damage.',
      unmitigatedDamage: '~42,239',
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'bubble_net_2',
      name: 'Bubble Net',
      time: 160, // 150 + 10
      description: 'Party-wide magical damage that assigns Bubble Weave or Foamy Fetters debuffs to players. Bubble Weave lifts players in bubbles making them susceptible to knockbacks, while Foamy Fetters binds players in place.',
      unmitigatedDamage: '~70,362',
      damageType: 'magical',
      importance: 'high',
      icon: '🫧'
    },
    {
      id: 'hydrobullet_3',
      name: 'Hydrobullet',
      time: 171, // 161 + 10
      description: 'Moderate party-wide magical damage with spread mechanics. Players must spread out to avoid overlapping damage areas and inflicting Magic Vulnerability Up on each other.',
      unmitigatedDamage: '~42,730',
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'angry_seas_1',
      name: 'Angry Seas',
      time: 205, // 195 + 10
      description: 'Low party-wide mixed damage with knockback mechanics. Creates a lethal line AoE in the middle that partitions the arena into two sides, with knockbacks on both sides.',
      unmitigatedDamage: '~27,199',
      damageType: 'both',
      importance: 'medium',
      icon: '🌊'
    },
    {
      id: 'hydro_combo_3',
      name: 'Hydrofall || Hydrobullet',
      time: 207, // 197 + 10
      description: 'High party-wide magical damage with either stack (Hydrofall) or spread (Hydrobullet) mechanics. Players receive debuffs that resolve after a delay, requiring proper positioning.',
      unmitigatedDamage: '~68,233',
      damageType: 'magical',
      importance: 'high',
      icon: '💧'
    },
    {
      id: 'hydro_combo_4',
      name: 'Hydrofall || Hydrobullet',
      time: 212, // 202 + 10
      description: 'Moderate party-wide magical damage with either stack (Hydrofall) or spread (Hydrobullet) mechanics. Players receive debuffs that resolve after a delay, requiring proper positioning.',
      unmitigatedDamage: '~41,126',
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'bubble_net_3',
      name: 'Bubble Net',
      time: 218, // 208 + 10
      description: 'Party-wide magical damage that assigns Bubble Weave or Foamy Fetters debuffs to players. Bubble Weave lifts players in bubbles making them susceptible to knockbacks, while Foamy Fetters binds players in place.',
      unmitigatedDamage: '~71,767',
      damageType: 'magical',
      importance: 'high',
      icon: '🫧'
    },
    {
      id: 'burst_1',
      name: 'Burst',
      time: 234, // 224 + 10
      description: 'Low party-wide magical damage. Associated with tower mechanics where players must soak specific positions to prevent a wipe.',
      unmitigatedDamage: '~27,279',
      damageType: 'magical',
      importance: 'medium',
      icon: '💥'
    },
    {
      id: 'bubble_net_4',
      name: 'Bubble Net',
      time: 250, // 240 + 10
      description: 'Party-wide magical damage that assigns Bubble Weave or Foamy Fetters debuffs to players. Bubble Weave lifts players in bubbles making them susceptible to knockbacks, while Foamy Fetters binds players in place.',
      unmitigatedDamage: '~70,824',
      damageType: 'magical',
      importance: 'high',
      icon: '🫧'
    },
    {
      id: 'hydro_combo_5',
      name: 'Hydrofall || Hydrobullet',
      time: 280, // 270 + 10
      description: 'Moderate party-wide magical damage with both stack (Hydrofall) and spread (Hydrobullet) mechanics occurring simultaneously. Players must coordinate to handle both mechanics at once.',
      unmitigatedDamage: '~43,424', // Using the value from Hydrobullet_4
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'hydrofall_6',
      name: 'Hydrofall',
      time: 310, // 300 + 10
      description: 'Moderate party-wide magical damage with stack mechanics. Players must group together to split the damage and avoid lethal damage.',
      unmitigatedDamage: '~40,537',
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'tidal_roar_2',
      name: 'Tidal Roar',
      time: 320, // 0 + 10
      description: 'High party-wide magical damage that inflicts Dropsy debuff, requiring mitigation and healing. Also applies a DoT effect (initial hit: ~81,436, total DoT damage: ~82,755).',
      unmitigatedDamage: '~81,436',
      damageType: 'magical',
      importance: 'high',
      icon: '⭕'
    },
    {
      id: 'tidal_roar_enrage',
      name: 'Tidal Roar (enrage)',
      time: 330,
      description: 'Wipe',
      unmitigatedDamage: 'N/A',
      damageType: 'magical',
      importance: 'critical',
      icon: '💀'
    },
  ],
  lala: [
    {
      id: 'inferno_theorem_1',
      name: 'Inferno Theorem',
      time: 8,
      description: 'High party-wide magical damage that should be heavily mitigated. This is Lala\'s signature attack and one of the most dangerous raid-wide abilities.',
      unmitigatedDamage: '~86,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'targeted_light_1',
      name: 'Targeted Light',
      time: 59,
      description: 'Moderate party-wide magical damage. Part of a mechanic involving player rotation and positioning based on assigned debuffs.',
      unmitigatedDamage: '~35,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🔦'
    },
    {
      id: 'strategic_strike_1',
      name: 'Strategic Strike',
      time: 69,
      description: 'A telegraphed, three-hit physical tankbuster that deals very high damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: '~55,000 per hit',
      damageType: 'physical',
      importance: 'high',
      icon: '🗡️'
    },
    {
      id: 'arcane_combustion_1',
      name: 'Arcane Combustion',
      time: 100,
      description: 'Moderate party-wide magical damage. Part of Lala\'s mechanics involving Arcane Mines that must be disarmed by players with specific debuffs.',
      unmitigatedDamage: '~40,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '✨'
    },
    {
      id: 'symmetric_surge_1',
      name: 'Symmetric Surge',
      time: 105,
      description: 'Moderate party-wide magical damage. A two-person stack AoE that inflicts Magic Vulnerability Up. Will deal lethal damage if only one player is in the stack or if two stacks overlap.',
      unmitigatedDamage: '~47,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🔄'
    },
    {
      id: 'inferno_theorem_2',
      name: 'Inferno Theorem',
      time: 149,
      description: 'High party-wide magical damage that should be heavily mitigated. This is Lala\'s signature attack and one of the most dangerous raid-wide abilities.',
      unmitigatedDamage: '~76,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'strategic_strike_2',
      name: 'Strategic Strike',
      time: 160,
      description: 'A telegraphed, three-hit physical tankbuster that deals very high damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: '~54,000 per hit',
      damageType: 'physical',
      importance: 'high',
      icon: '🗡️'
    },
    {
      id: 'powerful_light_1',
      name: 'Powerful Light',
      time: 199,
      description: 'Moderate party-wide magical damage. Part of a mechanic involving player rotation and positioning based on assigned debuffs.',
      unmitigatedDamage: '~48,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '💡'
    },
    {
      id: 'explosive_theorem_1',
      name: 'Explosive Theorem',
      time: 208,
      description: 'Party-wide magical damage. Follows a complex sequence of mechanics involving Symmetric Surge and other abilities.',
      unmitigatedDamage: '~53,000',
      damageType: 'magical',
      importance: 'high',
      icon: '💥'
    },
    {
      id: 'symmetric_surge_2',
      name: 'Symmetric Surge',
      time: 212,
      description: 'Moderate party-wide magical damage. A two-person stack AoE that inflicts Magic Vulnerability Up. Will deal lethal damage if only one player is in the stack or if two stacks overlap.',
      unmitigatedDamage: '~44,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🔄'
    },
    {
      id: 'strategic_strike_3',
      name: 'Strategic Strike',
      time: 226,
      description: 'A telegraphed, three-hit physical tankbuster that deals very high damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: '~55,000 per hit',
      damageType: 'physical',
      importance: 'high',
      icon: '🗡️'
    },
    {
      id: 'inferno_theorem_3',
      name: 'Inferno Theorem',
      time: 234,
      description: 'High party-wide magical damage that should be heavily mitigated. This is Lala\'s signature attack and one of the most dangerous raid-wide abilities.',
      unmitigatedDamage: '~81,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'targeted_light_2',
      name: 'Targeted Light',
      time: 273,
      description: 'Moderate party-wide magical damage. Part of a mechanic involving player rotation and positioning based on assigned debuffs.',
      unmitigatedDamage: '~35,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🔦'
    },
    {
      id: 'strategic_strike_4',
      name: 'Strategic Strike',
      time: 284,
      description: 'A telegraphed, three-hit physical tankbuster that deals very high damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: '~54,000 per hit',
      damageType: 'physical',
      importance: 'high',
      icon: '🗡️'
    },
    {
      id: 'inferno_theorem_4',
      name: 'Inferno Theorem',
      time: 300,
      description: 'High party-wide magical damage that should be heavily mitigated. This is Lala\'s signature attack and one of the most dangerous raid-wide abilities.',
      unmitigatedDamage: '~81,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'inferno_theorem_enrage',
      name: 'Inferno Theorem (enrage)',
      time: 330,
      description: 'Wipe',
      unmitigatedDamage: 'N/A',
      damageType: 'magical',
      importance: 'critical',
      icon: '💀'
    },
  ],
  statice: [
    {
      id: 'aero_iv_1',
      name: 'Aero IV',
      time: 11,
      description: 'High party-wide magical damage that should be heavily mitigated. This is Statice\'s signature attack and appears multiple times throughout the fight.',
      unmitigatedDamage: '~73,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🌪️'
    },
    {
      id: 'trapshooting_1',
      name: 'Trapshooting',
      time: 39,
      description: 'Party-wide magical damage with stack or spread mechanics. Players must position correctly based on assigned debuffs to avoid lethal damage.',
      unmitigatedDamage: '~65,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🎯'
    },
    {
      id: 'trigger_happy_1',
      name: 'Trigger Happy',
      time: 45,
      description: 'Complex dodge mechanic that requires players to avoid AoE markers while dealing with forced movement debuffs. Players must position to be moved into safe areas.',
      unmitigatedDamage: 'N/A',
      damageType: 'magical',
      importance: 'medium',
      icon: '🔫'
    },
    {
      id: 'shocking_aboron_1',
      name: 'Shocking Aboron',
      time: 68,
      description: 'Telegraphed tankbuster that deals very high physical damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: 'Very high',
      damageType: 'physical',
      importance: 'high',
      icon: '🗡️'
    },
    {
      id: 'aero_iv_2',
      name: 'Aero IV',
      time: 100,
      description: 'High party-wide magical damage that should be heavily mitigated. This is Statice\'s signature attack and appears multiple times throughout the fight.',
      unmitigatedDamage: '~73,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🌪️'
    },
    {
      id: 'fireworks_1',
      name: 'Fireworks',
      time: 200,
      description: 'Moderate party-wide magical damage. Part of a complex mechanic involving tethered adds, chain markers, and spread/stack positions that must be resolved correctly.',
      unmitigatedDamage: '~55,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🎆'
    },
    {
      id: 'shocking_aboron_2',
      name: 'Shocking Aboron',
      time: 208,
      description: 'Telegraphed tankbuster that deals very high physical damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: 'Very high',
      damageType: 'physical',
      importance: 'high',
      icon: '🗡️'
    },
    {
      id: 'fireworks_2',
      name: 'Fireworks',
      time: 237,
      description: 'Moderate party-wide magical damage. Part of the Pinwheeling Dartboard mechanic where players must navigate rotating AoEs while resolving debuffs.',
      unmitigatedDamage: '~52,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🎆'
    },
    {
      id: 'aero_iv_3',
      name: 'Aero IV',
      time: 290,
      description: 'High party-wide magical damage that should be heavily mitigated. This is Statice\'s signature attack and appears multiple times throughout the fight.',
      unmitigatedDamage: '~73,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🌪️'
    },
    {
      id: 'aero_iv_4',
      name: 'Aero IV',
      time: 324,
      description: 'High party-wide magical damage that should be heavily mitigated. This is Statice\'s signature attack and appears multiple times throughout the fight.',
      unmitigatedDamage: '~73,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🌪️'
    },
    {
      id: 'aero_iv_enrage',
      name: 'Aero IV (enrage)',
      time: 340,
      description: 'Wipe',
      unmitigatedDamage: 'N/A',
      damageType: 'magical',
      importance: 'critical',
      icon: '💀'
    },
  ]
};

// For backward compatibility
export const bossActions = bossActionsMap.ketuduke;

export default bossActionsMap;
