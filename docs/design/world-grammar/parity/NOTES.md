## Measurements that are not in a sweep file

These numbers come from the batch reports of 2026-10-30. Each one names its source. They are evidence: append new entries, and never rewrite old ones.

### How the share of pixels changed during the port (pixels over 24, Three.js against the grammar world)

Source: PORT.md progress log, batches 1 to 4 and the home fix.

| Route | First grammar picture | After its batch | Final sweep (sweep6) |
|---|---|---|---|
| /chain | 8.86% | 4.71% | see sweep6 |
| /chain/record | 3.56% | 2.33% | see sweep6 |
| /chain/open | 2.47% | 2.00% | see sweep6 |
| /chain/links | 4.33% | 2.99% | see sweep6 |
| /ring | 7.35% | 4.45% | see sweep6 |
| /auth | 19.77% | 15.93% | see sweep6 |
| /?preview (home) | 12.43% | 2.99% | see sweep6 |
| /account | 5.44% | 5.38% | see sweep6 |
| /fxn | 9.78% | 9.78% | see sweep6 |

- Home rose from 2.99% to 8.74% during batches 2 and 3. The cause was not found, because the batch 1 state was not kept. The home fix brought it to 7.61%.
- Three.js's home does not stop in the same place each run. The same grammar picture scored 7.6% and 12.7% against two Three.js runs. Since sweep6, world-parity waits 6 s (SETTLE_MS) before it takes a picture.
- /stats/now scored 3.1% once and 0.68% on two re-runs. Treat 3.1% as a flake.

### One engine regression, found and fixed

Source: the /chain trace report, 2026-10-30.

- When the renderer moved into fxn-3d engine/render, pieces.mjs did not set `uEnvDiff`. Pieces got 0 diffuse room light.
- /chain went from 4.67% to 7.15%. /chain/links went from 2.96% to 3.79%. /auth went from 15.93% to 16.04%.
- With the fix in engine/render/program.mjs: /chain 4.67%, /chain/links 2.96%, /auth 15.93%.

### NFT card (Three.js art3d.js against js/nft/card-gl.mjs)

Source: PORT.md, NFT card result.

- At rest: mean abs diff 1.27 to 1.41, and 0.46% to 1.57% of pixels over 24.
- Steady paint on the Apple GPU (ABAB runs): card 27 10.3 ms against 10.5 ms, card 263 9.0 ms against 8.8 ms, card 512 10.8 ms against 11.0 ms. These are equal within timer noise.
- First paint: 37 to 50 ms with card-gl, 116 to 160 ms with Three.js. That is about 3 times faster.
- A first reading showed card-gl 20% to 30% slower. That reading was from software GL, not the GPU.

### Bytes

Sources: the Three.js removal plan and the compression report, 2026-10-30.

- Three.js library, js/vendor/three-r180-defxn.js: 723,874 bytes.
- The Three.js scene files in js/world/: 492,668 bytes in total.
- About 1.2 MB of JavaScript leaves the served site when Three.js is removed. A visitor on the default path already saves it, because the grammar world does not load Three.js.
- One load of / with the grammar world as default: 196 requests, none of them Three.js. The same load with ?world=1 also fetches the library and all 18 scene files.
- Cold load of / on the local server: 5,031,693 bytes uncompressed, 2,449,577 bytes with gzip (51% less). /chain: 5,315,624 bytes, then 2,513,644 bytes (53% less). Measured on this Mac over loopback, WebKit, 3 runs. Loopback time did not change: about 1.23 s both ways.

### The move into fxn-3d (F16)

Source: the fxn-3d session's F16 step 1 report, 2026-10-30.

- 30 of 30 sweep6 routes: largest channel difference 0 between defxn's own world2-gl and the fxn-3d world look.
- 29 of 30 pictures are byte-identical to sweep6. /download?step=0 differs by 51,575 pixels in both the old and the new renderer, because the site changed after sweep6.
- Card parity (27, 263): identical. GPU pick on /chain: 630 points, 0 differ.
- First frame median: 1,232 ms with world2-gl, 1,091 ms with the fxn-3d world look.

### 2026-10-30, sweep 7: tones 20 and 21 in the engine (F16 switch)

The fxn-3d engine now holds 22 tones, so tone 20 (danger) and 21 (drift, the honey of the identity Partial edge) draw in their own colours where the old renderer clamped them to primary300. Source: the F16 switch run, grammar picture from the old adapter against the engine adapter, 1440x900, WebKit, software GL, same site and server.
- Old against new, 30 routes: 25 routes with 0 differing pixels; routes `/?preview`, `/download?step=4` and `/stats/capabilities` differ by 190k to 480k pixels in one run and by 0 in a rerun (the capture lands on one of two states of the same page; the new renderer alternated between them across 5 reruns), and `/how-it-works?s=3` differs by 47 pixels of 1 level.
- `/identity/safe`: 658 pixels differ (largest channel 55) inside x 298 to 599, y 286 to 581. The cause is the host reading tone 21 from `--drift` instead of `--state-partial`, which no theme defines. The engine change alone gave 0.
- Resolved colours on `/auth`: `--danger` is HSL 349 99% 76.3% (RGB 254, 135, 157); `--drift` is HSL 53 100% 39.4% (RGB 201, 177, 0). The default theme sheet defines `--drift` as HSL 38 60% 62%. Both come from the theme, not from the hex fallbacks.

### 2026-10-30, sweep 8: the stale world fit, and the sweep after Three.js

The world drew 3 to 8% too big on home and sometimes shifted, and it stayed that way. The cause: the host measured the page's boxes once (a ResizeObserver on the layer and one fonts.ready) and the page moves them afterwards. Home's `.rail` rises in through the Web Animations API from left 1078.4 to 1022.4 px over about 700 ms, which fires no ResizeObserver, transitionend or animationend. The frame was fitted to wherever the rail stood at that moment: frame width 774 (and 768.2, 770.1 and others in other runs) instead of the settled 692.8. The site panes (`world2-sites.mjs`) read the same rail and header and had the same defect. `/stats` read pt and pb at fonts.ready while `.ws-legend` rose (pb 1 to 17 px); its camera dist came out 87.45, 87.04 or 86.49.
- Fix, in `js/world2/world2-host.mjs`: every box the frame reads goes through `rect()` or `touch()`, so the set of elements the fit depends on is derived from the frame functions, not listed. After a measurement the host asks each read element, and its ancestors, for `getAnimations()` and waits once on each `finished` promise. It also listens for transitionend and animationend on those elements. Either one runs the existing `refit()`, which glides on the 240 ms camera tween, and re-measures the site panes. No timer and no rAF loop is left running. `refit()` now covers every view, not only the chain family. `world2-sites.mjs` marks its own measured elements through `watch()`. `js/pages/world-stats.js` arms the same way on its stage, key readings and legend.
- Before: `/?preview` gave 3 distinct pictures in 12 captures (frame width 774, 768.2, 770.1); `/download?step=4` and `/stats/capabilities` each gave an odd picture in some runs. After: 8 of 8 captures byte-identical on `/?preview`, `/stats/capabilities` and `/download?step=4`, 4 of the 8 taken under four `yes` processes. Home's frame is 437.7, 167.1, 692.8, 502.6 in every capture.
- Home was never in the old reference as a stable picture; `/?preview` is expected to differ from sweep 7 now (8.34% of pixels over 24, mean 6.725) because of the new radio.fxn panes and the corrected fit. The sweep 8 picture is the new reference for home.
- `/auth` (2.74% against sweep 7) and `/stats/now` (3.3%, camera diff 0.12): both are 0 pixels now. `/stats/now` was this fit bug (dist now 42.063 against the frozen 42.064). `/auth` is 0 with and without the fix, three runs each, so the fit did not cause it; the uncommitted `js/pages/auth.js`, `css/auth.css` and `js/nft/*` edits of another session were changing the page while the first run was taken. Not our change, left alone.
- Sweep 8: 30 routes, 29 with 0 differing pixels against the sweep 7 grammar pictures; `/?preview` is the one that differs. `/stats/now` logs one console 502 from `/api/fleet-pulse`; it does not change the picture. `scripts/world-parity-log.mjs` writes "removed" for the Three.js columns a frozen-mode sweep no longer has, never 0.
