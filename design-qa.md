# Design QA — result screen, 15 August 2026

## Evidence

- Source visual truth: Figma file `bavdEOveHYl4LAaoVuhBV1`, result frames in section `305:7869`, exact logo node `305:7843`, plus browser annotations 1–2 from 15 August 2026.
- Implementation: `http://127.0.0.1:5174/`.
- Browser-rendered screenshot: `qa/implementation-2026-08-15.png`.
- Viewport and screenshot: 884 × 863 CSS px, 884 × 863 image px, device density 1×.
- State: result screen, intent `постричься`, selected date 28 August after checking both short and long card content.
- Focused comparison: logo transparency and card action/bottom boundary. A separate full-screen reference crop was unnecessary because the annotations target these two regions precisely.

## Full-view comparison

The existing composition, type scale, week strip, card hierarchy, background and controls are preserved. The two requested changes do not introduce layout drift: the card grows with its copy and the transparent mark keeps the same 34 × 34 CSS slot and Figma alignment.

## Focused comparison

- Logo: the first Figma PNG export contained a white matte. The replacement is rendered from the exact Figma SVG source at 3×, stored as RGBA, and shows no square background or transparency halo in the browser capture.
- Card: `.featured-card` no longer has a fixed minimum height. Browser geometry reports exactly 8 px from the bottom of the primary button to the card boundary for a 469 px card and for a 489 px card with longer text.

## Required fidelity surfaces

- Fonts and typography: unchanged from the approved screen; Onest sizing, weight and wrapping remain stable.
- Spacing and layout rhythm: passed; the action row retains its proportions and the lower inset is exactly 8 px for variable-height cards.
- Colors and visual tokens: unchanged; logo pixels are black on a transparent canvas rather than a white matte.
- Image quality and asset fidelity: passed; exact Figma logo vector source is rasterized at 3× and used as a transparent Retina PNG.
- Copy and content: score explanation now matches methodology v0.2 and no longer describes three fictitious weighted components.

## Interaction checks

- Opened the intent picker and selected `постричься`.
- Switched from the preferred day to a longer neutral-day card.
- Opened the score explanation sheet and verified the phase angle, target angle, distance and score text.
- Checked browser console: no errors.

## Comparison history

- P1 fixed: visible white square behind the logo. Re-exported from the exact transparent Figma SVG source at 3×; post-fix browser evidence shows transparent edges.
- P2 fixed: fixed card height left excess space below the actions. Removed the minimum height; post-fix measurements are 8 px for cards of two different heights.

## Findings

No actionable P0, P1 or P2 findings remain in the requested scope.

## Follow-up polish

- P3: revisit the working product name after the next feature pass; the current mark remains useful as a temporary visual placeholder.

final result: passed
