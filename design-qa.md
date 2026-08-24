# Design QA — эксперимент календаря с фазами Луны

## Артефакты

- Source visual truth: https://mobbin.com/explore/screens/5fa577fd-b611-409a-a766-a7302094bdc0
- Source capture: `/private/tmp/polune-mobbin-reference.png`
- Rendered implementation: `http://localhost:4173/?intent=haircut&date=2026-08-24&method=0.7p`
- Implementation capture: `/private/tmp/polune-binary-status-purple.png`
- Alternate gray-result capture: `/private/tmp/polune-binary-status-gray.png`
- Full-view evidence: `/private/tmp/polune-binary-status-purple.png`
- Focused calendar comparison: `/private/tmp/polune-binary-status-comparison.png`

## Нормализация

- Browser viewport: 884 × 861 CSS px; Polune mobile shell: 402 px wide.
- Source capture: 1280 × 720 px; implementation capture: 884 × 861 px.
- Browser devicePixelRatio: 2; browser screenshots were normalized by the browser tool to CSS-pixel dimensions, so no additional density conversion was applied.
- State: dark theme, haircut result, compact 14-day calendar, active recommended day 24 August, saved date-only personalization candidate `0.7p`.
- The Mobbin source is a full-month calendar while the requested implementation is intentionally a compact two-week sheet. The comparison therefore judges hierarchy, lunar imagery, date placement, sparse best-day markers, and visual density rather than identical frame geometry.

## Проверенные поверхности

- Typography: retained Polune's Onest hierarchy; date numbers are secondary labels below each Moon and remain legible at compact size.
- Spacing and layout: two complete rows of seven dates fit inside the 190 px sheet; the result score and CTA stack no longer overlap the raised sheet on a short viewport.
- Colors and tokens: ordinary dates retain the natural Moon color and white date labels; every date at 75% or above uses the same violet token and sparkle marker. Result percentages are binary: preferred and 75%+ dates use violet; every 0–74% date uses the existing neutral gray with the same neutral icon.
- Image quality: reused the product's real `moon-base.png` asset and the existing phase mask instead of drawing substitute Moon icons.
- Copy/content: no new explanatory copy was added; existing result text and date-selection behavior are preserved.

## Interaction checks

- Selected a non-recommended 38% day: the result content and URL changed to 30 August while the preferred-day marker stayed on 24 August.
- Expanded and collapsed the calendar: both month groups rendered, stayed internally scrollable, and retained the same binary visual language.
- Re-selected the preferred day and verified the compact 14-day state.
- Console errors checked after the final render: none.

## Comparison history

1. Initial comparison — blocked.
   - [P1] The newly raised 190 px calendar caused the result score row to sit underneath the CTA stack in a short desktop/mobile-shell viewport.
   - Fix: compressed Moon, date, guidance, and score spacing at short heights without reducing calendar cells or CTA touch targets.
   - Post-fix evidence: `/private/tmp/polune-calendar-implementation.png`; measured score/actions overlap became `false`.
2. Focused calendar comparison — blocked.
   - [P2] Neutral Moon phases were too dim to read as the primary content of each date cell.
   - Fix: increased neutral Moon opacity from `.46` to `.64` and brightness from `.70` to `.82`, keeping them monochrome and visually secondary.
   - Post-fix evidence: `/private/tmp/polune-calendar-focused-comparison-final.png`.
3. Final comparison — passed.
   - No actionable P0/P1/P2 differences remain. The full-month versus two-week geometry and Polune-specific type/color system are intentional product constraints.
4. State-language refinement — passed.
   - User feedback: ordinary dates looked disabled and suitable dates should share one violet state instead of a violet/green split.
   - Fix: restored natural Moon color and white labels for ordinary dates; unified all 75%+ dates under violet; reserved a subtle Moon-only dimming for the 0–24% range.
   - Post-fix evidence: `/private/tmp/polune-calendar-states-comparison.png`; a 38% ordinary date was selected successfully and updated the result.
5. Binary status consolidation — passed.
   - User feedback: all suitable dates should look like the recommended date, while green, orange, and worst-day result statuses should collapse into violet or gray.
   - Fix: added the sparkle to every 75%+ calendar date; mapped preferred and 75%+ result rows to violet; mapped neutral, caution, and low result rows to the same gray color and neutral icon.
   - Post-fix evidence: `/private/tmp/polune-binary-status-comparison.png`; a non-preferred 81% day rendered violet, and a 26% day rendered gray. Both remained selectable and updated the result.

## Remaining test gap

- Physical iPhone Safari still needs a touch check for the exact visible-browser-chrome height; the responsive implementation and short-height shell were verified locally.

final result: passed
