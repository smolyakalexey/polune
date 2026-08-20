# Design QA — iPhone 16 Pro Max adaptation

## Artifacts and normalization

- Source screenshots: the four iPhone screenshots supplied on 2026-08-20.
- Source result content crop: `/private/tmp/reference-result.png`.
- Implementation result crop: `/private/tmp/mobile-result.png`.
- Additional implementation captures: `/private/tmp/mobile-picker.png`, `/private/tmp/mobile-zodiac-raw.png`, `/private/tmp/mobile-birth.png`, `/private/tmp/mobile-transition.png`.
- Comparison viewport: `440 × 828` CSS pixels, matching the usable Safari/Telegram content region in the supplied `1320 × 2868` screenshots at 3× scale.
- States checked: start, intent picker, result with collapsed calendar, expanded calendar, zodiac step, birth-data step, reveal wave.

## Full-view comparison evidence

The supplied result screenshot and the new result capture were inspected together at the same `440 × 828` viewport. In the source, the calendar covered nearly the entire white CTA and the calendar header read as a separate grey layer. In the implementation, the CTA is fully visible directly above the calendar and the calendar uses one continuous dark-glass surface through its grabber area.

## Focused-region evidence

- **Main result:** top controls, moon, date, guidance, score, CTA and two calendar rows fit inside the visible browser viewport.
- **Intent picker:** the sheet spans all 440 px; cards and search stay inside its padding.
- **Zodiac sheet:** the sheet spans all 440 px and the 3-column grid remains centered without horizontal clipping.
- **Birth fields:** date, time and city controls occupy the available sheet width; custom calendar/time icons remain inset and no native input overflows.
- **Reveal transition:** the canvas and reel occupy the complete 440 px viewport; the radial star wave reaches both edges with no 402 px crop.
- **Expanded calendar:** its grabber is fixed to the continuous glass surface and both month grids stay within the sheet width.

## Comparison history

### Iteration 1

- [P1] The result CTA was hidden behind the collapsed calendar on the short iOS visual viewport.
- [P1] Date/time inputs used their intrinsic iOS width and overflowed the birth-data sheet.
- [P2] Bottom sheets and reveal canvas were capped at 402 px on a 440 px device.
- [P2] The calendar grabber gradient created a visibly separate top strip.
- Fixes: anchored the CTA above the calendar, added mobile viewport-specific vertical rhythm, constrained input shells and native controls, made all mobile sheets/canvas full-width, and unified the calendar surface.

### Iteration 2

- Rechecked all affected states in the in-app browser at `440 × 828`.
- No actionable P0, P1 or P2 layout defects remained.
- Production compilation and TypeScript validation completed successfully.

## Implementation checklist

- [x] full-width mobile sheets
- [x] safe birth-data input sizing
- [x] CTA visible above collapsed calendar
- [x] unified calendar glass background
- [x] full-width reveal animation
- [x] iOS visual-viewport vertical composition
- [x] production build
- [x] browser-rendered visual comparison

final result: passed
