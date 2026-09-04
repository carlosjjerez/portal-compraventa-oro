---
name: Aurelian Standard
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#4d4635'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#7f7663'
  outline-variant: '#d0c5af'
  surface-tint: '#735c00'
  primary: '#735c00'
  on-primary: '#ffffff'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#e9c349'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#b2b3b3'
  on-tertiary-container: '#444546'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  display-lg:
    fontFamily: EB Garamond
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: EB Garamond
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  price-display:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: -0.01em
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

The design system is engineered for a high-stakes gold trading environment, prioritizing the psychological triggers of security, heritage, and significant value. The brand personality is authoritative yet transparent, positioning the service as a modern digital vault.

The visual style employs **Minimalist Luxury** with **Tactile** accents. It leverages expansive whitespace to denote premium positioning, while using fine-line borders and subtle metallic textures to ground the digital experience in the physical reality of precious metals. The emotional goal is to move the user from a state of caution to a state of absolute confidence through a precise, high-contrast interface that feels both ancient in its reliability and futuristic in its efficiency.

## Colors

The palette is restricted to three core pillars to maintain an aura of exclusivity:

- **Rich Gold (#D4AF37):** Used sparingly for primary actions, success states, and key data points. It represents the asset itself and should never be used for large backgrounds to avoid visual fatigue.
- **Deep Charcoal (#1A1A1A):** The foundation of the system. Used for typography, navigation bars, and "Vault" areas to provide a sense of weight and permanence.
- **Crisp White (#FFFFFF):** The canvas. Used to ensure the interface remains modern and legible, preventing the "heavy" feel often associated with traditional finance.

Gradients should only be applied to gold elements to simulate a metallic luster. Use the `gold_gradient` for primary buttons and specialized iconography.

## Typography

This design system utilizes a high-contrast typographic pairing to bridge the gap between tradition and technology. 

**EB Garamond** is reserved for headlines and editorial moments. Its classical proportions evoke the history of currency and the permanence of gold. 

**Hanken Grotesk** handles all functional data, body copy, and UI labels. Its geometric clarity ensures that complex financial information—such as spot prices and transaction histories—is processed without friction. Use `label-caps` for section headers in dashboards to provide a structural, "ledger-like" appearance.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** approach for desktop to maintain a controlled, gallery-like presentation. A 12-column grid is used with generous margins to focus the user's eye on central assets.

- **Vertical Rhythm:** Built on an 8px base unit. Component heights should always be multiples of 8.
- **Density:** The design system prioritizes "Low Density" to convey luxury. Avoid cramming data; use whitespace to separate distinct financial modules.
- **Mobile:** Transition to a 4-column fluid grid. Margins shrink to 20px, but internal component padding remains high to maintain a "touch-premium" feel.

## Elevation & Depth

To maintain a sophisticated aesthetic, this design system avoids heavy shadows. Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines**.

1.  **Surface Levels:** The base background is white. "Containers" (e.g., asset cards) use a subtle `#F4F4F4` background or a very fine `0.5px` solid border in `#1A1A1A` at 10% opacity.
2.  **Interactive Depth:** Primary buttons use a soft, gold-tinted ambient shadow (`0px 10px 20px rgba(212, 175, 55, 0.15)`) to appear slightly raised from the page.
3.  **Glassmorphism:** Use only for mobile navigation bars or fixed headers, employing a backdrop blur of 10px with a 90% white tint to maintain legibility while hinting at the content beneath.

## Shapes

The shape language is strictly **Sharp (0px)**. 

In the context of precious metals and high finance, sharp corners convey precision, architectural strength, and institutional stability. All buttons, input fields, cards, and imagery must utilize 90-degree angles. The only exception is the use of circular "coin" icons when representing physical gold assets, which provides a necessary organic contrast to the rigid UI framework.

## Components

### Buttons
- **Primary:** Sharp corners, `gold_gradient` background, Deep Charcoal text. High-contrast and unmistakable.
- **Secondary:** Transparent background, 1px Deep Charcoal border, Deep Charcoal text.
- **Tertiary:** No border, Deep Charcoal text with a 1px gold underline that expands on hover.

### Input Fields
- **Design:** Bottom-border only (1px Deep Charcoal) to mimic high-end stationary. On focus, the border transitions to Gold.
- **Labels:** Always use `label-caps` positioned above the input.

### Cards (Asset/Portfolio)
- White background, 1px `#E0E0E0` border. No shadow.
- Headers within cards should use `headline-sm`.
- Include a 4px Gold vertical "accent bar" on the left side of cards containing active investments.

### Progress Indicators (Live Price)
- Use fine, 1px lines for charts. 
- Success/Increase: Gold (#D4AF37).
- Neutral/Decrease: Deep Charcoal (#1A1A1A). Avoid using "Red" for price drops to maintain a calm, premium atmosphere; gold is a long-term play.

### Navigation
- Top-level navigation should be centered, utilizing `label-caps` for a curated, boutique feel.