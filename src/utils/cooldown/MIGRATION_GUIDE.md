# Enhanced Cooldown System Migration Guide

This guide helps migrate from the old cooldown system to the new Enhanced Cooldown System in MitPlan.

## Overview

The Enhanced Cooldown System replaces three separate contexts with a unified, more powerful system:

- ❌ **Old**: `MitigationContext`, `ChargeCountContext`, `AetherflowContext`
- ✅ **New**: `EnhancedMitigationContext`

## Key Benefits

- **Unified API**: Single context for all cooldown-related functionality
- **Better Performance**: Intelligent caching and optimized calculations
- **Enhanced Features**: Improved charge tracking, role-shared abilities, Aetherflow integration
- **Real-time Sync**: Better integration with Firebase collaboration
- **Type Safety**: Consistent data structures and error handling

## Migration Steps

### 1. Update Context Imports

**Before:**
```javascript
import { useMitigationContext } from '../../contexts/MitigationContext';
import { useChargeCountContext } from '../../contexts/ChargeCountContext';
import { useAetherflowContext } from '../../contexts/AetherflowContext';
```

**After:**
```javascript
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';
```

### 2. Update Context Usage

**Before:**
```javascript
const { 
  assignments, 
  addMitigation, 
  removeMitigation, 
  checkAbilityCooldown 
} = useMitigationContext();

const { 
  getChargeCount, 
  canAssignMitigationToBossAction 
} = useChargeCountContext();

const { 
  aetherflowStacks, 
  isScholarSelected 
} = useAetherflowContext();
```

**After:**
```javascript
const { 
  assignments, 
  addMitigation, 
  removeMitigation, 
  checkAbilityAvailability,
  selectedJobs,
  cooldownManager
} = useEnhancedMitigation();

// Scholar check
const isScholarSelected = selectedJobs && selectedJobs['SCH'];

// Aetherflow state
const aetherflowState = cooldownManager?.aetherflowTracker?.getAetherflowState(targetTime);
```

### 3. Update Cooldown Checking

**Before:**
```javascript
const cooldownInfo = checkAbilityCooldown(abilityId, bossActionId);
const isDisabled = cooldownInfo.isOnCooldown;
const canAssign = canAssignMitigationToBossAction(bossActionId, abilityId);
```

**After:**
```javascript
const availability = checkAbilityAvailability(abilityId, targetTime, bossActionId);
const isDisabled = !availability.canAssign();
const reason = availability.getUnavailabilityReason();
```

### 4. Update Charge/Instance Handling

**Before:**
```javascript
const chargeCount = getChargeCount(abilityId);
const availableCharges = chargeCount?.availableCharges || 0;
const totalCharges = chargeCount?.totalCharges || 1;
```

**After:**
```javascript
const availability = checkAbilityAvailability(abilityId, targetTime, bossActionId);
const availableCharges = availability.availableCharges;
const totalCharges = availability.totalCharges;
const availableInstances = availability.availableInstances;
const totalInstances = availability.totalInstances;
```

### 5. Update Component Props

**Before:**
```javascript
<MitigationItem
  mitigation={mitigation}
  isDisabled={cooldownInfo.isOnCooldown}
  cooldownReason={cooldownInfo.lastUsedActionName}
  checkAbilityCooldown={checkAbilityCooldown}
  pendingAssignments={pendingAssignments}
/>
```

**After:**
```javascript
<EnhancedMitigationItem
  mitigation={mitigation}
  currentBossLevel={currentBossLevel}
  selectedBossAction={selectedBossAction}
  selectedJobs={selectedJobs}
/>
```

## API Reference

### Enhanced Mitigation Context

```javascript
const {
  // Cooldown checking
  checkAbilityAvailability,
  checkMultipleAbilities,
  getAvailableAbilities,
  
  // Assignment management
  addMitigation,
  removeMitigation,
  getActiveMitigations,
  
  // Pending assignments
  pendingAssignments,
  hasPendingAssignment,
  
  // Data access
  assignments,
  selectedJobs,
  currentBossActions,
  currentBossLevel,
  tankPositions,
  
  // Manager access
  cooldownManager,
  
  // Status
  isInitialized
} = useEnhancedMitigation();
```

### Availability Object

```javascript
const availability = checkAbilityAvailability(abilityId, targetTime, bossActionId);

// Properties
availability.isAvailable          // boolean
availability.canAssign()          // function -> boolean
availability.getUnavailabilityReason() // function -> string | null
availability.availableCharges     // number
availability.totalCharges         // number
availability.availableInstances   // number
availability.totalInstances       // number
availability.isRoleShared         // boolean
availability.nextAvailableTime    // number | null
availability.reason               // string | null
```

## Common Migration Patterns

### Pattern 1: Drag and Drop Assignment

**Before:**
```javascript
const handleDrop = (active, over) => {
  const mitigation = availableMitigations.find(m => m.id === active.id);
  if (mitigation && canAssignMitigationToBossAction(over.id, mitigation.id)) {
    addMitigation(over.id, mitigation);
  }
};
```

**After:**
```javascript
const handleDrop = (active, over) => {
  const mitigation = availableMitigations.find(m => m.id === active.id);
  const bossAction = bossActions.find(a => a.id === over.id);
  
  if (mitigation && bossAction) {
    const availability = checkAbilityAvailability(
      mitigation.id, 
      bossAction.time, 
      bossAction.id
    );
    
    if (availability.canAssign()) {
      addMitigation(bossAction.id, mitigation);
    }
  }
};
```

### Pattern 2: Mitigation List Rendering

**Before:**
```javascript
{mitigations.map(mitigation => {
  const cooldownInfo = checkAbilityCooldown(mitigation.id, selectedBossAction?.id);
  const chargeCount = getChargeCount(mitigation.id);
  
  return (
    <MitigationItem
      key={mitigation.id}
      mitigation={mitigation}
      isDisabled={cooldownInfo.isOnCooldown}
      availableCharges={chargeCount?.availableCharges}
      totalCharges={chargeCount?.totalCharges}
    />
  );
})}
```

**After:**
```javascript
{mitigations.map(mitigation => (
  <EnhancedMitigationItem
    key={mitigation.id}
    mitigation={mitigation}
    currentBossLevel={currentBossLevel}
    selectedBossAction={selectedBossAction}
    selectedJobs={selectedJobs}
  />
))}
```

### Pattern 3: Aetherflow Integration

**Before:**
```javascript
const { aetherflowStacks, isScholarSelected } = useAetherflowContext();

return (
  <div>
    {isScholarSelected && (
      <AetherflowGauge stacks={aetherflowStacks} />
    )}
  </div>
);
```

**After:**
```javascript
const { selectedJobs, cooldownManager } = useEnhancedMitigation();
const isScholarSelected = selectedJobs && selectedJobs['SCH'];

return (
  <div>
    {isScholarSelected && (
      <EnhancedAetherflowGauge selectedBossAction={selectedBossAction} />
    )}
  </div>
);
```

## Troubleshooting

### Common Issues

1. **"Cannot read property 'canAssign' of undefined"**
   - Ensure you're calling `checkAbilityAvailability` with valid parameters
   - Check that the enhanced context is properly initialized

2. **"Charges not updating correctly"**
   - The enhanced system handles charges automatically
   - Remove manual charge tracking code

3. **"Real-time sync not working"**
   - Ensure `EnhancedMitigationProvider` is wrapped correctly in the provider hierarchy
   - Check that Firebase is properly configured

### Debug Tools

```javascript
// In browser console
runCooldownIntegrationTests(); // Run all tests
validateCooldownIntegration();  // Validate current state
testCooldownPerformance();      // Check performance

// Get system metrics
const { getCooldownSystemMetrics } = require('./utils/cooldown');
console.log(getCooldownSystemMetrics());
```

## Performance Considerations

- The enhanced system uses intelligent caching for better performance
- Avoid calling `checkAbilityAvailability` in render loops without memoization
- Use the provided enhanced components when possible
- The system automatically optimizes for real-time collaboration

## Backward Compatibility

The old contexts are still available but deprecated:
- `MitigationContext` - Use `EnhancedMitigationContext` instead
- `ChargeCountContext` - Functionality moved to `EnhancedMitigationContext`
- `AetherflowContext` - Functionality moved to `EnhancedMitigationContext`

These will be removed in a future version.

## Support

If you encounter issues during migration:
1. Check the browser console for error messages
2. Run the integration tests to verify system health
3. Review this migration guide for common patterns
4. Check the enhanced components for reference implementations
