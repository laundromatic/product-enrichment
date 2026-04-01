# Design System: ShopGraph

## 1. Visual Theme & Atmosphere
Clean, functional, developer-tool aesthetic. Light theme with white backgrounds, soft gray surfaces, and blue accents. Inspired by Google's Material Design but lighter — no elevation hierarchy, minimal shadows, generous whitespace. The site should feel like documentation that happens to be beautiful: clear, scannable, trustworthy. Not flashy, not dark-mode, not glassmorphism. The playground and data should be the visual focus, not the chrome around it.

## 2. Color Palette & Roles

### Primary
- **Blue** `#1a73e8` — Primary actions, links, interactive elements, ShopGraph brand accent
- **Blue hover** `#1765cc` — Hover state for primary buttons/links

### Status & Pricing
- **Green** `#34a853` — Success, free tier, positive metrics
- **Green badge bg** `#e6f4ea` — Free tier badge background
- **Green badge text** `#137333` — Free tier badge text
- **Yellow** `#fbbc04` — Warning, degraded status, caution
- **Yellow badge bg** `#fef7e0` — New/highlight badge background
- **Yellow badge text** `#594300` — New/highlight badge text
- **Red** `#ea4335` — Error, critical status

### Neutral Scale
- **Text primary** `#202124` — Headlines, primary body text
- **Text secondary** `#595959` — Body paragraphs, descriptions, metadata
- **Text muted** `#9aa0a6` — Footer text, timestamps, de-emphasized content
- **Border** `#dadce0` — Card borders, section dividers, input borders
- **Surface** `#f8f9fa` — Alternate section backgrounds, card backgrounds
- **Surface alt** `#f1f3f4` — Code inline background, subtle fills
- **Background** `#ffffff` — Page background

### Code Blocks
- **Code bg** `#1e1e2e` — Pre/code block background (dark for contrast)
- **Code text** `#cdd6f4` — Code block text

### Decorative (Hero blobs only)
- **Blob blue** `#4285f4` — Hero gradient blob
- **Blob green** `#34a853` — Hero gradient blob
- **Blob yellow** `#fbbc04` — Hero gradient blob

## 3. Typography Rules

### Font Families
- **Primary**: `'Google Sans Flex', 'Google Sans', 'Segoe UI', system-ui, -apple-system, sans-serif`
- **Mono**: `'Google Sans Code', 'Google Sans Mono', 'SF Mono', monospace`
- Loaded via Google Fonts: `Google+Sans+Flex:opsz,wght@6..144,1..1000` and `Google+Sans+Code`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero title | Sans Flex | 3.6em | 700 | 1.1 | -0.03em | Single word "ShopGraph" |
| Section heading (h2) | Sans Flex | 1.6em | 600 | default | default | Section titles |
| Card heading (h3) | Sans Flex | 1.1em | 600 | default | default | Tool names, use case titles |
| Hero subtitle | Sans Flex | 1.25em | 400 | 1.6 | default | #595959 color |
| Body paragraph | Sans Flex | 1.05em | 400 | 1.7 | default | #595959 color |
| Small text | Sans Flex | 0.85-0.9em | 400-500 | default | default | Nav links, badges, metadata |
| Code inline | Code | 0.85em | 400 | default | default | #f1f3f4 bg, #202124 text |
| Code block | Code | 0.85em | 400 | 1.6 | default | Dark bg (#1e1e2e) |
| Tool name | Code | 1.05em | 600 | default | default | Monospace for API names |
| Price display | Sans Flex | 2em | 700 | default | default | #1a73e8 for paid, #34a853 for free |

## 4. Component Stylings

### Buttons
| Variant | Background | Text | Padding | Radius | Hover | Use |
|---------|-----------|------|---------|--------|-------|-----|
| Primary | `#1a73e8` | `#fff` | 12px 28px | 8px | `#1765cc` + deeper shadow | Main CTA (Try It Free, Extract) |
| Outline | `#fff` | `#1a73e8` | 12px 28px | 8px | `#f8f9fa` bg, blue border | Secondary actions (View on GitHub) |

### Cards
- **Border**: 1px solid `#dadce0`
- **Radius**: 12px
- **Padding**: 28px (large cards), 20px (position cards), 12px (endpoint pills)
- **Shadow**: `0 1px 4px rgba(60,64,67,.15)` — subtle, not prominent
- **Accent stripe**: 3px gradient top border on tool cards (blue-green for first, yellow-red for second)

### Integration Block
- **Background**: `#fff`
- **Border**: 1px solid `#dadce0`
- **Radius**: 12px
- **Padding**: 24-32px
- **Shadow**: `0 1px 4px rgba(60,64,67,.15)`
- **Max width**: 720-760px, centered

### Badges
- **Free tier**: bg `#e6f4ea`, text `#137333`, padding 4px 12px, radius 20px (pill)
- **New**: bg `#fef7e0`, text `#594300`, same padding/radius
- **Default**: bg `#e8f0fe`, text `#1a73e8`, same padding/radius

### Input Fields
- **Border**: 1px solid `#dadce0`
- **Radius**: 8px
- **Padding**: 10px 14px
- **Focus**: border-color `#1a73e8`
- **Font**: inherit (Sans Flex)

### Navigation
- **Height**: padding 16px 0
- **Border**: bottom 1px solid `#dadce0`
- **Logo**: 1.2em weight 600, icon 28x28 with 6px radius
- **Links**: `#595959`, 0.9em, weight 500, hover `#202124`

## 5. Layout Principles

### Spacing
- **Base unit**: 4px
- **Common gaps**: 8px, 12px, 16px, 24px, 32px, 48px
- **Section padding**: 40-50px vertical
- **Container max-width**: 1200px (full width), 720-760px (content blocks)

### Grid
- **Position cards**: 3-column grid, 16px gap
- **Tool cards**: 3-column grid, 24px gap
- **Use case cards**: 3-column grid, 24px gap
- **Integration code**: 2-column grid (npm + MCP side by side)
- **Stats cards**: flex row with 16px gap
- **All grids collapse to 1-column on mobile (768px)**

### Whitespace
- Sections breathe with 40-50px padding
- Section headers centered with 48px bottom margin
- Cards have internal padding (20-28px) creating consistent rhythm

### Border Radius Scale
- **Micro**: 4px (inline code)
- **Small**: 8px (buttons, inputs, endpoint pills)
- **Medium**: 12px (cards, integration blocks, pre blocks)
- **Pill**: 20px (badges)
- **Full**: 40px (works-with pills)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow, 1px border only | Position cards, endpoint pills |
| Subtle | `0 1px 4px rgba(60,64,67,.15)` | Content cards, integration block |
| None on hover | No elevation change on hover | Cards are not interactive surfaces |

Shadow philosophy: Minimal. Shadows indicate containment, not interactivity. The site uses borders (`#dadce0`) as the primary separation mechanism. Shadows are reserved for content cards that contain actionable information.

## 7. Do's and Don'ts

### Do
- Use `#1a73e8` blue for all interactive elements and CTAs
- Use `#595959` for body text (not pure black, not too light)
- Use monospace (`Google Sans Code`) for API names, endpoints, and code
- Use 12px border-radius for cards and containers
- Use `#f8f9fa` for alternating section backgrounds
- Use centered section headers with subtitle text
- Keep the hero blobs subtle (opacity 0.35, blur 120px)

### Don't
- Don't use dark mode or dark backgrounds (except code blocks)
- Don't use gradients on surfaces (only on decorative hero blobs and tool card accent stripes)
- Don't use shadows heavier than `0 1px 4px rgba(60,64,67,.15)`
- Don't use border-radius larger than 12px on cards (pills/badges are the exception)
- Don't use colors outside the defined palette — no purple, no teal, no orange
- Don't use font weights above 700 or below 400
- Don't center body paragraph text (section headers are centered; body text is left-aligned)
- Don't add hover elevation effects to cards

## 8. Responsive Behavior

| Breakpoint | Width | Key Changes |
|------------|-------|-------------|
| Desktop | >768px | 3-column grids, side-by-side code blocks, full hero blobs |
| Mobile | <=768px | 1-column grids, stacked code blocks, scaled-down typography |

- **Touch targets**: Buttons minimum 44px height
- **Collapsing**: All grids go to single column. Integration code blocks stack vertically.
- **Images**: No content images (text-driven site)
- **Hero blobs**: Scale down but remain decorative

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary blue: `#1a73e8`
- Text: `#202124` (headings), `#595959` (body)
- Border: `#dadce0`
- Surface: `#f8f9fa`
- Free/success green: `#34a853`
- Code bg: `#1e1e2e`

### Example Component Prompts
- "Build a card with 1px #dadce0 border, 12px radius, 28px padding, subtle shadow, white background"
- "Build a CTA button: #1a73e8 bg, white text, 12px 28px padding, 8px radius, hover #1765cc"
- "Build a badge: #e8f0fe bg, #1a73e8 text, 4px 12px padding, 20px pill radius"
- "Build a code block: #1e1e2e bg, #cdd6f4 text, 20px 24px padding, 12px radius, Google Sans Code font"
