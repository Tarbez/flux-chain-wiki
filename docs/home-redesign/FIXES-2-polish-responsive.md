# Home redesign: polish, spacing and responsive fixes (audit 3, 2026-10-23)

Reader: the agent who fixes the mockup, and the owner who audits it after.
Owner's words: "audit the 3D pages for polish details and spacing... the animations and the
motions and the layout... responsive, because it is not... improve the quality and the details."
Source: the app filmed and captured at 1024x768, 1280x720, 1366x768, 1440x900, 1536x864,
1920x1080, 2560x1440, 820x1180 and 390x844 (contact sheets `R-<size>.jpg` in the scratchpad audit
folder), and the code.

What the audit found, in one line each:
- At 2560x1440 the page stays 520px wide with 14px text. Most of the screen is empty.
- At 1024x768 and 1366x768, five views are too tall (record, resolvers, measured, measured runs).
- At small stages the 3D labels sit on each other (How it works, Connections).
- On a tablet the Menu button does nothing, and the mockup bar covers the content.

Each fix names the problem, the fix and the check. Work in order. Never invent data.

## R. Responsive layout

1. Nothing grows above 1440px. Add one fluid scale `--s`: 1 at 1440x900 and below, up to about 1.6 at 2560x1440, set from the viewport's width and height (the smaller of the two ratios). Apply it to every part around the 3D, from the header and footer to the 3D labels: their widths, padding, gaps and type. At 1440x900 and below every size stays as it is now. Check: 2560 and 1920 stills look like the 1440 still, only bigger.
2. The page sheet is a fixed width. Make it clamp(400px, 30vw, 700px), times the scale. Its height bound grows with the scale.
3. The open card stops at 1180px. Let it grow with the scale, up to about 1600px at 2560.
4. Check the 3D fit at every size: the chain ring fills at least 75% of the stage height, and each stage's objects fill its stage box, at all nine sizes.
5. Fix the 5 failing views: record, resolvers, measured and measured runs at 1024x768, and measured at 1366x768. Check: the harness passes.
6. Short screens use viewport media queries. Use container queries on the sheet (container-type: size) so a sheet decides what to fold by its own height: chips fold into a "Show all 18" toggle, case lists into "+N more", the lede into one line.
7. The chain page's footer links wrap: "History" drops to its own line at 1024. Keep the foot on one row, with a smaller gap.
8. Strip values are cut with an ellipsis ("Not measured…"). Let a narrow strip wrap to two rows instead.
9. Eyebrows wrap to two lines on narrow sheets ("FXN · owner decisions, mostly not in code yet"). Shorten them, or let them take one line with a smaller letter spacing.
10. On a tablet or phone, the Menu button does nothing. Make it open a menu sheet that slides down from the header (motion, not a fade) with the four nav links and Account. Esc and a second tap close it.
11. On a tablet in portrait (820x1180), the 3D is short and the page runs full width. Make the stage about 50vh, and use two columns inside the sheet where it has room (facts beside the list).
12. The mockup bar covers content on a tablet or phone, and covers the footer on desktop. Make it a small pill at the bottom right, folded by default below 1100px wide, opened by a tap.
13. On a tablet the open card is tall, with an empty middle. Let its height follow its content, with the facts after the content.
14. The shared header and footer scale with rule 1, so the home page scales too above 1440. Keep the home page exactly as it is at 1440x900 and below. Say this in the head notes.

## P. Polish and spacing

15. Spacing inside sheets differs from page to page. Use one scale (4, 8, 12, 16, 24, 32 times `--s`) for the gaps: eyebrow to title, title to lede, lede to strip, strip to list, list to foot. Check: the same gaps on all nine pages.
16. The 3D page and its words do not line up at every size: at 1024x768 the record's text sits on the slab's left edge. Make the slab match its box exactly at all sizes, with the padding inside it. Check stills at 1024, 1440 and 2560.
17. The slab's corner radius differs from the flat fallback's radius (3D off). Make them the same, and give both the same thin rim.
18. The crumbs and "Back to network" are hard to read when rings pass behind them (FXN). Add a soft scrim under the page top.
19. 3D labels collide at small stages: on How it works at 1024, Alice, Check 2 and Resolver sit on each other; on Connections the record names run together. Add a collision pass: labels have a priority; one that would cover a higher one moves to its other side or wipes out. At small stages a label shows only its title.
20. Label type stays the same size on any stage. Scale it with rule 1.
21. The legend and stage notes sit on top of the rings at the stage's bottom. Give them a small dark backing, and keep them clear of the 3D objects.
22. Timeline labels collide when two dates are close (03 Mar and 12 Mar on a narrow stage). Keep a minimum gap: move the label up or down, or shorten it to the revision.
23. Chips differ in height and padding between pages. Use one chip style. Make the chosen chip's contrast at least 4.5:1. Centre the hollow dot on its text.
24. Figures in strips and runs shift as they change. Use tabular figures (font-variant-numeric: tabular-nums).
25. Two-tone headlines leave one word on its own line ("capabilities."). Use text-wrap: balance on headlines.
26. Some lines in sheets run long. Keep body text at 60 characters or less per line.
27. Focus rings are hard to see on the dark slab and the bone card. Give each surface a focus colour that contrasts with it.
28. Hover states have different timings. Use 200 ms for every hover colour and lift in the page.

## M. Motion

29. A window resize makes the camera jump to the new fit. Ease it there over 240 ms.
30. On a phone or tablet, a page that is scrolled during a flight lets the slab drift from its box. Keep the slab on its box while the page scrolls.
31. Long lists stagger for too long (18 chips at 55 ms each). Cap any stagger at 400 ms in all.
32. A label's wipe-in starts from the wrong side when its leader is on the right. Wipe each label in from its leader's side.
33. The hover label jumps from one object to the next. Ease its position over 120 ms.
34. On a new choice, the words sometimes change before the 3D moves. Start the 3D first; the words follow 80 ms later.
35. Crossing a size threshold (container query) makes the layout jump. Do not transition layout properties; let only transforms and clip paths move.

## Q. 3D quality

36. At 2560x1440 the scene draws at about 0.84 of a pixel per screen pixel, so it looks soft. Raise the pixel cap for big screens. Keep the p95 frame time under 20 ms there, and measure it.
37. Shadows cover 80 world units with one 2048 map, so they look soft and blocky up close. Fit the shadow camera to the view's area (the stage, your ring or the network).
38. Dotted lines and beads look thin at 2560 and heavy at 1024. Scale their size with the frame, as the home's dots already do.
39. The slab's material looks like grey plastic up close. Give it a darker body, a fine rim light and a faint gloss, like the boards' dark glass.
40. Check the whole app at 1920x1080 and 2560x1440 for any 3D object that is cut by the stage's edge or hides behind the page, and fix each one.

## Done means

- The harness passes every route at all nine sizes:
  `AUDIT_SIZES=1024x768,1280x720,1366x768,1440x900,1536x864,1920x1080,2560x1440,820x1180,390x844 node audit.mjs routes-all.json`, with 0 idle frames.
- The harness also checks that no two visible 3D labels overlap, and that no label sits over the page. Add that check.
- The motion films keep p95 under 20 ms at 1440x900 and at 2560x1440.
- `npm run copy:check -- --ui` scores 5/5 on every changed page file.
- No file outside `docs/home-redesign/` changes. Nothing is committed. 71,249 stays as it is.
