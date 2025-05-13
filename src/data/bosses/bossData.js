/**
 * Boss data for the application
 */

/**
 * Base player health values by level
 * These values represent approximate health pools for different player roles at each level
 */
export const baseHealthValues = {
  90: {
    party: 80000,  // Average party member HP at level 90
    tank: 120000   // Average tank HP at level 90
  },
  100: {
    party: 143000, // Average party member HP at level 100
    tank: 225000   // Average tank HP at level 100
  }
};

export const bosses = [
  {
    id: 'ketuduke',
    name: 'Ketuduke',
    description: 'The Soul of the South Seas, first boss of Another Aloalo Island (Savage).',
    icon: '🌊',
    level: 90,
    baseHealth: baseHealthValues[90]
  },
  {
    id: 'lala',
    name: 'Lala',
    description: 'Math Boss, second boss of Another Aloalo Island (Savage).',
    icon: '➗',
    level: 90,
    baseHealth: baseHealthValues[90]
  },
  {
    id: 'statice',
    name: 'Statice',
    description: 'The final boss of Another Aloalo Island (Savage), wielding a gun and powerful magic.',
    icon: '🔫',
    level: 90,
    baseHealth: baseHealthValues[90]
  },
  {
    id: 'dancing-green-m5s',
    name: 'Dancing Green (M5S)',
    description: 'The shameless playboy of Solution Nine, first boss of AAC Cruiserweight Tier (Savage).',
    icon: '💃',
    level: 100,
    baseHealth: baseHealthValues[100]
  },
  {
    id: 'sugar-riot',
    name: 'Sugar Riot (M6S)',
    description: 'The artistic genius of Solution Nine, second boss of AAC Cruiserweight Tier (Savage).',
    icon: '🎨',
    level: 100,
    baseHealth: baseHealthValues[100]
  },
  {
    id: 'brute-abominator-m7s',
    name: 'Brute Abominator (M7S)',
    description: 'The monstrous creation of Solution Nine, third boss of AAC Cruiserweight Tier (Savage).',
    icon: '👹',
    level: 100,
    baseHealth: baseHealthValues[100]
  },
  {
    id: 'howling-blade-m8s',
    name: 'Howling Blade (M8S)',
    description: 'The final boss of AAC Cruiserweight Tier (Savage), wielding a sword and commanding wind and stone.',
    icon: '🐺',
    level: 100,
    baseHealth: baseHealthValues[100]
  },
];

export default bosses;
