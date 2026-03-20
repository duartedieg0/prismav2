# Design System Strategy: The Editorial Educator

## 1. Overview & Creative North Star
This design system is built to transform the "test-taking" experience from a stressful academic hurdle into a premium, supportive dialogue. Our Creative North Star is **"The Human Curator."** 

We move away from the cold, industrial "grid-and-gray" of legacy EdTech. Instead, we embrace an editorial layout inspired by high-end educational journals and boutique stationery. By leveraging intentional asymmetry, oversized typography scales, and a "No-Line" philosophy, we create an environment that feels authoritative yet deeply approachable. The interface doesn't just display data; it breathes, prioritizing cognitive ease through expansive negative space and warm, tactile layering.

---

## 2. Color & Surface Philosophy
The palette is rooted in nature—mineral greens and sun-bleached papers—designed to reduce eye strain and promote focus.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning or containment. Boundaries must be defined solely through:
*   **Background Color Shifts:** Use `surface-container-low` sections sitting on a `surface` background.
*   **Tonal Transitions:** Define areas by the natural contrast between the warm background (`#FAFAF7`) and the muted secondary layers (`#F1F0EB`).

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers. We use the Material surface tiers to create "nested" depth:
*   **Layer 0 (Base):** `surface` (#f9f9f6) — The canvas.
*   **Layer 1 (Sections):** `surface-container-low` (#f4f4f1) — Large structural blocks.
*   **Layer 2 (Cards/Focus):** `surface-container-lowest` (#ffffff) — High-priority interactive elements.
*   **Layer 3 (Modals/Popovers):** `surface-bright` (#f9f9f6) — Floating with elevation.

### The "Glass & Gradient" Rule
To escape the "flat" look, use **Glassmorphism** for floating sidebars or navigation overlays. Apply `surface-container-lowest` at 80% opacity with a `24px` backdrop-blur. 
*   **Signature Texture:** Use a subtle linear gradient on the Primary CTA (from `primary` #00614f to `primary-container` #0d7c66) at a 135-degree angle to provide a jewel-like depth that feels intentional and premium.

---

## 3. Typography
Our typography is the backbone of our editorial identity. It balances the modern precision of Inter with the friendly, geometric character of Plus Jakarta Sans.

*   **Display (Plus Jakarta Sans, ExtraBold):** Used for "Hero" moments and large statistics. It should feel massive and confident.
*   **Headline (Plus Jakarta Sans, Bold):** For page titles and section headers. High-contrast sizing ensures a clear information hierarchy.
*   **Body (Inter, Regular/Medium):** Optimized for long-form reading and exam questions. The line height is set to 1.6 to ensure readability during high-pressure tasks.
*   **Mono (JetBrains Mono):** Reserved for technical instructions, metadata, or "ID" numbers to give a "printed ticket" feel.

---

## 4. Elevation & Depth: The Layering Principle
We reject traditional shadows in favor of **Tonal Layering**. Depth is achieved by "stacking" surface tiers.

*   **Ambient Shadows:** When a float is required (e.g., a floating Action Button), use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(28, 25, 23, 0.06)`. This mimics soft, natural studio light.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke (e.g., high-contrast mode or input focus), use the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.
*   **Intentional Asymmetry:** Break the grid. Allow images or large text elements to bleed over container edges or overlap surface transitions by `-24px` to create a custom, "designed" feel rather than a "templated" one.

---

## 5. Components

### Buttons
*   **Primary:** Emerald Green gradient (`primary` to `primary-container`). Rounded-md (12px). White text.
*   **Secondary:** `surface-container-high` background with `on-surface` text. No border.
*   **Accent (CTA):** Amber (`tertiary`). Use only for the "Final Submit" or "Start" actions. High urgency, high warmth.

### Input Fields
*   **Styling:** A `surface-container-highest` base with a "Ghost Border" (15% opacity). On focus, transition the background to `surface-container-lowest` and increase the ghost border to 40% opacity. 
*   **Labels:** Always use `label-md` in `on-surface-variant`.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines between list items. Use `spacing-6` (1.5rem) of vertical white space or alternating backgrounds (`surface` to `surface-container-low`) to separate content.
*   **Interactive Cards:** Instead of a shadow on hover, use a slight "scale-up" (1.02) and change the background color to `primary-fixed-dim` at 10% opacity.

### Additional Signature Components
*   **The "Progress Ribbon":** A thick, horizontal bar at the top of the viewport using the `primary` color, but with a `secondary-fixed` background to show exam completion status.
*   **Status Badges:** Use `tertiary-fixed` for "In Progress" and `primary-fixed` for "Complete," with `label-sm` caps-lock typography.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use the `16 (4rem)` spacing token for page margins to create an "Editorial" feel.
*   **Do** overlap elements. Place a small `title-sm` label partially over the edge of a `surface-container` to break the box.
*   **Do** use JetBrains Mono for "Step 1 of 10" indicators to provide a functional contrast.

### Don’t
*   **Don’t** use black (#000000). Always use `on-background` (#1a1c1b) to maintain the warmth of the system.
*   **Don’t** use the Amber (`tertiary`) color for body text. It is for visual signaling only.
*   **Don’t** use 1px dividers. If you feel the need for a line, increase the background contrast between sections instead.