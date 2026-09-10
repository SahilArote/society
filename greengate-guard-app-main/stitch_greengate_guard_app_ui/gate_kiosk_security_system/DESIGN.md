---
name: Gate Kiosk Security System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#960014'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc1d25'
  on-tertiary-container: '#ffd0cc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-plate:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
  touch-target-min: 3rem
  touch-target-primary: 3.5rem
  margin-screen: 1rem
  gutter-kiosk: 0.75rem
---

## Brand & Style

This design system establishes a high-velocity, mission-critical operational interface for residential gate security staff operating dedicated Android handhelds and fixed kiosk mounts. 

The aesthetic is Modern Corporate Utility: clean, tactile, and highly legible under intense direct sunlight. The interface prioritizes rapid scanning, decisive one-tap actions, and immediate visual verification. It strikes an authoritative, protective tone without feeling intimidating or archaic. Critical decisions—approving guest entries, rejecting unauthorized vehicles, and monitoring queue states—are delivered with absolute clarity to prevent guard fatigue during high-volume shifts.

## Colors

The palette balances authoritative brand governance with rapid status recognition:

- **Primary (`#4F46E5` Indigo)**: Primary navigation headers, dominant action triggers, focused states, and scan activation buttons. Use `#4338CA` for active/pressed states and `#6366F1` for high-visibility badges.
- **Secondary / Success (`#10B981` Emerald)**: "Approve", "Grant Access", "Gate Open", and positive verification states. Use `#059669` for elevated text contrast on light tinted badges.
- **Tertiary / Destructive (`#EF4444` Rose)**: "Deny Entry", "Revoked Access", and emergency override triggers. Use `#DC2626` for active destructive buttons.
- **Warning / Pending (`#F59E0B` Amber / `#D97706`)**: Queued visitors, pending resident confirmations, and warning flags.
- **Surfaces & Backgrounds**: Base scaffold uses `#F8FAFC` (Slate 50) to mitigate glare. Elevated surfaces, modal sheets, and interactive card containers use pure `#FFFFFF`.
- **Text & Borders**: High-contrast `#0F172A` (Slate 900) for headers and critical license plate readouts, `#475569` (Slate 600) for secondary metadata, and `#E2E8F0` (Slate 200) for hairline boundaries.

## Typography

Inter provides crisp, neutral geometry optimized for high legibility on standard-density mobile displays in bright environmental conditions.

- **License Plates & PIN Codes (`code-plate`)**: Fixed uppercase tracking (+0.08em) with bold weighting to prevent character confusion (e.g., distinguishing `0` vs `O`, `8` vs `B`) at an arm’s length.
- **Labels (`label-lg`, `label-md`, `label-sm`)**: Semi-bold to bold weights applied to buttons, filter chips, and live status indicators to ensure immediate comprehension during fast scans.
- **Hierarchy Rules**: Primary headers never drop below 18px on mobile kiosk viewports. Informational body text maintains a minimum of 14px for accessibility.

## Layout & Spacing

Designed primarily for Android handheld portrait viewports (390px to 412px width), utilizing a flexible vertical stack anchored by a 4px base rhythm.

- **Screen Margins**: Fixed 16px (`space-md`) horizontal margins on mobile viewports; scales to 24px (`space-xl`) on 7-to-10-inch mounted tablet kiosks.
- **Touch Target Enforcements**: All interactive zones enforce a strict minimum boundary of 48px (`touch-target-min`), scaling to 56px (`touch-target-primary`) for primary operational actions (Approve, Deny, Scan, Call Resident).
- **Persistent Bottom Deck**: Floating or fixed bottom action bars are reserved for high-frequency binary actions (Allow / Deny), pinned within the bottom thumb zone with 16px clearance above Android system navigation bars.

## Elevation & Depth

Visual hierarchy uses clean surface elevation paired with slate-tinted ambient shadows to separate active operational cards from background feeds without visual noise.

- **Level 0 (Canvas)**: `#F8FAFC`. Base background for non-interactive areas and feeds.
- **Level 1 (Cards & Lists)**: `#FFFFFF` surface with `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)` and a 1px solid border in `#E2E8F0`.
- **Level 2 (Active Verification & Scan Modals)**: Elevated surfaces with `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Alerts, Drawers & Action Bars)**: Pinned action sheets and urgent entry notifications with `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.05)`.
- **State Feedback**: Pressed surfaces drop their shadow to Level 0 and shift background color to `#F1F5F9` for immediate tactile feedback.

## Shapes

The design uses a rounded aesthetic (`roundedness: 2`) tailored to match modern mobile design systems:

- **Cards & Primary Modules**: 16px to 20px border radii (`rounded-2xl`). This softens security workflows and creates distinct, easily tappable visual groups.
- **Interactive Action Buttons**: 12px to 16px radii. Pinned split action bars use 16px radii to match card containers.
- **Chips, Badges & Quick Toggles**: Pill-shaped (`9999px` radius) to immediately distinguish categorical attributes and quick-entry filters from actionable cards.
- **Input Fields**: 12px radius, matching medium button controls.

## Components

### Buttons
- **Primary Operational Buttons**: Height 56px (`touch-target-primary`), bold text (`label-lg`), 16px radius. "Approve Entry" uses `#10B981` background with `#FFFFFF` text. "Deny Entry" uses `#EF4444` background with `#FFFFFF` text.
- **Default Primary**: Indigo `#4F46E5` background, white text. Active state: `#4338CA`.
- **Secondary Buttons**: Neutral outline with `#FFFFFF` fill, 1.5px border `#CBD5E1`, text `#1E293B`. Height 48px.
- **Icon Actions**: 48x48px minimum hit target, center-aligned 24px icon.

### Chips & Filters
- **Filter Chips**: 36px height, pill-shaped (`9999px`), light background `#F1F5F9`, border `#E2E8F0`, text `#475569`. Selected state: `#4F46E5` background with `#FFFFFF` text.
- **Status Badges**: 28px height, rounded-full, containing a 6px status dot.
  - *Approved*: Background `#ECFDF5`, text `#065F46`, dot `#10B981`.
  - *Rejected*: Background `#FEF2F2`, text `#991B1B`, dot `#EF4444`.
  - *Pending*: Background `#FFFBEB`, text `#92400E`, dot `#F59E0B`.

### Cards & Verification Blocks
- Surface: `#FFFFFF`, 16px padding, 16px border radius, 1px border `#E2E8F0`, Level 1 elevation.
- Structure: Header row with entry timestamp and license plate badge (`code-plate`), middle section displaying visitor name and destination unit, footer containing direct resident contact and quick decision controls.

### Input Fields & Quick Keypads
- Text Fields: 52px height, 12px radius, `#FFFFFF` background, 1.5px border `#CBD5E1`. Focus state uses `#4F46E5` border with a 3px `#EEF2FF` outer halo.
- Numeric PIN / Quick Code Pads: Dedicated 3x4 grid for one-hand PIN entry, key targets 60px height with 12px radius and prominent 20px typography.

### Queue & List Items
- Clean divided rows with 12px vertical padding, separated by `#F1F5F9` divider lines. Touch targets fill entire width, with explicit left-border color accents (4px width) reflecting visitor priority or status.