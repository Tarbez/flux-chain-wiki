// The FXN ID card in a page's stage (owner, 2026-10-31). Layer: app. The site's form of FXN Browser's showFxnIdCard
// (ark-browser src/renderer/renderer.js): the browser keeps it inside its renderer; the site keeps it here, so every page that
// shows the card drives it the same way. Design note: docs/design/auth/FXN-ID-CARD.md.
//
// Two inputs:
//   onCard(frame, info)   the create panel's contract (js/ark/auth-kit-create-panel.js, opts.onCard): after every screen and every
//                         live change a create flow calls it with info = { screen, name, pinGrade, passwordGrade, icon, total,
//                         picked }. Grades and counts only, never a PIN, a password, a key word or a recovery word. /auth's own
//                         wizard (js/pages/auth.js) builds the same info and calls the same onCard, so one card answers both flows.
//   show(state, values)   any other state of the card: 'blank' (the plain card before its build, frame 0) while nothing is being
//                         made, or a finished pose ('welcome', 'done', 'master').
//
// The card is blank until a flow starts (owner, 2026-10-31). The first step after blank builds it piece by piece at the build's own
// pace (frame 0 to welcome, the document's assembly), and only then does it run on to the step's state, so the build is always
// seen whole. Going back to blank plays the chain back the way it came. release() stops the player and gives its WebGL context
// back; the next call builds the card again.
//
//   const stage = createCardStage(element)
//   stage.show('blank')
//   stage.onCard(frame, info)     frame is the panel's own card frame (unused: the stage carries the card)
//   stage.release()
import { createFxnIdCard } from './fxn-id-card.js'
import { STATES } from '../../../assets/fxn-id-card/card-states.js'

// the panel's screens to the card's states (the browser's FXN_CARD_STATE): the file, success and done screens all show it finished
export const CARD_STATE = Object.freeze({ welcome: 'welcome', name: 'name', pin: 'pin', password: 'password', word: 'word', words: 'words', confirm: 'confirm', file: 'done', success: 'done', done: 'done' })
const BUILT = STATES.welcome   // the frame the build ends on
const frameOf = (state) => state === 'blank' ? 0 : STATES[state]
// what a blank card holds: nothing typed, nothing graded, nothing stamped
const EMPTY = Object.freeze({ name: '', pinGrade: 0, passwordGrade: 0, icon: '', picked: 0 })

export function createCardStage(stage) {
  let card = null, latest = 'blank', building = false
  function to(state, values, play) {
    if (!stage || !stage.isConnected) { release(); return }
    latest = state
    const fresh = !card || !card.el.isConnected
    if (!card) {
      card = createFxnIdCard()
      // the build runs to welcome first; there it goes on to the latest step asked for
      card.onFrame = (f) => { if (building && f >= BUILT) { building = false; if (latest !== 'welcome' && card) card.go(latest) } }
    }
    card.update(values)
    if (fresh) {
      building = play && frameOf(state) > BUILT
      const first = building ? 'welcome' : state, built = card
      // a step taken while the player is still loading waits: the card goes there once it has loaded, instead of jumping ahead
      void built.attach(stage, { play, state: first, name: values.name || '' }).then(() => { if (card === built && !building && latest !== first) step(latest) })
      return
    }
    if (!(card.ready || card.failed)) return   // attach's own then() takes it to the latest state
    step(state)
  }
  function step(state) {
    if (card.frame < BUILT && frameOf(state) > BUILT) { building = true; card.go('welcome'); return }
    if (!building) card.go(state)
  }
  function onCard(_frame, info = {}) { to(CARD_STATE[info.screen] || 'welcome', info, true) }
  function show(state, values = {}) { to(state, state === 'blank' ? Object.assign({}, EMPTY, values, { name: '' }) : values, false) }
  function release() { if (card) card.release(); card = null; building = false }
  return { onCard, show, release, get card() { return card } }
}
