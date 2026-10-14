# Living mesh and restored hero

This iteration follows the request for more visible background animation, a less mechanical homepage, and restoration of the earlier hero illustration.

## What changed

- All seven backgrounds use distinct, full-field arrangements. Their motion follows the arrangement: traveling waves, stepped traces, horizontal layers, node ripples and expanding frames.
- Waves last 3.2 seconds with a configurable rest. New preferences enable animation; explicitly saved opt-outs remain unchanged. Global pause, tab visibility and reduced motion stop scheduling.
- The background is behind the page rather than painted over its text, buttons and cards. Tiny decorative pseudo-data is gone. Major grid lines and meaningful cell clusters replace the uniformly dense graph-paper treatment.
- Cached canvas paths batch static geometry and moving opacity bands. Animation is capped at 30 paints/second with no per-frame layout reads.
- Homepage framing is less rigid: fewer numbered labels, softer controls, more conversational section headings and more varied spacing. The Explore / Build / Operate routes remain.
- The original `buildChainFlow` illustration is restored instead of the replacement three-card model. Its five stages remain Sign, Check, Extend, Replicate and Resolve.
- A homepage-only rich mode adds layered parallel histories and a connected twelve-peer replication diagram. Nine peers are filled in the illustrative replication state; the other three remain unfilled. The narration now uses the same count.
- Four illustrative cases are selectable. Hero stage buttons explore in place; the dedicated chain page retains its existing onward links. The hero stops scheduling when outside the viewport and disposes its observers and timers when replaced.

## Boundaries

This illustrates the existing identity-chain story, not live network activity or a new claim about the current signed-resolution execution architecture. The background is decorative. No adoption metrics, production-readiness claims or external publication were added.

## Checks

Automated checks cover the restored scene, rich-mode controls, partial replication, audience selection, example replacement/disposal, seven pattern arrangements and mid-wave changes, batched rendering, saved preference handling, pause/reduced/hidden states, routing, panel return and shared theme/component contracts.

The shared backgrounds affect all routes; the layout and copy refresh is scoped to the homepage. A complete redesign of every destination page is not claimed.
