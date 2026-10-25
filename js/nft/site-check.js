/* DEFXN identity card: the SITE CHECK in the wearer's bar (the owner's goal: a self-certified grid of sites, against
   phishing). It shows whether this page's name has an owner the wearer's own browser verified.

   It verifies nothing itself and keeps nothing. The site passes check(name), which returns exactly what
   gateway/resolve-name.js's resolveName() returns: that reads DOM_PROOF from a node and verifies it with the ONE
   shared verifier (dense-wire's flx-domain-proof.mjs) against the pinned genesis key, so the node is not trusted
   (docs/DEFXN-NAMES-ONE-SYSTEM.md: no other name store, no second verifier, no second name rule).
     { ok: true, name, owner, ownerEntryCid, record: { cid, targets, updatedAt } | null, source, notChecked }
     { ok: false, reason, detail }   reason: NAME_NOT_FOUND | NAME_UNRESOLVABLE | PROOF_INVALID | GATEWAY_NOT_CONFIGURED

   What it can say, and what it cannot. A verified name proves who owns the name and where its owner points it.
   It says nothing about whether the page's words are true. Judging a scam or propaganda needs signed reports about
   a site, and no record kind carries them yet, so the check says that instead of a verdict.

   DefxnSiteCheck.stateOf(result)     a result as one closed state: { key, label, tone, says, missing, remedy, facts }
   DefxnSiteCheck.use({ check })      the site's verified read (resolveName, bound to its nodes and genesis key)
   DefxnSiteCheck.row(host, opts)     the check as one row of the wearer's card menu (never a bar item of its own);
                                      opts.name is the page's name, which the site derives from the names system
                                      (this file has no rule of its own: one rule, the site's); opts.check overrides use().
                                      -> { ready, refresh() -> Promise of the state, remove() }
   Works in the browser (window.DefxnSiteCheck); stateOf also in Node. */
(function (root) {
  'use strict';
  if (root.DefxnSiteCheck) return;

  var CONTENT = 'This proves who owns the name and where they point it. It does not prove the page\'s words are true: signed reports about a site do not exist yet.';
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

  var site = null;
  function use(hook) {
    if (hook && typeof hook.check !== 'function') throw new Error('DefxnSiteCheck.use needs { check(name) -> Promise of resolveName()\'s result }.');
    site = hook || null;
  }

  // the check as a row of a menu (the site's bar holds one control: the seal opens a menu, and this is a row in it)
  function row(host, opts) {
    opts = opts || {};
    var name = opts.name || null;
    var box = document.createElement('div');
    box.className = 'defxn-check';
    host.appendChild(box);
    function draw(s) {
      box.setAttribute('data-state', s.key); box.setAttribute('data-tone', s.tone);
      box.textContent = '';
      var head = document.createElement('p'), dot = document.createElement('span'), label = document.createElement('span');
      head.className = 'defxn-check__head'; dot.className = 'defxn-check__dot'; dot.setAttribute('aria-hidden', 'true');
      label.textContent = 'Site check: ' + s.label;
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
    function refresh() {
      var check = opts.check || (site && site.check);
      if (!check) return Promise.resolve(draw(stateOf(undefined, name)));
      if (!name) return Promise.resolve(draw(stateOf(null, null)));
      draw({ key: 'checking', label: 'checking ' + name, tone: 'muted', says: 'Your browser is checking who owns ' + name + '.', missing: '', remedy: '', facts: [] });
      return Promise.resolve().then(function () { return check(name); }).then(function (res) { return draw(stateOf(res, name)); },
        function (e) { return draw(stateOf({ ok: false, reason: 'NAME_UNRESOLVABLE', detail: e && e.message }, name)); });
    }
    return { ready: refresh(), refresh: refresh, remove: function () { if (box.parentNode) box.parentNode.removeChild(box); } };
  }

  root.DefxnSiteCheck = { stateOf: stateOf, use: use, row: row };
})(typeof window !== 'undefined' ? window : globalThis);
