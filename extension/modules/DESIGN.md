# Read & Learn Design System

Design tokens and guidelines for the Read & Learn Chrome extension.

## Quick Start

Import design tokens in your module:
```javascript
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS, TRANSITIONS, Z_INDEX } from './design.js';
```

## Color System

### Brand Colors
The primary brand uses a purple gradient representing learning and growth:
- **Primary Gradient**: `COLORS.primary.gradient` - Hero elements, main CTA buttons
- **Primary Start**: `COLORS.primary.start` (#667eea) - Accent color
- **Primary End**: `COLORS.primary.end` (#764ba2) - Gradient terminus

### CEFR Level Colors
Language proficiency levels use a progression from green (beginner) to purple (mastery):

| Level | Color | Hex | Usage |
|-------|-------|-----|-------|
| A1 | Green | #4CAF50 | Beginner - Elementary |
| A2 | Light Green | #8BC34A | Elementary - Pre-intermediate |
| B1 | Yellow | #FFC107 | Intermediate |
| B2 | Orange | #FF9800 | Upper-intermediate |
| C1 | Deep Orange | #FF5722 | Advanced |
| C2 | Purple | #9C27B0 | Mastery |

Usage: `COLORS.cefr.A1`, `COLORS.cefr.B2`, etc.

### Status Colors
- **Success**: `COLORS.success` (#4CAF50) - Confirmations, completed actions
- **Error**: `COLORS.error` (#f44336) - Errors, destructive actions
- **Warning**: `COLORS.warning` (#FF9800) - Cautions, important notices
- **Info**: `COLORS.info` (#2196F3) - Informational messages

### UI Colors
- **Background**: `COLORS.background.primary` (white), `.secondary` (light gray), `.hover` (light blue)
- **Text**: `COLORS.text.primary` (dark), `.secondary` (medium), `.muted` (light), `.inverse` (white)
- **Border**: `COLORS.border.light`, `.default`

### Feature Colors
- **Vocabulary**: `COLORS.vocabulary.background`, `.text` - Word definitions
- **Grammar**: `COLORS.grammar.background`, `.text` - Grammar explanations
- **Highlight**: `COLORS.highlight.background`, `.border` - Selected text
- **Delete**: `COLORS.delete.background`, `.text` - Remove actions

## Typography

### Font Families
- **Display**: `TYPOGRAPHY.fontFamily.display` - Headers, titles (Cinzel, Playfair Display)
- **Body**: `TYPOGRAPHY.fontFamily.body` - Content, UI text (SF Pro, system fonts)

### Font Sizes
| Token | Size | Usage |
|-------|------|-------|
| xs | 11px | Tiny labels, metadata |
| sm | 12px | Secondary text, captions |
| base | 13px | Default body text |
| md | 14px | Emphasized body text |
| lg | 16px | Subheadings |
| xl | 18px | Section headers |
| 2xl | 20px | Page headers |
| 3xl | 36px | Hero text |

### Font Weights
- `fontWeight.normal` (400) - Body text
- `fontWeight.medium` (600) - Emphasis
- `fontWeight.bold` (700) - Headers
- `fontWeight.black` (900) - Hero text

## Spacing

Consistent spacing scale for padding and margins:

| Token | Size | Usage |
|-------|------|-------|
| xs | 4px | Tight spacing, inline elements |
| sm | 6px | Compact elements |
| md | 8px | Default element padding |
| lg | 12px | Section padding |
| xl | 16px | Card padding |
| 2xl | 20px | Large sections |
| 3xl | 24px | Page sections |
| 4xl | 40px | Hero spacing |

## Borders

### Border Radius
- `radius.sm` (3px) - Subtle rounding
- `radius.md` (6px) - Default buttons, inputs
- `radius.lg` (8px) - Cards, panels
- `radius.xl` (12px) - Modals, large cards
- `radius.pill` (16px) - Pills, tags

### Border Widths
- `width.thin` (1px) - Default borders
- `width.medium` (2px) - Emphasized borders
- `width.thick` (4px) - Heavy emphasis

## Shadows

### Box Shadows
- `SHADOWS.sm` - Subtle elevation (inputs, small cards)
- `SHADOWS.md` - Default elevation (cards, dropdowns)
- `SHADOWS.lg` - High elevation (modals, overlays)
- `SHADOWS.xl` - Maximum elevation (floating elements)

### Special Shadows
- `SHADOWS.button` - Main action buttons
- `SHADOWS.buttonHover` - Button hover state
- `SHADOWS.text` - Text shadow for contrast

## Transitions

- `TRANSITIONS.fast` (0.2s) - Quick interactions (hover, focus)
- `TRANSITIONS.medium` (0.25s) - Standard animations
- `TRANSITIONS.slow` (0.3s) - Deliberate animations

## Z-Index

Layering hierarchy for overlapping elements:
- `Z_INDEX.banner` (999999) - Top-level notifications
- `Z_INDEX.button` (999999) - Floating action buttons
- `Z_INDEX.menu` (999998) - Dropdown menus
- `Z_INDEX.tooltip` (999999) - Tooltips
- `Z_INDEX.popup` (999999) - Popups and modals

## Accessibility Guidelines

### Color Contrast
- All text colors meet WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text)
- Use `COLORS.text.primary` on light backgrounds
- Use `COLORS.text.inverse` on dark/gradient backgrounds

### Focus States
- All interactive elements must have visible focus indicators
- Use `COLORS.primary.start` for focus outlines
- Minimum focus outline width: 2px

### Font Sizing
- Minimum body text: 13px (`TYPOGRAPHY.fontSize.base`)
- Minimum interactive text: 14px (`TYPOGRAPHY.fontSize.md`)
- Support browser font scaling (use relative units where possible)

### Motion
- Respect `prefers-reduced-motion` media query
- Keep animations under 0.3s for essential feedback
- Avoid animations for decorative purposes

## Usage Examples

### Creating a Button
```javascript
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS, TRANSITIONS } from './design.js';

const button = document.createElement('button');
button.style.cssText = `
  background: ${COLORS.primary.gradient};
  color: ${COLORS.text.inverse};
  font-family: ${TYPOGRAPHY.fontFamily.body};
  font-size: ${TYPOGRAPHY.fontSize.md};
  padding: ${SPACING.md} ${SPACING.xl};
  border-radius: ${BORDERS.radius.md};
  box-shadow: ${SHADOWS.button};
  transition: ${TRANSITIONS.fast};
`;
```

### Creating a Card
```javascript
const card = document.createElement('div');
card.style.cssText = `
  background: ${COLORS.background.primary};
  border: ${BORDERS.width.thin} solid ${COLORS.border.default};
  border-radius: ${BORDERS.radius.lg};
  padding: ${SPACING.xl};
  box-shadow: ${SHADOWS.md};
`;
```

### CEFR Level Badge
```javascript
import { COLORS } from './design.js';

function createCefrBadge(level) {
  const badge = document.createElement('span');
  badge.textContent = level;
  badge.style.cssText = `
    background: ${COLORS.cefr[level]};
    color: ${COLORS.text.inverse};
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  `;
  return badge;
}
```
