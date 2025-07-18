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
  lala: [
    {
      id: 'inferno_theorem_1',
      name: 'Inferno Theorem',
      time: 10, // 0 + 10
      description: 'High party-wide magical damage that should be heavily mitigated. This is Lala\'s signature attack and one of the most dangerous raid-wide abilities.',
      unmitigatedDamage: '~86,253',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'radiance_1',
      name: 'Radiance',
      time: 46, // 1 + 9
      description: 'Party-wide magical damage that is applied during mechanics',
      unmitigatedDamage: '~25,840',
      damageType: 'magical',
      importance: 'low',
      icon: '🔥'
    },
    {
      id: 'radiance_2',
      name: 'Radiance',
      time: 55, // 1 + 9
      description: 'Party-wide magical damage that is applied during mechanics',
      unmitigatedDamage: '~25,376',
      damageType: 'magical',
      importance: 'low',
      icon: '🔥'
    },
    {
      id: 'targeted_light_1',
      name: 'Targeted Light',
      time: 60,
      description: 'Moderate party-wide magical damage with knockback. Players must face their character so their safe side is towards the boss when considering rotation, or they will take heavy damage and be knocked back.',
      unmitigatedDamage: '~38,987',
      damageType: 'magical',
      importance: 'medium',
      icon: '🔦'
    },
    {
      id: 'strategic_strike_1',
      name: 'Strategic Strike',
      time: 71, // 62 + 9
      description: 'A telegraphed, three-hit physical tankbuster that deals very high damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: '~59,825 per hit',
      damageType: 'physical',
      importance: 'high',
      icon: '🛡️',
      isTankBuster: true
    },
    {
      id: 'symmetric_surge_1',
      name: 'Symmetric Surge',
      time: 107, // 98 + 9
      description: 'Pair stacks. Part of the Planar Tactics mechanic.',
      unmitigatedDamage: '~50,880',
      damageType: 'magical',
      importance: 'low',
      icon: '💥'
    },
    {
      id: 'inferno_theorem_2',
      name: 'Inferno Theorem',
      time: 112, // 103 + 9
      description: 'High party-wide magical damage that should be heavily mitigated. This is Lala\'s signature attack and one of the most dangerous raid-wide abilities.',
      unmitigatedDamage: '~84,792',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'strategic_strike_2',
      name: 'Strategic Strike',
      time: 122, // 113 + 9
      description: 'A telegraphed, three-hit physical tankbuster that deals very high damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: '~59,854 per hit',
      damageType: 'physical',
      importance: 'high',
      icon: '🛡️',
      isTankBuster: true
    },
    {
      id: 'inferno_theorem_3',
      name: 'Inferno Theorem',
      time: 172, // 164 + 9
      description: 'High party-wide magical damage that should be heavily mitigated. This is Lala\'s signature attack and one of the most dangerous raid-wide abilities.',
      unmitigatedDamage: '~85,099',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'inferno_theorem_4',
      name: 'Inferno Theorem',
      time: 183, // 175 + 9
      description: 'High party-wide magical damage that should be heavily mitigated. This is Lala\'s signature attack and one of the most dangerous raid-wide abilities.',
      unmitigatedDamage: '~85,099',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'powerful_light_1',
      name: 'Powerful Light',
      time: 221, // 212 + 9
      description: 'Moderate to high party-wide magical damage. Part of a mechanic involving player rotation and positioning based on assigned debuffs.',
      unmitigatedDamage: '~56,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '💡'
    },
    {
      id: 'explosive_theorem_1',
      name: 'Explosive Theorem',
      time: 230, // 221 + 9
      description: 'High party-wide magical damage that follows a complex sequence of mechanics involving Symmetric Surge and other abilities.',
      unmitigatedDamage: '~54,536',
      damageType: 'magical',
      importance: 'high',
      icon: '💥'
    },
    {
      id: 'symmetric_surge_2',
      name: 'Symmetric Surge',
      time: 234, // 225 + 9
      description: 'Moderate party-wide magical damage. A two-person stack AoE that inflicts Magic Vulnerability Up. Will deal lethal damage if only one player is in the stack or if two stacks overlap.',
      unmitigatedDamage: '~55,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🔄'
    },
    {
      id: 'strategic_strike_3',
      name: 'Strategic Strike',
      time: 248, // 239 + 9
      description: 'A telegraphed, three-hit physical tankbuster that deals very high damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: '~59,711 per hit',
      damageType: 'physical',
      importance: 'high',
      icon: '🛡️',
      isTankBuster: true
    },
    {
      id: 'inferno_theorem_5',
      name: 'Inferno Theorem',
      time: 257, // 248 + 9
      description: 'High party-wide magical damage that should be heavily mitigated. This is Lala\'s signature attack and one of the most dangerous raid-wide abilities.',
      unmitigatedDamage: '~80,363',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'targeted_light_2',
      name: 'Targeted Light',
      time: 296, // 287 + 9
      description: 'High party-wide magical damage with knockback. Players must face their character so their safe side is towards the boss when considering rotation, or they will take heavy damage and be knocked back.',
      unmitigatedDamage: '~31,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🔦'
    },
    {
      id: 'strategic_strike_4',
      name: 'Strategic Strike',
      time: 307, // 298 + 9
      description: 'A telegraphed, three-hit physical tankbuster that deals very high damage. Requires heavy mitigation or an invulnerability cooldown to survive.',
      unmitigatedDamage: '~54,000 per hit',
      damageType: 'physical',
      importance: 'high',
      icon: '🛡️',
      isTankBuster: true
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
  ],
  'dancing-green-m5s': [
    {
      id: 'deep_cut_1',
      name: 'Deep Cut',
      time: 15,
      description: 'Telegraphed conal magical tankbuster on both tanks. Requires heavy mitigation or tank invulnerability.',
      unmitigatedDamage: '400,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🛡️',
      "isTankBuster": true,
      "isDualTankBuster": true
    },
    {
      id: 'play_combo_1',
      name: 'Play A-side || Play B-side',
      time: 40,
      description: 'High party-wide magical damage that should be mitigated. Part of the boss\'s rotation of musical-themed attacks.',
      unmitigatedDamage: '120,000',
      damageType: 'magical',
      importance: 'high',
      icon: '⚔️'
    },
    {
      id: 'play_combo_2',
      name: 'Play A-side || Play B-side',
      time: 59,
      description: 'High party-wide magical damage that should be mitigated. Part of the boss\'s rotation of musical-themed attacks.',
      unmitigatedDamage: '120,000',
      damageType: 'magical',
      importance: 'high',
      icon: '⚔️'
    },
    {
      id: 'celebrate_good_times_1',
      name: 'Celebrate Good Times',
      time: 65,
      description: 'High party-wide magical damage that should be heavily mitigated.',
      unmitigatedDamage: '140,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🎉'
    },
    {
      id: 'disco_infernal_1',
      name: 'Disco Infernal',
      time: 77,
      description: 'Party-wide magical damage and assigns everyone Burn Baby Burn debuffs. Spotlights will spawn and move in fixed patterns. Players must be in a spotlight when debuffs expire.',
      unmitigatedDamage: '95,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'play_combo_3',
      name: 'Play A-side || Play B-side',
      time: 122,
      description: 'High party-wide magical damage that should be mitigated. Part of the boss\'s rotation of musical-themed attacks.',
      unmitigatedDamage: '120,000',
      damageType: 'magical',
      importance: 'high',
      icon: '⚔️'
    },
    {
      id: 'celebrate_good_times_2',
      name: 'Celebrate Good Times',
      time: 128,
      description: 'High party-wide magical damage that should be heavily mitigated.',
      unmitigatedDamage: '140,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🎉'
    },
    {
      id: 'deep_cut_2',
      name: 'Deep Cut',
      time: 136,
      description: 'Telegraphed conal magical tankbuster on both tanks. Requires heavy mitigation or tank invulnerability.',
      unmitigatedDamage: '400,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🛡️',
      "isTankBuster": true,
      "isDualTankBuster": true
    },
    {
      id: 'get_down!_1',
      name: 'Get Down!',
      time: 156,
      description: 'Moderate party-wide magical damage. Players must perform specific dance moves to avoid additional damage.',
      unmitigatedDamage: '100,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '👇'
    },
    {
      id: 'minor_freak_out_1',
      name: 'Minor Freak Out',
      time: 186,
      description: 'Low party-wide magical damage. Part of a mechanic involving pairs based on times',
      unmitigatedDamage: '25,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '😱'
    },
    {
      id: 'beats_combo_1',
      name: 'Quarter Beats || Eighth Beats',
      time: 243,
      description: 'Moderate party-wide magical damage. Part of a sequence of increasingly rapid beat attacks.',
      unmitigatedDamage: '130,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🎵'
    },
    {
      id: 'beats_combo_2',
      name: 'Quarter Beats || Eighth Beats',
      time: 251,
      description: 'All players receive a marker dealing magical damage. Players must spread the damage.',
      unmitigatedDamage: '130,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🎶'
    },
    {
      id: 'play_combo_4',
      name: 'Play A-side || Play B-side',
      time: 277,
      description: 'High party-wide magical damage that should be mitigated. Part of the boss\'s rotation of musical-themed attacks.',
      unmitigatedDamage: '120,000',
      damageType: 'magical',
      importance: 'high',
      icon: '⚔️'
    },
    {
      id: 'deep_cut_3',
      name: 'Deep Cut',
      time: 285,
      description: 'Telegraphed conal magical tankbuster on both tanks. Requires heavy mitigation or tank invulnerability.',
      unmitigatedDamage: '400,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🛡️',
      "isTankBuster": true,
      "isDualTankBuster": true
    },
    {
      id: 'celebrate_good_times_3',
      name: 'Celebrate Good Times',
      time: 291,
      description: 'High party-wide magical damage that should be heavily mitigated.',
      unmitigatedDamage: '140,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🎉'
    },
    {
      id: 'beats_combo_3',
      name: 'Quarter Beats || Eighth Beats',
      time: 306,
      description: 'All players receive a marker dealing magical damage. Players must spread the damage.',
      unmitigatedDamage: '130,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🎶'
    },
    {
      id: 'disco_infernal_2',
      name: 'Disco Infernal',
      time: 325,
      description: 'Party-wide magical damage and assigns everyone Burn Baby Burn debuffs. Spotlights will spawn and move in fixed patterns. Players must be in a spotlight when debuffs expire.',
      unmitigatedDamage: '95,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🔥'
    },
    {
      id: 'back-up_dance_1',
      name: 'Dancing Wave',
      time: 336,
      description: 'Baited Cleaves while completing spotlight mechanic',
      unmitigatedDamage: '95,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '👯'
    },
    {
      id: 'back-up_dance_2',
      name: 'Dancing Wave',
      time: 347,
      description: 'Baited Cleaves while completing spotlight mechanic',
      unmitigatedDamage: '95,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '👯'
    },
    {
      id: 'play_combo_5',
      name: 'Play A-side || Play B-side',
      time: 358,
      description: 'High party-wide magical damage that should be mitigated. Part of the boss\'s rotation of musical-themed attacks.',
      unmitigatedDamage: '120,000',
      damageType: 'magical',
      importance: 'high',
      icon: '⚔️'
    },
    {
      id: 'celebrate_good_times_4',
      name: 'Celebrate Good Times',
      time: 364,
      description: 'High party-wide magical damage that should be heavily mitigated.',
      unmitigatedDamage: '140,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🎉'
    },
    {
      id: 'get_down!_2',
      name: 'Get Down!',
      time: 385,
      description: 'Moderate party-wide magical damage. Players must perform specific dance moves to avoid additional damage.',
      unmitigatedDamage: '100,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '👇'
    },
    {
      id: 'back-up_dance_3',
      name: 'Dancing Wave',
      time: 482,
      description: 'Baited Cleaves while avoiding frogtourage',
      unmitigatedDamage: '95,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '👯'
    },
    {
      id: 'back-up_dance_4',
      name: 'Dancing Wave',
      time: 498,
      description: 'Baited Cleaves while avoiding frogtourage',
      unmitigatedDamage: '95,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '👯'
    },
    {
      id: 'deep_cut_4',
      name: 'Deep Cut',
      time: 515,
      description: 'Telegraphed conal magical tankbuster on both tanks. Requires heavy mitigation or tank invulnerability.',
      unmitigatedDamage: '400,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🛡️',
      "isTankBuster": true,
        "isDualTankBuster": true
    },
    {
      id: 'beats_combo_4',
      name: 'Quarter Beats || Eighth Beats',
      time: 533,
      description: 'Moderate party-wide magical damage. Pairs stacks',
      unmitigatedDamage: '130,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🎵'
    },
    {
      id: 'beats_combo_5',
      name: 'Quarter Beats || Eighth Beats',
      time: 553,
      description: 'All players receive a marker dealing magical damage. Players spread the damage.',
      unmitigatedDamage: '130,000',
      damageType: 'magical',
      importance: 'medium',
      icon: '🎶'
    },
    {
      id: 'celebrate_good_times_5',
      name: 'Celebrate Good Times',
      time: 561,
      description: 'High party-wide magical damage that should be heavily mitigated.',
      unmitigatedDamage: '140,000',
      damageType: 'magical',
      importance: 'high',
      icon: '🎉'
    },
    {
      id: 'celebrate_good_times_enrage',
      name: 'High Energy Night Fever (enrage)',
      time: 606,
      description: 'Wipe',
      unmitigatedDamage: 'N/A',
      damageType: 'magical',
      importance: 'critical',
      icon: '💀'
    }
  ]
};

// For backward compatibility
export const bossActions = bossActionsMap.ketuduke;

export default bossActionsMap;
