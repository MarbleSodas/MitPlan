export interface BaseHealthValues {
  party: number;
  tank: number;
}

export interface BossDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  baseHealth: BaseHealthValues;
}

export const baseHealthValues: Record<number, BaseHealthValues> = {
  90: {
    party: 80000,
    tank: 120000
  },
  100: {
    party: 143000,
    tank: 225000
  }
};

export const bosses: BossDefinition[] = [
  {
    id: 'ketuduke',
    name: 'Ketuduke',
    description: 'The Soul of the South Seas, first boss of Another Aloalo Island (Savage).',
    icon: '🌊',
    level: 90,
    baseHealth: baseHealthValues[90]!
  },
  {
    id: 'lala',
    name: 'Lala',
    description: 'Math Boss, second boss of Another Aloalo Island (Savage).',
    icon: '➗',
    level: 90,
    baseHealth: baseHealthValues[90]!
  },
  {
    id: 'statice',
    name: 'Statice',
    description: 'The final boss of Another Aloalo Island (Savage), wielding a gun and powerful magic.',
    icon: '🔫',
    level: 90,
    baseHealth: baseHealthValues[90]!
  },
  {
    id: 'black-cat-m1s',
    name: 'Black Cat (M1S)',
    description: 'The mischievous feline, first boss of AAC Light-heavyweight Tier (Savage).',
    icon: '🐱',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'honey-b-lovely-m2s',
    name: 'Honey B. Lovely (M2S)',
    description: 'The queen bee of beauty, second boss of AAC Light-heavyweight Tier (Savage).',
    icon: '🐝',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'brute-bomber-m3s',
    name: 'Brute Bomber (M3S)',
    description: 'The explosive powerhouse, third boss of AAC Light-heavyweight Tier (Savage).',
    icon: '💣',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'wicked-thunder-m4s',
    name: 'Wicked Thunder (M4S)',
    description: 'The electrifying finale, final boss of AAC Light-heavyweight Tier (Savage).',
    icon: '⚡',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'dancing-green-m5s',
    name: 'Dancing Green (M5S)',
    description: 'The shameless playboy of Solution Nine, first boss of AAC Cruiserweight Tier (Savage).',
    icon: '💃',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'sugar-riot',
    name: 'Sugar Riot (M6S)',
    description: 'The artistic genius of Solution Nine, second boss of AAC Cruiserweight Tier (Savage).',
    icon: '🎨',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'brute-abominator-m7s',
    name: 'Brute Abominator (M7S)',
    description: 'The monstrous creation of Solution Nine, third boss of AAC Cruiserweight Tier (Savage).',
    icon: '👹',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'howling-blade-m8s',
    name: 'Howling Blade (M8S)',
    description: 'The final boss of AAC Cruiserweight Tier (Savage), wielding a sword and commanding wind and stone.',
    icon: '🐺',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'vamp-fatale-m9s',
    name: 'Vamp Fatale (M9S)',
    description: 'The bloodthirsty diva, first boss of AAC Heavyweight Tier (Savage).',
    icon: '🧛',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'red-hot-deep-blue-m10s',
    name: 'Red Hot & Deep Blue (M10S)',
    description: 'The fiery and frigid duo, second boss of AAC Heavyweight Tier (Savage).',
    icon: '🔥',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'the-tyrant-m11s',
    name: 'The Tyrant (M11S)',
    description: 'The ruthless overlord, third boss of AAC Heavyweight Tier (Savage).',
    icon: '👑',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'lindwurm-m12s',
    name: 'Lindwurm (M12S)',
    description: 'The legendary serpent, final boss of AAC Heavyweight Tier (Savage).',
    icon: '🐉',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
  {
    id: 'necron',
    name: 'Necron',
    description: 'The harbinger of death and darkness, wielding necrotic magic and existential terror.',
    icon: '💀',
    level: 100,
    baseHealth: baseHealthValues[100]!
  },
];

export default bosses;
