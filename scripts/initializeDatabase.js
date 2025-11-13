#!/usr/bin/env node

/**
 * Initialize Firebase Realtime Database with the new data structure
 * This script sets up the database schema for the MitPlan real-time collaboration system
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, serverTimestamp } from 'firebase/database';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Sample boss data structure
const sampleBoss = {
  id: "ketuduke",
  name: "Ketuduke",
  actions: {
    "tidal_roar_1": {
      id: "tidal_roar_1",
      name: "Tidal Roar",
      time: 15,
      damageType: "raidwide",
      unmitigatedDamage: 85000,
      description: "Heavy raid-wide magical damage"
    },
    "hydrofall_1": {
      id: "hydrofall_1", 
      name: "Hydrofall",
      time: 45,
      damageType: "tankbuster",
      unmitigatedDamage: 120000,
      description: "Heavy tank buster attack"
    }
  }
};

// Sample job structure
const sampleJobs = {
  tank: [
    { id: "PLD", name: "Paladin", icon: "/jobs-new/paladin.png", selected: false },
    { id: "WAR", name: "Warrior", icon: "/jobs-new/warrior.png", selected: false },
    { id: "DRK", name: "Dark Knight", icon: "/jobs-new/darkknight.png", selected: false },
    { id: "GNB", name: "Gunbreaker", icon: "/jobs-new/gunbreaker.png", selected: false }
  ],
  healer: [
    { id: "WHM", name: "White Mage", icon: "/jobs-new/whitemage.png", selected: false },
    { id: "SCH", name: "Scholar", icon: "/jobs-new/scholar.png", selected: false },
    { id: "AST", name: "Astrologian", icon: "/jobs-new/astrologian.png", selected: false },
    { id: "SGE", name: "Sage", icon: "/jobs-new/sage.png", selected: false }
  ],
  melee: [
    { id: "MNK", name: "Monk", icon: "/jobs-new/monk.png", selected: false },
    { id: "DRG", name: "Dragoon", icon: "/jobs-new/dragoon.png", selected: false },
    { id: "NIN", name: "Ninja", icon: "/jobs-new/ninja.png", selected: false },
    { id: "SAM", name: "Samurai", icon: "/jobs-new/samurai.png", selected: false },
    { id: "RPR", name: "Reaper", icon: "/jobs-new/reaper.png", selected: false },
    { id: "VPR", name: "Viper", icon: "/jobs-new/viper.png", selected: false }
  ],
  ranged: [
    { id: "BRD", name: "Bard", icon: "/jobs-new/bard.png", selected: false },
    { id: "MCH", name: "Machinist", icon: "/jobs-new/machinist.png", selected: false },
    { id: "DNC", name: "Dancer", icon: "/jobs-new/dancer.png", selected: false }
  ],
  caster: [
    { id: "BLM", name: "Black Mage", icon: "/jobs-new/blackmage.png", selected: false },
    { id: "SMN", name: "Summoner", icon: "/jobs-new/summoner.png", selected: false },
    { id: "RDM", name: "Red Mage", icon: "/jobs-new/redmage.png", selected: false },
    { id: "PCT", name: "Pictomancer", icon: "/jobs-new/pictomancer.png", selected: false }
  ]
};

// Sample mitigation ability
const sampleMitigation = {
  id: "reprisal",
  name: "Reprisal",
  icon: "/abilities-gamerescape/reprisal.png",
  jobs: ["PLD", "WAR", "DRK", "GNB"],
  mitigationValue: 0.1,
  duration: 15,
  cooldown: 60
};

// Create sample plan
const samplePlan = {
  title: "Sample Ketuduke Plan",
  selectedBoss: sampleBoss,
  selectedJobs: sampleJobs,
  tankPositions: {
    mainTank: "",
    offTank: ""
  },
  assignedMitigations: {
    "tidal_roar_1": [sampleMitigation]
  },
  connectedUsers: {
    // Empty object for connected users - will be populated during real-time sessions
  },
  ownerId: "system",
  userId: "system", // For backward compatibility
  accessedBy: {}, // Initialize empty access tracking
  isPublic: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  lastAccessedAt: serverTimestamp(),
  lastModifiedBy: "system",
  lastChangeOrigin: "initialization",
  version: 4.0
};

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing Firebase Realtime Database...');
    
    // Create sample plan
    const planId = "sample-plan-001";
    await set(ref(database, `plans/${planId}`), samplePlan);
    console.log('✅ Sample plan created successfully');

    console.log('🎉 Database initialization complete!');
    console.log(`📋 Sample plan URL: /plan/edit/${planId}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
