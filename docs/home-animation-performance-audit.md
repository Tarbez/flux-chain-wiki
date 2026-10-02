# Home animation performance audit — 2026-10-02

Scope: desktop Home mesh interactions, alignment, shared pointer motion, and navigation cleanup. The visual direction remains the existing mesh blocks responding to the five cycle steps.

## Findings and fixes

| Finding | Change |
| --- | --- |
| Two geometry reads during every animation paint | Measure the mesh crop once per interaction; precompute normalized cells and reuse them. |
| Full viewport activity canvas cleared every paint | Clear only the occupied mesh cell rectangle. |
| Painting at display refresh rate | Cap expensive canvas painting at 30 fps, preserve the 850 ms progression, and always paint the final state. |
| Unrelated scene state updates restarted a selected response | Restart only for changed motion state or invalidated geometry/theme. |
| Canvas width/height reassigned on every field redraw | Resize backing buffers only when their dimensions change. |
| Home pointer movement scheduled a second parallax loop | Skip this decorative loop on Home; cell interactions remain active. |
| Pending initial Home alignment callback survived disposal | Cancel its frame and disconnect ResizeObserver; guard disposed callbacks. |
| Repeated alignment callbacks rewrote identical CSS variables | Cache bounds and skip unchanged writes. |
| Cancelled reading frames retained a stale handle | Clear the handle immediately; hidden tabs cancel the reading producer. |

The Home cell controller cancels old runs on step switches, clears on navigation/exit, and rejects stale callbacks through a revision token. Hidden tabs stop the loop. Pause and reduced motion paint a single static state. Scene-level delegated listeners are installed once; Home mounts do not add another listener set. The original random activity timer does not run while the Home cycle panel exists.

## Verification

The deterministic test uses the production controller and a 60 Hz frame scheduler. It observed **22 canvas paints**, **two layout reads per interaction**, and **zero queued frames after completion**. Every clear was below 520 × 120 pixels rather than the 1440 × 900 viewport. It also covers pointer priority, stale callback rejection, rapid switching, navigation, pause, reduced motion, visibility and 100 start/stop cycles without queued-frame accumulation.

Browser verification at 1440 × 900 completed five Agreement → Home round trips. Each return had **two lattice canvases, one Home panel and zero continuity hosts**. The two observed 1440 × 900 RGBA backing buffers total 10,368,000 bytes (about **9.9 MiB**); this is a backing-store estimate, not total browser or GPU memory. Home remained scroll-free. These shared full-scene canvases are retained for other pages; this revision reduces painting work without changing that architecture.

Checks: `node tests/home-animation-performance.cjs`, `node tests/lattice-theme.cjs`, `node tests/routes-live.cjs`, `node tests/panel-continuity.cjs`, `node tests/scene-state.cjs`, and `git diff --check`.

## Limits

Frame and operation counts are deterministic test observations, not measured CPU percentages. Browser heap snapshots, GPU memory profiling and long-duration production traces were not available in this audit. No DOM/canvas accumulation or pending-frame accumulation was detected in the exercised scenarios; this does not prove absence of every possible JavaScript heap leak.
