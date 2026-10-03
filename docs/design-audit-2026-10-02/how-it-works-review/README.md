# How it works — three simple boxes

The user clarified that this page must not replicate Lifecycle. It now explains a job in three everyday parts: Ask for help; Agree, then do it; Check the result. All three are visible together. Technical vocabulary and the previous five-part dashboard controls are absent from the default view. The copy remains editable in the deployment manifest.

Each softly rounded box links to the relevant inner agreement page: Intent, Agreement, or Receipt. Small mesh crops animate their actual cells on hover or keyboard focus. The selected response comes from the existing Home pattern rules. The surrounding page atmosphere is restrained. The footer keeps a concise capability boundary in ordinary language.

## Verified

- Browser: three boxes and document have matching client/scroll sizes at 1280 × 720 and 1024 × 768. Primary view also reviewed at 1440 × 900.
- Keyboard focus activates the request pattern in the first mesh; clicking opens Intent, and browser history returns to the three boxes.
- Real route tests cover the three destinations, rendered editable copy, pointer/focus states, and disposal.
- Shared local mesh regression: 18 paints in a finite 650 ms response, one layout measurement at interaction start, no frame layout reads or idle loop, stale-callback cancellation, pause/reduced-motion/visibility behavior, and 100 disposal cycles without accumulated frames or subscriptions. This is a deterministic fixture, not a hardware GPU or heap profile.
- Route, panel-continuity, Home animation-performance, resolver-page, and state-layering checks pass; `git diff --check` passes.

The local mesh painter is shared with Lifecycle rather than duplicated. Lifecycle now also receives finite cell transitions on its previews. Mobile remains a later pass; no commit or publication was performed.

[Desktop view](desktop.png) · [Keyboard mesh response](focus.png)
