/* =====================================================================
   SHARED "CREATE A NEW IDENTITY" WIZARD UI
   ---------------------------------------------------------------------
   One real implementation, reused by every auth surface (defxn-dao's
   sign-in modal, defxn.com's /account page, and any future one) instead
   of each page hand-rolling its own copy of this form -- the exact
   "do it once, reuse it" the 2026-10-06 identity-creation gap review
   asked for. Built on js/admin/vendor/auth-kit-create.js's
   window.ArkAuthKitCreate.create(...) (the REAL, tested
   ark-dao/createRecoveryIdentity, bundled for the browser -- see that
   file's own header for why this reuses existing crypto rather than
   reimplementing it).

   window.ArkAuthKitCreatePanel.mount(container, opts) renders the
   two-stage wizard (form -> recovery phrase + download) into `container`
   and returns { reset() }. `opts.onDownloaded(filename)` fires once the
   real .auth.fxn file has been saved, so the caller can return to its own
   import/unlock view -- this module never signs anyone in itself; the
   existing, already-proven import path does that, the same way creating
   a wallet and then restoring it from its own backup proves the backup
   is real before anything relies on it (see js/identity-panel.js's
   header comment for the full reasoning). Caller supplies the CSS
   classes it already uses for buttons/forms/result banners so the
   wizard matches the host page's own styling, not a fixed look. */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || {};

  /* ---- v10 (2026-10-30): the screen-by-screen FXN ID wizard, for a surface with no /auth page (FXN Browser's own FXN ID
     box). On only when the caller names a gate committee (opts.committeeUrl) and the sign-in bundle carries
     createFxnId (js/admin/auth.js, scripts/auth-entry.js over fxn-auth's createAuthKitV10, the one writer). The screens
     follow the owner's design board of 2026-10-30 (Welcome, Identity, Security x3, Recovery, Confirm, File, Success,
     Complete) with a five-stage stepper. Every hint on a screen is a rule the writer enforces
     (ark-ui authKitUnlockSecret: a PIN is 6 to 12 digits, and a password is required only under 8 digits; the key word
     is optional, up to 128 characters; the icon is one of ark-ui's FXN_ID_ICONS, never a copy): a strength bar
     may grade, it never adds a rule. createFxnId makes the words, the Secret Key, the file and the gate enrollment in
     ONE call, so it runs when the last Security screen is left, and the Recovery screen shows what it returned.
     Markup is rebuilt only when the screen changes (the screen enters with a slide); typing updates the DOM in
     place, so a keystroke never replays the entry motion. Secrets leave memory and the DOM when the file is saved.
     The 3D FXN ID card is an empty frame for now (owner, 2026-10-30): same size and place, art later. ---- */
  var STAGES = ['Identity', 'Security', 'Recovery', 'Confirm', 'Complete'];
  var STAGE_OF = { name: 0, pin: 1, password: 1, word: 1, words: 2, confirm: 3, file: 4 };
  var STRENGTH_WORDS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  var ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  var ICON_EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.5 6.6C4 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.3-1M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4"/></svg>';
  var ICON_FOLDER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18Z"/></svg>';
  var ICON_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';
  var ICON_COPY = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5v-3A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/></svg>';
  var DONE_LIST = [
    ['Connect to apps', 'Sign in to any DEFXN app with the file and its PIN.', '<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5ZM4 10h16"/>'],
    ['Join the network', 'Your Public ID is how the network knows you.', '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/>'],
    ['Keep control of your identity', 'The file and its keys stay on this device.', '<path d="M12 3.5 5 6.5v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9v-5Z"/>'],
    ['Explore what’s possible', 'Names, wallets and apps are built on this ID.', '<circle cx="12" cy="12" r="8.5"/><path d="m15 9-2 6-4 2 2-6Z"/>']
  ];
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  /* A grade for the bar's length and word, never a rule: four length steps plus the character classes used. */
  function passwordStrength(s) {
    if (!s) return 0;
    var classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(s); }).length;
    var score = Math.min(4, Math.floor(s.length / 4)) + classes;
    return score <= 2 ? 1 : score <= 4 ? 2 : score <= 6 ? 3 : 4;
  }
  /* The PIN's grade follows the writer's rule: under 8 digits the file needs a password, so that is the word. */
  function pinStrength(pin) { var n = pin.length; return n < 6 ? 0 : n < 8 ? 1 : n < 10 ? 2 : n < 12 ? 3 : 4; }
  function pinWord(pin) { var g = pinStrength(pin); return g === 1 ? 'Needs a password' : STRENGTH_WORDS[g]; }
  function shuffle(list) { var a = list.slice(), i, j, t; for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function kilobytes(text) { return (new TextEncoder().encode(text).length / 1024).toFixed(1); }

  function mountV10(container, opts) {
    var actionClass = opts.actionClass != null ? opts.actionClass : 'fxn-btn fxn-btn-primary';
    var quietClass = opts.quietClass != null ? opts.quietClass : 'fxn-btn fxn-btn-quiet';
    var resultClass = opts.resultClass != null ? opts.resultClass : 'fxn-create-note';
    var icons = window.ArkAdminAuth.FXN_ID_ICONS || [];
    var screen, dir, error, making, values, made, show, written, words, shuffled, picked, fileSize, savedName, prevStage;
    function reset() {
      screen = 'welcome'; dir = 'fwd'; error = ''; prevStage = null; making = false; made = null; words = null; shuffled = null; picked = [];
      written = false; show = { pin: false, password: false }; fileSize = ''; savedName = '';
      values = { displayName: '', pin: '', password: '', word: '', icon: '', wordCount: '24' };
    }
    function passwordNeeded() { return values.pin.length < 8; }
    function stepError(key) {
      if (key === 'name' && !values.displayName.trim()) return 'Type a name.';
      if (key === 'pin' && !/^\d{6,12}$/.test(values.pin)) return 'Use 6 to 12 digits.';
      if (key === 'password' && passwordNeeded() && !values.password) return 'A PIN of ' + values.pin.length + ' digits needs a password.';
      if (key === 'word' && !icons.some(function (c) { return c.id === values.icon; })) return 'Pick one of the nine icons.';
      return '';
    }

    /* ---- pieces ---- */
    function btn(cls, attrs, label) { return '<button class="' + cls + '" ' + attrs + '>' + label + '</button>'; }
    function arrow(label) { return label + ' <span aria-hidden="true">→</span>'; }
    function card() { return '<div class="fxn-card-frame" aria-hidden="true"></div>'; }
    /* The progress line fills from the stage the person came from (--fxn-progress-from), so a rebuilt stepper still
       moves instead of appearing filled; the step just completed pops once (data-just). */
    function stepper(stage) {
      var from = prevStage == null ? stage : prevStage;
      return '<ol class="fxn-stepper" style="--fxn-progress:' + (stage / (STAGES.length - 1)) + ';--fxn-progress-from:' + (from / (STAGES.length - 1)) + '" aria-label="Steps">' +
        '<li class="fxn-stepper-line"><i></i></li>' +
        STAGES.map(function (label, i) {
          var state = i < stage ? 'done' : i === stage ? 'current' : 'todo';
          return '<li class="fxn-stepper-step" data-state="' + state + '"' + (state === 'current' ? ' aria-current="step"' : '') + (state === 'done' && i === from && from < stage ? ' data-just="true"' : '') + '>' +
            '<span class="fxn-stepper-dot">' + (state === 'done' ? ICON_CHECK : (i + 1)) + '</span><span class="fxn-stepper-label">' + label + '</span></li>';
        }).join('') + '</ol>';
    }
    function head(stage, title, lede) {
      return '<p class="fxn-create-step">Step ' + (stage + 1) + ' of ' + STAGES.length + '</p><h3>' + title + '</h3>' + (lede ? '<p class="fxn-create-lede">' + lede + '</p>' : '');
    }
    function notice() {
      return '<div class="' + resultClass + ' error" data-fxn-create-error' + (error ? '' : ' hidden') + '>' + esc(error) + '</div>' +
        '<div class="' + resultClass + '" data-fxn-making' + (making ? '' : ' hidden') + '>Making your FXN ID. This takes a few seconds.</div>';
    }
    function nav(nextLabel, nextAttrs) {
      return '<div class="fxn-create-actions">' + btn(quietClass, 'type="button" data-fxn-back', 'Back') +
        btn(actionClass, 'type="submit"' + (nextAttrs || '') + (making ? ' disabled' : ''), arrow(nextLabel || 'Next')) + '</div>';
    }
    function checkField(name, type, attrs, valid) {
      return '<div class="fxn-field"><input name="' + name + '" type="' + type + '" ' + attrs + ' value="' + esc(values[name]) + '">' +
        '<span class="fxn-field-check" data-fxn-check data-valid="' + valid + '" aria-hidden="true">' + ICON_CHECK + '</span></div>';
    }
    function eye(which) { return '<button type="button" class="fxn-eye" data-fxn-eye="' + which + '" aria-label="' + (show[which] ? 'Hide' : 'Show') + '" aria-pressed="' + show[which] + '">' + (show[which] ? ICON_EYE_OFF : ICON_EYE) + '</button>'; }
    function strengthBar(grade, word) {
      return '<div class="fxn-strength" data-fxn-strength data-grade="' + grade + '"><i class="fxn-strength-bar"><b></b></i><span class="fxn-strength-word">' + esc(word) + '</span></div>';
    }
    function pinBoxes() {
      var out = '';
      for (var i = 0; i < 12; i++) out += '<span class="fxn-pin-box" data-optional="' + (i >= 6) + '" data-filled="' + (i < values.pin.length) + '">' + (i < values.pin.length ? (show.pin ? esc(values.pin[i]) : '•') : '') + '</span>';
      return out;
    }
    function fileRow() {
      return '<div class="fxn-file-row"><span class="fxn-file-icon">' + ICON_FOLDER + '</span><span class="fxn-file-text"><b>' + esc(made ? made.fileName : savedName) + '</b><small>~' + esc(fileSize) + ' KB · Encrypted</small></span><span class="fxn-file-icon">' + ICON_LOCK + '</span></div>';
    }

    /* ---- screens ---- */
    function body() {
      var st = STAGE_OF[screen], needed, n;
      if (screen === 'welcome') return '<div class="fxn-welcome"><h3>Enter the Open Network</h3><p class="fxn-create-lede">Create your FXN ID to connect, build and explore across the DEFXN network.</p>' + card() +
        '<div class="fxn-create-actions fxn-create-actions-stack">' + btn(actionClass, 'type="button" data-fxn-go="name"', arrow('Create a new FXN ID')) + btn(quietClass, 'type="button" data-fxn-have', arrow('I have an FXN ID')) + '</div>' +
        '<p class="fxn-welcome-foot">Identity <i>•</i> Security <i>•</i> Your Data <i>•</i> Always Yours</p></div>';
      if (screen === 'name') return '<form class="fxn-create" data-fxn-create>' + stepper(st) + head(st, 'Name your identity', 'This name is for you. Sites see your Public ID, which this file makes next.') +
        checkField('displayName', 'text', 'maxlength="80" autocomplete="nickname" aria-label="Name" autofocus', Boolean(values.displayName.trim())) +
        '<p class="fxn-hint">Up to 80 characters. The file is named from its letters, numbers, dots and underscores.</p>' + notice() +
        '<div class="fxn-create-actions">' + btn(actionClass, 'type="submit"', arrow('Next')) + '</div></form>';
      if (screen === 'pin') return '<form class="fxn-create" data-fxn-create>' + stepper(st) + head(st, 'Set a PIN', 'You type this PIN each time you open the file.') +
        '<div class="fxn-pin"><div class="fxn-pin-boxes" data-fxn-pin-boxes aria-hidden="true">' + pinBoxes() + '</div>' +
        '<input name="pin" class="fxn-pin-input" type="' + (show.pin ? 'text' : 'password') + '" inputmode="numeric" maxlength="12" autocomplete="new-password" aria-label="PIN" value="' + esc(values.pin) + '" autofocus>' + eye('pin') + '</div>' +
        strengthBar(pinStrength(values.pin), pinWord(values.pin)) +
        '<p class="fxn-hint">6 to 12 digits. With 6 or 7 digits, the next step asks for a password. With 8 or more, the password is optional.</p>' + notice() + nav() + '</form>';
      if (screen === 'password') {
        needed = passwordNeeded(); n = values.pin.length;
        return '<form class="fxn-create" data-fxn-create>' + stepper(st) + head(st, 'Create a password', needed ? 'Your ' + n + '-digit PIN needs a password. It is the file’s second lock.' : 'Optional with your ' + n + '-digit PIN. A password adds a second lock to the file.') +
          '<div class="fxn-field"><input name="password" type="' + (show.password ? 'text' : 'password') + '" autocomplete="new-password" aria-label="Password" value="' + esc(values.password) + '" autofocus>' + eye('password') + '</div>' +
          strengthBar(passwordStrength(values.password), STRENGTH_WORDS[passwordStrength(values.password)]) +
          '<ul class="fxn-checklist" data-fxn-checklist><li data-ok="' + (needed ? Boolean(values.password) : true) + '">' + ICON_CHECK + (needed ? 'Required with a PIN of ' + n + ' digits' : 'Optional with a PIN of ' + n + ' digits') + '</li>' +
          '<li data-ok="true">' + ICON_CHECK + 'Any length, any characters</li></ul>' + notice() + nav() + '</form>';
      }
      if (screen === 'word') return '<form class="fxn-create" data-fxn-create>' + stepper(st) + head(st, 'Choose a key word', 'Optional. One more thing only you know: the gate asks for it before it releases your Secret Key.') +
        checkField('word', 'text', 'maxlength="128" autocomplete="off" aria-label="Key word" autofocus', Boolean(values.word)) +
        '<p class="fxn-hint">Up to 128 characters.</p>' +
        '<p class="fxn-label">Choose an icon</p><div class="fxn-create-icons" role="radiogroup" aria-label="Icon">' + icons.map(function (c) {
          return '<button type="button" role="radio" aria-checked="' + (values.icon === c.id) + '" data-icon-id="' + esc(c.id) + '" title="' + esc(c.label) + '" aria-label="' + esc(c.label) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + esc(c.path) + '"/></svg></button>';
        }).join('') + '</div><p class="fxn-hint">You pick it again each time you sign in.</p>' +
        '<p class="fxn-label">Recovery words</p><div class="fxn-create-choice" role="radiogroup" aria-label="Recovery words">' + [['24', '24 words', 'Harder to guess'], ['12', '12 words', 'Quicker to write down']].map(function (o) {
          return '<button type="button" role="radio" aria-checked="' + (values.wordCount === o[0]) + '" data-word-count="' + o[0] + '"><b>' + o[1] + '</b><small>' + o[2] + '</small></button>';
        }).join('') + '</div>' + notice() + nav() + '</form>';
      if (screen === 'words') {
        var gate = made.gate;
        return '<form class="fxn-create" data-fxn-create>' + stepper(st) + head(st, 'Recovery words', 'Write these ' + words.length + ' words and the Secret Key on paper, in order. They bring your FXN ID back if you lose the file. This is the only time they are shown.') +
          '<ol class="fxn-words" style="--fxn-rows:' + Math.ceil(words.length / 2) + '">' + words.map(function (w, i) { return '<li><small>' + (i + 1) + '</small><strong>' + esc(w) + '</strong></li>'; }).join('') + '</ol>' +
          '<div class="fxn-words-tools">' + btn(quietClass + ' fxn-btn-small', 'type="button" data-fxn-copy', ICON_COPY + ' Copy to clipboard') + '<span class="fxn-hint" data-fxn-copied aria-live="polite"></span></div>' +
          '<p class="fxn-label">Master ID Secret Key</p><code class="fxn-create-secret">' + esc(made.emergencyKit.secretKey) + '</code>' +
          '<p class="fxn-hint">' + (gate.failed.length
            ? 'The gate holds your Secret Key in pieces. ' + gate.enrolled.length + ' of ' + gate.nodes + ' gate nodes took their piece; ' + gate.threshold + ' are needed. Keep the Secret Key above: the file opens with it.'
            : 'The gate holds your Secret Key in pieces: all ' + gate.nodes + ' gate nodes took theirs.') + '</p>' +
          '<label class="fxn-check-row"><input type="checkbox" data-fxn-written' + (written ? ' checked' : '') + '> I have written down my recovery words and the Secret Key</label>' + notice() +
          nav('Next', written ? '' : ' disabled') + '</form>';
      }
      if (screen === 'confirm') return '<form class="fxn-create" data-fxn-create>' + stepper(st) + head(st, 'Confirm your recovery words', 'Tap the words in the order you wrote them.') +
        '<div class="fxn-chips" role="group" aria-label="Recovery words, shuffled">' + shuffled.map(function (w, i) {
          return '<button type="button" class="fxn-chip" data-chip="' + i + '" data-state="' + (picked.indexOf(i) >= 0 ? 'picked' : '') + '">' + esc(w) + '</button>';
        }).join('') + '</div>' +
        '<div class="fxn-words-tools"><span class="fxn-hint" data-fxn-counter aria-live="polite">' + picked.length + ' / ' + words.length + ' correct</span>' + btn(quietClass + ' fxn-btn-small', 'type="button" data-fxn-restart', 'Start over') + '</div>' + notice() +
        nav('Next', picked.length === words.length ? '' : ' disabled') + '</form>';
      if (screen === 'file') return '<form class="fxn-create" data-fxn-create>' + stepper(st) + head(st, 'Create your FXN ID file', 'The file holds your identity, locked with your PIN' + (values.password ? ' and password' : '') + '.') +
        fileRow() + '<div class="fxn-save-row"><span>Save to</span><b>Downloads</b><small>Set in Settings › Downloads</small></div>' +
        '<div class="fxn-info">Your FXN ID stays on this device and is never uploaded.</div>' + notice() + nav('Create FXN ID') + '</form>';
      if (screen === 'success') return '<div class="fxn-create fxn-success"><div class="fxn-success-tile" aria-hidden="true">' + ICON_CHECK + '</div><h3>Your FXN ID is ready</h3>' +
        '<p class="fxn-create-lede">' + esc(savedName) + ' is in your Downloads folder. Keep the file, and keep the words apart from it.</p>' + fileRow() +
        '<div class="fxn-create-actions fxn-create-actions-stack">' + (opts.onOpenDownloads ? btn(actionClass, 'type="button" data-fxn-open-downloads', arrow('Open Downloads')) : '') + btn(opts.onOpenDownloads ? quietClass : actionClass, 'type="button" data-fxn-open-kit', arrow('View my FXN ID')) + '</div>' +
        '<p class="fxn-links"><button type="button" class="fxn-link" data-fxn-go="done">What’s next?</button>' + (opts.onLearnMore ? '<button type="button" class="fxn-link" data-fxn-learn>Learn more</button>' : '') + '</p></div>';
      if (screen === 'done') return '<div class="fxn-create fxn-done"><h3>You’re all set</h3><p class="fxn-create-lede">Your FXN ID opens every DEFXN app. Here is what it does.</p>' + card() +
        '<ul class="fxn-done-list">' + DONE_LIST.map(function (it, i) { return '<li style="--fxn-i:' + i + '"><span class="fxn-done-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + it[2] + '</svg></span><span><b>' + it[0] + '</b><small>' + it[1] + '</small></span></li>'; }).join('') + '</ul>' +
        '<div class="fxn-create-actions fxn-create-actions-stack">' + btn(actionClass, 'type="button" data-fxn-open-kit', arrow('Go to my FXN ID')) + '</div>' +
        '<p class="fxn-links"><button type="button" class="fxn-link" data-fxn-home>Back to home</button></p></div>';
      return '';
    }
    function render() {
      container.innerHTML = '<div class="fxn-screen" data-screen="' + screen + '" data-dir="' + dir + '">' + body() + '</div>';
      var input = container.querySelector('[autofocus]'); if (input) input.focus();
    }

    /* ---- in-place updates while typing (no re-render, so no replayed motion) ---- */
    function setError(msg) {
      error = msg; var el = container.querySelector('[data-fxn-create-error]');
      if (el) { el.textContent = msg; el.hidden = !msg; }
    }
    function setStrength(grade, word) {
      var el = container.querySelector('[data-fxn-strength]'); if (!el) return;
      el.dataset.grade = String(grade); el.querySelector('.fxn-strength-word').textContent = word;
    }
    function setCheck(valid) { var el = container.querySelector('[data-fxn-check]'); if (el) el.dataset.valid = String(valid); }
    function setNextEnabled(on) { var el = container.querySelector('button[type="submit"]'); if (el) el.disabled = !on; }
    function onInput(input) {
      if (input.name === 'displayName') { values.displayName = input.value; setCheck(Boolean(input.value.trim())); }
      else if (input.name === 'pin') {
        var digits = input.value.replace(/\D/g, '').slice(0, 12); if (digits !== input.value) input.value = digits;
        values.pin = digits; var boxes = container.querySelector('[data-fxn-pin-boxes]'); if (boxes) boxes.innerHTML = pinBoxes();
        setStrength(pinStrength(digits), pinWord(digits));
      } else if (input.name === 'password') {
        values.password = input.value; setStrength(passwordStrength(input.value), STRENGTH_WORDS[passwordStrength(input.value)]);
        var row = container.querySelector('[data-fxn-checklist] li'); if (row) row.dataset.ok = String(passwordNeeded() ? Boolean(input.value) : true);
      } else if (input.name === 'word') { values.word = input.value; setCheck(Boolean(input.value)); }
      if (error) setError('');
    }

    /* ---- moving between screens ---- */
    function go(next, back) { dir = back ? 'back' : 'fwd'; error = ''; prevStage = STAGE_OF[screen] == null ? null : STAGE_OF[screen]; screen = next; render(); }
    function forward() {
      var e = stepError(screen); if (e) { setError(e); return; }
      if (screen === 'name') go('pin');
      else if (screen === 'pin') go('password');
      else if (screen === 'password') go('word');
      else if (screen === 'word') make();
      else if (screen === 'words' && written) { shuffled = shuffle(words); picked = []; go('confirm'); }
      else if (screen === 'confirm' && picked.length === words.length) go('file');
      else if (screen === 'file') save();
    }
    function backward() {
      if (screen === 'pin') go('name', true);
      else if (screen === 'password') go('pin', true);
      else if (screen === 'word') go('password', true);
      /* Back past the words discards what createFxnId made: a changed PIN or icon needs a new kit, and the old
         words must not survive in memory behind a screen that no longer shows them. */
      else if (screen === 'words') { made = null; words = null; written = false; go('word', true); }
      else if (screen === 'confirm') { picked = []; go('words', true); }
      else if (screen === 'file') go('confirm', true);
    }
    function make() {
      making = true; setError(''); setNextEnabled(false);
      var m = container.querySelector('[data-fxn-making]'); if (m) m.hidden = false;
      window.ArkAdminAuth.createFxnId({ committeeUrl: opts.committeeUrl, displayName: values.displayName.trim(), pin: values.pin, password: values.password, word: values.word, icon: values.icon, wordCount: values.wordCount === '12' ? 12 : 24 })
        .then(function (result) {
          making = false; made = result; words = result.emergencyKit.mnemonic.split(' '); fileSize = kilobytes(result.text); written = false;
          values.pin = values.password = values.word = ''; go('words');
        }, function (err) {
          making = false; error = err.message; dir = 'back'; prevStage = STAGE_OF[screen]; screen = /PIN/i.test(err.message) ? 'pin' : 'word'; render();
        });
    }
    function save() {
      var blob = new Blob([made.text], { type: 'application/vnd.flux.auth-kit' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = made.fileName; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      savedName = made.fileName;
      /* The kit's secrets leave memory once the file is saved: the words, the Secret Key, the shuffled copy. */
      made = null; words = null; shuffled = null; picked = [];
      go('success');
      if (opts.onSaved) opts.onSaved(savedName);
    }
    function pick(chip) {
      var i = Number(chip.dataset.chip);
      if (picked.indexOf(i) >= 0) return;
      if (shuffled[i] === words[picked.length]) {
        picked.push(i); chip.dataset.state = 'picked';
        var counter = container.querySelector('[data-fxn-counter]'); if (counter) counter.textContent = picked.length + ' / ' + words.length + ' correct';
        setNextEnabled(picked.length === words.length);
      } else {
        /* A wrong word shakes and settles (animationend clears it), and nothing is counted. */
        chip.dataset.state = 'wrong';
        var settle = function () { if (chip.dataset.state === 'wrong') chip.dataset.state = ''; };
        chip.addEventListener('animationend', settle, { once: true }); setTimeout(settle, 400);   /* reduced motion: no animationend */
      }
    }

    container.addEventListener('submit', function (event) { event.preventDefault(); if (!making) forward(); });
    container.addEventListener('input', function (event) { if (event.target.matches('input[name]')) onInput(event.target); });
    container.addEventListener('change', function (event) {
      if (event.target.matches('[data-fxn-written]')) { written = event.target.checked; setNextEnabled(written); }
    });
    container.addEventListener('click', function (event) {
      var t = event.target.closest('button'); if (!t || making) return;
      if (t.hasAttribute('data-fxn-back')) backward();
      else if (t.dataset.fxnGo) go(t.dataset.fxnGo);
      else if (t.hasAttribute('data-fxn-have')) { if (opts.onHaveId) opts.onHaveId(); }
      else if (t.hasAttribute('data-fxn-home')) { reset(); render(); }
      else if (t.hasAttribute('data-fxn-open-kit')) { if (opts.onOpenKit) opts.onOpenKit(savedName); }
      else if (t.hasAttribute('data-fxn-open-downloads')) { if (opts.onOpenDownloads) opts.onOpenDownloads(savedName); }
      else if (t.hasAttribute('data-fxn-learn')) { if (opts.onLearnMore) opts.onLearnMore(); }
      else if (t.dataset.fxnEye) {
        var which = t.dataset.fxnEye; show[which] = !show[which];
        var input = container.querySelector('input[name="' + which + '"]'); if (input) input.type = show[which] ? 'text' : 'password';
        t.innerHTML = show[which] ? ICON_EYE_OFF : ICON_EYE; t.setAttribute('aria-label', show[which] ? 'Hide' : 'Show'); t.setAttribute('aria-pressed', String(show[which]));
        var boxes = container.querySelector('[data-fxn-pin-boxes]'); if (boxes) boxes.innerHTML = pinBoxes();
        if (input) input.focus();
      }
      else if (t.dataset.iconId) {
        values.icon = t.dataset.iconId; setError('');
        Array.prototype.forEach.call(container.querySelectorAll('[data-icon-id]'), function (b) { b.setAttribute('aria-checked', String(b.dataset.iconId === values.icon)); });
      }
      else if (t.dataset.wordCount) {
        values.wordCount = t.dataset.wordCount;
        Array.prototype.forEach.call(container.querySelectorAll('[data-word-count]'), function (b) { b.setAttribute('aria-checked', String(b.dataset.wordCount === values.wordCount)); });
      }
      else if (t.dataset.chip) pick(t);
      else if (t.hasAttribute('data-fxn-restart')) { picked = []; go('confirm', true); }
      else if (t.hasAttribute('data-fxn-copy') && words) {
        /* The board asks for it. It puts the phrase on the clipboard, where any app can read it: the owner decides
           whether it stays (report, 2026-10-30). */
        var note = container.querySelector('[data-fxn-copied]');
        (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(words.join(' ')) : Promise.reject(new Error('no clipboard')))
          .then(function () { if (note) note.textContent = 'Copied. Clear the clipboard after you paste.'; }, function () { if (note) note.textContent = 'Copy is blocked here. Write the words by hand.'; });
      }
    });
    reset(); render();
    return { reset: function () { reset(); render(); } };
  }

  function mount(container, opts) {
    opts = opts || {};
    if (opts.committeeUrl && window.ArkAdminAuth && window.ArkAdminAuth.createFxnId) return mountV10(container, opts);
    var actionClass = opts.actionClass != null ? opts.actionClass : 'action';
    var formClass = opts.formClass != null ? opts.formClass : 'founding-form';
    var resultClass = opts.resultClass != null ? opts.resultClass : 'result-banner';
    var stage = 'form';
    var kit = null;

    function render() {
      if (stage === 'form') {
        container.innerHTML =
          '<form class="' + formClass + '" data-auth-kit-create-form>' +
            '<label>Your name<input type="text" name="displayName" maxlength="80" required autofocus></label>' +
            '<label>Recovery words' +
              '<select name="wordCount"><option value="24" selected>24 words</option><option value="12">12 words</option></select>' +
            '</label>' +
            '<label>PIN<input type="password" name="pin" inputmode="numeric" placeholder="8–12 digits" autocomplete="new-password" required></label>' +
            '<label>Password (optional)<input type="password" name="password" autocomplete="new-password"></label>' +
            '<p class="account-hint">Use 8–12 PIN digits, or 6–12 digits with a password. You type them each time you open the file.</p>' +
            '<button class="' + actionClass + '" type="submit">Create my FXN ID</button>' +
          '</form><div class="' + resultClass + '" data-auth-kit-create-result hidden></div>';
        var form = container.querySelector('[data-auth-kit-create-form]');
        var result = container.querySelector('[data-auth-kit-create-result]');
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var data = new FormData(form);
          var pin = String(data.get('pin') || '');
          var password = String(data.get('password') || '');
          var displayName = String(data.get('displayName') || '').trim();
          if (!/^\d{6,12}$/.test(pin) || (pin.length < 8 && !password)) {
            result.hidden = false; result.className = resultClass + ' error'; result.textContent = 'Use 8–12 PIN digits alone, or 6–12 digits with a password.'; return;
          }
          if (!displayName) return;
          result.hidden = false; result.className = resultClass; result.textContent = 'Making your FXN ID…';
          (window.ArkAuthKitCreate ? window.ArkAuthKitCreate.create({
            displayName: displayName, wordCount: Number(data.get('wordCount')) === 12 ? 12 : 24, pin: pin, password: password,
          }) : Promise.reject(new Error('js/admin/vendor/auth-kit-create.js did not load.'))).then(function (created) {
            kit = created; stage = 'recovery'; render();
          }).catch(function (error) {
            result.className = resultClass + ' error'; result.textContent = error.message;
          });
        });
      } else if (stage === 'recovery') {
        var words = kit.mnemonic.split(' ');
        container.innerHTML =
          '<p class="lead">Write these ' + words.length + ' words on paper, in order. They bring your identity back if you lose the file. Anyone who has them can open it, so never photograph or paste them.</p>' +
          '<ol class="auth-word-grid">' + words.map(function (w, i) { return '<li><small>' + (i + 1) + '</small><strong></strong></li>'; }).join('') + '</ol>' +
          '<label class="auth-word-confirm"><input type="checkbox" data-auth-kit-create-written> I wrote the words down</label>' +
          '<button class="' + actionClass + '" type="button" data-auth-kit-create-download disabled>Save FXN ID file</button>' +
          '<div class="' + resultClass + '" data-auth-kit-create-download-result hidden></div>';
        var items = container.querySelectorAll('.auth-word-grid li strong');
        words.forEach(function (w, i) { items[i].textContent = w; });
        var written = container.querySelector('[data-auth-kit-create-written]'), saveButton = container.querySelector('[data-auth-kit-create-download]');
        written.addEventListener('change', function () { saveButton.disabled = !written.checked; });
        saveButton.addEventListener('click', function () {
          var filename = (kit.displayName.trim().toLowerCase().replace(/[^a-z0-9._]+/g, '-').replace(/^-+|-+$/g, '') || 'fxn-id') + '.auth.fxn';
          var blob = new Blob([kit.authKit], { type: 'application/vnd.flux.auth-kit' });
          var url = URL.createObjectURL(blob);
          var anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
          var result = container.querySelector('[data-auth-kit-create-download-result]');
          result.hidden = false; result.className = resultClass + ' ok';
          result.textContent = 'FXN ID file saved as ' + filename + '. Keep it, and keep the words apart from it. Next, choose the file under Sign in.';
          stage = 'done'; kit = null;
          if (opts.onDownloaded) setTimeout(function () { opts.onDownloaded(filename); }, 6000);
        });
      }
    }

    render();
    return { reset: function () { stage = 'form'; kit = null; render(); } };
  }

  window.ArkUI.authKitCreatePanel = { mount: mount };
  window.ArkAuthKitCreatePanel = { mount: mount };
})();
