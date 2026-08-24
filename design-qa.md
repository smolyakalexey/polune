# Design QA — типографика результата и космические поверхности

## Артефакты

- Source visual truth: Figma node `383:1084` in `bavdEOveHYl4LAaoVuhBV1`.
- Source capture: `/private/tmp/polune-figma-node-383-1084.png`.
- Rendered implementation: `http://localhost:4173/?intent=habit&date=2026-09-05&method=0.7p`.
- Implementation capture: `/private/tmp/polune-result-402x884-final.png`.
- Full-view side-by-side evidence: `/private/tmp/polune-figma-vs-implementation.png`.
- Additional states: `/private/tmp/polune-score-sheet-402x884.png`, `/private/tmp/polune-calendar-expanded-402x884.png`, `/private/tmp/polune-profile-sheet-402x884.png`.
- Status-icon source: Figma node `385:1247`; capture `/private/tmp/polune-figma-status-icons.png`.
- Status-icon focused comparison: `/private/tmp/polune-figma-vs-status-icons.png`.
- Latest implementation capture: `/private/tmp/polune-moon-stars-icons-stable.png`.

## Нормализация

- Figma source: 402 × 874 px at natural 1× density.
- Implementation: 402 × 884 px at a 402 × 884 CSS-pixel browser viewport and normalized 1× screenshot output.
- For the combined comparison the source received 10 px of neutral bottom padding; neither content region was scaled or stretched.
- State: dark theme, habit result for 5 September 2026, saved date-only personalization candidate `0.7p`, compact two-week calendar.
- Dynamic date, score and advice intentionally differ from the static Figma copy; the comparison targets only hierarchy and typography of the date, verdict/advice and percentage row.

## Проверенные поверхности

- Fonts and typography: Onest is preserved. Figma's high-screen values remain 68/64 for the date and 28/32 for verdict, advice and score. The 402 × 884 adaptive state now uses 60 px for the date, 24/27 and 23/26 for verdict/advice, and 21/27 for the score instead of the previous over-compressed 56/22/21/17 scale.
- Spacing and layout: the enlarged result hierarchy remains above the CTA stack and 190 px calendar; no overlap or clipped persistent control was found. The Figma-only composition has no CTAs or Moon calendar, so its more generous vertical whitespace is an intentional product difference.
- Colors and tokens: date, verdict and score are pure white; advice remains 58% white. All score colors now collapse to white on the result screen. Bottom-sheet gradients were darkened from gray to near-black while preserving their edge against the starfield.
- Image quality and asset fidelity: all four 32 px status SVGs are byte-identical downloads from Figma node `385:1247`. Suitable, neutral, caution and low ranges map to SealCheck, MinusCircle, WarningCircle and XCircle respectively; the suitable row keeps the Figma violet while all other rows stay white. The existing Moon raster is preserved; the shadow mask is 99.5% opaque with a 3 px blur. The final background renders 374 stars, stronger twinkle and three shooting-star tracks.
- Copy and content: no result copy or recommendation logic changed. Non-breaking Russian prepositions continue to render correctly.
- Icons and accessibility: score control remains a semantic button; its icon is decorative, the visible percentage remains in the accessible name, and the info icon retains visible contrast.

## Interaction checks

- Opened the score explanation: sheet rendered at 402 px width with the darker gradient and remained internally readable.
- Expanded the calendar: both month groups rendered in a 707 px sheet and all date buttons remained present.
- Opened and closed personalization: the 813 px sheet and footer shared the darker surface; the existing verified-city state remained intact.
- Returned to the main result and left the local preview open.
- Console warnings and errors after final render: none.
- Selected 81%, 59% and 43% dates and confirmed the expected suitable, neutral and caution SVG URLs in the rendered result. The current two-month `habit` window contains no score below 25%; the low XCircle asset and its `low` mapping were verified directly against the downloaded Figma bytes.

## Comparison history

1. Initial current comparison — blocked.
   - [P2] A neutral result still displayed the neutral round-wave icon, while the requested Figma reference used the white SealCheck glyph for the percentage row.
   - Fix: made the result percentage use the existing SealCheck asset for every score and applied the shared white treatment.
   - Post-fix evidence: `/private/tmp/polune-result-402x884-final.png` and `/private/tmp/polune-figma-vs-implementation.png`.
2. Final current comparison — passed.
   - No actionable P0/P1/P2 differences remain. Reduced type sizes at medium heights are intentional and proportional so that Polune's existing CTAs and two-week calendar remain visible; the high-screen rules retain the exact Figma scale.
3. Four-state icon comparison — passed.
   - User supplied Figma node `385:1247` with four ordered glyphs. The implementation now maps them to the four real score ranges instead of collapsing every non-suitable result to MinusCircle.
   - Post-fix evidence: `/private/tmp/polune-figma-vs-status-icons.png`; the three ranges present in the current window were browser-rendered, and all four committed SVGs match the Figma downloads byte for byte.
4. Moon and starfield refinement — passed.
   - Moon shadow blur is 3 px and its fill is 99.5% opaque; the center no longer visibly leaks the illuminated surface. Star count increased from 326 to 374 and the twinkle amplitude increased without obscuring result copy.
   - Post-fix evidence: `/private/tmp/polune-moon-stars-icons-stable.png`.
5. Suitable-result color restoration — passed.
   - Per final iPhone feedback, the suitable SealCheck and percentage text use `#6263f5`; neutral, caution and low rows remain white. The Info glyph remains secondary white for consistent affordance.

## Remaining test gap

- Physical iPhone Safari still needs a final check with real browser chrome and safe-area behavior; local responsive layout and all three bottom-sheet states were verified.

final result: passed
