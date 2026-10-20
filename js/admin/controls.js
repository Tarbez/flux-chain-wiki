/* =====================================================================
   ADMIN EDITOR · CONTROLS (js/admin/controls.js)
   ---------------------------------------------------------------------
   Owns: the one set of control-row builders every panel draws with -- ctlField,
   ctlLabel, ctlSegField, ctlSelectField, ctlSwatchField (each takes a ctx {get, set})
   -- and the option lists those controls offer (CMS_*), read from the content modules
   that validate them (ArkLayout, ArkCanvasTransitions, ArkElementMotion,
   ArkComponents), plus the block-resolver/master lookups over ArkComponents.
   Must not: hold a copy of any option list (tests/admin-token-source.cjs), know which
   panel it is drawn in, or build a field row any other way
   (tests/admin-no-local-field-builders.cjs).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */

  /* The real DEFXN site's own design tokens and the layout enums the visual-style controls
     offer -- read straight from js/content/layout.js (ArkLayout, loaded by admin-app.html
     before this file), the one module that also validates and applies them. These used to be
     hand-copied here "because this document has no <script src>", true only of the deleted
     admin-studio.html; a copy could only drift from what cleanFrame() accepts
     (tests/admin-token-source.cjs fails if a literal copy comes back). */
  const CMS_TEXT_TOKENS = ArkLayout.TEXT_TOKENS;
  const CMS_FILL_TOKENS = ArkLayout.FILL_TOKENS;
  const CMS_BORDER_TOKENS = ArkLayout.BORDER_TOKENS;
  const CMS_FONT_TOKENS = ArkLayout.FONT_TOKENS;
  const CMS_TYPE_SIZE_TOKENS = ArkLayout.TYPE_SIZE_TOKENS;
  const CMS_RADIUS_TOKENS = ArkLayout.RADIUS_TOKENS;
  const CMS_DISPLAY_TOKENS = ArkLayout.DISPLAY_TOKENS;
  const CMS_ALIGN_TOKENS = ArkLayout.ALIGN_ITEMS_TOKENS;
  const CMS_JUSTIFY_TOKENS = ArkLayout.JUSTIFY_TOKENS;
  const CMS_LINE_HEIGHT_TOKENS = ArkLayout.LINE_HEIGHT_TOKENS;
  const CMS_BORDER_VALUES = ArkLayout.BORDER_VALUES;
  const CMS_WRAP_VALUES = ArkLayout.WRAP_VALUES;
  const CMS_OPACITY_STEPS = ArkLayout.OPACITY_STEPS;
  const CMS_OVERFLOW_VALUES = ArkLayout.OVERFLOW_VALUES;
  const CMS_FONT_WEIGHT_STEPS = ArkLayout.FONT_WEIGHT_STEPS;
  const CMS_TEXT_ALIGN_VALUES = ArkLayout.TEXT_ALIGN_VALUES;
  /* The background-transition and element-animation option lists, and the typed blocks
     the Library offers -- read from the modules that validate them (admin-app.html loads
     canvas-transitions.js, element-motion.js and components.js before this file). These were
     hand copies "because this document has no <script src>", true only of the deleted
     admin-studio.html; a copy can only drift from what sanitize() keeps
     (tests/admin-token-source.cjs fails if one comes back). */
  const CMS_CANVAS_EFFECTS = ArkCanvasTransitions.effects();
  const CMS_CANVAS_EASINGS = ArkCanvasTransitions.easings();
  const CMS_CANVAS_TRANSITIONS_DEFAULT = ArkCanvasTransitions.defaults();
  const CMS_ELEMENT_MOTION_DIRECTIONS = ArkElementMotion.directions();
  const CMS_ELEMENT_MOTION_EASINGS = ArkElementMotion.easings();
  const CMS_ELEMENT_MOTION_DEFAULT_ENTRY = ArkElementMotion.defaultEntry();
  /* the typed blocks ({ resolver, label, props }), each resolver's name and props next to each other in js/content/components.js */
  const CMS_BLOCK_RESOLVERS = ArkComponents.blocks();
  function cmsBlockResolverLabel(resolver) { return ArkComponents.labelOf(resolver); }
  function cmsBlockResolverProps(resolver) { const found = CMS_BLOCK_RESOLVERS.find((b) => b.resolver === resolver); return found ? found.props : []; }
  /* A master's editable props: a typed block's fixed list, or -- for a component made from a
     selection -- its own text/image slots, read from its tree by the one canonical
     ArkComponents.propsOf (admin-app.html loads js/content/components.js). */
  function cmsMasterProps(master) {
    if (!master) return [];
    return window.ArkComponents && ArkComponents.propsOf ? ArkComponents.propsOf(master) : cmsBlockResolverProps(master.resolver);
  }
  function cmsMasterKind(master) { return cmsBlockResolverLabel(master && master.resolver); }

  /* =========================================================================
     Step 4 (flickering-juggling-donut.md): consolidated control-builder functions.
     field/segField/selectField/swatchField used to be copy-pasted 3 separate times (the
     canvas-transitions pane, the element-motion pane, and the big per-element Frame/
     Layout/Spacing/Typography/Fill/Size/Effects block) -- all three shared the exact same
     DOM-building logic and differed only in WHERE a value is read from and WHERE a change
     is posted to. These are now ONE module-level set, parameterized by a small `ctx`
     object each caller supplies: `{ get(key), set(key, value) }`. `get` returns the
     control's current value; `set` performs the patch (and, when the change could affect
     what the panel should show next -- e.g. Display deciding whether Gap/Align/Justify
     appear -- `set` is also where a caller triggers its own re-render). This is a small,
     deliberate simplification over the 3 originals: those called an explicit re-render
     after a segField/swatchField click but not after a field/selectField change (relying
     on the plain <input>/<select> to already show its own new value); every ctx.set() here
     re-renders unconditionally instead, which is safe (these all fire on 'change', after
     the control has already lost focus, never on every keystroke) and removes the need to
     reason about which of the 4 builders needs the extra call. */
  /* opts.type 'text' or 'textarea' makes this a free-text field (the SEO panels' titles,
     URLs and summaries) -- same row, same ctx contract, the value passed through as a
     string instead of a Number; the default is the original numeric field. */
  /* The content forms (js/admin/editor.js, articles.js, assets.js, secrets.js) draw their rows
     here too, with four more options: opts.id names the control (and the label points at it --
     browser drivers and the canvas's inline edits find a field by it), opts.live writes on every
     keystroke ('input') instead of on 'change' (a page field shows on the canvas while it is
     typed), opts.rows sizes a textarea, opts.note is the row's trailing hint (a manifest key such
     as NAV.PRODUCTS), and opts.readOnly shows a value that is not edited here. */
  function ctlField(ctx, label, key, opts) {
    opts = opts || {};
    const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
    const textual = opts.type === 'text' || opts.type === 'textarea';
    const input = document.createElement(opts.type === 'textarea' ? 'textarea' : 'input'); input.className = 'ctl';
    if (opts.id) { input.id = opts.id; l.htmlFor = opts.id; }
    if (opts.rows) input.rows = opts.rows;
    if (opts.readOnly) input.readOnly = true;
    if (!textual) {
      input.type = 'number';
      input.step = opts.step != null ? String(opts.step) : '1';
      if (opts.min != null) input.min = String(opts.min);
      if (opts.max != null) input.max = String(opts.max);
    } else {
      if (opts.type === 'text') input.type = 'text';
      if (opts.placeholder) input.placeholder = opts.placeholder;
      input.spellcheck = opts.spellcheck !== false;
    }
    if (opts.name) input.name = opts.name;
    /* opts.ariaLabel: a name that says more than the visible label ("Definition heading");
       opts.data: dataset entries a reader finds the field by (the new-block form's data-prop) */
    Object.keys(opts.data || {}).forEach((k) => { input.dataset[k] = opts.data[k]; });
    input.value = String(ctx.get(key) ?? (textual ? '' : 0)); input.setAttribute('aria-label', opts.ariaLabel || label);
    input.addEventListener(opts.live && textual ? 'input' : 'change', () => { if (textual) { ctx.set(key, input.value); return; } const v = Number(input.value); if (Number.isFinite(v)) ctx.set(key, v); });
    const note = document.createElement('span'); if (opts.note) { note.className = 'field-key'; note.textContent = opts.note; } else if (opts.hint) { note.className = 'hint'; note.textContent = opts.hint; }
    row.append(l, input, note); return row;
  }
  /* What a choice is called, derived from the value it writes: 'text-muted' -> "Text muted",
     'h1' -> "H1", 700 -> "700". Segmented and select controls take a label FUNCTION of the
     value, never a list of labels parallel to the list of values: the parallel list drifted --
     the Radius control's third button read "Pill" and wrote the `control` token -- and a
     function of the value cannot point at a neighbour's (regression: tests/admin-control-labels.cjs). */
  function ctlLabel(value) {
    const text = String(value).replace(/-/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  /* A segmented control is Ark's toggle group (ArkKit.createArkToggleGroup on a light-DOM host,
     docs/ux-audit/cms.md (c) "Segmented control / toggle group"): one choice pressed, roving
     focus (one tab stop, arrows move between the choices, Enter or Space picks one), the pressed
     state written by Ark. Each control gets its own host, which holds no document listener, so a
     panel's re-render lets the old one go. Without ArkKit (a test that loads only these builders)
     the same buttons work by click, with the same aria-pressed. */
  function ctlSegField(ctx, label, key, options, labelOf) {
    const name = labelOf || ctlLabel;
    const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
    const seg = document.createElement('div'); seg.className = 'ctl-seg';
    const buttons = options.map((opt) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = name(opt);
      b.setAttribute('aria-pressed', String(ctx.get(key) === opt));
      seg.appendChild(b); return b;
    });
    const kit = window.ArkKit;
    if (kit && typeof kit.createArkToggleGroup === 'function' && typeof kit.createArkDomHost === 'function') {
      const host = kit.createArkDomHost(document);
      const refs = buttons.map((b) => host.bind(b, 'ctl-seg')), current = options.indexOf(ctx.get(key));
      let ready = false;
      kit.createArkToggleGroup(host, { rootRef: host.bind(seg, 'ctl-seg'), itemRefs: refs, selectedRefs: current >= 0 ? [refs[current]] : [],
        onValueChange: (selected) => {
          if (!ready) return;   /* Ark reports the starting selection once; that is not a choice */
          const i = refs.indexOf(selected[0]);
          if (i >= 0 && ctx.get(key) !== options[i]) ctx.set(key, options[i]);
        } });
      ready = true;
    } else {
      buttons.forEach((b, i) => b.addEventListener('click', () => { if (ctx.get(key) !== options[i]) ctx.set(key, options[i]); }));
    }
    row.append(l, seg, document.createElement('span')); return row;
  }
  /* opts.ariaLabel as in ctlField; the value is written as the option's string */
  function ctlSelectField(ctx, label, key, options, labelOf, opts) {
    const name = labelOf || ctlLabel;
    opts = opts || {};
    const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
    const s = document.createElement('select'); s.className = 'ctl'; s.setAttribute('aria-label', opts.ariaLabel || label);
    if (opts.id) { s.id = opts.id; l.htmlFor = opts.id; }   /* as in ctlField */
    options.forEach((v) => { const o = document.createElement('option'); o.value = String(v); o.textContent = name(v); s.appendChild(o); });
    s.value = String(ctx.get(key) ?? '') || String(options[0]);
    s.addEventListener('change', () => ctx.set(key, s.value));
    row.append(l, s, document.createElement('span')); return row;
  }
  function ctlSwatchField(ctx, label, key, tokens, allowNone) {
    const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
    const sw = document.createElement('div'); sw.className = 'swatches';
    const pick = (v) => ctx.set(key, v);
    if (allowNone) { const b = document.createElement('button'); b.type = 'button'; b.className = 'none'; b.title = 'None'; b.setAttribute('aria-label', 'None'); b.setAttribute('aria-pressed', String(!ctx.get(key) || ctx.get(key) === 'none')); b.addEventListener('click', () => pick('none')); sw.appendChild(b); }
    tokens.forEach((tok) => { const b = document.createElement('button'); b.type = 'button'; b.title = tok; b.setAttribute('aria-label', tok); b.style.background = `hsl(var(--${tok}))`; b.setAttribute('aria-pressed', String(ctx.get(key) === tok)); b.addEventListener('click', () => pick(tok)); sw.appendChild(b); });
    row.append(l, sw, document.createElement('span')); return row;
  }
  /* filePicker({ id, accept, label, ariaLabel, hint, onFile }) -> root: the editor's one file
     chooser, in place of the browser's native "Choose File / No file chosen" input (docs/ux-audit/
     cms.md P1-11: unstyled, English-only per browser, cut off in the rail). The native <input
     type=file> stays in the page -- visually hidden, still the tab stop, still carrying `id` and
     `accept`, so the keyboard, a screen reader and a browser driver reach the same control -- and
     a real <label class="btn"> is the button drawn over it. It names the chosen file beside the
     button, and takes a file dropped on it (the same change event, so one handler serves both).
     `onFile(file, input)` runs for a new choice (not for a cleared one); a caller that listens
     for `change` on the input itself (assets.js's New image form) needs no onFile. */
  function filePicker(opts) {
    opts = opts || {};
    const root = document.createElement('span'); root.className = 'file-pick'; root.dataset.state = 'empty';
    const input = document.createElement('input'); input.type = 'file'; input.className = 'file-pick__input';
    if (opts.id) input.id = opts.id;
    if (opts.accept) input.accept = opts.accept;
    const id = input.id || (input.id = 'file-pick-' + (filePicker.n = (filePicker.n || 0) + 1));
    if (opts.ariaLabel) input.setAttribute('aria-label', opts.ariaLabel);
    const button = document.createElement('label'); button.className = 'btn file-pick__btn'; button.htmlFor = id; button.textContent = opts.label || 'Choose a file';
    const name = document.createElement('span'); name.className = 'file-pick__name'; name.textContent = opts.empty || 'or drop a file here';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      root.dataset.state = file ? 'chosen' : 'empty';
      name.textContent = file ? file.name : (opts.empty || 'or drop a file here');
      if (file && typeof opts.onFile === 'function') opts.onFile(file, input);
    });
    root.addEventListener('dragover', (e) => { if (e.dataTransfer) { e.preventDefault(); root.dataset.over = 'true'; } });
    root.addEventListener('dragleave', () => { delete root.dataset.over; });
    root.addEventListener('drop', (e) => {
      delete root.dataset.over;
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      e.preventDefault();
      try { input.files = files; } catch (err) { return; }   /* a browser that will not take dropped files: the button still works */
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    root.append(input, button, name);
    return root;
  }
  /* Developer details: the ONE place a surface shows the names the code uses -- a copy key, a
     file, a layout key, an id, a raw value -- closed, so nothing is lost and nothing shouts
     (docs/ux-audit/cms.md P1-2: HOME.TITLE, js/content/manifests/home.js, page:/section:1/... and
     spot ids reached the person on almost every surface). rows: [[name, value], ...]; an empty
     value is skipped. `extra`: elements placed inside after the list. */
  function devDetails(rows, extra) {
    const content = document.createElement('div');
    const dl = document.createElement('dl');
    (rows || []).forEach(([name, value]) => {
      if (value === undefined || value === null || value === '') return;
      const dt = document.createElement('dt'); dt.textContent = name;
      const dd = document.createElement('dd'); const code = document.createElement('code'); code.textContent = String(value); dd.appendChild(code);
      dl.append(dt, dd);
    });
    if (dl.children.length) content.appendChild(dl);
    (extra || []).forEach((el) => { if (el) content.appendChild(el); });
    /* Ark's disclosure (js/admin/ark-host.js arkDisclosure); .dev-details is the editor's quiet
       dress for its list of names (css/admin.css) */
    return A.arkDisclosure({ label: 'Developer details', content, className: 'dev-details' });
  }
  A.provide({ CMS_ALIGN_TOKENS: CMS_ALIGN_TOKENS, CMS_BLOCK_RESOLVERS: CMS_BLOCK_RESOLVERS,
      CMS_BORDER_TOKENS: CMS_BORDER_TOKENS, CMS_BORDER_VALUES: CMS_BORDER_VALUES,
      CMS_CANVAS_EASINGS: CMS_CANVAS_EASINGS, CMS_CANVAS_EFFECTS: CMS_CANVAS_EFFECTS,
      CMS_CANVAS_TRANSITIONS_DEFAULT: CMS_CANVAS_TRANSITIONS_DEFAULT,
      CMS_DISPLAY_TOKENS: CMS_DISPLAY_TOKENS,
      CMS_ELEMENT_MOTION_DEFAULT_ENTRY: CMS_ELEMENT_MOTION_DEFAULT_ENTRY,
      CMS_ELEMENT_MOTION_DIRECTIONS: CMS_ELEMENT_MOTION_DIRECTIONS,
      CMS_ELEMENT_MOTION_EASINGS: CMS_ELEMENT_MOTION_EASINGS, CMS_FILL_TOKENS: CMS_FILL_TOKENS,
      CMS_FONT_TOKENS: CMS_FONT_TOKENS, CMS_FONT_WEIGHT_STEPS: CMS_FONT_WEIGHT_STEPS,
      CMS_JUSTIFY_TOKENS: CMS_JUSTIFY_TOKENS, CMS_LINE_HEIGHT_TOKENS: CMS_LINE_HEIGHT_TOKENS,
      CMS_OPACITY_STEPS: CMS_OPACITY_STEPS, CMS_OVERFLOW_VALUES: CMS_OVERFLOW_VALUES,
      CMS_RADIUS_TOKENS: CMS_RADIUS_TOKENS, CMS_TEXT_ALIGN_VALUES: CMS_TEXT_ALIGN_VALUES,
      CMS_TEXT_TOKENS: CMS_TEXT_TOKENS, CMS_TYPE_SIZE_TOKENS: CMS_TYPE_SIZE_TOKENS,
      CMS_WRAP_VALUES: CMS_WRAP_VALUES, cmsBlockResolverLabel: cmsBlockResolverLabel,
      cmsBlockResolverProps: cmsBlockResolverProps, cmsMasterKind: cmsMasterKind,
      cmsMasterProps: cmsMasterProps, ctlField: ctlField, ctlSegField: ctlSegField,
      ctlSelectField: ctlSelectField, ctlSwatchField: ctlSwatchField, devDetails: devDetails,
      filePicker: filePicker });
})();
