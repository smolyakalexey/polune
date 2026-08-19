# Design QA — Polune reveal lab

## Artifacts

- Source visual truth: `/Users/alexey/.codex/generated_images/019ffac9-27b3-7cf2-a8b2-9f83957f5093/exec-74fb3b39-d3e1-4f45-b534-7fd45ce4391d.png`
- Implementation screenshot: `/private/tmp/polune-reveal-implementation-final.png`
- Side-by-side comparison: `/private/tmp/polune-reveal-comparison-final.png`
- Source pixels: `1536 × 1024`; compared right result frame crop: `448 × 950`
- Implementation pixels: `390 × 844`
- CSS viewport: `390 × 844`, device scale factor `1`
- Normalization: the source result crop was resized with `contain` to `390 × 844`; the implementation was captured directly at `390 × 844`
- State: dark theme, reveal completed, explanation collapsed

## Full-view comparison evidence

The selected direction and the implementation share the same dominant composition: centered Polune brand, translucent shell halves around a dark rounded result card, expressive serif date, compact verdict and advice, method link, and a high-contrast action below. The implementation keeps the card and all controls as live HTML rather than baking them into the shell artwork.

Intentional prototype differences:

- replay and theme controls are visible because this is an isolated motion laboratory;
- the production-oriented share action is retained beside the primary button;
- the implementation uses the current Polune typography and interaction focus treatment rather than reproducing generated-image artifacts literally.

## Focused-region comparison evidence

The result region was reviewed at full mobile resolution. Date hierarchy, card width, card radius, shell clearance, method-link spacing, and bottom action height are readable at `390 × 844`. The generated shell asset remains sharp and transparent on both themes. The card expands when `как посчитали` is opened without requiring a new graphic export.

## Required fidelity surfaces

- **Fonts and typography:** Onest is used for interface text; Cormorant Garamond is used only for the large date. Hierarchy and line wrapping match the selected direction. The generated mock used a slightly lighter display rendering, retained as a possible P3 refinement.
- **Spacing and layout rhythm:** result card, shell, method link, and action follow the source's vertical order. The source has no laboratory controls; their addition is intentional and isolated to `/reveal-lab`.
- **Colors and visual tokens:** near-black background, milky card/action, pale lavender shell and semantic text contrast match the selected direction. Light and dark modes use the same component structure.
- **Image quality and asset fidelity:** closed and opened shell states are real raster assets at `1254 × 1254` with alpha, not CSS drawings. UI text is not part of either asset.
- **Copy and content:** exact intended result copy is present: `24 августа, пн`, `день для мягкого обновления`, `освежите форму, не меняя себя целиком`, `как посчитали`, `добавить событие`.

## Interaction verification

- reveal starts only from `узнать день`;
- replay returns to the initial state;
- light/dark theme toggle works;
- `как посчитали` expands and collapses real interface content;
- `добавить событие` shows the temporary success state `добавлено`;
- share control has an accessible name;
- clean browser tab reported no console warnings or errors.

## Comparison history

### Iteration 1

- [P2] The initial result card was too wide and included the method link inside the card.
- [P2] The first opened-shell asset was too round and hid behind the card.
- Fixes: narrowed the result card, moved `как посчитали` below it, moved the action upward, generated a new slender pair of shell halves, and adjusted the open-state scale and vertical position.
- Post-fix evidence: `/private/tmp/polune-reveal-comparison-final.png`.

## Findings

No actionable P0, P1, or P2 differences remain for the isolated reveal prototype.

## Follow-up polish

- [P3] Tune the shell refraction and opening distance after observing the animation on a physical iPhone.
- [P3] Consider a slightly lighter optical weight for the large date.
- [P3] Decide whether laboratory controls remain visible when the concept is integrated into the real result flow.

## Implementation checklist

- [x] separate raster shell from editable HTML interface
- [x] responsive mobile layout at `390 × 844`
- [x] light and dark themes
- [x] reduced-motion fallback in CSS
- [x] functional reveal, reset, explanation and success states
- [x] lint and production build
- [x] browser-rendered visual comparison

final result: passed
