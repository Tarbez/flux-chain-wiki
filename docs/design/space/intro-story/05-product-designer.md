# 05 Product designer: the intro as a usable screen

Layer: app (`js/pages/intro.js` over the site objects drawn by fxn-3d). Reader: the producer, then the one building agent. Status: proposal, not built, not confirmed. Facts from `00-facts-genesis.md`, `00-facts-game.md` and `00-facts-browser.md`. A missing fact is marked.

## The one line

A first-time visitor watches their own archive wake, learns what FXN does one object at a time, and leaves with one real thing: an FXN ID file on their device. The one dominant action is at the end and is true today: the FXN ID gate is live on the old infra and `/auth` makes the file in the browser the visitor already has. It is never "download FXN Browser": no public download exists.

## What is always on screen (every act, 1440x900)

The film is a page, so its controls never leave. Seven elements:

| Place | Element | Size | Behaviour |
|---|---|---|---|
| Top left, 32px gutter | White glass FXN mark | 24px | Press: pause and open Why? |
| Beside it | Act label, mono | 11 | `ACT 2 OF 4 · A RECORD MOVES` |
| Top right | `Skip` | 11 mono outline | One camera move to the door. Esc does the same |
| Bottom centre | Four act dots | 8px, 16px apart | Current one filled. Press or keys 1-4: jump to that act |
| Bottom right | `Pause` / `Play` | 11 mono outline | Space toggles. Paused: every object shows its name as a hover label (`screenOf`) |
| Beside it | `Why?` | 11 mono outline | Pauses. One sheet, 420px, 18 body, one paragraph. Esc or a press outside closes it and plays on |
| Beside the acting object | Its name and line | 11 mono + 29 | Enters after the object acts (built: `cine()` waits for `acted`) |

The complement (`--secondary`) is spent once per view: the portal ring before the dive, nothing during the acts, `Create your FXN ID` at the door. Nothing fades except the sheet. Type stays on the ladder: 11, 18, 29, 47.

Pacing: the owner said "too fast". Hold per object rises from 4 s to 6 s (build 2, settle 1, words 3), a target to check on screen. Four acts come to about 90 s plus pauses.

## Screen by screen

**S0 Welcome (0-3 s).** Black canvas. The mark builds at centre, slides to the gutter. 47 `Welcome to FXN.` left half, baseline at 45% height. 18 under it: `This is a development network. Nothing here moves real money.` Said here and at S7, nowhere between.

**S1 Portal (holds until the press).** Portal 101 builds right (centre .788, .447 as measured). Left: 11 mono `FXN NETWORK`, 29 `A new internet, built in the open.` The complement is the ring itself, label `Go through the portal`. Hover: the ring's edge lights. Reduced motion: a `Go through` button.

**S2 Dive (0.9 s + 1.6 s glitch film).** No chrome. The one stretch where the visitor cannot act, under 3 s.

**S3 Act 1, Arrival (0-12 s).** Bays wake, the big screen turns on, the kernel builds on it. `This is your archive. The network runs under it.` then `The kernel puts every record in order.` Why?: "A record is one signed line. Order is what stops one coin being spent twice." "Kernel" is the object's name in mono. The 29 line never leans on it.

**S4 Act 2, A record moves (12-36 s).** Ledger Line, Keeper Ring, Keeper Tower, Rule Book, 6 s each, the built `HOME.LANDING.CINE.*` lines. Why? sheets carry the numbers with their conditions: "A keeper's receipt is final. 83,605 final a second on one keeper, 32 vCPU, real WAN, throwaway keys. Built, not live."

**S5 Act 3, What you build (36-66 s).** Chain Drum, App Bundler and App Bundle as one beat (`Your app is stamped into one bundle, its rules inside.`), Multisig Lock, Bridge Span, Network Wall, Network Portal. Why? for Chain Drum: "A chain costs 15,000 FXN to launch and locks 15,000 FXN. Built, devnet not live."

**S6 Act 4, The door (66-78 s).** Release Gate opens on its key, light runs toward the game, the view holds wide. `Your key opens the gate.` The game is local only and no person has played it, so the gate is a picture, never a button. Mono under it: `THE GAME OPENS AFTER GENESIS`.

**S7 End screen (holds).** The archive stays. Left half: 47 `Your key is an FXN ID.` 18 `One file on your device. It signs you in. No server holds it.` The one action, complement, 44px: `Create your FXN ID`. Under it, 11 mono: `REAL TODAY. THE NETWORK IT SIGNS INTO IS A DEVELOPMENT NETWORK.` One outlined second choice: `I have one. Sign in.` No role picker: who you are comes after you exist, on home.

## The identity moment

Route: `/auth`, the existing create wizard, the archive standing behind it. The FXN ID card builds beside the questions as today. One question per screen, 29 question, one 44px field, one `Next`:

| Step | Question | What the visitor sees | Target |
|---|---|---|---|
| 1 | Name your identity | The name types onto the card | 10 s |
| 2 | Pick a PIN (8-12 digits) | The security plate seats | 10 s |
| 3 | Pick your icon (one of nine) | The stamp strikes | 5 s |
| 4 | Choose your recovery words (12 or 24) | The card turns to its vault | 5 s |
| 5 | Save your Emergency Kit | Words and Secret Key shown once. `I wrote them down` is the only way on | their time |
| 6 | The file saves | `.auth.fxn` lands in downloads. `Choose it now to sign in` | 5 s |

Password and key word are optional today. For a first run they sit behind one outlined `Add more locks` on step 2, so the default path is four questions. A proposal only. The writer's rules do not change.

What they keep, three lines of 18 on step 6: the file (this device, never uploaded), the recovery words (bring it back if the file is lost), the icon and PIN (open it). What the network keeps: pieces of the Master ID Secret Key at the gate. [FACT NEEDED: `auth.js` enrols with a devnet gate of 2 of 3 at gate.defxn.com, and `/identity` says "any 3 of 5". One is wrong on screen.]

"Carry it": the same file opens on another device with `Choose your file`. The FXN Browser's own identity (a keypair in the Keychain) is in the dev build only, so the film never shows it as something to install.

## Controlled access, made concrete

Two true flows, one shown. The web flow (`/identity`) is what a visitor meets today: a site asks, you review, you share or don't, the server checks the signature and never holds the key. One sheet, never a page:

1. A site asks. The sheet names the exact site and what it asks for, in plain words. `Share` (complement) and `Don't share` (outline).
2. You sign on your device. `Show what I sign` folds the exact bytes open.
3. The yes lasts for that tab only. 11 mono: `FOR THIS TAB. CLOSING IT ENDS IT.`

Revoke: on the web today, closing the tab is the revoke, because no grant outlives it. Key-level revoke exists on `/account` (rotate, revoke or delegate a signing wallet). In the FXN Browser dev build a site asks through a permission prompt, the person grants or denies, grants are stored and can be revoked (`ark-permission-service.js`). The end screen's Why? sheet describes that shape in words: "You see who asks. You say yes or no. You can take a yes back." marked `BUILT, NOT RELEASED` on the same sheet. The film never stages a live grant.

## Removed for a first-time visitor

Kept for Why? sheets only: resolver, Public ID, Master ID, Secret Key, genesis, multisig as a noun (the line says `4 of 5 keys`). Out of the film: Name Gate (parked), the role picker (home's), any number without its condition on the frame, a gauge for "faster with each keeper" (not measured on the current build), Home Node, Reward Flow, Live Room, World Forge (nothing has paid out, live rooms are design only, a world is not a chain), and any "download" or "earn" button.

## Interaction list

The chrome table above, plus: drag (orbit) and wheel (zoom) in any hold, the call's end pose wins after. Tab walks the chrome in reading order. Phone: the mark, the dots and one `Menu` chip in the thumb zone holding Skip, Pause and Why?.

## Reduction test

About: your archive and the key that opens it. Dominant action: Create your FXN ID. Know now: records are ordered and copied, a receipt is final, your key is a file you hold. Hidden until asked: every reason, behind Why?. Repeated: the development-network line at S0 and S7 only. Every number beside its condition. Removable: the act label on a short screen. Leaving keeps the act reached (`defxn-intro-film-v1`). Returning: Replay intro at the dock. No WebGL: the host never sends a visitor here.
