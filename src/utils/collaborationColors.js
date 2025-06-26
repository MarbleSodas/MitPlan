/**
 * Collaboration Colors Utility
 * 
 * Manages consistent color assignment for users in collaborative sessions.
 * Provides Google Docs-style user colors for selection highlighting and presence indicators.
 */

// Predefined color palette optimized for accessibility and visual distinction
const COLLABORATION_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
  '#F8C471', // Orange
  '#82E0AA', // Light Green
  '#F1948A', // Light Red
  '#AED6F1', // Pale Blue
  '#D7BDE2', // Pale Purple
  '#A9DFBF', // Pale Green
  '#F9E79F', // Pale Yellow
  '#FADBD8', // Pale Pink
  '#D5DBDB', // Light Gray
  '#85929E'  // Dark Gray
];

// Color variations for different UI elements
const COLOR_VARIANTS = {
  primary: 1.0,      // Full opacity for main elements
  secondary: 0.7,    // Reduced opacity for secondary elements
  background: 0.1,   // Very light for backgrounds
  border: 0.5,       // Medium opacity for borders
  text: 0.9          // High opacity for text
};

/**
 * Generate a consistent color for a user based on their ID
 */
export const getUserColor = (userId) => {
  if (!userId) return COLLABORATION_COLORS[0];
  
  // Create a hash from the user ID for consistent color assignment
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use absolute value to ensure positive index
  const index = Math.abs(hash) % COLLABORATION_COLORS.length;
  return COLLABORATION_COLORS[index];
};

/**
 * Get a color variant with specific opacity
 */
export const getColorVariant = (baseColor, variant = 'primary') => {
  const opacity = COLOR_VARIANTS[variant] || COLOR_VARIANTS.primary;
  
  // Convert hex to rgba
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Get user color with specific variant
 */
export const getUserColorVariant = (userId, variant = 'primary') => {
  const baseColor = getUserColor(userId);
  return getColorVariant(baseColor, variant);
};

/**
 * Generate CSS custom properties for a user's color theme
 */
export const generateUserColorTheme = (userId) => {
  const baseColor = getUserColor(userId);
  
  return {
    '--user-color-primary': getColorVariant(baseColor, 'primary'),
    '--user-color-secondary': getColorVariant(baseColor, 'secondary'),
    '--user-color-background': getColorVariant(baseColor, 'background'),
    '--user-color-border': getColorVariant(baseColor, 'border'),
    '--user-color-text': getColorVariant(baseColor, 'text'),
    '--user-color-base': baseColor
  };
};

/**
 * Get contrasting text color (black or white) for a given background color
 */
export const getContrastingTextColor = (backgroundColor) => {
  // Remove # if present
  const hex = backgroundColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Generate user initials from name or user ID
 */
export const getUserInitials = (name, userId) => {
  if (name && name.trim()) {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else {
      return words[0].substring(0, 2).toUpperCase();
    }
  }
  
  // Fallback to user ID
  if (userId) {
    return userId.substring(0, 2).toUpperCase();
  }
  
  return 'U';
};

/**
 * Create a user avatar style object
 */
export const createUserAvatarStyle = (userId, name, size = 32) => {
  const backgroundColor = getUserColor(userId);
  const textColor = getContrastingTextColor(backgroundColor);
  const initials = getUserInitials(name, userId);
  
  return {
    backgroundColor,
    color: textColor,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${size * 0.4}px`,
    fontWeight: 'bold',
    userSelect: 'none',
    initials
  };
};

/**
 * Generate selection highlight styles
 */
export const createSelectionHighlightStyle = (userId, elementType = 'default') => {
  const baseColor = getUserColor(userId);
  
  const styles = {
    default: {
      outline: `2px solid ${getColorVariant(baseColor, 'primary')}`,
      backgroundColor: getColorVariant(baseColor, 'background'),
      borderRadius: '4px',
      position: 'relative'
    },
    'boss-action': {
      outline: `3px solid ${getColorVariant(baseColor, 'primary')}`,
      backgroundColor: getColorVariant(baseColor, 'background'),
      borderRadius: '8px',
      boxShadow: `0 0 0 1px ${getColorVariant(baseColor, 'border')}`
    },
    'mitigation-item': {
      outline: `2px solid ${getColorVariant(baseColor, 'primary')}`,
      backgroundColor: getColorVariant(baseColor, 'background'),
      borderRadius: '6px',
      transform: 'scale(1.02)'
    },
    'job-card': {
      outline: `3px solid ${getColorVariant(baseColor, 'primary')}`,
      backgroundColor: getColorVariant(baseColor, 'background'),
      borderRadius: '12px',
      boxShadow: `0 4px 8px ${getColorVariant(baseColor, 'secondary')}`
    }
  };
  
  return styles[elementType] || styles.default;
};

/**
 * Create CSS class for selection highlighting
 */
export const createSelectionHighlightCSS = (userId, elementType = 'default') => {
  const styles = createSelectionHighlightStyle(userId, elementType);
  
  return Object.entries(styles)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
};

/**
 * Get all available collaboration colors
 */
export const getAllCollaborationColors = () => {
  return [...COLLABORATION_COLORS];
};

/**
 * Check if a color is light or dark
 */
export const isLightColor = (color) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

/**
 * Generate a unique color that's different from existing colors
 */
export const generateUniqueColor = (existingColors = []) => {
  const availableColors = COLLABORATION_COLORS.filter(
    color => !existingColors.includes(color)
  );
  
  if (availableColors.length > 0) {
    return availableColors[0];
  }
  
  // If all colors are taken, return a random one
  return COLLABORATION_COLORS[Math.floor(Math.random() * COLLABORATION_COLORS.length)];
};

/**
 * Create a color map for multiple users
 */
export const createUserColorMap = (userIds) => {
  const colorMap = new Map();
  const usedColors = new Set();
  
  userIds.forEach(userId => {
    let color = getUserColor(userId);
    
    // If color is already used, find an alternative
    if (usedColors.has(color)) {
      color = generateUniqueColor(Array.from(usedColors));
    }
    
    colorMap.set(userId, color);
    usedColors.add(color);
  });
  
  return colorMap;
};

export default {
  getUserColor,
  getColorVariant,
  getUserColorVariant,
  generateUserColorTheme,
  getContrastingTextColor,
  getUserInitials,
  createUserAvatarStyle,
  createSelectionHighlightStyle,
  createSelectionHighlightCSS,
  getAllCollaborationColors,
  isLightColor,
  generateUniqueColor,
  createUserColorMap
};
