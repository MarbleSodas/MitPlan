/**
 * Unified Design System for MitPlan
 * 
 * This file contains standardized Tailwind CSS class strings for consistent styling
 * across the entire application. All components should use these constants to ensure
 * visual consistency.
 */

// ============================================================================
// HEIGHTS
// ============================================================================

export const HEIGHTS = {
  // Standard control heights
  small: 'h-9',      // 36px - Icon buttons, toggles, compact controls
  medium: 'h-10',    // 40px - Standard buttons and inputs
  large: 'h-11',     // 44px - Prominent buttons
  xlarge: 'h-12',    // 48px - Extra large buttons
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const RADIUS = {
  small: 'rounded-md',    // 6px
  medium: 'rounded-lg',   // 8px
  large: 'rounded-xl',    // 12px
  full: 'rounded-full',   // Circular
  pill: 'rounded-full',   // Pills
};

// ============================================================================
// SPACING
// ============================================================================

export const SPACING = {
  // Padding for buttons
  buttonPaddingX: {
    small: 'px-3',
    medium: 'px-4',
    large: 'px-6',
  },
  // Padding for inputs
  inputPaddingX: {
    small: 'px-2',
    medium: 'px-3',
    large: 'px-4',
  },
  // Gap between elements
  gap: {
    small: 'gap-2',
    medium: 'gap-3',
    large: 'gap-4',
  },
};

// ============================================================================
// TRANSITIONS
// ============================================================================

export const TRANSITIONS = {
  base: 'transition-all duration-200',
  fast: 'transition-all duration-150',
  slow: 'transition-all duration-300',
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-200',
};

// ============================================================================
// EFFECTS
// ============================================================================

export const EFFECTS = {
  hoverLift: 'hover:-translate-y-0.5',
  hoverShadow: 'hover:shadow-md',
  activeShadow: 'active:shadow-sm',
  shadow: {
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
  },
};

// ============================================================================
// FOCUS STATES
// ============================================================================

export const FOCUS = {
  ring: 'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
  ringOffset: 'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2',
  border: 'focus:outline-none focus:border-[var(--color-primary)]',
  shadow: 'focus:outline-none focus:shadow-[0_0_0_3px_rgba(51,153,255,0.2)]',
  // Enhanced input focus with glow effect and border color change
  input: 'focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15),0_0_20px_rgba(99,102,241,0.1)] focus:bg-[var(--color-cardBackground)]',
};

// ============================================================================
// BUTTON STYLES
// ============================================================================

// Base button classes (shared by all buttons)
const buttonBase = `
  inline-flex items-center justify-center
  font-semibold text-sm
  ${TRANSITIONS.base}
  ${FOCUS.ring}
  disabled:opacity-60 disabled:cursor-not-allowed
  cursor-pointer
`.trim().replace(/\s+/g, ' ');

// Button variants
export const BUTTON = {
  // Base classes
  base: buttonBase,
  
  // Size variants
  size: {
    small: `${HEIGHTS.small} ${SPACING.buttonPaddingX.small} ${RADIUS.medium}`,
    medium: `${HEIGHTS.medium} ${SPACING.buttonPaddingX.medium} ${RADIUS.medium}`,
    large: `${HEIGHTS.large} ${SPACING.buttonPaddingX.large} ${RADIUS.medium}`,
  },
  
  // Style variants
  variant: {
    primary: `
      bg-[var(--color-primary)] text-[var(--color-buttonText)]
      hover:brightness-110 ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}
    `.trim().replace(/\s+/g, ' '),
    
    secondary: `
      border-2 border-[var(--color-primary)] text-[var(--color-primary)]
      bg-transparent hover:bg-[var(--color-primary)] hover:text-[var(--color-buttonText)]
      ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}
    `.trim().replace(/\s+/g, ' '),
    
    danger: `
      bg-red-500 text-white
      hover:bg-red-600 ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}
    `.trim().replace(/\s+/g, ' '),
    
    ghost: `
      bg-transparent text-[var(--color-text)]
      hover:bg-[var(--color-hover)] ${EFFECTS.hoverLift}
    `.trim().replace(/\s+/g, ' '),
    
    icon: `
      ${HEIGHTS.small} w-9 ${RADIUS.medium}
      bg-transparent text-[var(--color-text)]
      hover:bg-[var(--color-hover)]
    `.trim().replace(/\s+/g, ' '),
  },
  
  // Complete button combinations (most commonly used)
  primary: {
    small: `${buttonBase} ${HEIGHTS.small} ${SPACING.buttonPaddingX.small} ${RADIUS.medium} bg-[var(--color-primary)] text-[var(--color-buttonText)] hover:brightness-110 ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}`,
    medium: `${buttonBase} ${HEIGHTS.medium} ${SPACING.buttonPaddingX.medium} ${RADIUS.medium} bg-[var(--color-primary)] text-[var(--color-buttonText)] hover:brightness-110 ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}`,
    large: `${buttonBase} ${HEIGHTS.large} ${SPACING.buttonPaddingX.large} ${RADIUS.medium} bg-[var(--color-primary)] text-[var(--color-buttonText)] hover:brightness-110 ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}`,
  },
  
  secondary: {
    small: `${buttonBase} ${HEIGHTS.small} ${SPACING.buttonPaddingX.small} ${RADIUS.medium} border-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent hover:bg-[var(--color-primary)] hover:text-[var(--color-buttonText)] ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}`,
    medium: `${buttonBase} ${HEIGHTS.medium} ${SPACING.buttonPaddingX.medium} ${RADIUS.medium} border-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent hover:bg-[var(--color-primary)] hover:text-[var(--color-buttonText)] ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}`,
    large: `${buttonBase} ${HEIGHTS.large} ${SPACING.buttonPaddingX.large} ${RADIUS.medium} border-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent hover:bg-[var(--color-primary)] hover:text-[var(--color-buttonText)] ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}`,
  },
  
  danger: {
    small: `${buttonBase} ${HEIGHTS.small} ${SPACING.buttonPaddingX.small} ${RADIUS.medium} bg-red-500 text-white hover:bg-red-600 ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}`,
    medium: `${buttonBase} ${HEIGHTS.medium} ${SPACING.buttonPaddingX.medium} ${RADIUS.medium} bg-red-500 text-white hover:bg-red-600 ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}`,
    large: `${buttonBase} ${HEIGHTS.large} ${SPACING.buttonPaddingX.large} ${RADIUS.medium} bg-red-500 text-white hover:bg-red-600 ${EFFECTS.hoverLift} ${EFFECTS.shadow.small}`,
  },
};

// ============================================================================
// INPUT STYLES
// ============================================================================

const inputBase = `
  w-full
  bg-[var(--color-cardBackground)] text-[var(--color-text)]
  border-2 border-[var(--color-border)]
  transition-all duration-200 ease-in-out
  ${FOCUS.input}
  placeholder:text-[var(--color-textSecondary)]
  disabled:opacity-60 disabled:cursor-not-allowed
  hover:border-[var(--color-borderLight)]
`.trim().replace(/\s+/g, ' ');

export const INPUT = {
  base: inputBase,
  
  size: {
    small: `${HEIGHTS.small} ${SPACING.inputPaddingX.medium} ${RADIUS.medium}`,
    medium: `${HEIGHTS.medium} ${SPACING.inputPaddingX.medium} ${RADIUS.medium}`,
    large: `${HEIGHTS.large} ${SPACING.inputPaddingX.large} ${RADIUS.medium}`,
  },
  
  // Complete input combinations
  small: `${inputBase} ${HEIGHTS.small} ${SPACING.inputPaddingX.medium} ${RADIUS.medium}`,
  medium: `${inputBase} ${HEIGHTS.medium} ${SPACING.inputPaddingX.medium} ${RADIUS.medium}`,
  large: `${inputBase} ${HEIGHTS.large} ${SPACING.inputPaddingX.large} ${RADIUS.medium}`,
};

// ============================================================================
// SELECT/DROPDOWN STYLES
// ============================================================================

export const SELECT = {
  base: inputBase,
  
  size: {
    small: `${HEIGHTS.small} ${SPACING.inputPaddingX.medium} ${RADIUS.medium}`,
    medium: `${HEIGHTS.medium} ${SPACING.inputPaddingX.medium} ${RADIUS.medium}`,
    large: `${HEIGHTS.large} ${SPACING.inputPaddingX.large} ${RADIUS.medium}`,
  },
  
  // Complete select combinations
  small: `${inputBase} ${HEIGHTS.small} ${SPACING.inputPaddingX.medium} ${RADIUS.medium}`,
  medium: `${inputBase} ${HEIGHTS.medium} ${SPACING.inputPaddingX.medium} ${RADIUS.medium}`,
  large: `${inputBase} ${HEIGHTS.large} ${SPACING.inputPaddingX.large} ${RADIUS.medium}`,
};

// ============================================================================
// CARD STYLES
// ============================================================================

export const CARD = {
  base: `
    bg-[var(--color-cardBackground)]
    border border-[var(--color-border)]
    ${RADIUS.large}
    ${EFFECTS.shadow.small}
    ${TRANSITIONS.base}
  `.trim().replace(/\s+/g, ' '),
  
  hover: `
    ${EFFECTS.hoverShadow} ${EFFECTS.hoverLift}
  `.trim().replace(/\s+/g, ' '),
  
  interactive: `
    bg-[var(--color-cardBackground)]
    border border-[var(--color-border)]
    ${RADIUS.large}
    ${EFFECTS.shadow.small}
    ${TRANSITIONS.base}
    ${EFFECTS.hoverShadow} ${EFFECTS.hoverLift}
    cursor-pointer
  `.trim().replace(/\s+/g, ' '),
};

// ============================================================================
// MODAL STYLES
// ============================================================================

export const MODAL = {
  overlay: `
    fixed inset-0 z-50
    bg-black/50
    flex items-center justify-center
    p-4
  `.trim().replace(/\s+/g, ' '),
  
  container: `
    bg-[var(--color-cardBackground)]
    ${RADIUS.large}
    ${EFFECTS.shadow.large}
    max-w-2xl w-full
    max-h-[90vh] overflow-y-auto
  `.trim().replace(/\s+/g, ' '),
  
  header: `
    flex items-center justify-between
    p-6 pb-4
    border-b border-[var(--color-border)]
  `.trim().replace(/\s+/g, ' '),
  
  title: `
    text-xl font-semibold
    text-[var(--color-text)]
    m-0
  `.trim().replace(/\s+/g, ' '),
  
  content: `
    p-6
  `.trim().replace(/\s+/g, ' '),
  
  footer: `
    flex items-center justify-end
    gap-3 p-6 pt-4
    border-t border-[var(--color-border)]
  `.trim().replace(/\s+/g, ' '),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Combine multiple class strings, removing duplicates and extra whitespace
 */
export const cn = (...classes) => {
  return classes
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Get button classes for a specific variant and size
 */
export const getButtonClasses = (variant = 'primary', size = 'medium', additionalClasses = '') => {
  return cn(BUTTON[variant]?.[size] || BUTTON.primary.medium, additionalClasses);
};

/**
 * Get input classes for a specific size
 */
export const getInputClasses = (size = 'medium', additionalClasses = '') => {
  return cn(INPUT[size] || INPUT.medium, additionalClasses);
};

/**
 * Get select classes for a specific size
 */
export const getSelectClasses = (size = 'medium', additionalClasses = '') => {
  return cn(SELECT[size] || SELECT.medium, additionalClasses);
};

