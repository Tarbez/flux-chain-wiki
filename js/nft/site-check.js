/* DEFXN identity card: the SITE CHECK in the wearer's bar (the owner's goal: a self-certified grid of sites, against
   phishing). It shows whether this page's name has an owner the wearer's own browser verified.

   It verifies nothing itself and keeps nothing. The site passes check(name), which returns exactly what
   gateway/resolve-name.js's resolveName() returns: that reads DOM_PROOF from a node and verifies it with the ONE
   shared verifier (dense-wire's flx-domain-proof.mjs) against the pinned genesis key, so the node is not trusted
   (docs/DEFXN-NAMES-ONE-SYSTEM.md: no other name store, no second verifier, no second name rule).
     { ok: true, name, owner, ownerEntryCid, record: { cid, targets, updatedAt } | null, source, notChecked }
     { ok: false, reason, detail }   reason: NAME_NOT_FOUND | NAME_UNRESOLVABLE | PROOF_INVALID | GATEWAY_NOT_CONFIGURED

   What it can say, and what it cannot. A verified name proves who owns the name and where its owner points it.
   It says nothing about whether the page's words are true.

   Scam reports (CHAIN-HANDOFF.md section 2). Reports about a site are KATTEST1 claims by the keys of a roster
   (KDLGSET1, role witness). The ONE shared verifier, dense-wire/web/flx-attest-proof.mjs (vendored byte for byte
   into js/dense-wire/), counts each roster key once, with its newest claim, and returns facts per word, never a
   verdict. The site passes reports(name), which resolves to one of:
     { ok: true, of, facts: [{ word, counted, of, keys, states }] }   keys: the counted keys, each a hex string or
                                                                       { key, at } (at: unix seconds); states: the
                                                                       claims not counted, each { key, state, at }
     { ok: false, failure, missing, remedy }                          the read or the proof failed, named
   The row shows the facts as sentences ("2 of 5 roster keys report this site as phishing"), with the keys and
   dates, and never says a page is true or false. With no reports(name) given, the row says the check is not built.

   DefxnSiteCheck.stateOf(result)     a result as one closed state: { key, label, tone, says, missing, remedy, facts }
   DefxnSiteCheck.use({ check, reports }) the site's verified reads: resolveName (bound to its nodes and genesis key),
                                      and, when the site has it, reports(name) as above
   DefxnSiteCheck.reportsOf(answer, name) an answer of reports(name) as one closed state, like stateOf
   DefxnSiteCheck.row(host, opts)     the check as one row of the wearer's card menu (never a bar item of its own);
                                      opts.name is the page's name, which the site derives from the names system
                                      (this file has no rule of its own: one rule, the site's); opts.check overrides use().
                                      -> { ready, refresh() -> Promise of the state, remove() }
   Works in the browser (window.DefxnSiteCheck); stateOf also in Node. */
(function (root) {
  'use strict';
  if (root.DefxnSiteCheck) return;

  var CONTENT = 'This proves who owns the name and where they point it. It does not prove the page\'s words are true.';
  function short(hex) { hex = String(hex || ''); return hex.length > 16 ? hex.slice(0, 8) + '…' + hex.slice(-4) : hex; }

  // one closed state per result; every state that is not "verified" says what failed, what is missing and the remedy
  function stateOf(result, name) {
    if (result === undefined) return { key: 'notBuilt', label: 'No site check', tone: 'muted',
      says: 'This page has no site check.', missing: 'The site has not connected the name check (DefxnSiteCheck.use).', remedy: 'Read the page\'s name another way before you trust it with keys.', facts: [] };
    if (!name && !(result && result.name)) return { key: 'noName', label: 'No name', tone: 'muted',
      says: 'This address is not a name on the DEFXN grid.', missing: 'A name that the name chain holds for this address.', remedy: 'Real DEFXN sites answer to a name. Do not enter keys here unless you know this address.', facts: [] };
    if (result && result.ok) {
      var facts = [['Name', result.name], ['Owner key', short(result.owner)], ['Checked through', result.source || 'a name node']];
      if (result.record) facts.push(['Record', short(result.record.cid)], ['Points to', (result.record.targets || []).map(function (t) { return t.type; }).join(', ') || 'nothing']);
      if (result.notChecked && result.notChecked.length) facts.push(['Not checked', [].concat(result.notChecked).join('; ')]);
      if (!result.record) return { key: 'noRecord', label: result.name + ': no record', tone: 'drift', facts: facts,
        says: result.name + ' has a verified owner, and points nowhere yet.', missing: 'A record, signed by the owner, that points the name at this site.', remedy: 'Treat the page as unverified until its owner points the name at it.' };
      return { key: 'verified', label: result.name, tone: 'trust', facts: facts,
        says: 'Your browser verified who owns ' + result.name + '. ' + CONTENT, missing: '', remedy: '' };
    }
    var reason = result && result.reason, detail = (result && result.detail) || '';
    var by = {
      NAME_NOT_FOUND: ['missing', 'Not a known name', 'danger', 'The name chain holds no owner for ' + name + '.', 'An owner for this name.', 'A real DEFXN site always has one. Do not enter keys here.'],
      NAME_UNRESOLVABLE: ['unreadable', 'Cannot check now', 'drift', 'No name node answered, so this page cannot be checked now.', 'An answer from a name node.', 'Wait and check again before you enter keys.'],
      PROOF_INVALID: ['refused', 'Proof refused', 'danger', 'A name node sent an ownership proof for ' + name + ' that does not verify.', 'A proof that verifies.', 'Do not trust this page. Close it.'],
      GATEWAY_NOT_CONFIGURED: ['notConfigured', 'Check not set up', 'muted', 'This site has no genesis key pinned, so it cannot verify any name yet.', 'The chain\'s genesis key in the site\'s name settings.', 'The site\'s operator pins the key. Until then, nothing here is verified.']
    }[reason] || ['unknown', 'Not checked', 'drift', 'The check gave an answer this page does not know.', 'A result from resolveName().', 'Check the page another way.'];
    return { key: by[0], label: by[1], tone: by[2], says: by[3], missing: by[4], remedy: by[5], facts: detail ? [['Detail', detail]] : [] };
  }

  /* ---------- scam reports: signed facts from a roster, never a verdict ---------- */
  function day(at) { var n = Number(at); return n > 0 ? new Date(n * 1000).toISOString().slice(0, 10) : ''; }
  function keyAt(k) { return typeof k === 'string' ? { key: k, at: null } : { key: (k && k.key) || '', at: k && k.at }; }
  function keyLine(k) { k = keyAt(k); return short(k.key) + (day(k.at) ? ' on ' + day(k.at) : ''); }
  function reportsOf(answer, name) {
    var where = name ? name : 'this site';
    if (answer === undefined) return { key: 'notBuilt', label: 'not built', tone: 'muted', facts: [],
      says: 'This site does not read scam reports yet.', missing: 'The shared report verifier (flx-attest-proof.mjs) in this site.', remedy: 'Until it is built, nothing here says whether others reported this site.' };
    if (!name) return { key: 'noName', label: 'no name', tone: 'muted', facts: [],
      says: 'Reports are kept per name, and this address has none.', missing: 'A name for this address.', remedy: 'Check the address another way.' };
    if (!answer || !answer.ok) return { key: 'unread', label: 'not read', tone: 'drift', facts: [],
      says: (answer && answer.failure) || 'The reports about ' + where + ' could not be read.', missing: (answer && answer.missing) || 'A report proof that verifies.', remedy: (answer && answer.remedy) || 'Check again later.' };
    var words = [].concat(answer.facts || []), of = answer.of != null ? answer.of : (words[0] && words[0].of);
    var reported = words.filter(function (w) { return w.counted > 0; }), facts = [], lines = [];
    reported.forEach(function (w) {
      lines.push(w.counted + ' of ' + w.of + ' roster keys report ' + where + ' as ' + w.word + '.');
      facts.push([w.word, [].concat(w.keys || []).map(keyLine).join('; ')]);
    });
    words.forEach(function (w) {
      [].concat(w.states || []).forEach(function (st) { facts.push(['Not counted', keyLine(st) + ': ' + w.word + ', ' + (st.state || 'not counted')]); });
    });
    facts.push(['Roster', (of != null ? of : '?') + ' keys']);
    if (!reported.length) return { key: 'none', label: 'none', tone: 'muted', facts: facts,
      says: 'No roster key reports ' + where + '. A report is a signed fact from one key. It does not prove the page is safe.', missing: '', remedy: '' };
    var warn = reported.some(function (w) { return w.word !== 'fine'; });
    return { key: 'reported', label: reported.map(function (w) { return w.counted + ' of ' + w.of + ' ' + w.word; }).join(', '), tone: warn ? 'drift' : 'muted', facts: facts,
      says: lines.join(' ') + ' Each report is a signed fact from one key. It does not prove the page is true or false.', missing: '', remedy: warn ? 'Read who reported it before you enter keys here.' : '' };
  }

  var site = null;
  function use(hook) {
    if (hook && typeof hook.check !== 'function') throw new Error('DefxnSiteCheck.use needs { check(name) -> Promise of resolveName()\'s result }.');
    if (hook && hook.reports != null && typeof hook.reports !== 'function') throw new Error('DefxnSiteCheck.use: reports, when given, is a function (name) -> Promise of the report facts.');
    site = hook || null;
  }

  // the check as a row of a menu (the site's bar holds one control: the seal opens a menu, and this is a row in it)
  function row(host, opts) {
    opts = opts || {};
    var name = opts.name || null;
    var box = document.createElement('div'), rbox = document.createElement('div');
    box.className = 'defxn-check';
    rbox.className = 'defxn-check'; rbox.setAttribute('data-part', 'reports');
    host.appendChild(box); host.appendChild(rbox);
    function draw(s) { return paint(box, 'Site check: ', s); }
    function drawReports(s) { return paint(rbox, 'Scam reports: ', s); }
    function paint(box, title, s) {
      box.setAttribute('data-state', s.key); box.setAttribute('data-tone', s.tone);
      box.textContent = '';
      var head = document.createElement('p'), dot = document.createElement('span'), label = document.createElement('span');
      head.className = 'defxn-check__head'; dot.className = 'defxn-check__dot'; dot.setAttribute('aria-hidden', 'true');
      label.textContent = title + s.label;
      head.appendChild(dot); head.appendChild(label); box.appendChild(head);
      var p = document.createElement('p'); p.className = 'defxn-check__says'; p.textContent = s.says; box.appendChild(p);
      if (s.missing) { var m = document.createElement('p'); m.textContent = 'Missing: ' + s.missing; box.appendChild(m); }
      if (s.remedy) { var r = document.createElement('p'); r.className = 'defxn-check__do'; r.textContent = s.remedy; box.appendChild(r); }
      if (s.facts.length) {
        var dl = document.createElement('dl');
        s.facts.forEach(function (f) { var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = f[0]; dd.textContent = f[1]; dl.appendChild(dt); dl.appendChild(dd); });
        box.appendChild(dl);
      }
      return s;
    }
    function refreshReports() {
      var reports = opts.reports || (site && site.reports);
      if (!reports) return Promise.resolve(drawReports(reportsOf(undefined, name)));
      if (!name) return Promise.resolve(drawReports(reportsOf(null, null)));
      drawReports({ key: 'checking', label: 'reading', tone: 'muted', says: 'Your browser is reading the signed reports about ' + name + '.', missing: '', remedy: '', facts: [] });
      return Promise.resolve().then(function () { return reports(name); }).then(function (res) { return drawReports(reportsOf(res, name)); },
        function (e) { return drawReports(reportsOf({ ok: false, failure: 'The reports about ' + name + ' could not be read (' + ((e && e.message) || e) + ').' }, name)); });
    }
    function refresh() {
      refreshReports();
      var check = opts.check || (site && site.check);
      if (!check) return Promise.resolve(draw(stateOf(undefined, name)));
      if (!name) return Promise.resolve(draw(stateOf(null, null)));
      draw({ key: 'checking', label: 'checking ' + name, tone: 'muted', says: 'Your browser is checking who owns ' + name + '.', missing: '', remedy: '', facts: [] });
      return Promise.resolve().then(function () { return check(name); }).then(function (res) { return draw(stateOf(res, name)); },
        function (e) { return draw(stateOf({ ok: false, reason: 'NAME_UNRESOLVABLE', detail: e && e.message }, name)); });
    }
    return { ready: refresh(), refresh: refresh, remove: function () { [box, rbox].forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); }); } };
  }

  root.DefxnSiteCheck = { stateOf: stateOf, reportsOf: reportsOf, use: use, row: row };
})(typeof window !== 'undefined' ? window : globalThis);
