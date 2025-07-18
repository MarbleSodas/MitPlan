/**
 * Boss actions data for the application
 */
import sugarRiotActions from './sugar-riot_actions.json';
import dancingGreenActions from './dancing-green_actions.json';
import lalaActions from './lala_actions.json';
import staticeActions from './statice_actions.json';
import bruteAbominatorActions from './brute-abominator_actions.json';
import howlingBladeActions from './howling-blade_actions.json';

export const bossActionsMap = {
  'sugar-riot': sugarRiotActions,
  'dancing-green-m5s': dancingGreenActions,
  'lala': lalaActions,
  'statice': staticeActions,
  'brute-abominator-m7s': bruteAbominatorActions,
  'howling-blade-m8s': howlingBladeActions,
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
      time: 91, // 87 + 10
      description: 'Moderate party-wide magical damage with either stack (Hydrofall) or spread (Hydrobullet) mechanics. Players receive debuffs that resolve after a delay, requiring proper positioning.',
      unmitigatedDamage: '~43,461', // Using the value from Hydrofall_2
      damageType: 'magical',
      importance: 'medium',
      icon: '💧'
    },
    {
      id: 'hydro_combo_3',
      name: 'Hydrofall || Hydrobullet',
      time: 97, // 87 + 10
      description: 'Moderate party-wide magical damage with either stack (Hydrofall) or spread (Hydrobullet) mechanics. Players receive debuffs that resolve after a delay, requiring proper positioning.',
      unmitigatedDamage: '~43,341', // Using the value from Hydrofall_2
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
      id: 'hydro_combo_4',
      name: 'Hydrofall || Hydrobullet',
      time: 207, // 197 + 10
      description: 'High party-wide magical damage with either stack (Hydrofall) or spread (Hydrobullet) mechanics. Players receive debuffs that resolve after a delay, requiring proper positioning.',
      unmitigatedDamage: '~68,233',
      damageType: 'magical',
      importance: 'high',
      icon: '💧'
    },
    {
      id: 'hydro_combo_5',
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
      id: 'hydro_combo_6',
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
  statice: [
    {
      id: 'aero_iv_1',
      name: 'Aero IV',
      time: 10, // 1 + 9
      description: 'High party-wide magical damage that should be heavily mitigated. This is Statice\'s signature attack and appears multiple times throughout the fight.',
      unmitigatedDamage: '~73,035',
      damageType: 'magical',
      importance: 'high',
      icon: '🌪️'
    },
    {
      id: 'trapshooting_1',
      name: 'Trapshooting',
      time: 38, // 29 + 9
      description: 'Party-wide magical damage with stack or spread mechanics. Players must position correctly based on assigned debuffs to avoid lethal damage.',
      unmitigatedDamage: '~67,362',
      damageType: 'magical',
      importance: 'high',
      icon: '🎯'
    },
    {
      id: 'trapshooting_2',
      name: 'Trapshooting',
      time: 70, // 61 + 9
      description: 'Party-wide magical damage with stack or spread mechanics. Players must position correctly based on assigned debuffs to avoid lethal damage.',
      unmitigatedDamage: '~69,361',
      damageType: 'magical',
      importance: 'high',
      icon: '🎯'
    },
    {
      id: 'trapshooting_3',
      name: 'Trapshooting + Uncommon Ground',
      time: 120, // 111 + 9
      description: 'Party-wide magical damage with stack or spread mechanics. Players must position correctly based on assigned debuffs to avoid lethal damage.',
      unmitigatedDamage: '~93,193',
      damageType: 'magical',
      importance: 'high',
      icon: '🎯'
    },
    {
      id: 'trapshooting_4',
      name: 'Trapshooting',
      time: 160, // 151 + 9
      description: 'Party-wide magical damage with stack or spread mechanics. Players must position correctly based on assigned debuffs to avoid lethal damage.',
      unmitigatedDamage: '~67,193',
      damageType: 'magical',
      importance: 'high',
      icon: '🎯'
    },
    {
      id: 'aero_iv_2',
      name: 'Aero IV',
      time: 168, // 159 + 9
      description: 'High party-wide magical damage that should be heavily mitigated. This is Statice\'s signature attack and appears multiple times throughout the fight.',
      unmitigatedDamage: '~73,556',
      damageType: 'magical',
      importance: 'high',
      icon: '🌪️'
    },
    {
      id: 'fireworks_1',
      name: 'Fireworks',
      time: 200, // 191 + 9
      description: 'Moderate to high party-wide magical damage. Part of a complex mechanic involving tethered adds, chain markers, and spread/stack positions that must be resolved correctly.',
      unmitigatedDamage: '~60,798',
      damageType: 'magical',
      importance: 'medium',
      icon: '🎆'
    },
    {
      id: 'shocking_abandon_1',
      name: 'Shocking Abandon',
      time: 208, // 199 + 9
      description: 'Telegraphed tankbuster that deals very high physical damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: '~267,868',
      damageType: 'physical',
      importance: 'high',
      icon: '🛡️',
      isTankBuster: true
    },
    {
      id: 'fireworks_2',
      name: 'Fireworks + Uncommon Ground',
      time: 236, // 227 + 9
      description: 'Moderate to high party-wide magical damage. Part of the Pinwheeling Dartboard mechanic where players must navigate rotating AoEs while resolving debuffs.',
      unmitigatedDamage: '~85,226',
      damageType: 'magical',
      importance: 'medium',
      icon: '🎆'
    },
    {
      id: 'aero_iv_3',
      name: 'Aero IV',
      time: 249, // 240 + 9
      description: 'High party-wide magical damage that should be heavily mitigated. This is Statice\'s signature attack and appears multiple times throughout the fight.',
      unmitigatedDamage: '~71,716',
      damageType: 'magical',
      importance: 'high',
      icon: '🌪️'
    },
    {
      id: 'trapshooting_5',
      name: 'Trapshooting',
      time: 288, // 279 + 9
      description: 'Party-wide magical damage with stack or spread mechanics. Players must position correctly based on assigned debuffs to avoid lethal damage.',
      unmitigatedDamage: '~65,847',
      damageType: 'magical',
      importance: 'high',
      icon: '🎯'
    },
    {
      id: 'trapshooting_6',
      name: 'Trapshooting',
      time: 315, // 306 + 9
      description: 'Party-wide magical damage with stack or spread mechanics. Players must position correctly based on assigned debuffs to avoid lethal damage.',
      unmitigatedDamage: '~65,847',
      damageType: 'magical',
      importance: 'high',
      icon: '🎯'
    },
    {
      id: 'aero_iv_4',
      name: 'Aero IV',
      time: 331, // 322 + 9
      description: 'High party-wide magical damage that should be heavily mitigated. This is Statice\'s signature attack and appears multiple times throughout the fight.',
      unmitigatedDamage: '~73,540',
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
