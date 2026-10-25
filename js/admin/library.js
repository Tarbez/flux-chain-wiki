/* =====================================================================
   ADMIN EDITOR · LIBRARY (js/admin/library.js)
   ---------------------------------------------------------------------
   Owns: the Library tab -- every component a person can put on a page, DERIVED, never listed
   here: the Ark block registry (ArkComponents.blocks(), read from ArkKit.describeArkBlocks),
   the legacy typed blocks Ark has no successor for yet, and the components already saved (made
   from a selection, or configured here). Grouped Text / Media / Layout / Data / Navigation /
   Captured, searchable, each with a live mini-render (docs/ux-audit/cms.md P2-5 and IA);
   inserting one at a reported insertion point (the in-page picker); editing a saved definition.
   Also owns THE schema-driven prop editor, cmsBlockFields(): one field per prop of the block's
   schema (Ark's prop-schema vocabulary -- line, text with [[term]] glossary markup, href through
   the site's link picker, enum as a segmented control or a select, number and value with absent
   kept distinct from 0, objects, lists, table rows, nested blocks), drawn with the shared ctl*
   builders. The toolbar's Component instance section (js/admin/toolbar-sections.js) draws an
   instance's overrides with the same editor.
   Saving: a block is checked by the SDK's validateCmsArkBlock in strict mode
   (ArkComponents.problems): "Create block" and "Insert" refuse while it has refusals, and Save
   refuses the components draft while any saved block has one (js/admin/save.js). A refusal
   names the field (by its label path), the failure, what it needs and the remedy.
   The Card slot block's field ('cardslot') mounts the NFT session's slot editor (DefxnCardComponents.editor) after loading
   its scripts here; FLX text in, FLX text out, one change per step, destroyed when its field is repainted.
   Must not: mutate the components draft itself: every command goes to the preview
   (postCmsComponentsCommand), which computes it once and relays the whole draft back.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, showLeft = A.showLeft, $ = A.$, cmsPreview = A.cmsPreview, h = A.h,
      postCmsComponentsCommand = A.postCmsComponentsCommand, cmsNextComponentId = A.cmsNextComponentId,
      toast = A.toast, ic = A.ic, cmsMasterKind = A.cmsMasterKind, ctlField = A.ctlField,
      ctlSelectField = A.ctlSelectField, ctlSegField = A.ctlSegField, refuse = A.refuse,
      CMS_BLOCK_RESOLVERS = A.CMS_BLOCK_RESOLVERS, linkPickerEl = A.linkPickerEl, devDetails = A.devDetails;

  /* ===================================================================================
     The schema-driven prop editor
     =================================================================================== */
  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const sentence = (text) => { const t = String(text || ''); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; };
  /* what a choice is called, derived from the value it writes ('secondary' -> "Secondary", '16/9' -> "16/9") */
  const choiceName = (v) => sentence(String(v).replace(/[-_]/g, ' '));
  const defaultName = (schema, short) => 'Default' + (!short && schema.default != null ? ' (' + choiceName(schema.default).toLowerCase() + ')' : '');
  function hintOf(schema, extra) {
    const help = schema.help ? sentence(schema.help) : '';
    const said = schema.required ? (help ? 'Required — ' + help.charAt(0).toLowerCase() + help.slice(1) : 'Required') : help;
    return [said, extra].filter(Boolean).join('. ');
  }
  function blockGlossary() { return window.ArkGlossary && ArkGlossary.map ? ArkGlossary.map : {}; }

  /* An Ark block's fields come from the SDK (ArkCmsBlocks.getCmsArkBlockEditorFields, generated
     from the same registry ArkKit carries; tests/components-library.cjs holds the two equal); a
     legacy or captured component's from ArkComponents.fieldsOf. */
  function cmsFieldsFor(master) {
    if (!master) return [];
    if (ArkComponents.isArk(master.resolver) && window.ArkCmsBlocks && typeof ArkCmsBlocks.getCmsArkBlockEditorFields === 'function') {
      try { return ArkCmsBlocks.getCmsArkBlockEditorFields(ArkComponents.arkBlockName(master.resolver)); } catch (e) { /* a block this SDK does not know yet: the registry's own description */ }
    }
    return ArkComponents.fieldsOf(master);
  }
  const fieldsOfBlock = (name) => cmsFieldsFor({ resolver: ArkComponents.arkResolverFor(name), props: {} });

  /* A link value the picker can show. route:/doc:/url: as they are; a plain site path the
     catalogue knows reads as that page ('/about' -> route:about); anything else as an address. */
  function pickerValue(value) {
    if (!value || /^(route|doc|url):/.test(value)) return value || '';
    const catalog = (window.ArkUI && ArkUI.pageCatalog) || {};
    const key = Object.keys(catalog).find((k) => catalog[k] && catalog[k].path === value);
    return key ? 'route:' + key : 'url:' + value;
  }
  /* the same, written: an Ark example's plain '/about' becomes route:about when a block is made
     from it, so the site's router opens it in place instead of reloading the page */
  function taggedLinks(fields, props) {
    const walk = (schema, value) => {
      if (value == null) return value;
      if (schema.kind === 'href' && typeof value === 'string' && /^\//.test(value)) { const v = pickerValue(value); return /^route:/.test(v) ? v : value; }
      if (schema.kind === 'object' && isObj(value)) { Object.keys(schema.fields || {}).forEach((k) => { if (k in value) value[k] = walk(schema.fields[k], value[k]); }); return value; }
      if (schema.kind === 'list' && Array.isArray(value)) return value.map((item) => walk(schema.of || {}, item));
      return value;
    };
    (fields || []).forEach((f) => { if (f.prop in props) props[f.prop] = walk(f, props[f.prop]); });
    return props;
  }

  /* A table row's cells are keyed by the block's own columns: the cells a `record` shows are the
     keys named by the sibling list whose items carry a `key` (a table's `columns`), plus any key
     the row already holds -- decided by structure, never by knowing it is a table. */
  function recordKeys(o, row) {
    const keys = [];
    (o.fields || []).forEach((f) => {
      if (f.kind !== 'list' || !f.of || f.of.kind !== 'object' || !(f.of.fields || {}).key) return;
      const list = o.all ? o.all()[f.prop] : null;
      (Array.isArray(list) ? list : []).forEach((item) => { if (isObj(item) && typeof item.key === 'string' && item.key && !keys.some((k) => k.key === item.key)) keys.push({ key: item.key, label: item.label || item.key }); });
    });
    Object.keys(isObj(row) ? row : {}).forEach((key) => { if (!keys.some((k) => k.key === key)) keys.push({ key, label: key }); });
    return keys;
  }

  function objectCtx(ctx, key) {
    return {
      get: (field) => { const v = ctx.get(key); return isObj(v) ? v[field] : undefined; },
      set: (field, value) => {
        const next = Object.assign({}, isObj(ctx.get(key)) ? ctx.get(key) : {});
        if (value === undefined) delete next[field]; else next[field] = value;
        ctx.set(key, next);
      }
    };
  }
  function listCtx(ctx, key, empty) {
    const list = () => (Array.isArray(ctx.get(key)) ? ctx.get(key) : []);
    return {
      list,
      get: (i) => list()[i],
      set: (i, value) => { const next = list().slice(); next[i] = value === undefined ? clone(empty) : value; ctx.set(key, next); }
    };
  }

  /* ===================================================================================
     The Card slot's editor (kind 'cardslot'): the NFT session's DefxnCardComponents.editor. Its scripts load here, once, when
     a card slot field first draws; a visitor to the site never loads them. The text it hands on is the slot's FLX (DFXNCOMP1).
     =================================================================================== */
  const CARD_KIT = [['js/nft/timeline.js', 'DefxnTimeline'], ['js/nft/timeline-editor.js', 'DefxnTimelineEditor'], ['js/nft/card-components.js', 'DefxnCardComponents']];
  const CARD_KIT_SHEET = 'css/nft-card.css';
  const loadFile = (el, name) => new Promise((ok, fail) => { el.onload = ok; el.onerror = () => fail(new Error('could not load ' + name)); document.head.appendChild(el); });
  let cardKit = null;
  function loadCardKit() {
    if (!cardKit) {
      cardKit = CARD_KIT.reduce((chain, [src, global]) => chain.then(() => {
        if (window[global]) return null;
        const el = document.createElement('script'); el.src = src;
        return loadFile(el, src);
      }), Promise.resolve()).then(() => {
        /* the styles do not hold the editor back: unstyled, it still works, and a failure is said in the console */
        if (!document.querySelector('link[data-card-kit]')) {
          const el = document.createElement('link'); el.rel = 'stylesheet'; el.href = CARD_KIT_SHEET; el.setAttribute('data-card-kit', '');
          el.onerror = () => console.error('The card slot editor\'s styles did not load (could not load ' + CARD_KIT_SHEET + '). The editor works unstyled; reload the editor to try again.');
          document.head.appendChild(el);
        }
        return null;
      }).then(() => {
        if (!window.DefxnCardComponents) throw new Error('js/nft/card-components.js loaded and defined no DefxnCardComponents');
        return window.DefxnCardComponents;
      });
      cardKit.catch(() => { cardKit = null; });   /* a failed load may be tried again */
    }
    return cardKit;
  }
  /* the editors on screen: one whose field was repainted (its host left the document) is destroyed on the next draw or mount */
  let slotEditors = [];
  function pruneSlotEditors() {
    slotEditors = slotEditors.filter((e) => { if (e.host.isConnected) return true; try { e.editor.destroy(); } catch (error) { /* already gone */ } return false; });
  }
  /* The field: with no slot saved, one button (absent is a state of its own, not a banner nobody chose); with one, the editor.
     Each change the editor reports is one ctx.set, so one undoable step. */
  function cardSlotEl(schema, key, ctx, label, path) {
    pruneSlotEditors();
    const box = h('fieldset', { class: 'lib-cardslot', 'data-prop': path, 'data-prop-row': path }, h('legend', { text: label }));
    const hint = hintOf(schema); if (hint) box.appendChild(h('p', { class: 'hint', text: hint }));
    const body = h('div', { class: 'lib-cardslot-body' });
    box.appendChild(body);
    const say = (text, ...buttons) => { body.textContent = ''; body.appendChild(h('p', { class: 'hint', role: 'status', text })); buttons.forEach((b) => body.appendChild(b)); };
    const button = (text, run, quiet) => h('button', { type: 'button', class: 'btn small' + (quiet ? ' quiet' : ''), text, onclick: run });
    const fresh = (K) => K.encode({ kind: K.KINDS[0], timeline: null });
    /* resolves to DefxnCardComponents once the editor is mounted, or to null after saying what failed */
    const start = (initial) => {
      say('Loading the card slot editor...');
      return loadCardKit().then((K) => {
        body.textContent = '';
        try { slotEditors.push({ host: body, editor: K.editor(body, { value: initial, onChange: (text) => { if (body.isConnected) ctx.set(key, text); } }) }); }
        catch (error) {
          say('The saved slot text cannot be read (' + (error && error.message ? error.message : error) + '). It needs slot text written by this editor. Start again to replace it with a new slot.',
            button('Start again', () => { const text = fresh(K); ctx.set(key, text); start(text); }));
          return null;
        }
        return K;
      }, (error) => {
        say('The card slot editor did not load: ' + error.message + '. It needs js/nft/timeline.js, js/nft/timeline-editor.js and js/nft/card-components.js from this site. Check the connection, then try again, or reload the editor.',
          button('Try again', () => start(initial)));
        return null;
      });
    };
    const saved = ctx.get(key);
    if (typeof saved === 'string' && saved !== '') start(saved);
    else say('No card is placed here yet. Until you choose what the card makes, this block shows nothing.',
      button('Choose what the card makes', () => { start(undefined).then((K) => { if (K) ctx.set(key, fresh(K)); }); }));
    return box;
  }

  /* One prop's editor. `ctx` is { get(key), set(key, value) } where undefined means "absent";
     `o` carries { id (unique id prefix), aria (accessible-name prefix), path (where this sits),
     fields (the block's top-level fields), all() (its current props), rerender() (after a
     structural change), marked(prop) (an instance's overridden top-level prop) }. */
  function blockFieldEl(schema, key, ctx, o) {
    const label = schema.label || String(key), path = o.path ? o.path + '.' + key : String(key);
    const aria = (o.aria ? o.aria + ' ' : '') + label;
    const common = { ariaLabel: aria, data: { prop: path } };
    const text = { get: (k) => { const v = ctx.get(k); return v == null ? '' : String(v); }, set: (k, v) => ctx.set(k, v === '' ? undefined : v) };
    const tag = (row) => { if (row && row.dataset) row.dataset.propRow = path; return row; };
    /* the choices are the schema's own values ('' = absent: the block's default) */
    const segOrSelect = (schemaChoices, name, sctx) => {
      const row = schemaChoices.length <= 4
        ? ctlSegField(sctx, label, key, schemaChoices, (v) => (v === '' ? defaultName(schema, true) : name(v)))
        : ctlSelectField(sctx, label, key, schemaChoices, (v) => (v === '' ? defaultName(schema) : name(v)), { ariaLabel: aria });
      const control = row.children[1];
      if (control && control.classList.contains('ctl-seg')) { control.setAttribute('role', 'group'); control.setAttribute('aria-label', aria); control.dataset.prop = path; }
      else if (control) control.dataset.prop = path;
      const hint = hintOf(schema); if (hint) { row.children[2].className = 'hint'; row.children[2].textContent = hint; }
      return tag(row);
    };
    switch (schema.kind) {
      case 'line': case 'slot': case 'id':
        return tag(ctlField(text, label, key, Object.assign({ type: 'text', hint: hintOf(schema) }, common)));
      case 'text':
        return tag(ctlField(text, label, key, Object.assign({ type: 'textarea', rows: 3, hint: hintOf(schema) }, common)));
      case 'number': {
        /* absent is not 0: an empty box removes the prop (the block's default applies); it never writes 0 */
        const range = schema.min != null || schema.max != null ? 'From ' + (schema.min != null ? schema.min : 'any') + ' to ' + (schema.max != null ? schema.max : 'any') : '';
        const row = ctlField({ get: text.get, set: (k, v) => { const t = String(v).trim(); ctx.set(k, t === '' ? undefined : (Number.isFinite(Number(t)) ? Number(t) : t)); } },
          label, key, Object.assign({ type: 'text', hint: hintOf(schema, [range, schema.required ? '' : 'Empty uses the default'].filter(Boolean).join('; ')) }, common));
        const input = row.querySelector('input');
        if (input) { input.type = 'number'; input.step = 'any'; input.inputMode = 'decimal'; if (schema.min != null) input.min = String(schema.min); if (schema.max != null) input.max = String(schema.max); }
        return tag(row);
      }
      case 'value':
        /* a measured value: a number, words, or nothing -- and nothing is "No reading", never 0 */
        return tag(ctlField({ get: text.get, set: (k, v) => { const t = String(v).trim(); ctx.set(k, t === '' ? undefined : (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : v)); } },
          label, key, Object.assign({ type: 'text', hint: hintOf(schema, 'Leave empty when there is no reading: it shows "No reading", never 0') }, common)));
      case 'boolean': {
        const choices = schema.required ? ['true', 'false'] : ['', 'true', 'false'];
        return segOrSelect(choices, (v) => (v === 'true' ? 'Yes' : 'No'), { get: (k) => { const v = ctx.get(k); return v === true ? 'true' : v === false ? 'false' : ''; }, set: (k, v) => ctx.set(k, v === '' ? undefined : v === 'true') });
      }
      case 'enum': {
        const values = Array.isArray(schema.values) ? schema.values.slice() : [];
        return segOrSelect(schema.required ? values : [''].concat(values), choiceName, text);
      }
      case 'href': {
        const box = linkPickerEl(label, (o.id || 'lib') + '-' + path.replace(/[^\w-]+/g, '-'), pickerValue(ctx.get(key)), (v) => ctx.set(key, /^(route|doc|url):$/.test(v) ? undefined : v));
        box.dataset.prop = path; box.dataset.propRow = path;
        const hint = hintOf(schema); if (hint) box.appendChild(h('p', { class: 'hint', text: hint }));
        return box;
      }
      case 'cardslot':
        return cardSlotEl(schema, key, ctx, label, path);
      case 'object': {
        const group = h('fieldset', { 'data-prop': path, 'data-prop-row': path }, h('legend', { text: label }));
        const hint = hintOf(schema); if (hint) group.appendChild(h('p', { class: 'hint', text: hint }));
        if (!isObj(ctx.get(key)) && !schema.required) {
          group.appendChild(h('button', { type: 'button', class: 'btn small', text: 'Add ' + label.toLowerCase(), onclick: () => { ctx.set(key, {}); if (o.rerender) o.rerender(); } }));
          return group;
        }
        const sub = objectCtx(ctx, key);
        Object.keys(schema.fields || {}).forEach((field) => group.appendChild(blockFieldEl(schema.fields[field], field, sub, Object.assign({}, o, { path, aria }))));
        if (!schema.required) group.appendChild(h('button', { type: 'button', class: 'btn small quiet', text: 'Remove ' + label.toLowerCase(), onclick: () => { ctx.set(key, undefined); if (o.rerender) o.rerender(); } }));
        return group;
      }
      case 'record': {
        const group = h('fieldset', { 'data-prop': path, 'data-prop-row': path }, h('legend', { text: label }));
        const sub = objectCtx(ctx, key), keys = recordKeys(o, ctx.get(key));
        if (!keys.length) group.appendChild(h('p', { class: 'hint', text: 'No columns yet: add a column first, then fill in its value here.' }));
        keys.forEach((k) => group.appendChild(blockFieldEl(Object.assign({}, schema.values || { kind: 'value' }, { label: k.label, required: false }), k.key, sub, Object.assign({}, o, { path, aria }))));
        return group;
      }
      case 'list': case 'blocks': {
        const of = schema.kind === 'blocks' ? { kind: 'spec', label: 'Block' } : (schema.of || { kind: 'line', label: 'Item' });
        const empty = of.kind === 'object' || of.kind === 'record' ? {} : of.kind === 'spec' ? { block: firstBlockName(), props: {} } : '';
        const lc = listCtx(ctx, key, empty), items = lc.list();
        const group = h('fieldset', { 'data-prop': path, 'data-prop-row': path }, h('legend', { text: label + (items.length ? ' (' + items.length + ')' : '') }));
        const hint = hintOf(schema, [schema.minItems ? 'At least ' + schema.minItems : '', schema.maxItems ? 'at most ' + schema.maxItems : ''].filter(Boolean).join(', ')); if (hint) group.appendChild(h('p', { class: 'hint', text: hint }));
        const move = (from, to) => { const next = items.slice(); const [it] = next.splice(from, 1); next.splice(to, 0, it); ctx.set(key, next); if (o.rerender) o.rerender(); };
        items.forEach((item, i) => {
          const name = (of.label || 'Item') + ' ' + (i + 1);
          const box = h('div', { class: 'lib-item', 'data-item': String(i) });
          const head = h('div', { class: 'lib-item-head' }, h('span', { text: name }));
          const tool = (icon, what, run, why) => { const b = h('button', { type: 'button', class: 'ibtn', 'aria-label': what + ' ' + name, title: what }); b.innerHTML = ic(icon); b.addEventListener('click', run); refuse(b, why || ''); return b; };
          head.append(tool('up', 'Move up', () => move(i, i - 1), i === 0 ? 'Already first' : ''), tool('down', 'Move down', () => move(i, i + 1), i === items.length - 1 ? 'Already last' : ''),
            tool('trash', 'Remove', () => { ctx.set(key, items.filter((_x, j) => j !== i)); if (o.rerender) o.rerender(); }, schema.minItems && items.length <= schema.minItems ? 'This list needs at least ' + schema.minItems + ': add another before removing this one' : ''));
          box.appendChild(head);
          const itemPath = path + '.' + i, itemAria = aria + ' ' + (i + 1);
          if (of.kind === 'object') {
            const sub = objectCtx(lc, i);
            Object.keys(of.fields || {}).forEach((field) => box.appendChild(blockFieldEl(of.fields[field], field, sub, Object.assign({}, o, { path: itemPath, aria: itemAria }))));
          } else if (of.kind === 'spec') box.appendChild(specEl(lc, i, Object.assign({}, o, { path: itemPath, aria: itemAria })));
          else box.appendChild(blockFieldEl(Object.assign({}, of, { label: of.kind === 'record' ? name : 'Value' }), i, lc, Object.assign({}, o, { path, aria: itemAria })));
          group.appendChild(box);
        });
        const add = h('button', { type: 'button', class: 'btn small', text: '+ Add ' + String(of.label || 'item').toLowerCase() });
        refuse(add, schema.maxItems && items.length >= schema.maxItems ? 'At the limit: this holds at most ' + schema.maxItems + '. Remove one to add another.' : '');
        add.addEventListener('click', () => { ctx.set(key, items.concat([clone(empty)])); if (o.rerender) o.rerender(); });
        group.appendChild(add);
        return group;
      }
      default:
        /* a prop kind this editor has not learned is said, never skipped */
        return h('p', { class: 'hint lib-unknown-kind', 'data-prop-row': path, text: label + ': this kind of field ("' + schema.kind + '") has no editor here yet. Its saved value is kept as it is.' });
    }
  }
  /* a typed block (legacy, or the site's own such as the Card slot) has no Ark block behind it: no thumbnail, example or glossary */
  const isTyped = (b) => b.legacy || b.site;
  function firstBlockName() { const ark = CMS_BLOCK_RESOLVERS.find((b) => !isTyped(b)); return ark ? ark.name : ''; }
  /* a nested block spec ({ block, props }) inside a tab or a section: its type, then its own fields */
  function specEl(lc, i, o) {
    const spec = isObj(lc.get(i)) ? lc.get(i) : { block: firstBlockName(), props: {} };
    const box = h('div', { class: 'lib-spec' });
    const blockNames = CMS_BLOCK_RESOLVERS.filter((b) => !isTyped(b)).map((b) => b.name);
    box.appendChild(ctlSelectField({ get: () => spec.block, set: (_k, v) => { lc.set(i, { block: v, props: ArkComponents.starterProps(ArkComponents.arkResolverFor(v), '') }); if (o.rerender) o.rerender(); } },
      'Block', 'block', blockNames, (n) => ArkComponents.labelOf(ArkComponents.arkResolverFor(n)), { ariaLabel: o.aria + ' block' }));
    const props = isObj(spec.props) ? spec.props : {};
    const pctx = { get: (k) => props[k], set: (k, v) => { const next = Object.assign({}, props); if (v === undefined) delete next[k]; else next[k] = v; lc.set(i, { block: spec.block, props: next }); } };
    const fields = fieldsOfBlock(spec.block);
    fields.forEach((f) => box.appendChild(blockFieldEl(f, f.prop, pctx, Object.assign({}, o, { path: o.path + '.props', fields, all: () => props }))));
    return box;
  }

  /* THE editor: every field of a block, then any saved prop the block no longer defines (a
     record written by another version), which strict saving refuses -- so it is shown with a
     way to remove it, never hidden. */
  function cmsBlockFields(fields, ctx, opts) {
    opts = opts || {};
    pruneSlotEditors();   /* a repaint: the card slot editors of the fields it replaced go */
    const box = h('div', { class: 'cms-form lib-fields' });
    const o = { id: opts.id || 'lib', aria: opts.aria || '', path: '', fields, all: opts.all || (() => ({})), rerender: opts.rerender };
    /* [[term]] markup is an Ark block's (its renderer draws the term); a legacy or captured block
       sets its words as plain text, so it is not offered there */
    if (opts.glossary && fields.some((f) => f.kind === 'text' || f.kind === 'line')) {
      const sample = Object.keys(blockGlossary())[0];
      box.appendChild(h('p', { class: 'hint lib-glossary-hint', text: 'Text fields take glossary links: write [[word]]' + (sample ? ', for example [[' + sample + ']]' : '') + ', and the word shows its definition on hover.' }));
    }
    fields.forEach((field) => {
      const el = blockFieldEl(field, field.prop, ctx, o);
      if (opts.marked && opts.marked(field.prop) && el.classList) el.classList.add('ovr');
      box.appendChild(el);
    });
    const known = fields.map((f) => f.prop), all = o.all();
    Object.keys(all || {}).filter((k) => known.indexOf(k) < 0 && fields.length).forEach((k) => {
      const row = h('div', { class: 'lib-extra', 'data-prop-row': k }, h('span', { text: 'Not part of this block: "' + k + '". Saving refuses it.' }));
      row.appendChild(h('button', { type: 'button', class: 'btn small', text: 'Remove', 'aria-label': 'Remove ' + k, onclick: () => { ctx.set(k, undefined); if (opts.rerender) opts.rerender(); } }));
      box.appendChild(row);
    });
    return box;
  }

  /* The save-path check for one block's props, as refusals with plain field names (the same
     ArkComponents.problems that Save runs). Legacy and captured blocks have no schema to check. */
  function cmsBlockRefusals(resolver, props) {
    if (!ArkComponents.isArk(resolver)) return [];
    return ArkComponents.problems({ version: 1, masters: { probe: { resolver, props: props || {}, label: 'this block' } }, routes: {} });
  }
  function cmsRefusalList(refusals, title) {
    const box = h('div', { class: 'lib-refusals', role: 'status', 'aria-live': 'polite' });
    if (!refusals.length) { box.hidden = true; return box; }
    box.appendChild(h('p', { class: 'lib-refusals-head', text: title || 'Fix before saving (' + refusals.length + ')' }));
    const list = h('ul');
    refusals.forEach((r) => list.appendChild(h('li', { 'data-path': r.path || '' }, h('b', { text: (r.field || 'This block') + ': ' }), sentence(r.failure) + '. Needs ' + r.needs + '. ' + sentence(r.remedy) + '.')));
    box.appendChild(list);
    return box;
  }

  /* ---- live mini-renders: the real Ark block, rendered by ArkKit, inert. A thumbnail is the
     block's registry example scaled down; a preview is the props being edited. */
  function previewHref(value) { return /^url:/.test(value || '') ? value.slice(4) : /^(route|doc):/.test(value || '') ? '#' : value; }
  function renderBlockEl(name, props) {
    const kit = window.ArkKit;
    if (!kit || typeof kit.renderArkBlock !== 'function') return null;
    try { return kit.renderArkBlock({ block: name, props: props || {} }, { document, glossary: blockGlossary(), onInvalid: 'render', resolveHref: previewHref }); }
    catch (error) { return h('p', { class: 'hint', text: 'No preview: ' + (error && error.message ? error.message : error) }); }
  }
  /* a copy shown twice must not repeat ids (or point aria at the other copy's) */
  function inertCopy(el) {
    const copy = el.cloneNode(true);
    [copy].concat(Array.from(copy.querySelectorAll('*'))).forEach((n) => ['id', 'for', 'aria-describedby', 'aria-controls', 'aria-labelledby'].forEach((a) => n.removeAttribute && n.removeAttribute(a)));
    return copy;
  }
  const GROUP_ICON = { text: 'text', media: 'image', layout: 'grid', data: 'list', navigation: 'link', captured: 'comp' };
  const thumbs = new Map();
  function thumbEl(group, name, props) {
    const frame = h('div', { class: 'lib-thumb', 'aria-hidden': 'true' });
    if (name) {
      const cacheKey = name + '\n' + JSON.stringify(props || {});
      if (thumbs.size > 300) thumbs.clear();   /* a saved block's every edit is a new key: bounded, never a leak */
      if (!thumbs.has(cacheKey)) thumbs.set(cacheKey, renderBlockEl(name, props));
      const el = thumbs.get(cacheKey);
      if (el) { frame.appendChild(h('div', { class: 'lib-thumb-inner' }, inertCopy(el))); frame.inert = true; return frame; }
    }
    frame.classList.add('lib-thumb-icon'); frame.innerHTML = ic(GROUP_ICON[group] || 'comp');
    return frame;
  }
  function previewEl(resolver, props) {
    const name = ArkComponents.isArk(resolver) ? ArkComponents.arkBlockName(resolver) : '';
    const el = name ? renderBlockEl(name, props) : null;
    if (!el) return null;
    const box = h('div', { class: 'lib-preview', 'aria-label': 'Preview', role: 'img' }, el);
    box.inert = true;
    return box;
  }

  /* ===================================================================================
     The Library
     =================================================================================== */
  /* open things, by id: a saved definition being edited, the insertion-point picker (a master id,
     or 'new:' + a block's resolver), the block being configured, the search */
  let libEditing = '', libPicking = '', libCustom = '', libQuery = '', fresh = null;
  /* the groups are Ark's accordion (js/admin/ark-host.js arkAccordion): all open at first, a
     group folded by the person stays folded across repaints (libClosed); a search opens every
     group that has a match, and the fold comes back when the search is cleared */
  const libClosed = new Set();
  let libAccordion = null, libFolding = false;
  function cmsOpenMasterInLibrary(id) {
    libEditing = id; state.libKey = ''; showLeft('lib'); renderLibrary();
    const row = $('libPane').querySelector('.lib-definition'); if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
  }
  function postCmsHighlightPoint(id) {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-highlight-point', id }, window.location.origin);
  }
  /* "Page header", then "Page header 2": a saved component is found by its name */
  function uniqueLabel(base, masters) {
    const used = new Set(Object.keys(masters || {}).map((id) => masters[id].label));
    if (!used.has(base)) return base;
    let n = 2; while (used.has(base + ' ' + n)) n += 1;
    return base + ' ' + n;
  }
  /* search: by name, description, kind and group -- rows are shown or hidden, never rebuilt, so
     typing in the box keeps its focus */
  function applyFilter(box) {
    const q = libQuery.trim().toLowerCase();
    let shown = 0;
    box.querySelectorAll('.lib-group').forEach((group) => {
      let any = false;
      group.querySelectorAll('[data-find]').forEach((row) => {
        const hit = !q || row.dataset.find.indexOf(q) >= 0;
        row.hidden = !hit;
        if (hit) { any = true; shown += 1; }
      });
      const empty = group.querySelector('.lib-empty');
      group.hidden = !!q && !any;
      if (empty) empty.hidden = !!q;
      /* a match inside a folded group is shown; without a search the person's fold is kept */
      if (libAccordion) {
        libFolding = true;
        if (q) { if (any) libAccordion.open(group.dataset.group); }
        else if (libClosed.has(group.dataset.group)) libAccordion.close(group.dataset.group);
        else libAccordion.open(group.dataset.group);
        libFolding = false;
      }
    });
    const none = box.querySelector('.lib-no-match');
    if (none) { none.hidden = !q || shown > 0; none.textContent = 'Nothing matches "' + libQuery.trim() + '". Try a plainer word: card, image, table, steps.'; }
  }

  function renderLibrary() {
    const box = $('libPane'); if (box.hidden) return;
    /* Reusable components (js/content/components.js): masters/instances/overrides are real
       DEFXN runtime state, round-tripped through the connected preview iframe exactly like
       every other authoritative edit here -- never a second, visual-only component system.
       insertInstance/setOverride/removeInstance/createMaster/updateMaster all run for real
       inside that iframe (js/main.js's cmsComponentsCommand). */
    const components = (state.cmsSourceSite && state.cmsSourceSite.components) || { masters: {}, routes: {} };
    /* a detached copy belongs to its one instance; it is not something to reuse */
    const masterIds = Object.keys(components.masters || {}).filter((id) => !components.masters[id].detached);
    if (libEditing && masterIds.indexOf(libEditing) < 0) libEditing = '';
    if (libPicking && !/^new:/.test(libPicking) && masterIds.indexOf(libPicking) < 0) libPicking = '';
    const blocks = CMS_BLOCK_RESOLVERS;
    if (libCustom && !blocks.some((b) => b.resolver === libCustom)) { libCustom = ''; fresh = null; }
    const key = JSON.stringify(['cms-components', masterIds.map((id) => [id, components.masters[id]]), state.cmsInsertPoints, state.cmsPreviewRoute, libEditing, libPicking, libCustom]);
    if (key === state.libKey && box.children.length) return;
    /* Never rebuild under someone typing: every selection in the preview re-reports the
       page's places, and a rebuild mid-edit replaced the definition field being typed in,
       so its change event fired on a fresh field holding the OLD value and the edit was
       silently lost (found driving the editor: tests/browser/studio-flows.mjs, makecomp).
       The rebuild waits until focus leaves the panel. */
    const typing = document.activeElement && box.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (typing && box.children.length) {
      if (!box.dataset.deferred) { box.dataset.deferred = '1'; box.addEventListener('focusout', () => { setTimeout(() => { if (box.contains(document.activeElement)) return; delete box.dataset.deferred; state.libKey = ''; renderLibrary(); }, 0); }, { once: true }); }
      return;
    }
    state.libKey = key; box.textContent = '';

    /* Insertion points come from the preview (js/main.js's cmsInsertionPoints), each with
       whether a block put there would be SEEN. A point too narrow to show anything is not
       offered -- /about's only page slot is 0px wide, and a block inserted there existed
       and was invisible (regression: tests/cms-insertion-points.cjs) -- but it is still
       named, with why, so a missing option does not read as a missing feature. A state's
       own content anchor is never a point (it belongs to the States section). */
    const usable = state.cmsInsertPoints.filter((point) => point.usable), unusable = state.cmsInsertPoints.filter((point) => !point.usable);
    const head = h('div', { class: 'libsec lib-places' }, h('h4', { text: 'Components' }));
    head.appendChild(h('p', { class: 'hint', text: usable.length
      ? `${usable.length} place${usable.length > 1 ? 's' : ''} to insert on this page: ${usable.map((point) => point.label).join('; ')}.`
      : 'No visible place to insert on this page yet. Select an element on the page to insert after it.' }));
    if (unusable.length) head.appendChild(h('p', { class: 'hint lib-skipped', text: 'Not offered: ' + unusable.map((point) => `${point.label} (${point.reason})`).join('; ') + '.' }));
    const search = ctlField({ get: () => libQuery, set: (_k, v) => { libQuery = v; applyFilter(box); } }, 'Find', 'q', { type: 'text', live: true, id: 'libSearch', placeholder: 'Search components', ariaLabel: 'Search components', spellcheck: false });
    search.classList.add('lib-search'); search.querySelector('input').type = 'search';
    head.appendChild(search);
    box.appendChild(head);

    const insertRefusal = usable.length ? '' : 'No visible place on this page: select an element on the page to insert after it';
    const insertTitle = usable.length > 1 ? 'Choose where on this page' : usable.length ? 'Insert: ' + usable[0].label : '';
    const postInsert = (masterId, point) => postCmsComponentsCommand(point.kind === 'after'
      ? { action: 'insert-instance', after: point.after, key: cmsNextComponentId('i'), masterId }
      : { action: 'insert-instance', anchorId: point.anchorId, key: cmsNextComponentId('i'), masterId });
    /* a saved component goes in as an instance; a new block is created, then goes in */
    const insertSaved = (id, master, point) => { postCmsHighlightPoint(''); postInsert(id, point); libPicking = ''; state.libKey = ''; toast(`Inserted ${master.label}: ${point.label}.`); };
    const insertNew = (resolver, props, label, point) => {
      postCmsHighlightPoint('');
      const id = cmsNextComponentId('m');
      postCmsComponentsCommand({ action: 'create-master', id, resolver, props, label });
      postInsert(id, point);
      libPicking = ''; libCustom = ''; fresh = null; state.libKey = '';
      toast(`Inserted ${label}: ${point.label}. It is saved in the Library too, to use on any page.`);
    };
    /* One place inserts at once; several open a picker in the panel (not a prompt() that
       wanted an anchor id typed exactly): hovering or focusing a place outlines it in the
       preview, clicking inserts there. */
    const insertButton = (pickId, run) => {
      const b = h('button', { type: 'button', class: 'btn small', text: 'Insert', title: insertTitle, 'aria-expanded': String(libPicking === pickId) });
      refuse(b, insertRefusal);
      b.addEventListener('click', () => {
        if (usable.length === 1) { run(usable[0]); renderLibrary(); return; }
        libPicking = libPicking === pickId ? '' : pickId; if (!libPicking) postCmsHighlightPoint('');
        state.libKey = ''; renderLibrary();
      });
      return b;
    };
    const picker = (label, run) => {
      const list = h('div', { class: 'lib-picker', role: 'listbox', 'aria-label': 'Where to insert ' + label });
      Object.assign(list.style, { display: 'grid', gap: '4px', margin: '2px 0 8px 22px' });
      usable.forEach((point) => {
        const b = h('button', { type: 'button', class: 'btn small lib-point', role: 'option', 'data-point': point.id, text: point.label, title: `${point.width}px wide here` });
        /* a place's label quotes page text; it wraps inside the panel instead of widening it */
        Object.assign(b.style, { justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%', height: 'auto', minHeight: '28px' });
        b.addEventListener('mouseenter', () => postCmsHighlightPoint(point.id)); b.addEventListener('focus', () => postCmsHighlightPoint(point.id));
        b.addEventListener('mouseleave', () => postCmsHighlightPoint('')); b.addEventListener('blur', () => postCmsHighlightPoint(''));
        b.addEventListener('click', () => { run(point); renderLibrary(); });
        list.appendChild(b);
      });
      list.appendChild(h('button', { type: 'button', class: 'btn small', text: 'Cancel', onclick: () => { libPicking = ''; postCmsHighlightPoint(''); state.libKey = ''; renderLibrary(); } }));
      return list;
    };
    const uses = (id) => Object.keys(components.routes || {}).reduce((n, route) => n + Object.keys(components.routes[route]).reduce((m, a) => m + components.routes[route][a].filter((it) => it.masterId === id).length, 0), 0);

    /* one section per group, in the registry's group order; a group nothing is in is not drawn,
       except Captured, whose empty state says how to fill it */
    const groupOrder = ArkComponents.groups().map((g) => g.group);
    blocks.concat(masterIds.map((id) => ({ group: ArkComponents.groupOf(components.masters[id].resolver) }))).forEach((b) => { if (groupOrder.indexOf(b.group) < 0) groupOrder.push(b.group); });
    const groups = h('div', { class: 'lib-groups' }), folds = [];
    groupOrder.forEach((group) => {
      const saved = masterIds.filter((id) => ArkComponents.groupOf(components.masters[id].resolver) === group);
      const offered = blocks.filter((b) => b.group === group);
      if (!saved.length && !offered.length && group !== 'captured') return;
      const groupLabel = (ArkComponents.groups().find((g) => g.group === group) || { label: group }).label;
      /* the group's head is its fold (Ark's accordion, below); its rows are in the panel */
      const trigger = h('button', { type: 'button', class: 'lib-group-trigger' }, h('span', { text: groupLabel }), h('small', { class: 'lib-group-count', text: String(saved.length + offered.length) }));
      const head = h('h4', { class: 'lib-group-head' }, trigger);
      const sec = h('div', { class: 'lib-group-rows' });
      const item = h('section', { class: 'libsec lib-group', 'data-group': group, 'aria-label': groupLabel }, head, sec);
      folds.push({ value: group, item, header: head, trigger, panel: sec });
      if (group === 'captured' && !saved.length) sec.appendChild(h('p', { class: 'hint lib-empty', text: 'Select something on the page and choose More → Make component. It appears here, to use on any page.' }));

      saved.forEach((id) => {
        const master = components.masters[id], kind = cmsMasterKind(master);
        const name = ArkComponents.isArk(master.resolver) ? ArkComponents.arkBlockName(master.resolver) : '';
        const row = h('div', { class: 'myrow lib-row', 'data-master': id, 'data-find': (master.label + ' ' + kind + ' ' + groupLabel).toLowerCase(), title: master.label + ' · ' + kind });
        row.appendChild(thumbEl(group, name, master.props));
        const words = h('div', { class: 'lib-words' }, h('span', { text: master.label }), h('small', { text: kind + ' · used ' + uses(id) + '×' }));
        row.appendChild(words);
        const insert = insertButton(id, (point) => insertSaved(id, master, point));
        const edit = h('button', { type: 'button', class: 'btn small', text: 'Edit', title: 'Edit the definition: every instance, on every page, follows it', 'aria-expanded': String(libEditing === id) });
        edit.addEventListener('click', () => { libEditing = libEditing === id ? '' : id; state.libKey = ''; renderLibrary(); });
        row.append(insert, edit); sec.appendChild(row);
        if (libPicking === id) sec.appendChild(picker(master.label, (point) => insertSaved(id, master, point)));
        if (libEditing === id) sec.appendChild(definitionEditor(id, master, uses(id)));
      });

      offered.forEach((block) => {
        const pickId = 'new:' + block.resolver;
        const row = h('div', { class: 'lib-row lib-block', 'data-resolver': block.resolver, 'data-find': (block.label + ' ' + block.description + ' ' + groupLabel + ' ' + block.name).toLowerCase() });
        row.appendChild(thumbEl(group, isTyped(block) ? '' : block.name, block.example));
        row.appendChild(h('div', { class: 'lib-words' }, h('span', { text: block.label }), h('small', { text: block.description })));
        /* Insert puts the block in as it comes (its registry example; a legacy block with its name
           as visible text, never empty); Customize fills it in first */
        const starter = () => (isTyped(block) ? ArkComponents.starterProps(block.resolver, block.label) : taggedLinks(fieldsOfBlock(block.name), clone(block.example)));
        const insert = insertButton(pickId, (point) => insertNew(block.resolver, starter(), uniqueLabel(block.label, components.masters), point));
        const custom = h('button', { type: 'button', class: 'btn small', text: 'Customize', title: 'Fill it in, then insert it or save it to the Library', 'aria-expanded': String(libCustom === block.resolver) });
        custom.addEventListener('click', () => {
          if (libCustom === block.resolver) { libCustom = ''; fresh = null; }
          else { libCustom = block.resolver; fresh = { resolver: block.resolver, label: uniqueLabel(block.label, components.masters), props: starter() }; }
          state.libKey = ''; renderLibrary();
        });
        row.append(insert, custom); sec.appendChild(row);
        if (libPicking === pickId) sec.appendChild(picker(block.label, (point) => insertNew(block.resolver, clone(fresh && fresh.resolver === block.resolver ? fresh.props : starter()), fresh && fresh.resolver === block.resolver ? fresh.label : uniqueLabel(block.label, components.masters), point)));
        if (libCustom === block.resolver && fresh) sec.appendChild(newBlockForm(block, components, usable, (point) => insertNew(block.resolver, clone(fresh.props), fresh.label.trim() || block.label, point), pickId));
      });
      groups.appendChild(item);
    });
    box.appendChild(groups);
    libAccordion = folds.length ? A.arkAccordion(groups, folds, { label: 'Library groups', open: folds.map((f) => f.value).filter((v) => !libClosed.has(v)),
      onChange: (openValues) => { if (libFolding) return; folds.forEach((f) => { if (openValues.indexOf(f.value) >= 0) libClosed.delete(f.value); else libClosed.add(f.value); }); } }) : null;
    box.appendChild(h('p', { class: 'hint lib-no-match', hidden: true }));
    applyFilter(box);
  }

  /* A saved definition: its name and every prop -- update-master, so every instance re-renders
     from it. The fields keep a working copy, so a second field changed before the preview
     relays the first one builds on it instead of on the stale definition. */
  function definitionEditor(id, master, used) {
    const form = h('div', { class: 'lib-definition' });
    const props = clone(master.props) || {};
    const labelCtx = { get: () => master.label, set: (_key, v) => postCmsComponentsCommand({ action: 'update-master', id, patch: { label: v } }) };
    const propsCtx = { get: (prop) => props[prop], set: (prop, v) => { if (v === undefined) delete props[prop]; else props[prop] = v; postCmsComponentsCommand({ action: 'update-master', id, patch: { props: clone(props) } }); } };
    form.appendChild(ctlField(labelCtx, 'Name', 'label', { type: 'text', ariaLabel: 'Definition name', hint: 'What the Library and the toolbar call it' }));
    const fields = cmsFieldsFor(master);
    form.appendChild(cmsBlockFields(fields, propsCtx, { id: 'lib-def-' + id, aria: 'Definition', all: () => props, glossary: ArkComponents.isArk(master.resolver) }));
    form.appendChild(cmsRefusalList(cmsBlockRefusals(master.resolver, master.props)));
    form.appendChild(h('p', { class: 'hint', text: `Used ${used} time${used === 1 ? '' : 's'} across the site; every one follows these fields unless it overrides one.` }));
    form.appendChild(devDetails([['Kind', cmsMasterKind(master)], ['Definition id', id], ['Resolver', master.resolver]]));
    return form;
  }

  /* A block being configured before it exists: name, live preview, fields, and the two ways out
     -- Insert (on this page) and Create block (into the Library) -- each refused while the block
     has refusals, which are listed under it as they change. */
  function newBlockForm(block, components, usable, insertAt, pickId) {
    const form = h('div', { class: 'lib-new', 'data-resolver': block.resolver });
    const previewHost = h('div', { class: 'lib-preview-host' });
    const fieldsHost = h('div');
    const refusalsHost = h('div');
    const fields = cmsFieldsFor({ resolver: block.resolver, props: fresh.props });
    const create = h('button', { type: 'button', class: 'btn small primary', text: 'Create block' });
    const insert = h('button', { type: 'button', class: 'btn small', text: 'Insert on this page', title: usable.length > 1 ? 'Choose where on this page' : usable.length ? 'Insert: ' + usable[0].label : '' });
    const check = () => {
      const refusals = cmsBlockRefusals(block.resolver, fresh.props);
      refusalsHost.textContent = ''; refusalsHost.appendChild(cmsRefusalList(refusals));
      previewHost.textContent = ''; const p = previewEl(block.resolver, fresh.props); if (p) previewHost.appendChild(p);
      const why = refusals.length ? 'Fix ' + refusals.length + ' thing' + (refusals.length > 1 ? 's' : '') + ' listed above first: ' + refusals[0].field + ' — ' + refusals[0].failure : '';
      refuse(create, why);
      refuse(insert, why || (usable.length ? '' : 'No visible place on this page: select an element on the page to insert after it'));
      return refusals;
    };
    const ctx = { get: (prop) => fresh.props[prop], set: (prop, v) => { if (v === undefined) delete fresh.props[prop]; else fresh.props[prop] = v; check(); } };
    const drawFields = () => { fieldsHost.textContent = ''; fieldsHost.appendChild(cmsBlockFields(fields, ctx, { id: 'lib-new', aria: '', all: () => fresh.props, glossary: !isTyped(block), rerender: () => { drawFields(); check(); } })); };
    form.appendChild(ctlField({ get: () => fresh.label, set: (_k, v) => { fresh.label = v; } }, 'Name', 'label', { type: 'text', ariaLabel: 'New component name', hint: 'What the Library calls it' }));
    form.append(previewHost, fieldsHost, refusalsHost);
    drawFields();
    create.addEventListener('click', () => {
      if (check().length) return;
      const label = fresh.label.trim() || block.label;
      postCmsComponentsCommand({ action: 'create-master', id: cmsNextComponentId('m'), resolver: block.resolver, props: clone(fresh.props), label });
      libCustom = ''; fresh = null; state.libKey = '';
      toast(`Created ${label}. It is in the Library under ${block.groupLabel}, to insert on any page.`);
    });
    insert.addEventListener('click', () => {
      if (check().length) return;
      if (usable.length === 1) { insertAt(usable[0]); renderLibrary(); return; }
      libPicking = libPicking === pickId ? '' : pickId; state.libKey = ''; renderLibrary();
    });
    const cancel = h('button', { type: 'button', class: 'btn small quiet', text: 'Cancel', onclick: () => { libCustom = ''; fresh = null; libPicking = ''; state.libKey = ''; renderLibrary(); } });
    form.appendChild(h('div', { class: 'tools' }, insert, create, cancel));
    check();
    return form;
  }

  A.provide({ cmsOpenMasterInLibrary: cmsOpenMasterInLibrary, renderLibrary: renderLibrary,
    cmsBlockFields: cmsBlockFields, loadCardKit: loadCardKit, cmsFieldsFor: cmsFieldsFor, cmsBlockRefusals: cmsBlockRefusals, cmsRefusalList: cmsRefusalList });
})();
