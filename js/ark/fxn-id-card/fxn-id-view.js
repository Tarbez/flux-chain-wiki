// The FXN ID view on defxn.com (owner, 2026-10-31): the signed-in FXN ID, inside the card. Layer: app. The site's one copy of FXN
// Browser's view (ark-browser src/renderer/fxn-id-card/fxn-id-view.js), kept line for line in the same shape so the two can become
// one shared module; /account opens it (js/pages/account.js, "Open your FXN ID"). Design note: docs/design/auth/FXN-ID-CARD.md.
// A full-window view, not a box in the page: the open card shows every Public ID with its wallets, and four Public IDs of five
// wallets each need the room.
//
// It explains itself first, in four beats, once (then on demand with "How it works"): the Master ID, Public IDs, wallets, and where
// to manage them. Then the card opens (the document's master -> open segment: its plates lift and part) and the person's real Public
// IDs stand inside it as layers, each holding its wallets. The layers are page elements placed in 3D through the card's own camera
// (fxn-id-card.js viewOf), because the web player draws a fixed document and cannot add a piece per wallet at run time.
//
// It reads only what the sign-in kit shows the person on this page: identity.publicIds ({ key, name, label, at, wallets: [{ key,
// label, at, published }] }), identity.publicId (the one sites see) and identity.fileDisplayName. It changes the file only through the
// kit's own actions: addPublicId, addWallet, usePublicId, fileText. Nothing is sent anywhere and no secret is read.
//
// Keys: Up and Down move between Public IDs, Right and Left move along its wallets, Enter opens the one in focus, Escape steps back
// out (wallet, then Public ID, then the view). The same structure is a tree for screen readers; with reduced motion, or without
// WebGL2, that tree is drawn as the view itself, in 2D.
//
//   const view = openFxnIdView({ identity, explained, onExplained, onFile })   view.close()
import { createFxnIdCard, viewOf } from './fxn-id-card.js'

const K = 60   // page pixels to one card unit in the 3D layer: at the open camera this draws text at about its own size
const BEATS = [
  { state: 'master', reveal: 0, title: 'Your Master ID', text: 'This card is your Master ID. It holds everything in your FXN ID file. It never signs for a site.' },
  { state: 'open', reveal: 1, title: 'Public IDs', text: 'A site sees one of your Public IDs, never the Master ID. Each Public ID is its own key.' },
  { state: 'open', reveal: 2, title: 'Wallets', text: 'Each Public ID holds its own wallets. A wallet stays private until you publish its link.' },
  { state: 'open', reveal: 3, title: 'Manage them here', text: 'Add a Public ID or a wallet, and choose the Public ID sites see. Save the file after each change.' },
]
const short = key => (key ? `${key.slice(0, 6)}…${key.slice(-4)}` : '')
const dateOf = at => { const d = new Date(typeof at === 'number' && at < 1e12 ? at * 1000 : at); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
const el = (tag, cls, parent, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e }
const idName = (id, i) => id.name || id.label || `Public ID ${i + 1}`
const walletName = (w, j) => w.label || `Wallet ${j + 1}`

export function openFxnIdView({ identity, explained = false, onExplained = () => {}, onFile = () => {} }) {
  const dialog = el('dialog', 'ark-dialog fxn-idv', document.body)
  dialog.setAttribute('aria-labelledby', 'fxnIdvTitle')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---- frame: the head, the stage, the foot
  const head = el('div', 'fxn-idv-head', dialog)
  const titles = el('div', 'fxn-idv-titles', head)
  el('p', 'fxn-idv-kicker', titles, 'FXN ID')
  const title = el('h2', 'fxn-idv-title', titles, identity.fileDisplayName || 'Your FXN ID'); title.id = 'fxnIdvTitle'
  const howBtn = el('button', 'fxn-btn fxn-btn-quiet fxn-btn-small', head, 'How it works'); howBtn.type = 'button'
  const fileBtn = el('button', 'fxn-btn fxn-btn-quiet fxn-btn-small', head, 'File and sign-out'); fileBtn.type = 'button'
  const closeBtn = el('button', 'fxn-close', head, '✕'); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close')

  const stage = el('div', 'fxn-idv-stage', dialog)
  const worldWrap = el('div', 'fxn-idv-world-wrap', stage)
  const world = el('div', 'fxn-idv-world', worldWrap)
  const detail = el('div', 'fxn-idv-detail', stage); detail.hidden = true
  const guide = el('div', 'fxn-idv-guide', stage)
  const guideStep = el('p', 'fxn-idv-kicker', guide), guideTitle = el('h3', '', guide), guideText = el('p', '', guide)
  const guideNav = el('div', 'fxn-idv-guide-nav', guide)
  const skipBtn = el('button', 'fxn-btn fxn-btn-quiet fxn-btn-small', guideNav, 'Skip'); skipBtn.type = 'button'
  const backBtn = el('button', 'fxn-btn fxn-btn-quiet fxn-btn-small', guideNav, 'Back'); backBtn.type = 'button'
  const nextBtn = el('button', 'fxn-btn fxn-btn-primary fxn-btn-small', guideNav, 'Next'); nextBtn.type = 'button'

  // the tree: what the 3D layer shows, as a list (screen readers always; the view itself without motion or WebGL2)
  const tree = el('ul', 'fxn-idv-tree', dialog)
  tree.setAttribute('role', 'tree'); tree.setAttribute('aria-label', 'Public IDs and their wallets'); tree.tabIndex = 0

  const foot = el('div', 'fxn-idv-foot', dialog)
  const addIdForm = el('form', 'fxn-idv-add', foot)
  const addIdInput = el('input', '', addIdForm); addIdInput.name = 'label'; addIdInput.placeholder = 'Label for a new Public ID'; addIdInput.maxLength = 40; addIdInput.setAttribute('aria-label', 'Label for a new Public ID')
  const addIdBtn = el('button', 'fxn-btn fxn-btn-quiet fxn-btn-small', addIdForm, 'Add a Public ID'); addIdBtn.type = 'submit'
  const note = el('p', 'fxn-idv-note', foot); note.setAttribute('aria-live', 'polite')
  const saveBtn = el('button', 'fxn-btn fxn-btn-primary', foot, 'Save the file'); saveBtn.type = 'button'

  // ---- state
  let ids = [], sel = 0, wsel = -1, open = false, reveal = 3, beat = -1, dirty = false, last = null
  const nodes = { ids: [], wallets: [] }
  const card = createFxnIdCard()
  card.update({ name: identity.fileDisplayName || '', pinGrade: 4, passwordGrade: 4 })

  function read() {
    try { ids = identity.publicIds || [] } catch { ids = [] }
    sel = Math.min(sel, Math.max(0, ids.length - 1))
  }
  const currentKey = () => { try { return identity.publicId?.key || '' } catch { return '' } }

  // ---- the 3D layer: built from the data, placed every frame through the card's camera
  function build() {
    world.textContent = ''; nodes.ids = []; nodes.wallets = []
    ids.forEach((id, i) => {
      const layer = el('div', 'fxn-idv-layer', world)
      const top = el('div', 'fxn-idv-layer-head', layer)
      el('b', '', top, idName(id, i))
      el('small', '', top, `${short(id.key)} · ${id.wallets.length} ${id.wallets.length === 1 ? 'wallet' : 'wallets'}`)
      if (id.key === currentKey()) el('span', 'fxn-idv-badge', top, 'Sites see this one')
      const row = el('div', 'fxn-idv-coins', layer)
      layer.addEventListener('click', () => { if (sel !== i || wsel !== -1) { sel = i; wsel = -1; refresh() } })
      nodes.ids.push(layer)
      nodes.wallets.push(id.wallets.map((w, j) => {
        const coin = el('button', 'fxn-idv-coin', row); coin.type = 'button'; coin.tabIndex = -1
        el('b', '', coin, walletName(w, j)); el('small', '', coin, short(w.key))
        if (w.published != null) { coin.dataset.published = 'true'; el('span', 'fxn-idv-mark', coin, 'Published') }
        coin.addEventListener('click', (e) => { e.stopPropagation(); sel = i; wsel = j; refresh() })
        return coin
      }))
    })
    buildTree()
  }
  function buildTree() {
    tree.textContent = ''
    ids.forEach((id, i) => {
      const li = el('li', '', tree); li.setAttribute('role', 'treeitem'); li.id = `fxnIdvId${i}`; li.setAttribute('aria-expanded', String(i === sel))
      el('span', 'fxn-idv-tree-label', li, `${idName(id, i)}${id.key === currentKey() ? ' (sites see this one)' : ''}, ${id.wallets.length} ${id.wallets.length === 1 ? 'wallet' : 'wallets'}`)
      const ul = el('ul', '', li); ul.setAttribute('role', 'group')
      id.wallets.forEach((w, j) => {
        const wl = el('li', '', ul, `${walletName(w, j)}, ${short(w.key)}, ${w.published != null ? 'published' : 'private'}`)
        wl.setAttribute('role', 'treeitem'); wl.id = `fxnIdvW${i}_${j}`
      })
    })
  }
  // where each layer and coin stands, in card units above the slab's face (z 0.4): the chosen Public ID in front with its wallets,
  // the others stacked behind it as tabs. Moves ease through CSS transitions on the inner element; the outer one follows the camera.
  function layout() {
    const n = ids.length
    nodes.ids.forEach((layer, i) => {
      const rank = (i - sel + n) % n, front = rank === 0
      const behind = Math.min(rank, 4)
      layer.dataset.front = String(front)
      layer.dataset.shown = String(reveal >= 1 && open)
      layer._pos = front ? [0, -0.55, 1.15] : [0, 0.65 + behind * 0.5, 0.75 - behind * 0.04]
      layer._tilt = 34
      layer.dataset.focus = String(front && wsel === -1)
      layer.style.setProperty('--fxn-idv-delay', `${(front ? 0 : behind) * 70}ms`)
      nodes.wallets[i].forEach((coin, j) => {
        coin.dataset.shown = String(reveal >= 2 && open && front)
        coin.dataset.focus = String(front && j === wsel)
        coin.style.setProperty('--fxn-idv-delay', `${120 + j * 60}ms`)
        coin.setAttribute('aria-hidden', 'true')
      })
    })
    tree.querySelectorAll('[role="treeitem"]').forEach(t => t.setAttribute('aria-selected', 'false'))
    const active = wsel >= 0 ? `fxnIdvW${sel}_${wsel}` : `fxnIdvId${sel}`
    const a = document.getElementById(active); if (a) { a.setAttribute('aria-selected', 'true'); tree.setAttribute('aria-activedescendant', active) }
    tree.querySelectorAll(':scope > li').forEach((li, i) => li.setAttribute('aria-expanded', String(i === sel)))
  }
  // the CSS camera: the card's view, written as one matrix3d with the perspective at the camera's focal length (in page pixels), so a
  // point the page places at card units (x, y, z) lands where the player draws the same point
  function place(f, view) {
    last = view
    const p = view.fpx, { x, u, z, eye } = view, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    worldWrap.style.perspective = p.toFixed(2) + 'px'
    const m = [x[0], -u[0], z[0], 0, x[1], -u[1], z[1], 0, x[2], -u[2], z[2], 0, -K * dot(x, eye), K * dot(u, eye), -K * dot(z, eye) + p, 1]
    world.style.transform = `matrix3d(${m.map(v => +v.toFixed(6)).join(',')})`
    const D = Math.PI / 180
    let moving = false
    nodes.ids.forEach((layer) => {
      // a spring toward the layer's place: it passes it a little and settles (no motion: it is there at once)
      const goal = layer._pos || [0, 0, 1]
      if (!layer._cur || reduced) { layer._cur = goal.slice(); layer._v = [0, 0, 0] }
      layer._cur = layer._cur.map((v, k) => { layer._v[k] = layer._v[k] * 0.7 + (goal[k] - v) * 0.2; return v + layer._v[k] })
      if (layer._v.some(v => Math.abs(v) > 0.002)) moving = true
      const [X, Y, Z] = layer._cur, t = -(layer._tilt || 0) * D, c = Math.cos(t), s = Math.sin(t)
      // local x right, y down -> card x, -y; then a tilt about x toward the camera; then the place
      layer.style.transform = `matrix3d(1,0,0,0, 0,${(-c).toFixed(5)},${(-s).toFixed(5)},0, 0,${(-s).toFixed(5)},${c.toFixed(5)},0, ${(X * K).toFixed(1)},${(Y * K).toFixed(1)},${(Z * K).toFixed(1)},1) translate(-50%, -50%)`
    })
    if (moving && !springRaf) springRaf = requestAnimationFrame(() => { springRaf = 0; if (last) place(card.frame, last) })
  }
  let springRaf = 0
  card.onFrame = place

  // ---- focus with intent: the camera turns toward what is chosen (the player's orbit, and the CSS camera with it)
  let orbitRaf = 0, orbitNow = { yaw: 0, pitch: 0 }
  function aimAt(yaw, pitch) {
    cancelAnimationFrame(orbitRaf)
    const from = { ...orbitNow }, t0 = performance.now(), dur = reduced ? 0 : 640
    const step = (now) => {
      const t = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)   // passes the mark a little and settles
      orbitNow = { yaw: from.yaw + (yaw - from.yaw) * e, pitch: from.pitch + (pitch - from.pitch) * e }
      card.orbit(orbitNow.yaw, orbitNow.pitch)
      if (t < 1) orbitRaf = requestAnimationFrame(step)
    }
    orbitRaf = requestAnimationFrame(step)
  }
  function showDetail() {
    const id = ids[sel]
    detail.hidden = !open || beat >= 0 || !id
    if (detail.hidden) return
    detail.textContent = ''
    if (wsel >= 0) {
      const w = id.wallets[wsel]
      el('p', 'fxn-idv-kicker', detail, 'Wallet')
      el('h3', '', detail, walletName(w, wsel))
      el('code', '', detail, w.key)
      el('p', '', detail, w.published != null ? 'Published: anyone who reads the chain can see that this wallet belongs to this Public ID.' : 'Private: its link to this Public ID stays in your file.')
      const at = dateOf(w.at); if (at) el('p', 'fxn-idv-muted', detail, `Made ${at}`)
    } else {
      el('p', 'fxn-idv-kicker', detail, 'Public ID')
      el('h3', '', detail, idName(id, sel))
      el('code', '', detail, id.key)
      el('p', '', detail, id.key === currentKey() ? 'Sites see this Public ID when you sign in.' : 'Sites do not see this Public ID until you choose it.')
      const row = el('div', 'fxn-idv-detail-actions', detail)
      if (id.key !== currentKey()) { const b = el('button', 'fxn-btn fxn-btn-quiet fxn-btn-small', row, 'Use this Public ID'); b.type = 'button'; b.addEventListener('click', () => act(() => identity.usePublicId(id.key), 'Sites now see this Public ID.')) }
      const add = el('button', 'fxn-btn fxn-btn-quiet fxn-btn-small', row, 'Add a wallet'); add.type = 'button'
      add.addEventListener('click', () => act(async () => {
        const before = currentKey()
        if (before !== id.key) identity.usePublicId(id.key)   // the kit adds a wallet to the Public ID in use, so use this one for the moment
        try { await identity.addWallet({ label: `Wallet ${id.wallets.length + 1}` }) } finally { if (before && before !== id.key) identity.usePublicId(before) }
        dirty = true
      }, 'Wallet added. Save the file to keep it.'))
    }
  }
  function refresh() {
    layout(); showDetail()
    const coins = nodes.wallets[sel] || []
    const n = Math.max(1, coins.length), xw = wsel >= 0 ? (wsel - (n - 1) / 2) * 1.35 : 0
    if (open && beat < 0) aimAt(-xw * 2.2, wsel >= 0 ? -4 : 0)
    if (last) place(card.frame, last)
  }
  async function act(fn, done) {
    note.textContent = ''
    try { await fn(); read(); build(); refresh(); note.textContent = done; saveBtn.dataset.dirty = String(dirty) }
    catch (error) { note.textContent = error?.message || String(error) }
  }

  // ---- the guide: four beats; the card and the layers move with them
  function showBeat(i) {
    beat = i
    const b = BEATS[i]
    guide.hidden = false
    guideStep.textContent = `${i + 1} of ${BEATS.length}`; guideTitle.textContent = b.title; guideText.textContent = b.text
    backBtn.disabled = i === 0; nextBtn.textContent = i === BEATS.length - 1 ? 'Start' : 'Next'
    reveal = b.reveal; open = b.state === 'open'
    card.go(b.state)
    dialog.dataset.reveal = String(reveal)
    refresh(); nextBtn.focus()
  }
  function endGuide() {
    beat = -1; guide.hidden = true; reveal = 3; open = true; dialog.dataset.reveal = '3'
    card.go('open'); refresh(); tree.focus()
    onExplained()
  }
  nextBtn.addEventListener('click', () => (beat < BEATS.length - 1 ? showBeat(beat + 1) : endGuide()))
  backBtn.addEventListener('click', () => { if (beat > 0) showBeat(beat - 1) })
  skipBtn.addEventListener('click', endGuide)
  howBtn.addEventListener('click', () => showBeat(0))

  // ---- keys
  tree.addEventListener('keydown', (e) => {
    if (beat >= 0 || !ids.length) return
    const n = ids.length, m = ids[sel].wallets.length
    if (e.key === 'ArrowDown') { sel = (sel + 1) % n; wsel = -1 }
    else if (e.key === 'ArrowUp') { sel = (sel - 1 + n) % n; wsel = -1 }
    else if (e.key === 'ArrowRight') { if (m) wsel = Math.min(m - 1, wsel + 1) }
    else if (e.key === 'ArrowLeft') { wsel = Math.max(-1, wsel - 1) }
    else if (e.key === 'Enter') { if (wsel < 0 && m) wsel = 0 }
    else return
    e.preventDefault(); refresh()
  })
  dialog.addEventListener('cancel', (e) => {   // Escape: out of a wallet, then out of the guide, then the view closes
    if (beat >= 0) { e.preventDefault(); endGuide(); return }
    if (wsel >= 0) { e.preventDefault(); wsel = -1; refresh() }
  })
  addIdForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const label = addIdInput.value.trim() || `Public ID ${ids.length + 1}`
    act(async () => { await identity.addPublicId({ label }); dirty = true; addIdInput.value = ''; sel = ids.length }, 'Public ID added. Save the file to keep it.')
  })
  saveBtn.addEventListener('click', () => {
    try {
      const text = identity.fileText()
      const name = (String(identity.fileDisplayName || '').trim().toLowerCase().replace(/[^a-z0-9._]+/g, '-').replace(/^-+|-+$/g, '') || 'fxn-id') + '.auth.fxn'
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/vnd.flux.auth-kit' })); a.download = name; a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      dirty = false; saveBtn.dataset.dirty = 'false'
      note.textContent = `${name} is saving to your Downloads folder. Keep it in place of the old file.`
    } catch (error) { note.textContent = error?.message || String(error) }
  })
  closeBtn.addEventListener('click', () => close())
  fileBtn.addEventListener('click', () => { close(); onFile() })
  dialog.addEventListener('close', () => { card.release(); dialog.remove() })

  // ---- start
  read(); build()
  dialog.showModal()
  const flat = reduced
  const attached = card.attach(stage, { play: false, state: explained ? 'open' : 'master', name: identity.fileDisplayName || '' })
  stage.insertBefore(card.el, worldWrap)   // attach puts the card in the stage at once; it goes under the layers
  void attached.then(() => { if (card.failed || flat) dialog.dataset.flat = 'true' })   // the 2D tree is the view
  if (explained) { guide.hidden = true; open = true; reveal = 3; dialog.dataset.reveal = '3'; refresh(); tree.focus() } else showBeat(0)
  if (flat) dialog.dataset.flat = 'true'

  function close() { try { dialog.close() } catch {} }
  return { close, dialog, card }
}
