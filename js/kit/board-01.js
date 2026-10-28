/* =====================================================================
   KIT BOARD 01 · ACTIONS & INPUTS (js/kit/board-01.js), and the helpers boards 01-02 share (DefxnKitA)
   ---------------------------------------------------------------------
   One renderer per element of board 01 (js/content/kit-boards.js), registered in DefxnKit (js/kit/registry.js).
   Each element is a real Ark UI part where Ark has one: a block (ArkUI.blocks.render, js/ark/blocks.js) or a
   behaviour primitive (ArkKitCatalog / ArkKit createArk*) run on Ark's light-DOM host (ArkKit.createArkDomHost)
   over markup built here. Where Ark has no part, the element is composed from Ark parts plus a little markup,
   marked `partial` with the missing piece, and shaped like an Ark part so it can be promoted into Ark UI later.

   Skins: every element carries Ark UI part names. Blocks and primitives stamp theirs; markup built here sets a
   schema key from registerArkComponents (design/ark-ui/ark-ui.components.ts) before a primitive runs, because the
   host never renames a part that is already named. So the NFT skin reaches every element (js/ark/skin-parts.js).

   Size: an element fits its tile (about 200 x 100 px at 1280 x 720). The element root `.kit-a` draws at
   zoom var(--kit-z) (css/kit-boards-a.css), so Ark's own rem sizes come out near the site's 11 px base; the
   sheet divides its own type sizes by the same zoom, so they render exactly on the --fs-* scale.

   Every value is sample data (the page header says so). Values come from the site's sample files where one fits
   (DEFXN_IDENTITY, DEFXN_RECORDS, DEFXN_RESOLVERS, DEFXN_CAPABILITIES, DEFXN_NETWORK); nothing is counted that the
   files do not hold.
   ===================================================================== */
var DefxnKitA = (function () {
  'use strict';

  /* ---- refusals: what failed, what is missing, the remedy ---- */
  function refuse(what, needs, remedy) { throw new Error(what + ' Needs: ' + needs + '. Remedy: ' + remedy + '.'); }
  function kit() {
    if (!window.ArkKit || typeof ArkKit.createArkDomHost !== 'function') refuse('The Ark kit is not loaded.', 'js/ark/vendor/ark-kit.js before js/kit/board-01.js', "list it in the 'kit' route's scripts (js/pages/catalog.js)");
    return ArkKit;
  }
  /* a createArk* primitive: the catalog has every one, the full kit the ones the site's blocks use */
  function prim(name) {
    var f = (window.ArkKitCatalog && ArkKitCatalog[name]) || (window.ArkKit && ArkKit[name]);
    if (typeof f !== 'function') refuse('Ark UI primitive ' + name + ' is not loaded.', 'js/ark/vendor/ark-kit-catalog.js', "list it in the 'kit' route's scripts (js/pages/catalog.js)");
    return f;
  }
  /* a fresh light-DOM host per element: it keeps no document listener while nothing is open */
  function host() { return kit().createArkDomHost(document); }
  /* bind an element whose text the primitive writes (a value, a copy label, a day number): the host writes
     `text` state only onto refs marked data-ark-live (design/ark-ui/blocks/host.ts applyState) */
  function live(H, el, scope) { var r = H.bind(el, scope); H.configureRef(r, { attrs: { 'data-ark-live': 'true' } }); return r; }
  function sample(name, file) {
    var v = window[name];
    if (!v) refuse('The sample ' + name + ' is not loaded.', file, "list it in the 'kit' route's scripts (js/pages/catalog.js)");
    return v;
  }

  /* ---- markup ---- */
  function h(tag, a, kids) {
    var n = document.createElement(tag);
    if (a) Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'part') n.setAttribute('data-ark-part', v);
      else if (k === 'on') Object.keys(v).forEach(function (ev) { n.addEventListener(ev, v[ev]); });
      else if (k === 'hidden') n.hidden = true;
      else n.setAttribute(k, v === true ? '' : String(v));
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var SVG = 'http://www.w3.org/2000/svg';
  function s(tag, a) {
    var n = document.createElementNS(SVG, tag);
    Object.keys(a || {}).forEach(function (k) { n.setAttribute(k, String(a[k])); });
    return n;
  }
  /* Icons: the site's own strokes (js/ark/icons.js, ArkUI.iconPaths) first. The few the site does not have yet are
     drawn here on the same 24 px grid and stroke; they belong in js/ark/icons.js once a page outside the Kit uses them. */
  var EXTRA = {
    minus: ['M5 12h14'],
    close: ['m6 6 12 12', 'M18 6 6 18'],
    'chevron-down': ['m6 9 6 6 6-6'],
    'chevron-right': ['m9 6 6 6-6 6'],
    'chevron-left': ['m15 6-6 6 6 6'],
    calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v5', 'M16 3v5'],
    upload: ['M12 16V4', 'm7 9 5-5 5 5', 'M4 20h16'],
    eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
    'eye-off': ['M3 3l18 18', 'M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9', 'M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6'],
    lock: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 6 0v3'],
    unlock: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 5.8-1'],
    command: ['m5 8 4 4-4 4', 'M12 16h7']
  };
  function icon(name) {
    var paths = (window.ArkUI && ArkUI.iconPaths && ArkUI.iconPaths[name]) || EXTRA[name];
    var svg = s('svg', { viewBox: '0 0 24 24', class: 'kit-a-icon', 'aria-hidden': 'true', focusable: 'false', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    (paths || []).forEach(function (d) { svg.appendChild(s('path', { d: d })); });
    return svg;
  }

  /* the element's root inside the page's host; `tall` draws at the smaller zoom for blocks that stand taller */
  function root(hostEl, kind, mods) {
    var r = h('div', { class: 'kit-a kit-a--' + kind + (mods ? ' ' + mods : '') });
    hostEl.appendChild(r);
    return r;
  }
  /* an Ark block (js/ark/blocks.js): a spec Ark refuses throws, so the tile names the refusal instead of drawing it */
  function block(name, props) {
    if (!window.ArkUI || !ArkUI.blocks || typeof ArkUI.blocks.render !== 'function') refuse('Ark blocks are not loaded.', 'js/ark/blocks.js after js/ark/vendor/ark-kit.js', "list it in the 'kit' route's scripts (js/pages/catalog.js)");
    return ArkUI.blocks.render({ block: name, props: props }, { onInvalid: 'throw' });
  }
  /* a button in Ark's own classes (.ark-btn, css/ark-blocks.css), named by its schema key so a skin reaches it */
  var PART = { primary: 'PRIMARY|BUTTON', secondary: 'SECONDARY|BUTTON', ghost: 'GHOST|BUTTON', danger: 'DANGER|BUTTON', link: 'LINK|BUTTON' };
  function btn(label, tone, a, kids) {
    var at = { type: 'button', class: 'ark-btn ark-btn--compact ark-btn--' + tone + (a && a['class'] ? ' ' + a['class'] : ''), 'data-tone': tone, part: PART[tone] || 'BUTTON' };
    Object.keys(a || {}).forEach(function (k) { if (k !== 'class') at[k] = a[k]; });
    return h('button', at, kids || (label ? [label] : null));
  }
  /* the Ark status-line block under an action: change its words in place (Ark's live update keeps the node) */
  function say(line, text, tone) {
    var props = { text: text };
    if (tone) props.tone = tone;
    return ArkUI.blocks.update(line, props);
  }
  /* an `ark:action` from a block inside root, by action name */
  function onAction(rootEl, map) {
    rootEl.addEventListener('ark:action', function (e) { var d = e.detail || {}; if (map[d.action]) map[d.action](d, e); });
  }
  /* free text as hex of its UTF-8 bytes (the FLX payload rule for free text) */
  function hex(text) {
    return Array.prototype.map.call(new TextEncoder().encode(text), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
  }
  function reg(id, render, info) { DefxnKit.register(id, render, info); }

  return { refuse: refuse, kit: kit, prim: prim, host: host, live: live, sample: sample, h: h, s: s, icon: icon, root: root, block: block, btn: btn, say: say, onAction: onAction, hex: hex, reg: reg };
})();

(function () {
  'use strict';
  var A = DefxnKitA, h = A.h, icon = A.icon, reg = A.reg;

  /* ---------- buttons: Ark's actions block, one press each ---------- */
  function actionButton(label, tone) {
    return function (host) {
      var r = A.root(host, 'button');
      r.appendChild(A.block('actions', { items: [{ label: label, tone: tone, action: 'kit-press' }], align: 'center' }));
    };
  }
  reg('01-primary-button', actionButton('Claim name', 'primary'), { uses: ['actions block', 'button (tone primary)'] });
  reg('01-secondary-button', actionButton('View records', 'secondary'), { uses: ['actions block', 'button (tone secondary)'] });
  reg('01-ghost-button', actionButton('Skip for now', 'ghost'), { uses: ['actions block', 'button (tone ghost)'] });
  reg('01-destructive-button', actionButton('Remove device', 'danger'), { uses: ['actions block', 'button (tone danger)'] });

  reg('01-icon-button', function (host) {
    /* an actions item with `icon` is icon-only: Ark draws it square, and its label is its spoken name and tooltip */
    A.root(host, 'button').appendChild(A.block('actions', { label: 'Name actions', align: 'center', items: [
      { label: 'Settings', icon: '⚙', tone: 'secondary', action: 'kit-settings' }, { label: 'Copy name', icon: '⧉', tone: 'ghost', action: 'kit-copy' },
      { label: 'Share link', icon: '↗', tone: 'ghost', action: 'kit-share' }, { label: 'More actions', icon: '⋯', tone: 'ghost', action: 'kit-more' }] }));
  }, { uses: ['actions block', 'button (icon)'] });

  /* ---------- split button: a joined pair (button group) and a menu (createArkMenu) ---------- */
  reg('01-split-button', function (host) {
    var r = A.root(host, 'split', 'kit-a--top');
    var wrap = h('div', { class: 'kit-a-anchor' });
    var group = h('div', { class: 'kit-a-split', part: 'BUTTONGROUP' });
    var main = A.btn('Publish', 'primary');
    var more = A.btn('', 'primary', { 'class': 'kit-a-split__more', 'aria-label': 'More ways to publish' }, [icon('chevron-down')]);
    group.appendChild(main); group.appendChild(more);
    var labels = ['Publish now', 'Save as draft', 'Publish later'];
    var menu = h('div', { class: 'kit-a-menu kit-a-menu--end', part: 'POPOVER', hidden: true });
    var items = labels.map(function (l) { var it = h('div', { class: 'kit-a-menu__item', part: 'ITEM', text: l }); menu.appendChild(it); return it; });
    wrap.appendChild(group); wrap.appendChild(menu); r.appendChild(wrap);
    var H = A.host(), refs = items.map(function (it) { return H.bind(it, 'publish-item'); });
    A.prim('createArkButtonGroup')(H, { rootRef: H.bind(group, 'split'), itemRefs: [H.bind(main, 'split-main')], label: 'Publish' });
    A.prim('createArkMenu')(H, { triggerRef: H.bind(more, 'split-more'), contentRef: H.bind(menu, 'publish-menu'), itemRefs: refs, align: 'end' });
    items.forEach(function (it) { it.addEventListener('click', function () { main.textContent = it.textContent; }); });
  }, { uses: ['createArkButtonGroup', 'createArkMenu', '.ark-btn', 'BUTTONGROUP', 'POPOVER', 'ITEM'] });

  /* ---------- segmented control and radio: Ark's choice block ---------- */
  reg('01-segmented-control', function (host) {
    A.root(host, 'choice').appendChild(A.block('choice', { label: 'Show', look: 'segmented', value: 'list', options: [{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }, { value: 'map', label: 'Map' }] }));
  }, { uses: ['choice block (look segmented)'] });
  reg('01-radio-button', function (host) {
    A.root(host, 'choice').appendChild(A.block('choice', { label: 'Network', look: 'radio', value: 'devnet', options: [{ value: 'devnet', label: 'Devnet' }, { value: 'local', label: 'Local node' }] }));
  }, { uses: ['choice block (look radio)'] });

  /* ---------- switches and checkboxes: createArkCheckbox over a real checkbox ---------- */
  /* one labelled control: the input is visually hidden, the box or track beside it is what shows */
  function checkRow(H, o) {
    /* the host writes aria-checked, not the input's own checked: the starting state is the attribute */
    var input = h('input', { type: 'checkbox', class: 'kit-a-check__input', role: o.switchRole ? 'switch' : null, checked: !!o.checked });
    var mark = o.switchRole
      ? h('span', { class: 'kit-a-switch', 'aria-hidden': 'true' }, [h('span', { class: 'kit-a-switch__thumb' }, o.icons ? [icon(o.icons[0]), icon(o.icons[1])] : null)])
      : h('span', { class: 'kit-a-box', 'aria-hidden': 'true' }, [icon('check'), icon('minus')]);
    var label = h('label', { class: 'kit-a-check' + (o.switchRole ? ' kit-a-check--switch' : '') }, [input, mark, h('span', { class: 'kit-a-check__text', part: o.switchRole ? 'SWITCH|TEXT' : 'CHECKBOX|TEXT', text: o.label })]);
    var handle = A.prim('createArkCheckbox')(H, { triggerRef: H.bind(input, 'check'), defaultChecked: !!o.checked, indeterminate: !!o.mixed });
    return { el: label, handle: handle };
  }
  function checkList(kind, rows, mods) {
    return function (host) {
      var r = A.root(host, kind, mods), H = A.host(), list = h('div', { class: 'kit-a-stack', part: 'GROUP' });
      rows.forEach(function (o) { list.appendChild(checkRow(H, o).el); });
      r.appendChild(list);
    };
  }
  reg('01-toggle-switch', checkList('switches', [{ label: 'Ask before signing', checked: true, switchRole: true }, { label: 'Show test chains', switchRole: true }]),
    { uses: ['createArkCheckbox (role switch)', 'SWITCH|TEXT'] });
  reg('01-checkbox', checkList('checks', [{ label: 'Sign with this device', checked: true }, { label: 'Keep a local copy' }, { label: 'All resolvers', mixed: true }]),
    { uses: ['createArkCheckbox', 'CHECKBOX|TEXT'] });
  reg('01-switch-icon', checkList('switches', [{ label: 'Lock the wallet', checked: true, switchRole: true, icons: ['unlock', 'lock'] }, { label: 'Hide the balance', switchRole: true, icons: ['eye', 'eye-off'] }]),
    { uses: ['createArkCheckbox (role switch)', 'SWITCH|TEXT'], partial: "Ark UI's switch has no icon slot, so the icon sits in a thumb drawn here." });

  /* ---------- fields: Ark's field block ---------- */
  reg('01-text-input', function (host) {
    A.root(host, 'field').appendChild(A.block('field', { name: 'name', label: 'Name', placeholder: 'subzero.fxn' }));
  }, { uses: ['field block (type text)'] });

  reg('01-password-input', function (host) {
    A.root(host, 'field').appendChild(A.block('field', { name: 'passphrase', label: 'Passphrase', type: 'password', autocomplete: 'current-password', reveal: true }));
  }, { uses: ['field block (type password)', 'field-reveal'] });

  reg('01-search-bar', function (host) {
    var r = A.root(host, 'search');
    var input = h('input', { type: 'search', class: 'kit-a-input__control', part: 'SEARCH|TEXT', placeholder: 'Search names and records', 'aria-label': 'Search names and records' });
    var group = h('div', { class: 'kit-a-input', part: 'INPUTGROUP' }, [h('span', { class: 'kit-a-input__addon' }, [icon('inspect')]), input, h('kbd', { class: 'kit-a-kbd', part: 'KBD|TEXT', text: '/' })]);
    r.appendChild(group);
    var H = A.host();
    A.prim('createArkInputGroup')(H, { rootRef: H.bind(group, 'search') });
  }, { uses: ['createArkInputGroup', 'INPUTGROUP', 'SEARCH|TEXT', 'KBD|TEXT'] });

  reg('01-textarea', function (host) {
    A.root(host, 'field').appendChild(A.block('field', { name: 'note', label: 'Note', type: 'textarea', rows: 2, maxLength: 140, placeholder: 'What changed in this record' }));
  }, { uses: ['field block (type textarea)', 'field-count'] });

  /* ---------- selects: createArkSelect (a custom listbox on the light-DOM host) ---------- */
  function selectControl(o) {
    var H = A.host();
    var lab = h('span', { class: 'kit-a-label', part: 'LABEL|TEXT', text: o.label });
    var value = h('span', { class: 'kit-a-trigger__value' });
    var trig = h('button', { type: 'button', class: 'kit-a-trigger', part: 'INPUT|TEXT' }, [value, icon('chevron-down')]);
    var list = h('div', { class: 'kit-a-listbox', part: 'POPOVER', hidden: true });
    var opts = o.options.map(function (t) { var op = h('div', { class: 'kit-a-option', part: 'ITEM' }, [h('span', { text: t }), icon('check')]); list.appendChild(op); return op; });
    var wrap = h('div', { class: 'kit-a-select' + (o.open ? ' kit-a-select--inline' : ''), part: 'FIELD' }, [lab, trig, list]);
    var optRefs = opts.map(function (op) { return H.bind(op, 'option'); });
    var contentRef = H.bind(list, 'listbox'), triggerRef = H.bind(trig, 'select');
    A.prim('createArkSelect')(H, { triggerRef: triggerRef, contentRef: contentRef, optionRefs: optRefs, labelRef: H.bind(lab, 'select-label'), selectedRef: optRefs[o.selected || 0],
      onValueChange: function (_ref, text) { value.textContent = text; } });
    /* "open" at rest: shown open without taking focus or arming the outside-press layer; the first press works as a select */
    if (o.open) { H.update(triggerRef, Object.assign({}, H.get(triggerRef) || {}, { open: true })); H.update(contentRef, Object.assign({}, H.get(contentRef) || {}, { open: true, hidden: false })); }
    return wrap;
  }
  reg('01-dropdown', function (host) {
    A.root(host, 'select', 'kit-a--top').appendChild(selectControl({ label: 'Network', options: ['Devnet', 'Local node', 'Offline'] }));
  }, { uses: ['createArkSelect', 'FIELD', 'INPUT|TEXT', 'POPOVER', 'ITEM'] });
  reg('01-select-menu-open', function (host) {
    A.root(host, 'select', 'kit-a--top').appendChild(selectControl({ label: 'Sign with', options: ['This device', 'iPhone 15', 'A new key'], open: true }));
  }, { uses: ['createArkSelect', 'FIELD', 'INPUT|TEXT', 'POPOVER', 'ITEM'] });

  /* ---------- file upload: createArkAttachment with a drop zone ---------- */
  reg('01-file-upload', function (host) {
    var r = A.root(host, 'upload'), H = A.host();
    var input = h('input', { type: 'file', class: 'kit-a-sr' });
    var names = h('span', { class: 'kit-a-upload__names', part: 'META|TEXT' });
    var empty = h('span', { class: 'kit-a-upload__hint', part: 'HELPER|TEXT', text: 'Drop a file, or choose one' });
    var zone = h('label', { class: 'kit-a-upload', part: 'FIELD' }, [input, icon('upload'), h('span', { class: 'kit-a-upload__words' }, [h('span', { class: 'kit-a-label', part: 'LABEL|TEXT', text: 'Attach a file' }), empty, names])]);
    r.appendChild(zone);
    A.prim('createArkAttachment')(H, { inputRef: H.bind(input, 'file'), listRef: A.live(H, names, 'files'), emptyRef: H.bind(empty, 'files-empty'), dropzoneRef: H.bind(zone, 'drop'), multiple: true });
  }, { uses: ['createArkAttachment', 'FIELD', 'LABEL|TEXT', 'HELPER|TEXT'] });

  /* ---------- inline field states: a field that passed its check, and one the page refused ---------- */
  reg('01-inline-field-states', function (host) {
    var r = A.root(host, 'states', 'kit-a--tall');
    r.appendChild(A.block('field', { name: 'name-free', label: 'Name', value: 'subzero.fxn', valid: 'Free to claim' }));
    r.appendChild(A.block('field', { name: 'name-taken', label: 'Name', value: 'radio.fxn', error: { failure: 'radio.fxn is taken.', remedy: 'try another name' } }));
  }, { uses: ['field block (valid)', 'field block (error)', 'field-valid', 'field-error'] });

  /* ---------- chips you can remove and add: Ark's tags field ---------- */
  reg('01-chips', function (host) {
    A.root(host, 'field').appendChild(A.block('field', { name: 'recipients', label: 'Recipients', type: 'tags', tags: ['alex.fxn', 'radio.fxn'], placeholder: 'name.fxn', maxTags: 6 }));
  }, { uses: ['field block (type tags)', 'field-tagbox', 'field-tag', 'field-tag-remove', 'field-add'] });

  /* ---------- pills and tags: Ark badges (each names what the holder is) and status chips ---------- */
  reg('01-pills-tags', function (host) {
    var r = A.root(host, 'tags'), H = A.host(), row = h('div', { class: 'kit-a-chips' });
    [['FXN ID', 'identity'], ['Signer', 'role'], ['Devnet', 'participation']].forEach(function (b) {
      var label = h('span', { class: 'ark-badge__label', text: b[0] });
      var el = h('span', { class: 'ark-badge', part: 'BADGE|TEXT' }, [label]);
      row.appendChild(el);
      A.prim('createArkBadge')(H, { rootRef: H.bind(el, 'badge'), labelRef: H.bind(label, 'badge-label'), meaning: b[1] });
    });
    [['Signed', 'trust'], ['Draft', 'drift']].forEach(function (t) { row.appendChild(h('span', { class: 'ark-status', 'data-tone': t[1], part: 'STATUS', text: t[0] })); });
    r.appendChild(row);
  }, { uses: ['createArkBadge', '.ark-badge', '.ark-status', 'BADGE|TEXT', 'STATUS'] });

  /* ---------- slider: createArkSlider (press the track, or arrow keys on the thumb) ---------- */
  reg('01-slider', function (host) {
    var r = A.root(host, 'slider'), H = A.host();
    var out = h('output', { class: 'kit-a-slider__value', part: 'VALUE|TEXT' });
    var fill = h('span', { class: 'kit-a-slider__fill', part: 'PROGRESSINDICATOR' });
    var thumb = h('span', { class: 'kit-a-slider__thumb', part: 'BUTTON', 'aria-label': 'Copies kept' });
    var track = h('span', { class: 'kit-a-slider__track', part: 'PROGRESS' }, [fill, thumb]);
    r.appendChild(h('div', { class: 'kit-a-field', part: 'FIELD' }, [h('div', { class: 'kit-a-field__head' }, [h('span', { class: 'kit-a-label', part: 'LABEL|TEXT', text: 'Copies kept' }), out]), track,
      h('div', { class: 'kit-a-field__head kit-a-help', part: 'HELPER|TEXT' }, [h('span', { text: '1' }), h('span', { text: '10 nodes' })])]));
    A.prim('createArkSlider')(H, { trackRef: H.bind(track, 'slider-track'), thumbRef: H.bind(thumb, 'slider-thumb'), min: 1, max: 10, step: 1, value: 6,
      onValueChange: function (v) { out.textContent = v + ' of 10'; fill.style.width = ((v - 1) / 9 * 100) + '%'; thumb.setAttribute('aria-valuetext', v + ' of 10'); } });
  }, { uses: ['createArkSlider', 'FIELD', 'PROGRESS', 'VALUE|TEXT'] });

  /* ---------- stepper: Ark's number field with its minus and plus ---------- */
  reg('01-stepper-input', function (host) {
    A.root(host, 'field').appendChild(A.block('field', { name: 'signers', label: 'Signers needed', type: 'number', value: 6, min: 1, max: 10, step: 1, stepper: true }));
  }, { uses: ['field block (type number)', 'field-step'] });

  /* ---------- date input: createArkDatePicker (a popover holding createArkCalendar) ---------- */
  reg('01-date-input', function (host) {
    var r = A.root(host, 'date', 'kit-a--top'), H = A.host();
    var fmt = function (d) { return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
    var today = new Date();
    var value = h('span', { class: 'kit-a-trigger__value', text: fmt(today) });
    var trig = h('button', { type: 'button', class: 'kit-a-trigger', part: 'INPUT|TEXT', 'aria-label': 'Choose a date' }, [value, icon('calendar')]);
    var label = h('span', { class: 'kit-a-cal__label', part: 'LABEL|TEXT' });
    var prev = h('button', { type: 'button', class: 'kit-a-cal__nav', part: 'GHOST|BUTTON', 'aria-label': 'Previous month' }, [icon('chevron-left')]);
    var next = h('button', { type: 'button', class: 'kit-a-cal__nav', part: 'GHOST|BUTTON', 'aria-label': 'Next month' }, [icon('chevron-right')]);
    var grid = h('div', { class: 'kit-a-cal__grid' });
    var days = [];
    for (var i = 0; i < 42; i++) { var d = h('button', { type: 'button', class: 'kit-a-cal__day' }); grid.appendChild(d); days.push(d); }
    var panel = h('div', { class: 'kit-a-cal', part: 'POPOVER', hidden: true }, [h('div', { class: 'kit-a-cal__head' }, [prev, label, next]), grid]);
    r.appendChild(h('div', { class: 'kit-a-select', part: 'FIELD' }, [h('span', { class: 'kit-a-label', part: 'LABEL|TEXT', text: 'Valid from' }), trig, panel]));
    A.prim('createArkDatePicker')(H, { triggerRef: H.bind(trig, 'date'), contentRef: H.bind(panel, 'calendar'), gridRef: H.bind(grid, 'calendar-grid'),
      dayRefs: days.map(function (d) { return A.live(H, d, 'day'); }), labelRef: A.live(H, label, 'month'), prevRef: H.bind(prev, 'month-prev'), nextRef: H.bind(next, 'month-next'),
      selectedDate: today, weekStartsOn: 1, locale: 'en-GB', valueRef: A.live(H, value, 'date-value'), formatDate: fmt });
  }, { uses: ['createArkDatePicker', 'createArkCalendar', 'FIELD', 'INPUT|TEXT', 'POPOVER'] });

  /* ---------- command input: createArkCommandSurface (type to filter, Enter or a press to run) ---------- */
  reg('01-command-input', function (host) {
    var r = A.root(host, 'command', 'kit-a--top'), H = A.host();
    var input = h('input', { class: 'kit-a-input__control', part: 'SEARCH|TEXT', placeholder: 'Type a command', 'aria-label': 'Command' });
    var group = h('div', { class: 'kit-a-input', part: 'INPUTGROUP' }, [h('span', { class: 'kit-a-input__addon' }, [icon('command')]), input, h('kbd', { class: 'kit-a-kbd', part: 'KBD|TEXT', text: '⌘K' })]);
    var cmds = ['Claim a name', 'Sign a record', 'Open the explorer', 'Add a device'];
    var list = h('div', { class: 'kit-a-listbox', part: 'COMMANDLIST', hidden: true });
    var opts = cmds.map(function (c) { var o = h('div', { class: 'kit-a-option', part: 'ITEM', text: c }); list.appendChild(o); return o; });
    var empty = h('div', { class: 'kit-a-option kit-a-option--empty', part: 'EMPTY|TEXT', text: 'No command matches.', hidden: true });
    list.appendChild(empty);
    var ran = h('p', { class: 'kit-a-help', part: 'HELPER|TEXT', role: 'status', text: 'Press a command, or type and press Enter.' });
    r.appendChild(h('div', { class: 'kit-a-select', part: 'COMMAND' }, [group, list, ran]));
    A.prim('createArkInputGroup')(H, { rootRef: H.bind(group, 'command-group') });
    A.prim('createArkCommandSurface')(H, { inputRef: H.bind(input, 'command'), contentRef: H.bind(list, 'commands'), optionRefs: opts.map(function (o) { return H.bind(o, 'command-item'); }),
      emptyRef: H.bind(empty, 'commands-empty'), openOnFocus: true, onCommand: function (_ref, v) { ran.textContent = 'Chose: ' + v + '. Nothing runs on this page.'; } });
  }, { uses: ['createArkCommandSurface', 'createArkInputGroup', 'COMMAND', 'COMMANDLIST', 'ITEM'] });

  /* ---------- copy control: the code block's copy (createArkCodeBlock), which says "Copied" ---------- */
  reg('01-copy-control', function (host) {
    var r = A.root(host, 'copy'), H = A.host(), name = A.sample('DEFXN_IDENTITY', 'js/content/identity-sample.js').name;
    var code = h('code', { class: 'kit-a-copy__code', part: 'CODE|TEXT', text: name });
    var copy = A.btn('Copy', 'secondary', { 'class': 'kit-a-copy__btn' });
    var content = h('div', { class: 'kit-a-input kit-a-copy', part: 'INPUTGROUP' }, [h('span', { class: 'kit-a-input__addon kit-a-copy__tag', part: 'LABEL|TEXT', text: 'FXN ID' }), code, copy]);
    /* the code block's fold is not used here: its trigger stays hidden and the content stays open */
    var fold = h('button', { type: 'button', hidden: true });
    r.appendChild(fold); r.appendChild(content);
    A.prim('createArkCodeBlock')(H, { triggerRef: H.bind(fold, 'copy-fold'), contentRef: H.bind(content, 'copy-content'), codeRef: H.bind(code, 'copy-code'),
      copyTriggerRef: A.live(H, copy, 'copy'), defaultOpen: true, copyLabel: 'Copy', copiedLabel: 'Copied', copyUnavailableLabel: 'Copy blocked here' });
  }, { uses: ['createArkCodeBlock (copy)', 'INPUTGROUP', 'CODE|TEXT', 'SECONDARY|BUTTON'] });

  /* ---------- CTA tile: Ark's card with its one action ---------- */
  reg('01-cta-tile', function (host) {
    A.root(host, 'cta', 'kit-a--tall').appendChild(A.block('card', { eyebrow: 'Next step', title: 'Claim your name', description: 'Your FXN ID starts with one flat name, like subzero.fxn.',
      action: { label: 'Claim a name', tone: 'primary', action: 'kit-cta' } }));
  }, { uses: ['card block (action)'] });

  /* ---------- filter control: Ark's choice, each option with the count the network sample holds ---------- */
  reg('01-filter-control', function (host) {
    var r = A.root(host, 'filter'), N = A.sample('DEFXN_NETWORK', 'js/content/network-data.js');
    var count = {};
    N.KIND.forEach(function (k) { count[k] = (count[k] || 0) + 1; });
    var kinds = ['identity', 'resolver', 'token', 'network'].filter(function (k) { return count[k]; });
    var said = function (k) { return count[k] + ' chains shown'; };
    r.appendChild(A.block('choice', { label: 'Chain kind', look: 'segmented', value: kinds[0], action: 'kit-filter',
      options: kinds.map(function (k) { return { value: k, label: k.charAt(0).toUpperCase() + k.slice(1), count: count[k] }; }) }));
    var line = A.block('status-line', { text: said(kinds[0]) });
    r.appendChild(line);
    A.onAction(r, { 'kit-filter': function (d) { if (count[d.value]) line = A.say(line, said(d.value)); } });
  }, { uses: ['choice block (look segmented)', 'choice-count', 'status-line block'], partial: "Ark's choice takes one value, so a filter that allows several is not built." });

  /* ---------- confirmation buttons and a form footer: actions block + status line ---------- */
  reg('01-confirmation-buttons', function (host) {
    var r = A.root(host, 'confirm');
    var line = A.block('status-line', { text: 'Remove iPhone 15 from your FXN ID?' });
    r.appendChild(line);
    r.appendChild(A.block('actions', { label: 'Remove a device', items: [{ label: 'Keep it', tone: 'secondary', action: 'keep' }, { label: 'Remove', tone: 'danger', action: 'remove' }] }));
    A.onAction(r, {
      keep: function () { line = A.say(line, 'Kept. Nothing changed.', 'trust'); },
      remove: function () { line = A.say(line, 'Removed in this sample only. No key changed.', 'warning'); }
    });
  }, { uses: ['actions block', 'status-line block'] });

  reg('01-form-submit-footer', function (host) {
    var r = A.root(host, 'footer');
    var line = A.block('status-line', { text: '2 changes not saved', tone: 'drift' });
    var bar = h('div', { class: 'kit-a-footer', part: 'TOOLBAR' }, [line, A.block('actions', { align: 'end', items: [{ label: 'Discard', tone: 'ghost', action: 'discard' }, { label: 'Save', tone: 'primary', action: 'save' }] })]);
    r.appendChild(bar);
    A.onAction(r, {
      discard: function () { line = A.say(line, 'Changes discarded', 'hidden'); },
      save: function () { line = A.say(line, 'Saved in this sample only', 'trust'); }
    });
  }, { uses: ['actions block', 'status-line block', 'TOOLBAR'] });
})();
