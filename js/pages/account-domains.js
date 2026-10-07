/* Your domains: the names/* records this browser has chosen to track, each
   re-verified live against the mesh on every view (see js/ark/local-domains.js
   for why there is no server-side "list my names" query to read instead). */
(function () {
  'use strict';
  var HOSTNAME = typeof location !== 'undefined' && location.hostname || 'localhost';
  var LOCAL_MINER = /^(127\.0\.0\.1|localhost)$/.test(HOSTNAME) ? 'http://127.0.0.1:8766' : 'https://cd1.defxn.com';
  var EXPLORER_API = 'explorer-api-v1';

  function text(value, fallback) { return value == null || value === '' ? (fallback || '—') : String(value); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function liveUrl(name) {
    var label = name.replace(/\.fxn$/i, '');
    return label === name ? null : 'https://' + label + '.defxn.com';
  }

  ArkUI.pageModules.accountDomains = {
    mount: function (host) {
      var page = document.createElement('section');
      page.className = 'ark-page task-page account-page account-domains-page';
      page.setAttribute('aria-labelledby', 'account-domains-title');
      // Same shape as /account: the ask on the left, one card on the right.
      page.innerHTML =
        '<div class="account-shell account-domains-shell">' +
        '<header class="account-hero"><a class="account-domains-back" href="/account" data-scene-link="account">← Your account</a><p class="account-promise">Names you track</p>' +
        '<h1 id="account-domains-title">Your domains.</h1>' +
        '<p class="account-intro">Each name is checked live against the mesh. This browser only keeps the list of names to check.</p>' +
        '<form data-domains-form aria-label="Track a domain"><label for="domainsNameInput">Track an exact name</label><input id="domainsNameInput" type="text" autocomplete="off" placeholder="yourname.fxn" /><button type="submit" class="palette-solid">Track &amp; verify</button></form>' +
        '<p data-domains-add-status role="status" aria-live="polite"></p>' +
        '<p class="account-domains-note">Claim a new name from the CMS on <a href="/account" data-scene-link="account">your account</a>.</p></header>' +
        '<section class="account-card account-domains-list" aria-label="Tracked domains"><p class="account-card-caption">Tracked names <span data-domains-count>(0)</span></p>' +
        '<ul data-domains-items></ul>' +
        '<p class="account-domains-empty" data-domains-empty hidden>No names tracked yet. Add one to see its owner and target.</p></section>' +
        '</div>';
      host.appendChild(page);

      var form = page.querySelector('[data-domains-form]');
      var input = page.querySelector('#domainsNameInput');
      var addStatus = page.querySelector('[data-domains-add-status]');
      var itemsEl = page.querySelector('[data-domains-items]');
      var countEl = page.querySelector('[data-domains-count]');
      var emptyEl = page.querySelector('[data-domains-empty]');
      var generation = 0;
      var controllers = Object.create(null);

      function explorerRecord(payload, name) {
        if (!payload || payload.apiVersion !== EXPLORER_API || !payload.data || !payload.data.record || payload.data.record.id !== name) return null;
        return payload.data.record;
      }

      async function verifyName(name, token, cardFields) {
        cardFields.status.textContent = 'Checking the mesh…';
        cardFields.card.dataset.state = 'checking';
        if (controllers[name]) controllers[name].abort();
        var controller = new AbortController();
        controllers[name] = controller;
        var timeout = window.setTimeout(function () { controller.abort(); }, 10000);
        try {
          var response = await fetch(LOCAL_MINER + '/explorer/v1/record', {
            method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ sourceId: 'names', recordId: name, scope: { name: name } }),
            signal: controller.signal, cache: 'no-store'
          });
          var payload = await response.json().catch(function () { return null; });
          if (token !== generation) return;
          if (!response.ok) throw new Error(payload && payload.error && payload.error.message || 'Miner returned HTTP ' + response.status + '.');
          var record = explorerRecord(payload, name);
          if (!record) throw new Error('No name record found for ' + name + '.');
          if (record.verification && record.verification.state !== 'verified') throw new Error('Returned without verified provenance.');
          var body = record.fields && record.fields.sourceRecord && typeof record.fields.sourceRecord === 'object' ? record.fields.sourceRecord : {};
          var who = window.ArkUI.localIdentity && window.ArkUI.localIdentity.current();
          var mine = who && body.ownerPublicKey && who.publicKeyB64 === body.ownerPublicKey;
          cardFields.card.dataset.state = mine ? 'mine' : 'found';
          cardFields.status.textContent = mine ? 'Owned by your signed-in identity.' : 'Live on the mesh.';
          cardFields.owner.textContent = text(body.ownerPublicKey, 'Not reported');
          cardFields.updated.textContent = body.updatedAt ? new Date(body.updatedAt).toLocaleString() : 'Not dated';
          var target = Array.isArray(body.targets) && body.targets[0];
          cardFields.target.textContent = target ? text(target.value, 'Not reported') : 'No target recorded';
          var url = liveUrl(name);
          if (url) { cardFields.open.hidden = false; cardFields.open.href = url; } else { cardFields.open.hidden = true; }
        } catch (error) {
          if (token !== generation) return;
          cardFields.card.dataset.state = error && error.name === 'AbortError' ? 'timeout' : 'missing';
          cardFields.status.textContent = error && error.name === 'AbortError' ? 'The Miner did not respond in time.' : text(error && error.message, 'That name has no record on the mesh yet.');
          cardFields.owner.textContent = '—'; cardFields.updated.textContent = '—'; cardFields.target.textContent = '—';
          cardFields.open.hidden = true;
        } finally {
          window.clearTimeout(timeout);
          if (controllers[name] === controller) delete controllers[name];
        }
      }

      function renderList(names) {
        generation += 1;
        var token = generation;
        countEl.textContent = '(' + names.length + ')';
        emptyEl.hidden = names.length > 0;
        itemsEl.innerHTML = '';
        names.forEach(function (name) {
          var li = document.createElement('li');
          li.className = 'account-domains-item';
          li.innerHTML = '<div class="account-domains-item-head"><strong>' + escapeHtml(name) + '</strong><button type="button" data-domains-remove="' + escapeHtml(name) + '">Stop tracking</button></div>' +
            '<p class="account-domains-item-status" data-status>Checking the mesh…</p>' +
            '<dl><div><dt>Owner</dt><dd data-owner>—</dd></div><div><dt>Target</dt><dd data-target>—</dd></div><div><dt>Updated</dt><dd data-updated>—</dd></div></dl>' +
            '<a data-open hidden target="_blank" rel="noopener">Open live site ↗</a>';
          itemsEl.appendChild(li);
          var cardFields = {
            card: li, status: li.querySelector('[data-status]'), owner: li.querySelector('[data-owner]'),
            updated: li.querySelector('[data-updated]'), target: li.querySelector('[data-target]'), open: li.querySelector('[data-open]')
          };
          verifyName(name, token, cardFields);
        });
      }

      itemsEl.addEventListener('click', function (event) {
        var button = event.target.closest && event.target.closest('[data-domains-remove]');
        if (!button) return;
        window.ArkUI.localDomains.remove(button.getAttribute('data-domains-remove'));
      });

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        try {
          var name = window.ArkUI.localDomains.add(input.value);
          input.value = '';
          addStatus.textContent = 'Tracking ' + name + '.';
        } catch (error) {
          addStatus.textContent = text(error && error.message, 'Could not track that name.');
        }
      });

      var unsubscribe = window.ArkUI.localDomains.subscribe(renderList);
      page.arkDispose = function () {
        generation += 1;
        Object.keys(controllers).forEach(function (name) { controllers[name].abort(); });
        unsubscribe();
      };
      return page;
    }
  };
})();
