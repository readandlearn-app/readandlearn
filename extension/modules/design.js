/**
 * @fileoverview Design tokens for Read & Learn extension
 * @see DESIGN.md for usage guidelines
 */

/** Brand and UI colors */
export const COLORS = {
  // Primary brand gradient
  primary: {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    start: '#667eea',
    end: '#764ba2',
    shadow: 'rgba(102,126,234,0.4)'
  },

  // Status colors
  success: '#4CAF50',
  error: '#f44336',
  warning: '#FF9800',
  info: '#2196F3',

  // CEFR level colors (progression from green to purple)
  cefr: {
    A1: '#4CAF50',
    A2: '#8BC34A',
    B1: '#FFC107',
    B2: '#FF9800',
    C1: '#FF5722',
    C2: '#9C27B0'
  },

  // UI element colors
  background: {
    primary: '#ffffff',
    secondary: '#f5f5f5',
    hover: '#e3f2fd'
  },

  // Text colors
  text: {
    primary: '#333333',
    secondary: '#666666',
    muted: '#888888',
    inverse: '#ffffff'
  },

  // Border colors
  border: {
    light: '#e0e0e0',
    default: '#ddd'
  },

  // Feature-specific
  vocabulary: {
    background: '#e8eaf6',
    text: '#3f51b5'
  },
  grammar: {
    background: '#fff3e0',
    text: '#f57c00'
  },
  highlight: {
    background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
    border: '#FF9800'
  },
  delete: {
    background: '#ffebee',
    text: '#c62828'
  }
};

/** Typography tokens (fonts, sizes, weights) */
export const TYPOGRAPHY = {
  // Font families
  fontFamily: {
    display: '"Cinzel", "Playfair Display", "Bodoni MT", "Didot", "Georgia", serif',
    body: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },

  // Font sizes
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '36px'
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '600',
    bold: '700',
    black: '900'
  },

  // Line heights
  lineHeight: {
    tight: '1.1',
    normal: '1.6'
  },

  // Letter spacing
  letterSpacing: {
    tight: '1px',
    wide: '2px'
  }
};

/** Spacing scale for padding and margins */
export const SPACING = {
  // Padding/margin scale
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '40px'
};

/** Border radius and width tokens */
export const BORDERS = {
  // Border radius
  radius: {
    sm: '3px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    pill: '16px'
  },

  // Border widths
  width: {
    thin: '1px',
    medium: '2px',
    thick: '4px'
  }
};

/** Box and text shadow definitions */
export const SHADOWS = {
  // Box shadows
  sm: '0 2px 8px rgba(0,0,0,0.08)',
  md: '0 2px 10px rgba(0,0,0,0.2)',
  lg: '0 4px 20px rgba(0,0,0,0.2)',
  xl: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',

  // Button shadows
  button: '-2px 4px 20px rgba(0,0,0,0.3)',
  buttonHover: '-4px 6px 28px rgba(0,0,0,0.4)',

  // Text shadows
  text: '0 2px 4px rgba(0,0,0,0.3)'
};

/** CSS transition presets */
export const TRANSITIONS = {
  fast: 'all 0.2s ease',
  medium: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 0.3s ease'
};

/** Z-index layering hierarchy */
export const Z_INDEX = {
  banner: 999999,
  button: 999999,
  menu: 999998,
  tooltip: 999999,
  popup: 999999
};
