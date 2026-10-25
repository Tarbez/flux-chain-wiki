/* =====================================================================
   ADMIN EDITOR · THE SKIN LAB (js/admin/skin-lab.js)
   ---------------------------------------------------------------------
   Owns: the Skin lab view (More > Skin lab). The owner tests NFT card skins on the real site "skin by skin":
   which parts of the page take which rules, which rules Ark UI takes back, and which rules the site switches
   off. A card dresses the site by its own rules (the owner, 2026-10-24); the switches are content, the skin
   policy (js/content/skin-policy.js).
   Draws: a picker (the site's own look, or one of the three review samples), the report of what each part
   took, and one switch per part and rule, on unless switched off. A switch edits the DRAFT policy (state.skinPolicyDraft) and the
   canvas applies the sample again at once. Pressing a part outlines its first element on the canvas.
   Must not: write a file (Save does: ArkAdminStore.saveSkinPolicy, as FLX), hold a skin itself (the canvas
   applies it: js/main.js, through DefxnSkinSite), or name a rule or a part. Rows come from the canvas's
   report; the rule keys come from ArkSkinPolicy.RULES.
   Messages: the editor sends 'defxn-cms-preview-skin' and 'defxn-cms-preview-skin-focus'; the canvas
   answers 'defxn-cms-skin-report' (js/admin/bridge.js routes it to skinReport below).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, h = A.h, status = A.status, touch = A.touch, paintInto = A.paintInto,
      repaintPanels = A.repaintPanels, refuse = A.refuse, clone = A.clone;
  /* defined by files loaded after this one: resolved when called */
  var notifyPreviewSkin = A.later('notifyPreviewSkin'), postSkinFocus = A.later('postSkinFocus'), syncSkinDot = A.later('syncSkinDot'), setView = A.later('setView');

  /* the three review samples (DefxnSkinSite.SAMPLES): the canvas refuses any other number, so the picker
     offers only these. A card is named by its sample number; no other card is offered here. */
  var SAMPLES = ['27', '263', '512'];
  var FILTERS = [['rules', 'With rules'], ['problems', 'Taken back'], ['all', 'All parts']];
  var lab = { report: null, filter: 'rules', scope: 'site', error: '' };   /* what the canvas last said, and the view's own choices */
  state.skinChoice = state.skinChoice || '';

  function sampleLabel(n) { return 'Sample card ' + n; }
  /* the name the policy holds for a part the report names: the canvas resolves it (DefxnSkinSite.ruleKey), so Ark UI's
     lower-case block parts (card, alert, tabs-list) take the switches of CARD, ALERT, TABSLIST. null: no rule reaches it */
  function policyKey(key) {
    var map = lab.report && lab.report.ruleKeys;
    if (map && Object.prototype.hasOwnProperty.call(map, key)) return map[key] || null;
    return /^[A-Z][A-Z0-9]*(?:\|[A-Z][A-Z0-9]*)*$/.test(key) ? key : null;
  }

  /* ---- the draft: one edit is one step of the editor's one undo history ---------------------- */
  function snapshot() { return clone(state.skinPolicyDraft); }
  function after() { syncSkinDot(); notifyPreviewSkin(); touch({ kind: 'skinPolicy', canvas: false }); }
  function putBack(snap) {
    state.skinPolicyDraft = clone(snap); after(); repaintPanels('skinPolicy');
    return true;
  }
  function step(label, change) {
    var before = snapshot();
    change();
    state.skinPolicyDraft = ArkSkinPolicy.sanitize(state.skinPolicyDraft);
    var next = snapshot();
    if (JSON.stringify(before) === JSON.stringify(next)) return false;
    after();
    if (typeof A.historyAction === 'function') A.historyAction({ label: label, merge: '', undo: function () { return putBack(before); }, redo: function () { return putBack(next); } });
    return true;
  }

  /* ---- what the policy switches off ------------------------------------------------------------- */
  function family() { return lab.report && lab.report.family ? lab.report.family : null; }
  function codeOff() { return (lab.report && lab.report.codeOff) || {}; }
  /* the rules a part does not wear for the card on the canvas: the site's (DefxnSkinParts.OFF), the policy's and the
     card family's together. Every other rule the card sends reaches the part, and Ark UI decides what it can wear. */
  function offFor(part, fam) { return ArkSkinPolicy.effectiveOff(codeOff(), state.skinPolicyDraft, fam)[part] || []; }
  function scopeFamily() { return lab.scope === 'family' ? family() : null; }
  function allowed(part, rule) { return offFor(part, family()).indexOf(rule) < 0; }

  /* Switch one rule off or on again for one part, in the scope chosen (every card, or this card's set). A switch
     only ever takes a rule away, so a rule the site or every card switched off cannot be switched on for one set:
     that switch is shown off and locked (lockedOff below). */
  function setAllowed(part, rule, on) {
    var fam = scopeFamily();
    step((on ? 'switching on ' : 'switching off ') + rule + ' on ' + part, function () {
      var d = state.skinPolicyDraft, layer;
      if (fam) { d.families = d.families || {}; d.families[fam] = d.families[fam] || { off: {} }; layer = d.families[fam].off = d.families[fam].off || {}; }
      else layer = d.off = d.off || {};
      var list = (layer[part] || []).filter(function (r) { return r !== rule; });
      if (!on) list.push(rule);
      list = ArkSkinPolicy.RULES.filter(function (r) { return list.indexOf(r) >= 0; });
      if (list.length) layer[part] = list; else delete layer[part];
    });
  }
  /* switched off by a wider layer than the scope edits (the site's code, or every card when editing one set) */
  function lockedOff(part, rule) {
    var wider = scopeFamily() ? ArkSkinPolicy.effectiveOff(codeOff(), state.skinPolicyDraft, null) : codeOff();
    return (wider[part] || []).indexOf(rule) >= 0;
  }

  /* ---- the report, as rows ---------------------------------------------------------------------- */
  /* One row per part in the report: every part is a candidate, because turning a rule on for a part the site table
     names makes it wear the card's rules. "has" marks the parts worth listing first: rules applied, skipped or
     taken back, or a rule switched off for them (so a part switched fully off can be switched on again). */
  function mentioned(key) { return offFor(key, family()).length > 0; }
  function rows() {
    var rep = lab.report && lab.report.report;
    if (!rep) return [];
    var offered = lab.report.offered || {};
    return rep.parts.map(function (p) {
      var r = p.rules || {}, applied = r.applied || {}, skipped = r.skipped || [], reverted = r.reverted || [];
      var names = Object.keys(applied).concat(skipped.map(function (s) { return s.rule; }), reverted.map(function (s) { return s.rule; }), Object.keys(offered));
      var ruleKeys = ArkSkinPolicy.RULES.filter(function (k) { return names.indexOf(k) >= 0; });
      var colours = reverted.filter(function (x) { return x.rule === 'colours'; })[0] || null;
      var general = skipped.filter(function (x) { return x.rule === '*'; })[0] || null;
      var taken = reverted.filter(function (x) { return x.rule !== 'colours'; });
      var target = policyKey(p.key) || p.key;
    var has = Object.keys(applied).length > 0 || skipped.length > 0 || reverted.length > 0 || mentioned(target);
      return { part: p, ruleKeys: ruleKeys, applied: applied, skipped: skipped, reverted: reverted, colours: colours, general: general,
        offered: offered, has: has, broken: taken.length > 0 || !!colours };
    });
  }
  function visible(all) {
    return all.filter(function (row) { return lab.filter === 'problems' ? row.broken : lab.filter === 'rules' ? row.has : true; });
  }

  /* ---- drawing -------------------------------------------------------------------------------------- */
  function reasonOf(list, rule) { var hit = list.filter(function (x) { return x.rule === rule; })[0]; return hit ? hit.why : ''; }
  function ruleLine(row, rule) {
    var target = policyKey(row.part.key), key = target || row.part.key, on = allowed(key, rule), editable = !!target;
    /* off first: a switch shows its new state at once, before the canvas answers with a fresh report */
    var tone = !on ? 'off' : row.reverted.some(function (x) { return x.rule === rule; }) ? 'taken' : row.applied[rule] !== undefined ? 'applied' : row.skipped.some(function (x) { return x.rule === rule; }) ? 'skipped' : 'idle';
    var text = tone === 'applied' ? String(row.applied[rule])
      : tone === 'taken' ? 'Taken back: ' + reasonOf(row.reverted, rule)
      : tone === 'skipped' ? 'Not taken: ' + reasonOf(row.skipped, rule)
      : tone === 'off' ? 'Switched off. The card sends ' + (row.offered[rule] !== undefined ? String(row.offered[rule]) : 'this rule') + '.'
      : 'On, but this page did not take it.';
    var id = 'skin-' + key.replace(/[^A-Za-z0-9]+/g, '_') + '-' + rule;
    var input = h('input', { id: id, type: 'checkbox', role: 'switch', 'data-part': key, 'data-rule': rule, 'aria-label': rule + ' on ' + key });
    input.checked = on;
    if (!editable) { input.disabled = true; input.title = 'No skin rule can reach this part yet: Ark UI has no rules name for it.'; }
    else if (lockedOff(key, rule)) { input.disabled = true; input.title = scopeFamily() ? 'Switched off for every card. Switch it on under “Every card” first.' : 'Switched off by the site’s code (DefxnSkinParts.OFF).'; }
    else input.addEventListener('change', function () { setAllowed(key, rule, input.checked); });
    return h('li', { class: 'skin-rule', 'data-tone': tone, 'data-rule-row': rule },
      h('label', { for: id, class: 'skin-rule-name', text: rule }),
      h('span', { class: 'skin-rule-state', text: text }),
      input);
  }
  function partRow(row) {
    var p = row.part, key = p.key;
    var head = h('button', { type: 'button', class: 'skin-part-head', 'aria-label': 'Outline ' + key + ' on the page', title: 'Outline the first ' + key + ' on the page' },
      h('span', { class: 'skin-part-key', text: key }),
      h('span', { class: 'skin-part-count', text: p.count + (p.count === 1 ? ' element' : ' elements') }));
    head.addEventListener('click', function () { postSkinFocus(p.selector); });
    var box = h('li', { class: 'skin-part', 'data-part': key, 'data-broken': row.broken ? 'true' : 'false' }, head);
    var list = h('ul', { class: 'skin-rules' });
    row.ruleKeys.forEach(function (rule) { list.appendChild(ruleLine(row, rule)); });
    if (row.colours) list.appendChild(h('li', { class: 'skin-rule', 'data-tone': 'colours', 'data-rule-row': 'colours' },
      h('span', { class: 'skin-rule-name', text: 'colours' }), h('span', { class: 'skin-rule-state', text: 'Taken back: ' + row.colours.why }), h('span', {})));
    if (row.general) list.appendChild(h('li', { class: 'skin-rule', 'data-tone': 'skipped' },
      h('span', { class: 'skin-rule-name', text: 'all' }), h('span', { class: 'skin-rule-state', text: 'Not taken: ' + row.general.why }), h('span', {})));
    box.appendChild(list);
    return box;
  }
  function tokensBox(rep) {
    var moved = (rep.tokens && rep.tokens.adjusted) || [], kept = (rep.tokens && rep.tokens.skipped) || [];
    var box = h('details', { class: 'skin-tokens' }, h('summary', { text: moved.length + ' colour' + (moved.length === 1 ? '' : 's') + ' moved for contrast' + (kept.length ? ', ' + kept.length + ' kept as the site has them' : '') }));
    if (!moved.length && !kept.length) box.appendChild(h('p', { class: 'hint', text: 'The skin’s colours all passed the site’s contrast rules as they were.' }));
    moved.forEach(function (t) {
      box.appendChild(h('p', { class: 'skin-token' }, h('code', { text: t.token }), h('span', { text: ' ' + t.from + ' to ' + t.to + '. ' + t.why + '.' })));
    });
    kept.forEach(function (t) {
      box.appendChild(h('p', { class: 'skin-token' }, h('code', { text: t.token }), h('span', { text: ' stays the site’s own. ' + t.why + '.' })));
    });
    return box;
  }

  function pickControl() {
    var select = h('select', { id: 'skin-pick', 'aria-label': 'Card skin to try' });
    select.appendChild(h('option', { value: '', text: 'Site’s own look' }));
    SAMPLES.forEach(function (n) { select.appendChild(h('option', { value: n, text: sampleLabel(n) })); });
    select.value = state.skinChoice;
    select.addEventListener('change', function () {
      state.skinChoice = select.value; lab.report = null; lab.error = '';
      postSkinFocus('');
      notifyPreviewSkin();
      repaintPanels('skinPolicy');
    });
    return h('div', { class: 'skin-pick-row' }, h('label', { for: 'skin-pick', text: 'Try on this page' }), select);
  }
  function scopeControl() {
    var fam = family();
    if (!fam) return null;
    var select = h('select', { id: 'skin-scope', 'aria-label': 'Who a switch changes' },
      h('option', { value: 'site', text: 'Every card' }), h('option', { value: 'family', text: 'Only cards of the set ' + fam }));
    select.value = lab.scope;
    select.addEventListener('change', function () { lab.scope = select.value; repaintPanels('skinPolicy'); });
    return h('div', { class: 'skin-pick-row' }, h('label', { for: 'skin-scope', text: 'A switch changes' }), select);
  }
  function filterControl(all) {
    var counts = { rules: all.filter(function (r) { return r.has; }).length, problems: all.filter(function (r) { return r.broken; }).length, all: all.length };
    var bar = h('div', { class: 'skin-filter', role: 'group', 'aria-label': 'Which parts to list' });
    FILTERS.forEach(function (f) {
      var b = h('button', { type: 'button', 'data-filter': f[0], 'aria-pressed': lab.filter === f[0] ? 'true' : 'false', text: f[1] + ' ' + counts[f[0]] });
      if (f[0] === 'problems' && counts.problems) b.dataset.tone = 'review';
      b.addEventListener('click', function () { lab.filter = f[0]; repaintPanels('skinPolicy'); });
      bar.appendChild(b);
    });
    return bar;
  }

  function revertSkinPolicy() {
    state.skinPolicyDraft = ArkSkinPolicy.get();
    after(); repaintPanels('skinPolicy');
    status('The skin policy is back to its saved version.', '');
  }

  function renderSkinLabPanel(container) {
    var record = { kind: 'skinPolicy', repaint: function () { renderSkinLabPanel(container); } };
    paintInto(container, record, function (root) {
      root.classList.add('cms-form', 'cms-skin');
      if (!window.ArkSkinPolicy) { root.appendChild(h('p', { class: 'empty-state', text: 'The Skin lab is unavailable on this page.' })); return; }
      state.skinPolicyDraft = ArkSkinPolicy.sanitize(state.skinPolicyDraft);
      var revert = h('button', { type: 'button', class: 'btn', text: 'Revert', 'data-revert': 'skinPolicy:', onclick: revertSkinPolicy });
      root.appendChild(h('div', { class: 'cms-form-head' },
        h('div', {}, h('h2', { text: 'Skin lab' }), h('div', { class: 'route', text: 'Sample cards on the real page' })),
        h('div', { class: 'editor-actions' }, revert, A.overlay.closeButton(function () { setView('design'); }, 'Close Skin lab'))));
      root.appendChild(pickControl());
      var scope = scopeControl(); if (scope) root.appendChild(scope);

      var rep = lab.report && lab.report.sample === state.skinChoice ? lab.report : null;
      if (!state.skinChoice) {
        root.appendChild(h('p', { class: 'hint skin-note', text: 'Pick a sample card. The page on the canvas takes its skin, and each part lists the rules it took.' }));
      } else if (lab.error) {
        root.appendChild(h('p', { class: 'hint skin-note', role: 'alert', 'data-tone': 'danger', text: 'The sample did not apply: ' + lab.error + ' The page keeps its own look.' }));
      } else if (!rep || !rep.report) {
        root.appendChild(h('p', { class: 'hint skin-note', role: 'status', text: 'Applying ' + sampleLabel(state.skinChoice).toLowerCase() + ' to this page.' }));
      } else {
        var all = rows(), listed = all.filter(function (r) { return r.has; }), shown = visible(all), back = all.filter(function (r) { return r.broken; }).length;
        root.appendChild(h('p', { class: 'hint skin-note', role: 'status', 'data-testid': 'skin-summary',
          text: listed.length + (listed.length === 1 ? ' part wears' : ' parts wear') + ' rules from ' + sampleLabel(state.skinChoice).toLowerCase() + (rep.family ? ' (the set ' + rep.family + ')' : '') + '. ' +
            (back ? back + (back === 1 ? ' has' : ' have') + ' a rule or a colour taken back.' : 'None had a rule taken back.') }));
        root.appendChild(filterControl(all));
        var list = h('ul', { class: 'skin-parts', 'aria-label': 'Parts of this page' });
        shown.forEach(function (row) { list.appendChild(partRow(row)); });
        if (!shown.length) list.appendChild(h('li', { class: 'hint', text: lab.filter === 'problems' ? 'No part had a rule or a colour taken back.' : 'No part on this page wears rules.' }));
        root.appendChild(list);
        var others = all.length - listed.length;
        if (others > 0 && lab.filter !== 'all') root.appendChild(h('p', { class: 'hint', text: others + ' other parts took no rule on this page. “All parts” lists them.' }));
        root.appendChild(tokensBox(rep.report));
      }
      root.appendChild(h('p', { class: 'hint', text: 'Save in the header keeps the policy for the whole site.' }));
      root.appendChild(A.devDetails([['Writes', 'js/content/skin-policy-data.js'], ['Stored as', 'FLX records (ArkSkinPolicy.serialize), not JSON']]));
    });
    return container;
  }

  /* the canvas answered (js/admin/bridge.js): keep the newest report and redraw */
  function skinReport(message) {
    if (message.sample !== state.skinChoice) return;   /* an answer to a pick that has since changed */
    lab.report = { sample: message.sample, family: message.family || null, report: message.report || null, ruleKeys: message.ruleKeys || null, offered: message.offered || {}, codeOff: message.codeOff || {} };
    lab.error = message.error || '';
    if (lab.scope === 'family' && !lab.report.family) lab.scope = 'site';
    if (state.view === 'skin') repaintPanels('skinPolicy');
  }
  /* the view closed: the review skin leaves the canvas you edit */
  function skinLabLeave() {
    postSkinFocus('');
    if (!state.skinChoice) return;
    state.skinChoice = ''; lab.report = null; lab.error = '';
    notifyPreviewSkin();
  }
  A.provide({ renderSkinLabPanel: renderSkinLabPanel, revertSkinPolicy: revertSkinPolicy, skinReport: skinReport, skinLabLeave: skinLabLeave });
})();
