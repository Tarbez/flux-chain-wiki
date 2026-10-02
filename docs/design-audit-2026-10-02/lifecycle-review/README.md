# Lifecycle desktop redesign — 2026-10-02

The user explicitly requested the lifecycle overview and all five inner pages. This authorizes the lifecycle slice independently of the earlier Home review checkpoint.

## Delivered

- One soft, persistent dashboard for overview, Intent, Offer, Agreement, Fulfillment, and Receipt. Primary answer and next action come first.
- Existing semantic theme colors indicate selected stages, established prior steps, reference access, and limits that remain unproven. Text remains explicit without relying on hue.
- One local dense mesh illustrates the same snapshot. Hover or keyboard focus on each stage repaints its actual cells using the shared Home pattern rules and reveals that stage’s consequence. No extra cycle pictograms or unrelated rotating geometry.
- Answer, Understand why, and Evidence replace one another. Inner facts show one answer at a time. Capability boundaries remain visible in every depth.
- Stage routes retain the continuous opaque panel. Canonical evidence opens the source reader and returns to the originating stage.
- Local mesh paints on entry, stage preview, resize, and theme changes; it has no idle frame loop. Resize and theme observers disconnect on page disposal.

## Verification

All six default views fit 1280 × 720; overview and Agreement were also visually checked at 1440 × 900. All six initial Context views at 1280 × 720 have matching client/scroll heights (91–121 px) and a 1280 × 720 document. Existing desktop tests cover persistent source identity, opaque geometry, interrupted transitions, reduced motion, and focus return. Browser checks covered stage keyboard preview, a single local mesh canvas, and canonical source/return navigation.

`routes-live.cjs` now exercises lifecycle depth, selected facts, canonical evidence route, and retained boundaries across all six pages. Route, panel-continuity, state-layering, lattice-theme, and Home animation-performance tests pass. Home performance fixture remains 22 bounded paints, two layout reads, and 100 cleanup cycles. These are deterministic regressions, not a GPU or heap profile.

Screenshots: [Overview](overview.png), [Agreement](agreement.png), [Context at 1280 × 720](context.png). The theme shown is the existing test tab’s theme.

Mobile remains the final pass. Other site families are outside this completed slice and still require review. No commit, publication, or deployment was performed.
