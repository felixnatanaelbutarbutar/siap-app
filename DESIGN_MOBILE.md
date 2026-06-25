---
name: SIAP Professional Mobility
colors:
  surface: '#f3fcef'
  surface-dim: '#d4ddd0'
  surface-bright: '#f3fcef'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf6ea'
  surface-container: '#e8f0e4'
  surface-container-high: '#e2ebde'
  surface-container-highest: '#dce5d9'
  on-surface: '#161d16'
  on-surface-variant: '#3d4a3d'
  inverse-surface: '#2a322a'
  inverse-on-surface: '#ebf3e7'
  outline: '#6d7b6c'
  outline-variant: '#bccbb9'
  surface-tint: '#006e2f'
  primary: '#006e2f'
  on-primary: '#ffffff'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#4ae176'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#9e4036'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff8b7c'
  on-tertiary-container: '#76231b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4a9'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#7f2a21'
  background: '#f3fcef'
  on-background: '#161d16'
  surface-variant: '#dce5d9'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
  display-md-mobile:
    fontFamily: Inter
    fontSize: 20px
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
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  safe-margin: 20px
  header-height: 180px
---

## Brand & Style
The design system for this employee attendance information system is anchored in **Minimalism** with a focus on high-energy functional accents. It targets a professional workforce that requires efficiency, reliability, and clarity. The brand personality is "Precision with Vitality"—using a vibrant green to signal activity and growth, contrasted against a grounded, corporate slate-gray and clean white base. 

The emotional response should be one of confidence and ease. By utilizing a "clean-plate" approach with generous white space and sharp, purposeful typography, the interface removes cognitive load from daily administrative tasks. The distinctive visual signature of the system is the implementation of a complex, double-wave 3D graphic element used as a transition between the header and the body, breaking the standard linear grid with organic, modern movement.

## Colors
The palette is structured to drive immediate visual hierarchy. 
- **Primary Green:** Applied to the header panels and primary action indicators. It uses a subtle diagonal gradient to provide depth and a "vibrant" feel without sacrificing accessibility.
- **Surface & Background:** Pure white is used for the primary canvas to maintain a "medical-grade" cleanliness. 
- **Secondary Slate:** Reserved for primary action buttons, providing a heavy, stable anchor to the high-energy green.
- **Status & Warning:** A pure, high-contrast red is utilized exclusively for errors, late arrivals, or critical warnings.
- **Inputs:** A soft, cool gray ($surface_input_hex) differentiates interactive fields from the static white background.

## Typography
This design system utilizes **Inter** exclusively to achieve a systematic, utilitarian aesthetic. 
- **Titles:** Use `display-lg` and `display-md` in Bold Black ($text_title_hex) to create strong entry points.
- **Header Text:** When placed over the Green Header panel, typography transitions to White ($text_on_green_hex) with a slightly increased medium weight to ensure legibility against the vibrant background.
- **Readability:** Body text maintains a 1.6x line height to ensure that information-dense attendance logs remain readable on small mobile displays.

## Layout & Spacing
The layout follows a **Fluid Grid** model specifically optimized for mobile-first interaction. 
- **The Header Panel:** Occupies the top 20-25% of the screen. The bottom edge of this panel is defined by a custom "Double-Wave" 3D graphic separator that creates a fluid transition into the content area.
- **Safe Zones:** A consistent 20px safe-margin is applied to the left and right of all content containers.
- **Rhythm:** An 8pt grid system is used for vertical spacing between elements to ensure a tight, professional composition. Elements within cards (like timestamps) use the 4px unit for micro-spacing.

## Elevation & Depth
Depth is created through **Tonal Layers** rather than heavy shadows.
- **Level 0:** Background ($background_color_hex).
- **Level 1:** Input fields and secondary cards, slightly recessed using the Light Gray ($surface_input_hex) without borders.
- **Level 2:** Floating action buttons or critical alerts, utilizing a very soft, diffused ambient shadow (0px 4px 20px, 5% opacity black).
- **3D Graphic:** The double-wave separator should feature subtle inner-glows and 3D rendering to appear as a physical displacement of the interface, adding a premium "tech" feel to the top of the viewport.

## Shapes
The shape language is consistently **Rounded**. 
- **Inputs & Buttons:** Use a 0.5rem (8px) base radius. This provides a modern, approachable feel that isn't as juvenile as full pill-shapes.
- **Cards:** Content containers utilize 1rem (16px) corner radii to softly frame attendance data.
- **The Wave:** The double-wave graphic should use high-mathematical curvature (Bézier) to contrast against the geometric rigidity of the buttons and inputs.

## Components
- **Buttons:** Solid Slate-Gray ($secondary_color_hex) with centered white text. High-density padding (12px 24px) to ensure a large touch target.
- **Input Fields:** Filled style using $surface_input_hex. No border in default state; a 2px Green ($primary_color_hex) border appears on focus. Label text is placed above the field in `label-bold`.
- **Status Chips:** Small, rounded-xl tags for "On-Time" (Green background/White text) or "Late" (Red background/White text).
- **Attendance Cards:** White surface with a subtle 1px light gray outline. Includes a leading icon area for "Check-in/Check-out" visual cues.
- **Header Panel:** The primary container for user profile summary and current time. The background is the vibrant green gradient, capped by the 3D wave element.
- **Check-in Slider:** A unique component where users slide a green circle across a slate-gray track to confirm attendance, preventing accidental triggers.