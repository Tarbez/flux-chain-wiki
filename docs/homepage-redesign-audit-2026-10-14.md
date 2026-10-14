# DEFXN homepage: brand-preserving redesign

## Decision

Serve all three audiences without asking them to read three pitches at once. The homepage has one shared promise and one hero action; **Explore / Build / Operate** then reveals one audience's action and two supporting references. References are not removed. Their prominence follows the reader's intent.

This is a local redesign attempt, not a published launch or a claim of improved conversion. It deliberately replaces the previous zero-scroll home with a scrolling narrative. The original mesh renderer, configurable backgrounds, palette families, global motion controls, shared header, and routes remain in place.

## Audit findings and changes

| Finding | Why it matters | This attempt |
| --- | --- | --- |
| Hero, chain teaser, reference links and benchmarks all compete in one screen | A newcomer has no obvious reading order | Promise → model → audience path → explanation → evidence → questions |
| Three audiences need different destinations | Three equally loud CTA clusters dilute the shared idea | One audience panel at a time; all three selectors remain visible |
| Earlier styling removed distinctive brand material | Recognition is lost even if spacing improves | Reuse `ArkUI.createMeshFabric` and shared theme/background settings |
| Technical mechanism precedes human benefit | Visitors must already understand the product to understand the pitch | “Your identity. Your chain. One connected world.” followed by a plain-language introduction |
| Older introductory copy promises that everything becomes faster | This exceeds the measured evidence | Replace it with a scoped explanation of signed histories, resolvers and inspectable results |
| Benchmark limits are too easy to miss | Capacity can be mistaken for production traffic or end-to-end TPS | Visible scope, date, fleet size, units and methodology link |
| The previous compact home element is assumed by return navigation | Removing it can leave a stale dashboard over Home | Release the dashboard when there is no surviving compact origin; regression tested |

## Audience journeys

| Audience | First question | Main destination | Supporting references |
| --- | --- | --- | --- |
| Explorers and evaluators | What is different, and can I inspect it? | Protocol overview | Chain walkthrough; measured evidence |
| Developers and founders | What would I build on, and how? | Resolver model | Resolver catalog; source instructions |
| Operators and partners | What would I run, and what is required? | Operator/source path | Network creation; fleet measurements |

The shared hero still leads to the existing “How it works” walkthrough. Header utility links remain in the menu; Explorer and Stats no longer compete as separate home header entries. Audience selection is retained in memory when navigating away and back.

## Before a public launch

1. **Resolve the positioning vocabulary.** `docs/whitepaper.md`, `docs/deprecated.md` and `js/content/stats-highlights.js` use signed resolution and retire chain-era execution comparisons. Other overview and identity material still uses chains. This attempt explicitly distinguishes the identity/history model from execution, but the protocol owner should approve one consistent explanation across the entire site. The homepage alone cannot settle that architecture decision.
2. **Prove one complete use case.** Show a reproducible input → resolver → signed output → inspection journey with real artifacts and prerequisites. The homepage diagram is labelled illustrative; it is not a production activity feed.
3. **Make readiness verifiable.** Confirm public repository URLs, reproducible build steps, packaged downloads where available, supported environments, security boundaries, and support/contact ownership. The redesign does not imply verified binaries or a production launch.
4. **Qualify the evidence.** Keep benchmark methodology, hardware, exclusions and date alongside each headline. Hourly synthetic fleet capacity is not cumulative ledger growth, user demand, or transaction throughput. Do not turn synthetic measurements into adoption claims.
5. **Finish the destination journeys.** A clearer homepage cannot compensate for inconsistent claims on About, Chain, deployment or reference pages. Review those pages as the next bounded phase.
6. **Validate the pitch with people.** Ask representatives of each audience to explain DEFXN after reading the hero, choose their path without help, and locate evidence. Compare completion and understanding with the previous home. Add conversion analytics only after agreeing on privacy and event scope; none were added here.

## Implementation and verification

- New isolated layout: `css/home-swiss.css`; semantic content/interaction: `js/pages/home.js`.
- Hero copy remains editable through the home manifest. SEO metadata and no-JavaScript introduction match the new message.
- Benchmarks consume the existing shared evidence source; no fabricated totals, logos, testimonials, financial promises, or production activity.
- Browser checks: 1440px desktop, 805px tablet, 390px phone and 320px narrow phone. Horizontal overflow found in narrow tabs was fixed and rechecked. Light and dark Ember themes inspected; original dark preference restored.
- Interaction checks: model selection, audience click/keyboard selection, chain navigation and return, settings and theme switching.
- Automated checks: homepage tabs/model/disposal/offline response; panel continuity; resolver route contracts; fleet pulse route; page router; component contracts. Syntax and whitespace checks pass.
- Shared mesh and CSS retain pause/reduced-motion handling. Full assistive-technology, real-device, all-palette visual QA and conversion measurement are not claimed by these checks.

## Scope boundaries

No deployment, dependency additions, analytics, wallet transactions, backend changes, or new promises of production readiness. This preserves the visual identity while testing a different information hierarchy. It is not a literal one-font/one-accent Swiss reset: the established DEFXN identity, action and reference color roles take precedence over the earlier generic style brief.
