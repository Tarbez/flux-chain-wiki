# Three.js against fxn-3d: measured

This file is written by `node scripts/world-parity-log.mjs` from the raw sweeps in `parity/`. Do not edit it by hand. To add a sweep, save the output of `scripts/world-parity.mjs` in `parity/<date>-<name>.txt` and run the script again.

How each sweep was measured:
- The machine: this Mac (8 GB), loopback to `scripts/serve-site.mjs`.
- The browser: WebKit in Playwright, with software GL, at 1440x900.
- Held constant: the same site files and the same machine. Both sides run in the same sweep.
- Frame time is the median of 40 forced redraws, each ended by gl.finish and a one-pixel readback. It is the draw cost, not the display's refresh.
- First frame is the time from navigation start until the canvas shows.
- Pixels over 24 is the share of pixels whose largest channel differs by more than 24 of 255.
- Other jobs on the machine change the speed numbers. Compare the two sides from the same sweep only.

Pictures for each route are in the `parity/png-<date>-<name>/` folder of the same sweep (`<route>-three.png` and `<route>-grammar.png`). After Three.js is removed, these pictures are the only reference.

## 2026-10-30-sweep6-world2gl

- Routes: 30. Camera diff 0 on 29 of 30.
- Median first frame: Three.js 1983 ms, fxn-3d 1179 ms.
- Median frame time: Three.js 6 ms, fxn-3d 2 ms.
- Median share of pixels over 24 (fxn-3d against Three.js): 2.87%.
- Routes with 0 page errors on the fxn-3d side: 29 of 30.
- Camera diff not 0: /stats/now (0.12).
- Errors on /stats/now: Three.js "console: Failed to load resource: the server responded with a status of 502 (Bad Gateway)"; fxn-3d "console: Failed to load resource: the server responded with a status of 502 (Bad Gateway)".

| Route | Camera diff | Pixels over 24 | Mean abs diff | Over 24 against frozen grammar picture | First frame Three.js | First frame fxn-3d | Frame Three.js | Frame fxn-3d | Errors Three.js / fxn-3d |
|---|---|---|---|---|---|---|---|---|---|
| /intro | 0 | 2.92% | 1.182 | removed | 1840ms | 1125ms | 6ms | 2ms | 0 / 0 |
| /?preview | 0 | 7.61% | 3.721 | removed | 1769ms | 1443ms | 7ms | 2ms | 0 / 0 |
| /about | 0 | 4.53% | 3.123 | removed | 2009ms | 1068ms | 6ms | 2ms | 0 / 0 |
| /chain | 0 | 3.75% | 3.402 | removed | 1994ms | 1124ms | 6ms | 3ms | 0 / 0 |
| /chain/record | 0 | 2.19% | 3.136 | removed | 1979ms | 1132ms | 6ms | 2ms | 0 / 0 |
| /chain/open | 0 | 1.97% | 4.354 | removed | 2064ms | 1128ms | 5ms | 2ms | 0 / 0 |
| /chain/links | 0 | 2.65% | 3.001 | removed | 1958ms | 1147ms | 7ms | 3ms | 0 / 0 |
| /ring | 0 | 4.39% | 3.845 | removed | 2060ms | 1105ms | 6ms | 3ms | 0 / 0 |
| /auth | 0 | 10.78% | 7.607 | removed | 2207ms | 1246ms | 8ms | 3ms | 0 / 0 |
| /identity | 0 | 0.28% | 1.56 | removed | 1947ms | 1194ms | 6ms | 3ms | 0 / 0 |
| /identity/sign | 0 | 0.29% | 1.33 | removed | 1951ms | 1252ms | 5ms | 2ms | 0 / 0 |
| /identity/safe | 0 | 1.01% | 1.918 | removed | 1977ms | 1236ms | 6ms | 3ms | 0 / 0 |
| /identity/you | 0 | 1.36% | 2.045 | removed | 1998ms | 1215ms | 5ms | 2ms | 0 / 0 |
| /account | 0 | 3.06% | 2.186 | removed | 1979ms | 1200ms | 6ms | 3ms | 0 / 0 |
| /how-it-works?s=1 | 0 | 3.03% | 3.152 | removed | 1980ms | 1408ms | 6ms | 2ms | 0 / 0 |
| /how-it-works?s=3 | 0 | 3.54% | 3.516 | removed | 1752ms | 1414ms | 7ms | 2ms | 0 / 0 |
| /how-it-works?s=4 | 0 | 5.61% | 4.512 | removed | 1985ms | 1463ms | 6ms | 2ms | 0 / 0 |
| /how-it-works?s=5 | 0 | 3.62% | 3.662 | removed | 1964ms | 1407ms | 6ms | 2ms | 0 / 0 |
| /how-it-works?s=9 | 0 | 2.82% | 2.915 | removed | 1963ms | 1505ms | 7ms | 2ms | 0 / 0 |
| /how-it-works/resolve | 0 | 3.17% | 3.322 | removed | 2005ms | 1149ms | 7ms | 4ms | 0 / 0 |
| /how-it-works/layers | 0 | 1.72% | 2.635 | removed | 1967ms | 1176ms | 7ms | 2ms | 0 / 0 |
| /how-it-works/life | 0 | 0.12% | 1.717 | removed | 2025ms | 1097ms | 6ms | 2ms | 0 / 0 |
| /trace | 0 | 4.57% | 4.126 | removed | 1976ms | 1162ms | 7ms | 2ms | 0 / 0 |
| /resolvers | 0 | 0.82% | 2.447 | removed | 2041ms | 1121ms | 8ms | 4ms | 0 / 0 |
| /fxn | 0 | 5.53% | 6.115 | removed | 2030ms | 1166ms | 7ms | 4ms | 0 / 0 |
| /stats/now | 0.12 | 3.1% | 3.704 | removed | 2038ms | 1182ms | 8ms | 5ms | 1 / 1 |
| /stats/capabilities | 0 | 2.03% | 3.037 | removed | 2044ms | 1160ms | 9ms | 6ms | 0 / 0 |
| /stats/ceiling | 0 | 0.15% | 2.09 | removed | 1768ms | 1168ms | 8ms | 3ms | 0 / 0 |
| /download?step=0 | 0 | 2.42% | 1.982 | removed | 2050ms | 1536ms | 0ms | 2ms | 0 / 0 |
| /download?step=4 | 0 | 0.6% | 0.42 | removed | 2182ms | 1528ms | 0ms | 2ms | 0 / 0 |

## 2026-10-30-sweep7-fxn3d-engine

- Routes: 30. Camera diff 0 on 30 of 30.
- Median first frame: Three.js 2470 ms, fxn-3d 1792 ms.
- Median frame time: Three.js 8 ms, fxn-3d 3 ms.
- Median share of pixels over 24 (fxn-3d against Three.js): 2.73%.
- Routes with 0 page errors on the fxn-3d side: 29 of 30.
- Errors on /stats/now: Three.js "console: Failed to load resource: the server responded with a status of 502 (Bad Gateway)"; fxn-3d "console: Failed to load resource: the server responded with a status of 502 (Bad Gateway)".

| Route | Camera diff | Pixels over 24 | Mean abs diff | Over 24 against frozen grammar picture | First frame Three.js | First frame fxn-3d | Frame Three.js | Frame fxn-3d | Errors Three.js / fxn-3d |
|---|---|---|---|---|---|---|---|---|---|
| /intro | 0 | 2.92% | 1.182 | removed | 4261ms | 4703ms | 10ms | 6ms | 0 / 0 |
| /?preview | 0 | 11.14% | 7.06 | removed | 2833ms | 2939ms | 7ms | 2ms | 0 / 0 |
| /about | 0 | 4.53% | 3.123 | removed | 2110ms | 2045ms | 11ms | 2ms | 0 / 0 |
| /chain | 0 | 3.75% | 3.402 | removed | 2712ms | 3147ms | 7ms | 3ms | 0 / 0 |
| /chain/record | 0 | 2.19% | 3.136 | removed | 3010ms | 1274ms | 10ms | 3ms | 0 / 0 |
| /chain/open | 0 | 1.97% | 4.354 | removed | 3268ms | 1695ms | 6ms | 2ms | 0 / 0 |
| /chain/links | 0 | 2.65% | 3.001 | removed | 2740ms | 1717ms | 8ms | 3ms | 0 / 0 |
| /ring | 0 | 4.39% | 3.845 | removed | 2435ms | 1779ms | 10ms | 3ms | 0 / 0 |
| /auth | 0 | 10.78% | 7.607 | removed | 2979ms | 1380ms | 10ms | 3ms | 0 / 0 |
| /identity | 0 | 0.28% | 1.56 | removed | 2199ms | 2130ms | 8ms | 2ms | 0 / 0 |
| /identity/sign | 0 | 0.29% | 1.33 | removed | 2154ms | 1380ms | 7ms | 2ms | 0 / 0 |
| /identity/safe | 0 | 1.03% | 1.929 | removed | 2311ms | 2176ms | 8ms | 3ms | 0 / 0 |
| /identity/you | 0 | 1.36% | 2.045 | removed | 2995ms | 2232ms | 8ms | 3ms | 0 / 0 |
| /account | 0 | 3.06% | 2.186 | removed | 3824ms | 1249ms | 6ms | 2ms | 0 / 0 |
| /how-it-works?s=1 | 0 | 3.03% | 3.152 | removed | 2131ms | 1548ms | 7ms | 3ms | 0 / 0 |
| /how-it-works?s=3 | 0 | 3.54% | 3.516 | removed | 2220ms | 1594ms | 7ms | 3ms | 0 / 0 |
| /how-it-works?s=4 | 0 | 5.61% | 4.512 | removed | 2297ms | 1621ms | 7ms | 3ms | 0 / 0 |
| /how-it-works?s=5 | 0 | 3.62% | 3.662 | removed | 2062ms | 1458ms | 8ms | 3ms | 0 / 0 |
| /how-it-works?s=9 | 0 | 2.82% | 2.915 | removed | 2856ms | 1875ms | 8ms | 3ms | 0 / 0 |
| /how-it-works/resolve | 0 | 3.17% | 3.322 | removed | 3798ms | 1871ms | 10ms | 3ms | 0 / 0 |
| /how-it-works/layers | 0 | 1.72% | 2.635 | removed | 2505ms | 2509ms | 8ms | 3ms | 0 / 0 |
| /how-it-works/life | 0 | 0.12% | 1.717 | removed | 2204ms | 2315ms | 7ms | 3ms | 0 / 0 |
| /trace | 0 | 4.57% | 4.126 | removed | 2913ms | 1804ms | 10ms | 5ms | 0 / 0 |
| /resolvers | 0 | 0.82% | 2.447 | removed | 3910ms | 1490ms | 7ms | 3ms | 0 / 0 |
| /fxn | 0 | 5.53% | 6.115 | removed | 2173ms | 1596ms | 8ms | 3ms | 0 / 0 |
| /stats/now | 0 | 0.68% | 2.354 | removed | 2234ms | 1262ms | 10ms | 4ms | 1 / 1 |
| /stats/capabilities | 0 | 2.03% | 3.037 | removed | 2307ms | 2620ms | 12ms | 4ms | 0 / 0 |
| /stats/ceiling | 0 | 0.15% | 2.09 | removed | 2851ms | 2727ms | 10ms | 4ms | 0 / 0 |
| /download?step=0 | 0 | 1.39% | 0.902 | removed | 2275ms | 1739ms | 0ms | 2ms | 0 / 0 |
| /download?step=4 | 0 | 1.41% | 1.139 | removed | 2252ms | 2285ms | 0ms | 7ms | 0 / 0 |

## 2026-10-30-sweep8-after-removal

- Routes: 30. Camera diff 0 on 22 of 30.
- Median first frame: Three.js removed, fxn-3d 1478 ms.
- Median frame time: Three.js removed, fxn-3d 3 ms.
- Median share of pixels over 24 (fxn-3d against Three.js): 2.73%.
- Routes with 0 page errors on the fxn-3d side: 29 of 30.
- Camera diff not 0: /identity (0.001).
- Camera diff not 0: /identity/sign (0.001).
- Camera diff not 0: /identity/safe (0.001).
- Camera diff not 0: /identity/you (0.001).
- Camera diff not 0: /how-it-works?s=1 (0.001).
- Camera diff not 0: /how-it-works/resolve (0.001).
- Camera diff not 0: /stats/now (0.001).
- Camera diff not 0: /download?step=4 (0.001).
- Errors on /stats/now: Three.js "removed"; fxn-3d "console: Failed to load resource: the server responded with a status of 502 (Bad Gateway)".

| Route | Camera diff | Pixels over 24 | Mean abs diff | Over 24 against frozen grammar picture | First frame Three.js | First frame fxn-3d | Frame Three.js | Frame fxn-3d | Errors Three.js / fxn-3d |
|---|---|---|---|---|---|---|---|---|---|
| /intro | 0 | 2.92% | 1.182 | 0% | removed | 1271ms | removed | 2ms (grammar world alone) | removed / 0 |
| /?preview | 0 | 12.78% | 7.88 | 8.34% | removed | 1210ms | removed | 2ms (grammar world alone) | removed / 0 |
| /about | 0 | 4.53% | 3.123 | 0% | removed | 1199ms | removed | 2ms (grammar world alone) | removed / 0 |
| /chain | 0 | 3.75% | 3.402 | 0% | removed | 1466ms | removed | 3ms (grammar world alone) | removed / 0 |
| /chain/record | 0 | 2.19% | 3.136 | 0% | removed | 1171ms | removed | 3ms (grammar world alone) | removed / 0 |
| /chain/open | 0 | 1.97% | 4.354 | 0% | removed | 1602ms | removed | 2ms (grammar world alone) | removed / 0 |
| /chain/links | 0 | 2.65% | 3.001 | 0% | removed | 1636ms | removed | 3ms (grammar world alone) | removed / 0 |
| /ring | 0 | 4.39% | 3.845 | 0% | removed | 1631ms | removed | 2ms (grammar world alone) | removed / 0 |
| /auth | 0 | 10.78% | 7.607 | 0% | removed | 1150ms | removed | 3ms (grammar world alone) | removed / 0 |
| /identity | 0.001 | 0.28% | 1.56 | 0% | removed | 1213ms | removed | 2ms (grammar world alone) | removed / 0 |
| /identity/sign | 0.001 | 0.29% | 1.33 | 0% | removed | 1637ms | removed | 2ms (grammar world alone) | removed / 0 |
| /identity/safe | 0.001 | 1.03% | 1.929 | 0% | removed | 1523ms | removed | 3ms (grammar world alone) | removed / 0 |
| /identity/you | 0.001 | 1.36% | 2.045 | 0% | removed | 1570ms | removed | 2ms (grammar world alone) | removed / 0 |
| /account | 0 | 3.06% | 2.186 | 0% | removed | 1177ms | removed | 2ms (grammar world alone) | removed / 0 |
| /how-it-works?s=1 | 0.001 | 3.03% | 3.152 | 0% | removed | 1390ms | removed | 3ms (grammar world alone) | removed / 0 |
| /how-it-works?s=3 | 0 | 3.54% | 3.516 | 0% | removed | 1408ms | removed | 3ms (grammar world alone) | removed / 0 |
| /how-it-works?s=4 | 0 | 5.61% | 4.512 | 0% | removed | 1371ms | removed | 3ms (grammar world alone) | removed / 0 |
| /how-it-works?s=5 | 0 | 3.62% | 3.662 | 0% | removed | 1454ms | removed | 2ms (grammar world alone) | removed / 0 |
| /how-it-works?s=9 | 0 | 2.82% | 2.915 | 0% | removed | 1657ms | removed | 3ms (grammar world alone) | removed / 0 |
| /how-it-works/resolve | 0.001 | 3.17% | 3.322 | 0% | removed | 1588ms | removed | 3ms (grammar world alone) | removed / 0 |
| /how-it-works/layers | 0 | 1.72% | 2.635 | 0% | removed | 1473ms | removed | 3ms (grammar world alone) | removed / 0 |
| /how-it-works/life | 0 | 0.12% | 1.717 | 0% | removed | 1513ms | removed | 2ms (grammar world alone) | removed / 0 |
| /trace | 0 | 4.57% | 4.126 | 0% | removed | 1280ms | removed | 3ms (grammar world alone) | removed / 0 |
| /resolvers | 0 | 0.82% | 2.447 | 0% | removed | 1775ms | removed | 3ms (grammar world alone) | removed / 0 |
| /fxn | 0 | 5.53% | 6.115 | 0% | removed | 1543ms | removed | 3ms (grammar world alone) | removed / 0 |
| /stats/now | 0.001 | 0.68% | 2.354 | 0% | removed | 1721ms | removed | 4ms (grammar world alone) | removed / 1 |
| /stats/capabilities | 0 | 2.03% | 3.037 | 0% | removed | 1563ms | removed | 3ms (grammar world alone) | removed / 0 |
| /stats/ceiling | 0 | 0.15% | 2.09 | 0% | removed | 1589ms | removed | 4ms (grammar world alone) | removed / 0 |
| /download?step=0 | 0 | 1.39% | 0.902 | 0% | removed | 1482ms | removed | 2ms (grammar world alone) | removed / 0 |
| /download?step=4 | 0.001 | 1.41% | 1.139 | 0% | removed | 1435ms | removed | 2ms (grammar world alone) | removed / 0 |

## Three.js gate

Newest run: `2026-10-30-gate-2.txt` (2 run(s) saved). Written by `scripts/threejs-gate.mjs`; it exits 1 while anything uses Three.js.

- `gate=static files_scanned=1363 files_using_threejs=21 files_mentioning_only=34`
- `gate=dynamic pages=138 pages_loading_threejs=5`
- `gate=result static_files=21 dynamic_pages=5 exit=1`

Pages that load Three.js (5): `/docs/home-redesign/chain.html`, `/docs/home-redesign/grid-look/index.html`, `/docs/home-redesign/home-mockup.html`, `/docs/home-redesign/record-open.html`, `/docs/home-redesign/record.html`.

Files that use Three.js (21): `docs/home-redesign/grid-look/grid-look.js`, `docs/home-redesign/grid-look/index.html`, `docs/home-redesign/home-mockup.html`, `js/vendor/three-r180-defxn.js`, `js/world/auth-stage.js`, `js/world/chain-marks.js`, `js/world/chains-scene.js`, `js/world/concept-stages.js`, `js/world/download-stage.js`, `js/world/glass-kit.js`, `js/world/home-descent.js`, `js/world/home-helix.js`, `js/world/home-sites.js`, `js/world/identity-stages.js`, `js/world/kit-stage.js`, `js/world/object-kit.js`, `js/world/record-glass.js`, `js/world/ring-kit.js`, `js/world/stages.js`, `js/world/stats-stage.js`, `js/world/world-host.js`.

## Motion, Three.js against fxn-3d

Written by `scripts/world-motion.mjs` from `motion/<date>-<name>/motion.txt`. Real Chrome, 1440x900, video analysed at 12 frames per second; a frame moves when more than 0.2% of its pixels change by more than 12 grey levels. Start and stop are milliseconds from the start of the segment. The video clock starts when the page opens, so a segment edge can be 0.3 s off.

### 2026-10-30-auth

Page /auth: 12 segments; moving on Three.js 11, on fxn-3d 12; flagged 7.

| Seg | Action | At (s) | Three.js start/stop/moving ms | fxn-3d start/stop/moving ms | Flag |
|---|---|---|---|---|---|
| 1 | `first-visit` | 0.0-8.1s | 250/5083/4250 | 83/3500/2250 | TIME-DIFFERS |
| 2 | `hover:396,417` | 8.1-9.9s | 667/917/250 | 667/1083/500 | TIME-DIFFERS |
| 3 | `hover:231,540` | 9.9-11.5s | 1000/1167/167 | 917/1333/500 | ONLY-FXN3D |
| 4 | `hover:561,540` | 11.5-13.1s | 1333/1500/250 | 1167/1583/500 | TIME-DIFFERS |
| 8 | `back:/` | 25.9-29.5s | 3083/3500/500 | 2250/3417/1250 | TIME-DIFFERS |
| 11 | `go:/explore` | 37.8-42.5s | 1083/2000/1000 | 0/4583/1917 | TIME-DIFFERS |
| 12 | `back:/explore` | 42.5-46.4s | 250/917/750 | 3417/3667/333 | TIME-DIFFERS |

### 2026-10-30-chain

Page /chain: 12 segments; moving on Three.js 12, on fxn-3d 11; flagged 6.

| Seg | Action | At (s) | Three.js start/stop/moving ms | fxn-3d start/stop/moving ms | Flag |
|---|---|---|---|---|---|
| 1 | `first-visit` | 0.0-8.3s | 500/6833/667 | 167/3167/1333 | TIME-DIFFERS |
| 3 | `hover:552,813` | 10.3-12.0s | 0/1250/917 | none/none/0 | ONLY-THREE |
| 4 | `hover:1108,382` | 12.0-13.7s | 83/333/333 | 1083/1500/500 | TIME-DIFFERS |
| 6 | `back:/` | 18.7-22.8s | 3000/3167/250 | 1667/3500/1917 | TIME-DIFFERS |
| 10 | `back:/chain/record` | 36.6-40.2s | 3250/3583/333 | 3083/3500/500 | TIME-DIFFERS |
| 12 | `back:/download` | 46.0-50.1s | 0/3333/833 | 0/500/417 | TIME-DIFFERS |

### 2026-10-30-home

Page /: 11 segments; moving on Three.js 10, on fxn-3d 10; flagged 3.

| Seg | Action | At (s) | Three.js start/stop/moving ms | fxn-3d start/stop/moving ms | Flag |
|---|---|---|---|---|---|
| 8 | `go:/resolvers` | 27.4-32.0s | 0/4250/2250 | 2250/4417/1000 | TIME-DIFFERS |
| 10 | `go:/resolutions` | 35.5-40.0s | 0/4250/1667 | 2250/3750/583 | TIME-DIFFERS |
| 11 | `back:/resolutions` | 40.0-43.6s | 3083/3417/417 | 2083/3500/1333 | TIME-DIFFERS |

### 2026-10-30-home-mockup

Page /docs/home-redesign/home-mockup.html: 26 segments; moving on Three.js 25, on fxn-3d 26; flagged 15.

| Seg | Action | At (s) | Three.js start/stop/moving ms | fxn-3d start/stop/moving ms | Flag |
|---|---|---|---|---|---|
| 2 | `hover:720,605` | 8.2-10.0s | 500/500/83 | 417/667/333 | ONLY-FXN3D |
| 4 | `back:#/` | 14.7-18.4s | 1083/2833/1833 | 1000/2667/1167 | TIME-DIFFERS |
| 5 | `go:#/chain` | 18.4-23.2s | 1417/3500/1417 | 1250/3333/2167 | TIME-DIFFERS |
| 8 | `back:#/record` | 31.3-34.8s | 2250/3417/1250 | 1667/3500/1917 | TIME-DIFFERS |
| 10 | `back:#/open` | 39.4-42.9s | 2833/3417/667 | 2167/3500/1417 | TIME-DIFFERS |
| 11 | `go:#/links` | 42.9-47.4s | 0/4417/2500 | 0/4750/833 | TIME-DIFFERS |
| 12 | `back:#/links` | 47.4-51.0s | 0/3500/750 | 2750/3833/1083 | TIME-DIFFERS |
| 15 | `go:#/resolve` | 59.0-63.5s | 583/4417/1917 | 0/5417/2833 | TIME-DIFFERS |
| 16 | `back:#/resolve` | 63.5-67.1s | 0/2083/2083 | 0/3917/750 | TIME-DIFFERS |
| 17 | `go:#/layers` | 67.1-71.6s | 1167/2917/1833 | 0/5000/2667 | TIME-DIFFERS |
| 18 | `back:#/layers` | 71.6-75.2s | 417/2333/2000 | 0/3750/667 | TIME-DIFFERS |
| 20 | `back:#/life` | 79.8-83.3s | 917/2750/1917 | 0/667/500 | TIME-DIFFERS |
| 22 | `back:#/resolvers` | 88.0-91.6s | 1333/3000/1583 | 0/917/1000 | TIME-DIFFERS |
| 23 | `go:#/measured` | 91.6-96.2s | 2667/4500/1667 | 333/4917/1000 | TIME-DIFFERS |
| 24 | `back:#/measured` | 96.2-99.8s | 1917/3417/1583 | 0/750/833 | TIME-DIFFERS |

### 2026-10-30-identity-start

Page /identity/start: 12 segments; moving on Three.js 8, on fxn-3d 9; flagged 4.

| Seg | Action | At (s) | Three.js start/stop/moving ms | fxn-3d start/stop/moving ms | Flag |
|---|---|---|---|---|---|
| 1 | `first-visit` | 0.0-8.1s | 83/4000/1167 | 250/917/583 | TIME-DIFFERS |
| 7 | `go:/download` | 21.4-26.2s | 1500/4333/2167 | 1583/2833/1167 | TIME-DIFFERS |
| 8 | `back:/download` | 26.2-29.7s | 2333/2917/667 | 2167/3083/1000 | TIME-DIFFERS |
| 12 | `back:/explore` | 42.6-46.1s | 1417/1417/83 | 2917/3333/500 | ONLY-FXN3D |

### 2026-10-30-kit

Page /kit: 12 segments; moving on Three.js 8, on fxn-3d 9; flagged 4.

| Seg | Action | At (s) | Three.js start/stop/moving ms | fxn-3d start/stop/moving ms | Flag |
|---|---|---|---|---|---|
| 6 | `back:/` | 17.7-22.2s | 3167/4250/583 | 1333/2167/917 | TIME-DIFFERS |
| 9 | `go:/about` | 30.8-35.4s | 83/4167/833 | 2000/2667/500 | TIME-DIFFERS |
| 10 | `back:/about` | 35.4-39.0s | none/none/0 | 2333/2667/250 | ONLY-FXN3D |
| 12 | `back:/explore` | 43.7-47.2s | 167/3333/750 | 2500/2917/417 | TIME-DIFFERS |

### 2026-10-30-stats-now

Page /stats/now: 12 segments; moving on Three.js 8, on fxn-3d 9; flagged 6.

| Seg | Action | At (s) | Three.js start/stop/moving ms | fxn-3d start/stop/moving ms | Flag |
|---|---|---|---|---|---|
| 6 | `back:/` | 18.3-22.1s | 2917/3667/667 | 1833/3500/1667 | TIME-DIFFERS |
| 8 | `back:/stats/capabilities` | 27.1-30.8s | 3333/3583/333 | 2417/3583/1250 | TIME-DIFFERS |
| 9 | `go:/stats/ceiling` | 30.8-35.5s | 0/4083/1500 | 0/4417/2417 | TIME-DIFFERS |
| 10 | `back:/stats/ceiling` | 35.5-39.2s | 583/583/83 | 2583/3500/1000 | ONLY-FXN3D |
| 11 | `go:/download` | 39.2-44.4s | 83/1667/1333 | 0/4667/2083 | TIME-DIFFERS |
| 12 | `back:/download` | 44.4-49.8s | 0/2250/1167 | 0/3667/500 | TIME-DIFFERS |


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
