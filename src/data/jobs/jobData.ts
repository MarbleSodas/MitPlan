import type { Job, JobsByRole } from '../../types';

export const ffxivJobs: JobsByRole = {
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
    },
    {
      id: 'VPR',
      name: 'Viper',
      icon: '/jobs-new/viper.png',
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
    },
    {
      id: 'PCT',
      name: 'Pictomancer',
      icon: '/jobs-new/pictomancer.png',
      selected: false
    }
  ]
};

export default ffxivJobs;
