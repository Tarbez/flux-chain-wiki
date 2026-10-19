'use strict';
/* The editor's ONE notice component (js/admin/notice.js): toast or banner, tone, title, body,
   actions -- and the contract the later Ark UI port must keep.

   Why this exists (docs/ux-audit/cms.md P1-16 and the four P0s): the editor reported through four
   channels -- a header status cut to ten characters, a #toast that vanished after 2.6 s, the footer
   and rail dots -- so "not saved", "cannot publish" and "this page is a draft" read as nothing
   happening, and a refusal could not carry its remedy as a button. Each case below is a way the
   one component could plausibly go wrong:
     - a toast closes by itself, but never while it is hovered or focused (a person reading it, or
       reaching for its button);
     - a banner (persist) stays until whoever fixed its condition closes it by key;
     - one notice per key: the same condition twice is one banner, not a stack;
     - warning and danger are announced (role alert), info and success politely (role status);
       the status line's tones (ok / warn / error) mean success / warning / danger;
     - a toast's action closes it; a banner's does not (its condition decides);
     - toasts give way past three, oldest first; banners go above the canvas when the workspace
       has the strip (#noticeBanners), inline when given a container (a sheet's own alert);
     - core.js toast() is a notice now, not its own element. */
const assert = require('node:assert/strict');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

const { window, document, A } = bootForms();
/* the clock, held: notice.js reads setTimeout from the window when it arms a toast */
const timers = [];
window.setTimeout = (fn, ms) => { timers.push({ fn, ms, done: false }); return timers.length; };
window.clearTimeout = (id) => { if (timers[id - 1]) timers[id - 1].done = true; };
const fire = () => { const due = timers.filter((t) => !t.done); due.forEach((t) => { t.done = true; t.fn(); }); return due.map((t) => t.ms); };
const notice = A.notice;

/* ---- a toast: tone, parts, closes by itself, not while hovered ---- */
const t = notice({ tone: 'ok', title: 'Saved', body: 'Saved 2 items.' });
assert.equal(t.el.dataset.tone, 'success', "the status line's 'ok' is success");
assert.equal(t.el.getAttribute('role'), 'status', 'a success is announced politely');
assert.equal(t.el.dataset.part, 'toast');
assert.equal(t.el.querySelector('[data-part="alert-title"]').textContent, 'Saved');
assert.equal(t.el.querySelector('[data-part="alert-description"]').textContent, 'Saved 2 items.');
assert(t.el.parentElement && t.el.parentElement.id === 'noticeToasts', 'toasts stack in one region');
t.el.dispatchEvent(new window.Event('pointerenter'));
assert.deepEqual(fire(), [6000], 'a toast without actions is up for 6 s');
assert(t.el.isConnected, 'a hovered toast stays: the person is reading it');
t.el.dispatchEvent(new window.Event('pointerleave'));
fire();
assert(!t.el.isConnected && t.closed, 'an unhovered toast closes when its time is up');

/* ---- a toast's action runs, and closes it; with an action it stays longer ---- */
let undone = 0;
const u = notice({ tone: 'info', title: 'Reverted', actions: [{ label: 'Undo', run: () => { undone += 1; } }] });
assert.equal(timers.filter((x) => !x.done).pop().ms, 10000, 'a toast with an action is up longer: 10 s');
u.el.querySelector('[data-part="alert-action"]').click();
assert.equal(undone, 1, 'the action ran');
assert(!u.el.isConnected, 'a toast closes once its action ran');
fire();

/* ---- a banner: stays, one per key, closed by key; warning is announced ---- */
const b1 = notice({ tone: 'warn', persist: true, key: 'cond', title: 'First', actions: [{ label: 'Fix', run: () => {} }] });
assert.equal(b1.el.dataset.tone, 'warning');
assert.equal(b1.el.getAttribute('role'), 'alert', 'a warning is announced (role alert)');
assert.equal(b1.el.dataset.part, 'alert');
assert.equal(timers.filter((x) => !x.done).length, 0, 'a banner arms no timer');
b1.el.querySelector('[data-part="alert-action"]').click();
assert(b1.el.isConnected, 'a banner\'s action does not close it: its condition decides');
const b2 = notice({ tone: 'error', persist: true, key: 'cond', title: 'Second' });
assert(!b1.el.isConnected && b2.el.isConnected, 'the same key replaces, never stacks');
assert.equal(b2.el.dataset.tone, 'danger', "the status line's 'error' is danger");
assert.equal(document.querySelectorAll('[data-notice="cond"]').length, 1);
assert.equal(notice.get('cond'), b2);
notice.close('cond');
assert(!b2.el.isConnected && notice.get('cond') === null, 'close(key) closes the condition\'s banner');

/* ---- the dismiss button ---- */
const d = notice({ tone: 'info', persist: true, title: 'Dismiss me' });
d.el.querySelector('[data-part="alert-dismiss"]').click();
assert(!d.el.isConnected, 'every notice can be dismissed');

/* ---- where: the workspace strip, or inline in a container ---- */
const strip = document.createElement('div'); strip.id = 'noticeBanners'; document.body.appendChild(strip);
const s = notice({ persist: true, title: 'In the strip' });
assert.equal(s.el.parentElement, strip, 'a banner goes in the strip above the canvas when the workspace has one');
const box = document.createElement('div');
const inline = notice({ tone: 'warning', into: box, title: 'Inline' });
assert.equal(inline.el.parentElement, box, 'into: drawn inline in the given container');
assert.equal(timers.filter((x) => !x.done).length, 0, 'an inline alert never times out');

/* ---- toasts give way past three, oldest first ---- */
const four = [1, 2, 3, 4].map((n) => notice({ body: 'toast ' + n }));
assert.deepEqual(four.map((x) => x.el.isConnected), [false, true, true, true]);

/* ---- core.js toast() is a notice ---- */
A.toast('A refusal that names what it needs.');
const last = document.getElementById('noticeToasts').lastElementChild;
assert.equal(last.querySelector('[data-part="alert-description"]').textContent, 'A refusal that names what it needs.');

console.log('PASS: notice() is one toast/banner component: tones and roles, toasts that wait while read, banners that stay until their key closes them, one per key, actions, inline alerts, and core toast() on top of it.');
