# Home redesign: the next 300 upgrades (audit 4, 2026-10-23)

Reader: the owner, who picks what goes first, and whoever builds it.
Owner's words: "we are nowhere having a real UX here. Animations are still not good enough. The
new chains look half done. Find the next 300 visual upgrades, every aspect. We still have not
reworked the content and the words from the concept page."
Source: every view filmed and captured at 1440x900 (scratchpad `audit/a4/` and `audit/motion4/`),
the visible text of every view (`audit/a4/text.txt`), the concept page (defxn-concept.html) and the code.
Note: the polish agent's 40 fixes (FIXES-2) were still running during this audit. Some items here may
already be fixed when it reports. Check before you build.

Each line: what is wrong, then the fix. The lines marked **P0** are the most urgent.

## A. Motion system and timing (1–30)

1. **P0** Words are readable only about 2.6 s after a click. Make them readable by 1.2 s on a short hop and by 1.6 s on a long flight.
2. **P0** The camera, the page and the words run one after another. Overlap them: the words start when the flight is 55% done.
3. **P0** A lime line and a grey line flash across the screen as home's words leave (home → chain and home → ring, frame at 450 ms). Find the element and remove the flash.
4. Home's words all leave at once, before the camera moves. Let them leave in reading order, 30 ms apart, as the camera starts.
5. Every flight has the same shape. Use three: a hop within one world (≤ 1.1 s), a flight to another world (1.4–1.8 s), and a dive from home to a ring (1.6 s, with a crane arc).
6. The page opens slowly. Keep the open itself to 450 ms, starting at 40% of the flight.
7. Going between two views that both have a page, the page folds and opens again. Let it glide only.
8. Back plays the same move as forward. Make Back retrace the path the camera came by.
9. Ring → ring: the old ring drops while the camera is still on it. Let it sink after the camera leaves (200 ms later), and let the new ring rise as the camera arrives.
10. The network's dimming follows the view weight with a linear feel. Ease it over 600 ms with the glide curve.
11. 3D labels show at one speed on one page and another on the next. Use one wipe: 400 ms, starting 100 ms after the camera settles, in story order.
12. A ring's hover lift is flat. Add a 4% overshoot on the way up only.
13. A hovered ring gives no light change. Brighten its tiles by 8%.
14. A click gives no sign that it landed. Press the clicked tile or ring down for 60 ms before the flight starts.
15. The first-load intro takes 4.4 s. Cut it to 2.6 s and bring the words in with it.
16. Check that reduced motion makes every new motion instant: ring rise, ledger build, label picks, chip fills.
17. On a phone, scrolling can still move the page off its box after the scale change. Check again and pin it.
18. Tab content swaps overlap. Wipe the old content out in 150 ms, then the new in over 250 ms.
19. A pressed chip shows no motion. Sweep its fill in from the left over 200 ms.
20. Row hover paints each row's background. Slide one highlight bar between rows instead.
21. Figures in strips jump when the choice changes ("27 of 201" to "22 of 201"). Roll the digits over 300 ms.
22. The step bar fills at once. Sweep its fill in time with the 3D step.
23. The timeline highlight moves on its own clock. Give it the ring turn's duration.
24. Measure p95 at 2560x1440 again after the quality changes. Keep it under 20 ms.
25. Check that hovering off a ring stops the frame loop when the lift settles.
26. Click five views fast, one after another. No view may stay stuck on screen.
27. Every ring rises by the same rule (R × 0.9 + 1.6), so small rings rise too far. Scale the rise with the ring's size.
28. The page's arc lift is the same for every anchor, so from a resolver cube it leaves the screen. Scale the arc to the anchor's size.
29. The mark only tilts to the camera. On the FXN page, turn it a quarter once as it rises, then rest.
30. Rings that rose for a page snap home when you return. Ease their way back over 500 ms.

## B. Home scene (31–55)

31. **P0** Seven kind labels crowd the open column at 1440 and sit on tiles. Add a kind legend in the open area (seven rows, each with its colour); hover a row to lift every ring of that kind and dim the rest.
32. Labels over tiles are hard to read. Give each label a dark backing.
33. Hovering a kind label does nothing. Lift the rings of that kind and dim the others, like the legend.
34. The scene is small next to the copy at 1440. Enlarge its frame by 12% and use the space under the rail's fade.
35. Logo slots on small rings are too small to read. Keep a 16px minimum on screen, or hide the slot on rings below it.
36. Every slot's dashed rim is teal or grey. Use each kind's own colour for its rim, as the labels do.
37. The hover label appears at the pointer, far from the ring. Anchor it to the ring's top.
38. Your ring looks like the other identity rings. Add a small "You" tag and your key's dot in its slot.
39. The computers (cubes on stems) do not relate to any chain. Draw a faint line from each to the rings it keeps copies of.
40. The FXN ledger ring sits close to the mark's base. Open the gap by 10%.
41. The four joins between the ledger and the DEFXN chain are hard to see. Brighten them and run one light along them on the intro.
42. The dotted orbits cross the copy column. Fade them out under the words.
43. "Compare chains", "Genesis block", "DeFi" and "Governance" go nowhere ("#"). Point them at real views (see 287–288).
44. The Measured rail scrolls inside at 1440 (18 rows). Show the top 8 by checked cases and "All 18" to the Measured page.
45. The rail shows 71,249 ops/s, which is in no record. The owner still has to decide (see the earlier report).
46. The rail's line for a capability is crate wording ("The derived-balance custody index"). Use the brief's plain words, which the data already holds.
47. The labels appear 3.4 s after load. Bring them in at 2.0 s with the shorter intro.
48. On a phone the scene is a thin band and the labels are hidden. Add tappable kind chips under the scene.
49. The header has no way back to the network. Add "Network" as the first nav item.
50. The footer's devnet line links nowhere. Link it to the new status page (see 273).
51. The mockup bar still covers the footer at some sizes. Check the fold from the polish round.
52. The rail head wraps to two lines. Fit it on one line.
53. Your ring's hover label must say "Your chain · 5 records" and "Open".
54. The DEFXN label's second line is 9px. Make it 10px at the least.
55. The hub ring's tiles are the same white grey as the identity rings. Give the DEFXN chain its own tone (bright neutral with teal glyphs), so it reads as the centre.

## C. Chain page (56–80)

56. **P0** The tiles are chunky and the 5-tile ring reads as a crown. Thin the tiles and show the link bars between every pair, so it reads as a chain.
57. The key disc covers the top of the front tile. Raise it by 0.4 of a tile.
58. The light under the chosen tile is a flat disc. Give it a soft radial edge and make it smaller.
59. The "Oldest" and "Newest" tags are 9px and float away from the ring. Put them on the ring with a short leader, at 10px.
60. "1 of 5" sits far below the ring. Move it up under the front tile, and make the arrows 44px.
61. The ring does not show which way time runs. Add a faint arrow along the links, from oldest to newest.
62. The page is tall and narrow, and its rows are cramped. Widen it to 480px and give rows 56px.
63. "Signed" and "Not signed" pills shout. Use a small check and "Signed" in muted text; show a dash for the others.
64. The Activity tab repeats "Project notes · by you" three times. Group the steps under each record, with a count.
65. Activity says nothing about the other four records. Say that the sample has no history for them.
66. "Next in chain" on the chain page is unclear. Call it "Newest record links to".
67. Choosing a row turns the ring but nothing marks the chosen tile. Pulse that tile once.
68. "History" in the foot and the "Activity" tab sound alike. Rename the link to "Record history".
69. The lede lost "Nothing is rewritten." Put it back.
70. The key shows a generic person. Put "you" under it.
71. The empty slots of your home ring vanish on entry. Let them fly into the key and go, so the story shows where they went.
72. The tile glyphs are tiny bars. Make them larger and crisper.
73. The camera leans hard with the pointer here. Lower the lean to 1.6 degrees.
74. The ring floats with no contact. Add a soft contact shadow under it.
75. At 1280x720 the last row is cut. Fit all five rows.
76. On a phone the ring is too small and the key covers it. Frame it larger, with the key above.
77. The arrow keys turn the ring, but nothing says so. Show "← → to turn" once, on the first visit.
78. A row's hover lift is hard to see from the camera. Brighten the tile as it lifts.
79. The chosen row's teal and the tile's teal light differ. Use one teal for both.
80. The chain page has no sign that its records are a sample. Add one small "Sample records" badge.

## D. Record page (81–95)

81. The earlier versions read as a blur behind the tile. Fan them out by 12 degrees each, with Rev 05, 06 and 07 readable.
82. The "Next in chain" tag is cut at the right edge. Bring the next tile into the frame.
83. Timeline dates are 9px. Make them 11px and the current dot larger.
84. The timeline has no year. Show "2024" once at its start.
85. The content preview cuts off mid-line. Show the three key decisions as short bullets.
86. "Earlier: revisions 05–07" does nothing on click. Make a click nudge the camera to the versions.
87. "Signed" has no mark. Add the small teal seal beside it.
88. Moving to the next record swaps the version tiles at once. Fold them in and out.
89. A record without content shows an empty-feeling page. Show its type icon large.
90. The timeline sits on the network's dots. Give it a dark backing.
91. The versions are 26% opaque and look like fog. Draw them solid and darker, with an outline.
92. Keep two quiet links in the foot. Check that both lead somewhere new.
93. The eyebrow and the kind line repeat "Note". Show it once.
94. At 1024x768 the text sat on the page's edge. Check the polish round's fix.
95. A click on the main tile opens the card, but nothing says so. Add the hover tag "Open".

## E. Open card (96–115)

96. **P0** The card is huge and half empty: the content ends at 45% of its height. Fit the card's height to its content plus 15% (at least 420px), centred.
97. The neighbour tiles are huge and cut by the screen. Scale them to 60% and push them back, or hide them when the card is over 70% of the width.
98. A blank bone slab shows for about 500 ms before the words. Start the words at 70% of the widen.
99. Closing the card flies a giant blank slab across the screen. Take the words out first, then shrink it in 500 ms.
100. Light falls across the card in a dirty gradient. Light its face evenly.
101. Add a hairline inner border to the card, in ink at 10%.
102. The tab content has no edge. Add a hairline under the tabs.
103. Body text is 15px on a card this size. Make it 16px, with more line space.
104. The Signature tab is two lines in a huge card. Show a small record diagram: the fields, then the signature as the last field.
105. The History tab's steps have no line between them. Join the numbers with a line.
106. The Details tab repeats the facts column. Remove the repeat.
107. "Next in chain" in the facts column should fly to that record's card.
108. The card's top line is crowded. Put 16px between each item in it.
109. Check the card at 1280x720.
110. Esc does nothing here. Make Esc go back to the chain.
111. On a phone, check the tabs scroll sideways and stay 44px tall.
112. The card has no shadow. Add a soft one under it.
113. A record with no content still gets the huge card. Size it to its content.
114. The bone surface and the lime button sit close in lightness. Give the button a thin dark edge on bone.
115. The card's tile glyph fades out early. Keep it until the words arrive, then let it go.

## F. Connections (116–130)

116. The line of records sits small and low on the left. Centre it and enlarge it by 25%.
117. Names under the tiles sit on the link bars and dots. Move them below, with a backing.
118. "Your key" and "Project notes" labels overlap. Separate them.
119. Record 03 and Record 12 are placeholders. Mark them "sample".
120. The chevrons on the links are too small. Make them visible.
121. The legend is 9px and far from the 3D. Move it into the page as a key.
122. The earlier versions overlap the Design direction tile. Spread them.
123. The newest record has nothing after it. Show an empty dashed slot to its right: "the next record goes here".
124. Hovering a row barely marks its tile. Lift it and outline it.
125. At 24 degrees the tile faces are small. Lower the camera to about 18.
126. A click on a related record does nothing. Say "Not in this sample".
127. Tiles pass through each other as the ring unrolls. Lift them in an arc on the way.
128. The group labels give no counts. Add them ("Related · 2").
129. "Back to record" and "Back to chain" both show. Keep the crumbs to the record and the foot to the chain, no more.
130. Check the page at 1024x768.

## G. The chain pages for each kind (131–160)

131. **P0** The page is thin: a line, a strip, an aside and chips. Give each kind its own content from the brief (see N, 281–286).
132. **P0** The logo box looks like a broken image ("LOGO" at 9px). Make it a clear slot: 72px, dashed, with "Logo · not given yet".
133. The 3D slot on a risen ring is only a dark disc. Add an inner ring so it reads as a socket.
134. A risen ring floats with nothing under it. Add a contact shadow and a thin line down to its place in the network.
135. The other rings stay bright behind it. Dim them further.
136. The risen ring stands still. Turn it 30 degrees once on arrival, then rest.
137. **P0** The kinds differ only by colour. Give each kind its own tile glyph: a person for identity, rule lines for a resolver, a coin for a token, two arrows for a pool, a network mark for a network chain.
138. Use the same glyphs on home, so the kinds read with no labels.
139. A network chain should carry its coin's ledger inside it, as the DEFXN chain does with FXN. Give DeArk a DARO ledger ring and CR3TV a CR3 ledger ring.
140. The brief says a token lives inside one network chain, but the token rings float apart. Join each token ledger to a network chain with a dotted line, and say on its page that the picture shows the idea, not which chain.
141. The pool page has no motion of its own. Show two intents flowing into the pool and one result out, as on How it works.
142. The resolver page shows no capabilities. Show the blocks it names, as on the Resolvers page, and link there.
143. The identity page shows an empty ring. Show record tiles and a key, like your chain, as "someone's chain".
144. Ten chips sit in two loose rows. Group them: "Kinds" and "Named chains".
145. "Back to network" shows twice. Keep it once.
146. "A shape, not live data" repeats on every ring page. Keep one short line.
147. "Identity chain. One key signs it." wraps to two lines. Shorten the second part.
148. "Coin: —" is noise for a kind with no coin. For a token ledger, show "Lives in: a network chain" instead.
149. The page gives no state. Add the brief's state label for the kind (one of its four).
150. There is no way to step through rings of the same kind. Add previous and next.
151. Hovering a risen ring's tiles says nothing. Say what a tile is: "one record", "one result".
152. On the DEFXN page, light the FXN ledger and run the joins once, with a "FXN ledger" tag.
153. The DEFXN page has one way on. Add "How a result is made" as a quiet link.
154. Check that a ring sinks back exactly into its place when you go home.
155. The DEFXN page frames the hub from too far. Frame it tighter.
156. The minimap marks your chain on every ring page. Mark the ring you are on.
157. The eyebrow repeats the title ("Network chain · DeArk" over "DeArk."). Keep only the kind.
158. The page does not say what you can do with this kind. Add it from the brief's products (for identity: Inbox, Posts, Play).
159. Check the ring pages on a phone.
160. A click on the risen ring does nothing. Make it open the kind's next step.

## H. How it works (161–175)

161. Intents and computers are small in a large stage. Zoom in 15% and centre them.
162. The 3D labels repeat the step text. Keep names only: Alice, Bob, Resolver, Result, Copies.
163. Step 2's "one price for the batch" is not shown. Show a row of beads inside the resolver that all take one height.
164. The computers are plain slabs. Label them Computer 1, 2 and 3.
165. After the trace, put "3 checks" large by the result.
166. The step bar's segments are 2px. Make them 4px, with the step name on hover.
167. Show the keyboard hint once: "← → to move a step".
168. Alice's and Bob's chains are tiny. Enlarge them so they read as rings.
169. Add "Play all": the five steps once in a row, then rest.
170. The illustration note sits on the rings. Give it a backing.
171. Check that each step's camera lean stays under 600 ms.
172. The result's seal and the intents' seals look the same. Make the result's seal larger.
173. The copies fly in one arc. Stagger their arcs.
174. Step 5's trace lines are thin. Thicken them a little.
175. The aside's link "See the resolvers" is small. Make it a quiet link in the foot.

## I. Resolvers (176–190)

176. 15 identical grey cubes. Give each a face glyph for its purpose.
177. Group the wall by purpose, with row labels: Money (Custody, Balance, Stake, Slash, Payout, Treasury), Names (Domain, Records), Groups (DAO), Work (Compute, Storage, Audit, Attest, ACL, Service pool). The grouping comes from the brief's lines.
178. The capability blocks have no heading. Label the row "Capabilities".
179. "Names 1 of the blocks below" reads oddly. Say "Built from Multisig".
180. The hollow cubes look broken. Tag them "Grammar not specified yet".
181. The chips repeat the wall. Keep them for keyboard use, smaller and grouped like the wall.
182. The brief asks to show launched and served apart. Show a legend: dashed for launched, solid with a badge for served. Draw none as served, because the record does not say which are.
183. The page lacks the resolver's life. Add the brief's four steps: Build, Launch, Serve, Inspect.
184. "Who can change it: not in its manifest" needs a reason. On hover: "The control key is named at launch."
185. The camera's pan to a choice is small. Make it clear, but under 600 ms.
186. The resolver rings on home lead to a ring page. Link that page to the matching resolvers here.
187. Offers use system verbs ("Found DAO"). Use plain verbs ("Start a DAO", "Link a treasury").
188. Price shows "None today" in every row. Show it once, as a page note.
189. The facts are dense. Space them with the page's scale.
190. Add the brief's five resolvers that power products (Notify, Games, Content, Data, Streams) as a second group.

## J. Measured (191–205)

191. The columns are small. Zoom in 20%.
192. The columns have no names. Show names under them at 1920 and wider, and on hover everywhere.
193. Show each column's count on its top on hover.
194. **P0** "Checked for" shows raw case names ("A claim older than the window against the callers certified clock…"). Show one quoted case per line, at most 3, with "+N more".
195. The 18 chips are dense. Use a two-column list of name and count instead.
196. "Speed: not measured yet" needs its reason. Add "No capability has its own speed run yet."
197. The version (0.1.0) gets prime space. Move it to the details.
198. The Runs tab is only text. Draw each run: one resolver fanning out to 10 computers for BENCH-012, and 10 nodes for BENCH-013.
199. The run date is small. Make "Measured 10 Oct 2026" clear.
200. Give the limit (no network time in these runs) its own callout, beside the numbers.
201. On the Runs tab the 3D only steps back. Show the 10 nodes instead.
202. The "10 cases" label floats on the left. Attach it to the end of the base plate.
203. Add the brief's rules for reading numbers: a rate names what it counts; a fleet number is a sum; "not measured" is not 0.
204. Five capabilities have crate names on screen (Xdomain, Object, Quota, Commit, Challenge). The owner must give their plain words; flag them.
205. The base plate's edge is hard. Bevel it.

## K. FXN (206–220)

206. The group labels are small. Enlarge them, and draw a thin arc along each group.
207. The hub ring under the supply ring still competes. Dim it further on this page.
208. The network rings at the top are bright. Dim them further.
209. The part list has only numbers. Add short bars: one series, teal for the chosen part.
210. Operations' release (monthly over 3 years) has no drawing. Draw it as a line of 36 steps.
211. The public sale is one dense sentence. Split it into facts: price, cap per identity, vesting.
212. Fees: add the third fact, the 15% for builder programs that no vote can raise.
213. **P0** The brief's three kinds of money (network coins, credits, app tokens) are missing. Add a third tab: Money.
214. Link the Genesis product ("create a network's starting supply, once") from the page.
215. Under the CTA, give its reason in small text: "The sale is per identity."
216. Raise the chosen part's tiles, and lower the rest by 10%.
217. Mark every 10% of the ring with a tick.
218. Group labels jump when the tab changes. Ease them.
219. The mark rises, then stops dead. Let it settle with a small ease-out.
220. The page never names the DEFXN chain. Say "FXN lives on the DEFXN chain" and link to its page.

## L. Page, type, spacing and parts (221–245)

221. **P0** The page slab is mid grey and glossy, so muted text loses contrast. Darken it to about 9% lightness and check every text colour on it.
222. Corners differ everywhere: slab 12, card 22, chips round. Set a radius scale (6, 12, 22) and use it.
223. A heavy light streak crosses the slab's top left. Even it out.
224. Check the eyebrow's top gap is the same on every page.
225. The second half of two-tone headlines is about 3:1 on the slab. Raise it to 4.5:1.
226. Strip labels drop to 9px at 1280. Keep 10px at the least.
227. Quiet links have different underline gaps. Use 6px everywhere.
228. Arrow weights differ (2.4 and 1.8). Use one.
229. Chips need a visible focus ring.
230. Inner lists show grey scrollbars. Make them thin and dark.
231. The crumbs take two lines (path, then back). Use one line: "← Network / Personal chain".
232. The minimap on every page adds little. Remove it from the stage pages, or turn it into "you are here".
233. "Earn FXN" in the header leads nowhere. Point it at the FXN page.
234. Mono capitals are on every metadata line, which is noisy. Use sentence-case sans in lists.
235. Dates show as "12 MAR 2024" and "12 Mar 2024". Use one form.
236. The page is a different width on different pages. Use one width on all inner pages.
237. Line heights differ (1.5, 1.55, 1.6). Use 1.55.
238. Check the crumbs' left edge lines up with the stage, and the page's right edge with the header.
239. Labels over 3D need a two-layer text shadow to stay legible.
240. Check the 60-character line limit on every page.
241. Make the selected state the same on rows, chips and tabs (teal edge plus faint fill).
242. Empty states differ ("Nothing yet", "No … in this sample"). Use one pattern: what is missing, and why.
243. Focus order follows the page: crumbs, page, then the 3D's list. Check it on every page.
244. The small mono notes under stages are 10px and spaced wide. Use 11px, with less spacing.
245. Check every quiet link has a state for hover, for focus and for a press.

## M. 3D craft (246–265)

246. Tiles look like plastic. Add a fine rim light and a little roughness variety.
247. One key light makes flat silhouettes. Add a cool rim light from behind.
248. Rings have no contact with the floor. Add soft contact shadows.
249. The FXN ledger has no glow. Give its tiles a faint teal emissive.
250. Far rings look as sharp as near ones. Darken them with distance.
251. The floor is a black void. Add a faint dot floor under the network, like home's dot texture.
252. Glyph bars are flat boxes. Make them read as engraved: darker and a little inset.
253. Pins and posts on network tiles are noise at small sizes. Hide them on home's network; keep them on record tiles.
254. Links between tiles are plain dark boxes. Shape them as chain links (rounded, with two holes).
255. Dot and bead sizes differ between lines. Use one scale.
256. Give the resolver cube on How it works a bevel to match the tiles.
257. Check sharpness at 1440 after the pixel-cap change.
258. Thin links shimmer as the camera moves. Thicken them a little, or soften their edges.
259. The flying page passes through rings. Draw it in front of the world while it flies.
260. Check the card's light for the dirty gradient (see 100).
261. The mark's rim glow is strong next to the ledger. Lower it 15%.
262. On phones, draw fewer far rings to keep frames smooth.
263. Kind colours for identity and token sit close in some light. Check them in the scene, not only in CSS.
264. Your key's disc and the DEFXN mark use the same style. Give your key a ring of its own colour.
265. Cubes for computers are plain. Give each a small light that shows it keeps a copy.

## N. Content and words from the concept page (266–300)

266. **P0** "What it means for you" lands on step 1. Open the page with the brief's "In one minute": every result is signed, and anyone can check it at any time, with no trust in a company.
267. **P0** Add the brief's words as definitions: every glossary word on screen (record, resolver, grammar, capability, checked cases, provider, replica, launched, served) gets a dotted underline and a short popover from the brief's table.
268. **P0** New page: Three layers (brief 5). Base chain, capabilities, resolvers, each with its one rule. 3D: three stacked plates.
269. **P0** New page: Life of a resolver (brief 6). Build, launch, choose who can change it, serve, inspect. Show launched and served apart.
270. **P0** New page: Products (brief 7). 26 products in 7 groups, with their stage and address. Each product gets an empty emblem slot, like the logos.
271. **P0** New page: Identity and names (brief 8). FXN ID is one key file that stays on your device; apps sign in the browser; names are flat (radio.fxn); only the genesis key can claim names for now.
272. **P0** New page: Nodes (brief 9). Browser tab, phone app, server; the roles a node picks; nodes are not paid yet.
273. **P0** New page: What exists today (brief 12). The status table, with the brief's four state labels. The footer's devnet line goes here.
274. FXN: add the three kinds of money (see 213).
275. FXN: show the rules that stop abuse, from the brief, without ever calling them fair.
276. How it works: end with the brief's "Trust is a choice you make before you send" and the three public facts every resolver shows.
277. Resolvers: add the five product resolvers (see 190).
278. Measured: add the brief's rules for numbers on screens (see 203).
279. Chain: use the brief's line in the lede: "A person, a team or an app keeps its own history of signed records."
280. Card Signature tab: end with the brief's caution: a signature shows who signed, not that the rulebook is good.
281. Identity ring page: link to the new Identity and names page.
282. Network ring page: add "A DAO governs each network with public rules" (brief 1).
283. Token ring page: add Flux Launch (a token on a price curve, then into a pool) and app tokens ("none registered yet").
284. Pool ring page: add the swap from brief 3 and BENCH-012's "every swap in a batch cleared at one price", with its source.
285. Resolver ring page: add the four life steps (see 269).
286. DEFXN ring page: add the base chain's rule from brief 5: "It never learns what a business record means", and link to Genesis.
287. Home paths: rewrite "Genesis block", "DeFi" and "Governance" to lead to the FXN supply, the swap on How it works, and the DAO and Treasury resolvers.
288. "Compare chains" has no page. Replace it with "See every kind of chain", leading to the chain pages.
289. Header: add "Products" and "Status" for the new pages.
290. Run the banned-word check on every new page's words.
291. Ask the owner for plain words for challenge, commit, object, quota and xdomain (see 204).
292. Replace system verbs everywhere (see 187).
293. Show manifest case names as quotes in sentence case, never as raw lowercase text.
294. Call the cubes "Computers that keep a copy" where there is room.
295. Review every title against law 68: a heading names the state, not a slogan.
296. "A shape, not live data" appears on many pages. Keep it on the footer and once per page at most.
297. The sample dates are from 2024 while the network runs in 2026. Mark the sample once ("Sample records from the owner's boards").
298. "Your key signs each record" while 3 of 5 are not signed. Say "A record counts once your key signs it. 2 of 5 are signed."
299. After the content work, run the copy check on the rendered text of every view. Target 5/5.
300. For each page, write its reader and their first question in the head notes (copy law 1), so the build keeps them.
