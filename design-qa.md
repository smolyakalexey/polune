# Design QA — ближайший лучший день и адаптив по высоте

- source visual truth: `/var/folders/94/bf2s3jnx1yxg49qk4nmh71s80000gq/T/TemporaryItems/NSIRD_screencaptureui_BpdKCd/Screenshot 2026-08-21 at 01.01.13.png`
- implementation screenshot: `/Users/alexey/Documents/ChatGPT/благоприятные дни/blagopriyatny-den/design-audit/2026-08-21-preferred-height-clean.png`
- combined comparison: `/Users/alexey/Documents/ChatGPT/благоприятные дни/blagopriyatny-den/design-audit/2026-08-21-height-comparison.png`
- viewport: 419 × 847 CSS px
- source: 838 × 1694 px at 2×, normalized to 419 × 847 px
- implementation: 419 × 847 px at 1×
- state: result screen, no saved personalization, two CTA, collapsed calendar, preferred date selected

## Full-view comparison

The source showed the score row partially hidden behind the personalization CTA. In the revised implementation the result content, score row, both CTA and calendar occupy separate vertical regions. At 419 × 847 the score ends at 379 px, actions occupy 561–673 px, and the calendar starts at 703 px.

The preferred date uses the same `status-excellent` state for both the score row and selected calendar day. Other calendar dates retain their absolute score colors.

## Required fidelity surfaces

- fonts and typography: existing Onest family and weights preserved; compact-height sizes reduce without clipping or single-word overflow;
- spacing and layout rhythm: fixed action overlay replaced with a flex-reserved action region; no overlap remains at 419 × 847 or 419 × 680;
- colors and tokens: preferred date consistently uses the existing purple brand token; red/yellow/gray/green thresholds remain unchanged for non-preferred dates;
- image quality: existing moon and status assets are preserved without raster or crop changes;
- copy and content: existing result and CTA copy are unchanged.

## Focused verification

- 419 × 847: score bottom 378.6 px, two-button actions top 561 px, calendar top 703 px;
- 419 × 680: score bottom 302 px, two-button actions top 406 px, calendar top 545.9 px;
- browser console: no warnings or errors;
- preferred result: `result-score-row status-excellent`;
- preferred calendar selection: `calendar-peek-day status-excellent selected`.

## Comparison history

1. P1: absolute-positioned CTA could cover the score row on a short visual viewport.
2. Fix: mobile result card now owns the available height and actions use `margin-top: auto` in normal flex flow; stale `bottom` offsets were removed from compact breakpoints.
3. Post-fix: both two-button mobile checks have at least 104 px between score and actions and at least 16 px between actions and calendar.

## Findings

No actionable P0/P1/P2 findings remain for the requested preferred-day state or height adaptation. The intentionally more compact typography on short screens is the mechanism that keeps all required controls visible.

final result: passed
