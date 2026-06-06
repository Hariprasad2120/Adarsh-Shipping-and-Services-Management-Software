---
name: Lumina Enterprise
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#404947'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#707977'
  outline-variant: '#bfc8c6'
  surface-tint: '#316761'
  primary: '#003631'
  on-primary: '#ffffff'
  primary-container: '#134e48'
  on-primary-container: '#87beb6'
  inverse-primary: '#9ad1c9'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#4b2500'
  on-tertiary: '#ffffff'
  tertiary-container: '#6c3800'
  on-tertiary-container: '#ff9b40'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b5ede5'
  primary-fixed-dim: '#9ad1c9'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#154f49'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  title-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-base:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.5'
    letterSpacing: 0.1em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 8px
  container-padding: 32px
  gutter: 24px
  section-gap: 48px
  card-internal: 24px
---

## Brand & Style

The design system is rooted in the **Corporate / Modern** aesthetic, prioritizing clarity, trust, and operational efficiency for enterprise HR environments. It avoids decorative excess in favor of a "content-first" philosophy. The visual language is defined by spaciousness, high legibility, and a soft, approachable professional tone.

By utilizing a white-label foundation with strategic color accents, the system manages high-density data without overwhelming the user. The emotional response is one of organized calm—transforming complex workforce management into a series of clear, actionable tasks.

## Colors

The palette uses a sophisticated semantic logic to differentiate HR modules:
- **Primary (Teal):** Used for HRMS core functions and active employee metrics. It represents growth and stability.
- **Secondary (Blue):** Dedicated to infrastructure elements like branches and locations.
- **Tertiary (Amber):** Reserved for organizational structures like departments.
- **Neutrals:** A range of cool grays (Slate/Gray) provide the scaffolding. Backgrounds stay strictly at `#FFFFFF` or `#F8FAFC` to ensure maximum contrast and a clean "airway" for data.

Each key color is paired with a highly desaturated, lightened version for card backgrounds to create subtle "zoning" across the dashboard.

## Typography

The design system utilizes **Hanken Grotesk** for all roles. This typeface offers a contemporary, technical sharpness that feels precise yet accessible. 

- **Hierarchy:** Use `label-caps` for eyebrows and category headers to provide a structural frame without competing with data.
- **Emphasis:** `display-lg` is reserved for page titles and primary metrics.
- **Readability:** Body text uses a generous 1.6 line height to facilitate scanning of long employee records or descriptions.
- **Color:** Headlines should use a deep charcoal/near-black, while secondary body text moves to a medium slate to create visual depth.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop (12 columns, 1200px max-width) to maintain the "clean sheet" feel of the reference image. 

- **Rhythm:** An 8px linear scale governs all margins and padding. 
- **Spaciousness:** Large `section-gap` units (48px) are used to separate major functional areas (e.g., Header vs. Metrics vs. Quick Actions), preventing the interface from feeling "crowded" even when data-heavy.
- **Responsive Behavior:** 
    - **Desktop:** 12 columns, 32px margins.
    - **Tablet:** 8 columns, 24px margins. Cards reflow from 4-across to 2-across.
    - **Mobile:** 4 columns, 16px margins. All cards stack vertically.

## Elevation & Depth

This design system utilizes a **Tonal Layering** approach combined with **Ambient Shadows** to define hierarchy.

1.  **Canvas:** The lowest layer, using a subtle off-white (`#F8FAFC`).
2.  **Surface:** Primary cards and containers use pure white (`#FFFFFF`).
3.  **Shadows:** Shadows are extremely soft and diffused. Use a two-step shadow for containers: a 1px border in a very light neutral (Slate-100) and an ambient shadow with 4% opacity and a 20px blur.
4.  **Interaction:** On hover, cards should subtly lift by increasing shadow opacity to 8% and shifting the Y-offset by 2px. This provides tactile feedback without disrupting the professional aesthetic.

## Shapes

The shape language is consistently **Rounded**, using a 16px (1rem) radius as the standard for containers and cards. 

This specific radius balance creates a "soft enterprise" look—it is friendlier than sharp 90-degree corners but maintains more structure than pill-shaped designs. Buttons and smaller UI elements like input fields should follow a 8px (0.5rem) radius to ensure they feel like distinct, clickable objects within the larger card structures.

## Components

### Cards
Cards are the primary container. They should feature a subtle border (`1px solid #E2E8F0`) and be themed by their content type using a 4px top-border or light background tint (e.g., Teal for active employees).

### Buttons
- **Primary:** Solid fill using the Primary Teal. Text is white, semi-bold.
- **Ghost/Action:** Used in Quick Actions. Feature an icon in a dark container on the left, followed by the label and a subtle "arrow" indicator on the right.

### Metrics & Chips
Large-scale numbers (Display-LG) should be paired with the semantic color of the category. Chips used for status (e.g., "Onboarded") should use high-desaturation backgrounds with high-contrast text.

### Input Fields
Inputs should be minimalist: a 1px border that darkens on focus, with labels in `label-caps` positioned strictly above the field.

### Quick Actions
These are wide, horizontal cards that act as navigation shortcuts. They must include a clear icon, a title, and a short descriptive sentence to guide the user through complex HR workflows.