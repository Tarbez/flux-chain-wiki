# Public-site state and layer system

This contract applies the Slate interaction laws to the Flux Protocol public site. It prevents navigation, transition art, explanation, and evidence from competing for attention.

## Route transition visibility

- Mount incoming content hidden and inert. Never use a route-style change to conceal the outgoing page.
- Finish outgoing semantic content under its own route styles, then dispose it before updating scene state. A selected panel can leave that root and remain in the shared shell as the next dashboard; its lifetime is separate from its contents.
- Keep the grid/mesh transition, but do not carry readable outgoing cards into the new route's layout. A partial hide of only the hero is insufficient.
- Presence can fade disposable content roots, including their complete inner material. Never fade the retained panel host. Its measured position, dimensions, and soft boundary change continuously. Inner contents may fade during replacement.
- Restore scroll before the incoming page's first visible animation frame, not after the entrance completes.
- Interrupted navigation must dispose of stale pages and retain the latest requested route. Hidden inner panels remain excluded from entry animations.

`tests/panel-continuity.cjs` proves selected-box identity, non-opacity geometry, child-content replacement, reverse return/focus, direct-link layout, and interrupted retargeting. Browser checks still establish clipping, readability, and perceived continuity.

`tests/page-router.cjs` checks the handoff boundary against every catalog route and uses a deferred exit to prove that scene styles cannot change before the outgoing exit resolves.

## Content depth

The route hierarchy has three depths:

1. **Focus** — home, overview, and operating-model routes answer one visitor question and offer one next movement. The overview's supporting model is a named Context disclosure rather than an undifferentiated scroll.
2. **Context** — a mechanism route answers its named question directly. `How it works` opens a focused interactive level with selectable steps and one answer at a time.
3. **Inner detail** — a stage route or `Evidence & limits` level holds implementation anatomy, limitations, and evidence links. It never repeats the parent page's full introduction.

The agreement-cycle panel expands into the lifecycle dashboard and contracts on parent return. Direct links show its final frame immediately. The lifecycle uses real inner routes: `/lifecycle` is the context overview and `/lifecycle/{stage}` is the stage detail, with selectable facts. Mechanism sheets use three explicit inner states within each route. Inactive panels are hidden and inert. Escape returns to the core idea; returning to a mechanism restores its selected level and detail for the session. Semantic `details` elements are the fallback before enhancement.

## Claim stack

Every mechanism surface preserves the Slate claim stack:

- **Primary:** the page question and direct answer are visible without interaction.
- **Complement:** current status and the explicit non-capability boundary remain visible beside that answer.
- **Reference:** deeper mechanics, limitations, and canonical evidence are available through a clearly named disclosure or inner route.

Collapsing reference material must never hide the current status label or turn an unverified claim into visual certainty.

## Runtime layers

The persistent scene has separate responsibilities:

- the persistent canvas is atmosphere and transition context;
- the route outlet owns ordinary pages and stages incoming contents; a retained panel host owns the current lifecycle dashboard contents after handoff;
- the header navigation is a temporary overlay and disappears when focus resumes.

Only one semantic layer may be readable and interactive at a time. During lifecycle navigation, the grid may move as atmosphere but the old canvas labels remain invisible. The route page owns reading and scrolling from the moment it mounts.

## Information-overload gate

A changed page fails this system when it:

- displays parent, child, and reference copy as one undifferentiated scroll;
- exposes more than one primary movement above the first disclosure;
- leaves transition labels visible over route content;
- repeats full stage detail on both an overview and its inner route;
- makes supporting atmosphere compete with body text;
- requires navigation to understand what layer the reader is in.

The minimum automated contract lives in `tests/state-layering.cjs`; browser inspection remains required for overlap, clipping, focus order, and transition completion.

## Batch 4 visual and interaction direction

The supplied reference images inform fine construction lines, concentric geometry, sparse accent color, generous spacing, and diagrams that respond to hover and keyboard focus. The shared field changes framing during route and inner-state changes. It remains decorative; it must never take focus or pretend to show live network activity.

Home gives the explanation and operator CTA priority. The operating model presents three mechanism entry cards with code-drawn illustrations. Mechanism levels retain a visible status label. Motion respects both reduced-motion preferences and the existing pause state.
