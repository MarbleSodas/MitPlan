/**
 * Export all contexts from a single file
 */
export { default as ThemeContext, ThemeProvider, useTheme } from './ThemeContext.jsx';
export { default as BossContext, BossProvider, useBossContext } from './BossContext.jsx';
export { default as JobContext, JobProvider, useJobContext } from './JobContext.jsx';
export { default as FilterContext, FilterProvider, useFilterContext } from './FilterContext.jsx';
export { default as TankPositionContext, TankPositionProvider, useTankPositionContext } from './TankPositionContext.jsx';
export { default as AppProvider } from './AppProvider.jsx';
export { TankSelectionModalProvider, useTankSelectionModalContext } from './TankSelectionModalContext.jsx';

export { ClassSelectionModalProvider, useClassSelectionModalContext } from './ClassSelectionModalContext.jsx';

// Enhanced Mitigation System (NEW - Recommended)
export { EnhancedMitigationProvider, LegacyEnhancedMitigationProvider, useEnhancedMitigation } from './EnhancedMitigationContext.jsx';

// Legacy contexts (DEPRECATED - Use EnhancedMitigationContext instead)
// These are kept for backward compatibility but should be migrated to the enhanced system
export { default as MitigationContext, MitigationProvider, useMitigationContext } from './MitigationContext.jsx';
export { default as ChargeCountContext, ChargeCountProvider, useChargeCountContext } from './ChargeCountContext.jsx';
export { default as AetherflowContext, AetherflowProvider, useAetherflowContext } from './AetherflowContext.jsx';
