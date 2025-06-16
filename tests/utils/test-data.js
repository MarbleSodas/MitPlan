// Test data for MitPlan E2E tests

export const testUsers = {
  validUser: {
    email: 'test@mitplan.dev',
    password: 'TestPassword123!',
    displayName: 'Test User'
  },
  invalidUser: {
    email: 'invalid@test.com',
    password: 'wrongpassword'
  },
  newUser: {
    email: 'newuser@mitplan.dev',
    password: 'NewPassword123!',
    displayName: 'New Test User'
  }
};

export const ffxivJobs = {
  tanks: [
    { id: 'PLD', name: 'Paladin', role: 'tank' },
    { id: 'WAR', name: 'Warrior', role: 'tank' },
    { id: 'DRK', name: 'Dark Knight', role: 'tank' },
    { id: 'GNB', name: 'Gunbreaker', role: 'tank' }
  ],
  healers: [
    { id: 'WHM', name: 'White Mage', role: 'healer' },
    { id: 'SCH', name: 'Scholar', role: 'healer' },
    { id: 'AST', name: 'Astrologian', role: 'healer' },
    { id: 'SGE', name: 'Sage', role: 'healer' }
  ],
  dps: [
    { id: 'BLM', name: 'Black Mage', role: 'dps' },
    { id: 'SMN', name: 'Summoner', role: 'dps' },
    { id: 'RDM', name: 'Red Mage', role: 'dps' },
    { id: 'DRG', name: 'Dragoon', role: 'dps' },
    { id: 'NIN', name: 'Ninja', role: 'dps' },
    { id: 'SAM', name: 'Samurai', role: 'dps' },
    { id: 'RPR', name: 'Reaper', role: 'dps' },
    { id: 'MNK', name: 'Monk', role: 'dps' },
    { id: 'BRD', name: 'Bard', role: 'dps' },
    { id: 'MCH', name: 'Machinist', role: 'dps' },
    { id: 'DNC', name: 'Dancer', role: 'dps' }
  ]
};

export const bosses = {
  ketuduke: {
    id: 'ketuduke',
    name: 'Ketuduke',
    level: 90,
    actions: [
      {
        id: 'hydrofall',
        name: 'Hydrofall',
        time: 15,
        damage: 85000,
        type: 'raid-wide',
        description: 'Raid-wide magical damage'
      },
      {
        id: 'fluke_typhoon',
        name: 'Fluke Typhoon',
        time: 45,
        damage: 120000,
        type: 'tank-buster',
        description: 'Tank buster with knockback'
      }
    ]
  },
  lala: {
    id: 'lala',
    name: 'Lala',
    level: 90,
    actions: [
      {
        id: 'inferno_theorem',
        name: 'Inferno Theorem',
        time: 20,
        damage: 90000,
        type: 'raid-wide',
        description: 'Raid-wide fire damage'
      }
    ]
  }
};

export const mitigationAbilities = {
  tank: {
    rampart: {
      id: 'rampart',
      name: 'Rampart',
      job: 'ALL_TANKS',
      cooldown: 90,
      duration: 20,
      mitigation: 20,
      type: 'self',
      level: 8
    },
    reprisal: {
      id: 'reprisal',
      name: 'Reprisal',
      job: 'ALL_TANKS',
      cooldown: 60,
      duration: 10,
      mitigation: 10,
      type: 'party',
      level: 22
    }
  },
  healer: {
    addle: {
      id: 'addle',
      name: 'Addle',
      job: 'ALL_CASTERS',
      cooldown: 90,
      duration: 10,
      mitigation: 10,
      type: 'party',
      level: 8
    }
  }
};

export const testPlans = {
  basicPlan: {
    name: 'Test Basic Plan',
    bossId: 'ketuduke',
    selectedJobs: {
      tank: [{ id: 'PLD', selected: true }, { id: 'WAR', selected: true }],
      healer: [{ id: 'WHM', selected: true }, { id: 'SCH', selected: true }],
      dps: [{ id: 'BLM', selected: true }, { id: 'DRG', selected: true }]
    },
    assignments: {
      'hydrofall': [
        {
          abilityId: 'rampart',
          tank: 'MT',
          timestamp: Date.now()
        }
      ]
    }
  },
  complexPlan: {
    name: 'Test Complex Plan',
    bossId: 'lala',
    selectedJobs: {
      tank: [{ id: 'DRK', selected: true }, { id: 'GNB', selected: true }],
      healer: [{ id: 'AST', selected: true }, { id: 'SGE', selected: true }],
      dps: [
        { id: 'SMN', selected: true },
        { id: 'RDM', selected: true },
        { id: 'NIN', selected: true },
        { id: 'SAM', selected: true }
      ]
    },
    assignments: {
      'inferno_theorem': [
        {
          abilityId: 'reprisal',
          tank: 'OT',
          timestamp: Date.now()
        }
      ]
    }
  }
};

export const collaborationData = {
  users: [
    {
      id: 'user1',
      displayName: 'Tank Player',
      color: '#ff6b6b'
    },
    {
      id: 'user2',
      displayName: 'Healer Player',
      color: '#4ecdc4'
    },
    {
      id: 'user3',
      displayName: 'DPS Player',
      color: '#45b7d1'
    }
  ],
  selections: {
    user1: {
      bossActionId: 'fluke_typhoon',
      timestamp: Date.now()
    },
    user2: {
      bossActionId: 'hydrofall',
      timestamp: Date.now()
    }
  }
};

export const errorScenarios = {
  networkError: {
    message: 'Network request failed',
    code: 'NETWORK_ERROR'
  },
  authError: {
    message: 'Authentication failed',
    code: 'AUTH_ERROR'
  },
  validationError: {
    message: 'Invalid plan data',
    code: 'VALIDATION_ERROR'
  }
};
