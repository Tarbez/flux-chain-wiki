/* =====================================================================
   ADMIN EDITOR · ARK BEHAVIOUR PRIMITIVES ON THE LIGHT-DOM HOST (js/admin/ark-host.js)
   ---------------------------------------------------------------------
   Owns: the three behaviour primitives every editor surface folds or switches with, each run
   by Ark on its light-DOM host (ArkKit.createArkDomHost, js/ark/vendor/ark-kit.js) over
   elements this editor builds:
     arkTabs({ label, items: [{ id, label, content }], value, onChange })  -> root
         Page settings (Text / Shapes / Search & sharing / Advanced), Site style
         (Colours & background / Visitor defaults / Search defaults): ArkKit.createArkTabs.
     arkDisclosure({ label, content, defaultOpen, className, onToggle })  -> root
         Developer details (controls.js devDetails), SEO's Advanced, Unused fields, a
         version row's longer change list: ArkKit.createArkAccordion, one collapsible item,
         in Ark's `disclosure` block markup (css/ark-blocks.css draws it).
     arkTabsOn({ list, triggers, panels, values, value, onChange })  -> { select(value) }
         the same tabs over elements the page already has: the rail's five tabs (js/admin/rail.js).
     arkSegGroup(root, buttons, { selected, onPick })  -> { select(index) }
         the hand-built segmented groups (Edit words / Edit style, screen size, Edit / Preview,
         the new item's kind, Media's Grid / List, the More menu's Show: page / site map / site style): ArkKit.createArkToggleGroup, one pressed,
         one tab stop, arrows between the choices. Form rows use controls.js ctlSegField.
   Why it exists (docs/ux-audit/components.md §4 "Admin tabs / disclosure", cms.md (c)): the
   editor carried its own tabs and disclosure (js/admin/primitives.js, 109 lines) whose
   classes .ark-tabs / .ark-disclosure were ALSO Ark's block classes, so css/admin.css restyled
   Ark's blocks by accident (the census's `ark-overrides`), and five segmented groups each kept
   their own pressed state with Tab through every choice. Ark's primitives own the ARIA (roles,
   aria-selected / aria-expanded / aria-pressed, aria-controls, the roving tab stop) and the
   hidden state; the markup carries Ark's own class names so Ark's static sheet draws the tabs
   and the disclosure. Ids Ark generates carry its reserved `ark-r-` prefix, which ArkLayout's
   layout keys ignore (components.md R4). Without ArkKit (a test that loads only the builders)
   each works by click with the same attributes, so a form's tests need no browser.
   Must not: draw a form's content, know a feature, or keep editor state -- callers pass the
   content and are told of each change.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var h = A.h;

  /* an id for the no-kit path, under Ark's reserved generated-id prefix (never a layout key);
     self-contained so a test can cut this function out alone (tests/lib/admin-source.cjs) */
  function fallbackId(scope) { fallbackId.n = (fallbackId.n || 0) + 1; return 'ark-r-' + scope + '-' + fallbackId.n; }
  /* a fresh light-DOM host (one per control: it holds no document listener, so a re-render lets
     the old one go), or null when the kit is not loaded */
  function arkHost() {
    var kit = window.ArkKit;
    return kit && typeof kit.createArkDomHost === 'function' ? kit.createArkDomHost(document) : null;
  }

  /* Tabs: Ark's `tabs` block markup (segmented variant) around the editor's own panels. The
     panels are plain containers for a form (not Ark's text panel class, whose type scale is a
     page's); Ark marks each role="tabpanel" and hides the unselected ones. */
  function arkTabs(options) {
    var items = options.items || [];
    var ids = items.map(function (item) { return item.id; });
    var current = ids.indexOf(options.value) >= 0 ? options.value : ids[0];
    var root = h('div', { class: 'ark-block ark-tabs' + (options.className ? ' ' + options.className : ''), 'data-variant': options.variant || 'segmented', 'data-ark-primitive': 'tabs' });
    var list = h('div', { class: 'ark-tabs__list', 'aria-label': options.label || 'Sections' });
    root.appendChild(list);
    var triggers = [], panels = [];
    items.forEach(function (item) {
      var trigger = h('button', { type: 'button', class: 'ark-tabs__trigger', 'data-tab': item.id, text: item.label });
      var panel = h('div', { 'data-tab': item.id, tabindex: '0' });
      panel.appendChild(item.content);
      list.appendChild(trigger); root.appendChild(panel);
      triggers.push(trigger); panels.push(panel);
    });
    if (!items.length) return root;
    var changed = function (id) { if (id && id !== current) { current = id; if (typeof options.onChange === 'function') options.onChange(id); } };
    var host = arkHost(), kit = window.ArkKit;
    if (host && typeof kit.createArkTabs === 'function') {
      var ready = false;
      kit.createArkTabs(host, { listRef: host.bind(list, 'tablist'), tabRefs: triggers.map(function (t) { return host.bind(t, 'tab'); }),
        panelRefs: panels.map(function (p) { return host.bind(p, 'tabpanel'); }), values: ids, defaultValue: current, activationMode: 'manual',
        onValueChange: function (value) { if (ready) changed(value); } });
      ready = true;
    } else {
      list.setAttribute('role', 'tablist');
      var show = function (id) {
        triggers.forEach(function (t, i) {
          var on = ids[i] === id;
          t.setAttribute('aria-selected', String(on)); t.setAttribute('tabindex', on ? '0' : '-1'); t.setAttribute('data-state', on ? 'active' : 'inactive');
          panels[i].hidden = !on; panels[i].setAttribute('data-state', on ? 'active' : 'inactive');
        });
      };
      triggers.forEach(function (t, i) {
        t.id = fallbackId('tab'); panels[i].id = fallbackId('tabpanel');
        t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', panels[i].id);
        panels[i].setAttribute('role', 'tabpanel'); panels[i].setAttribute('aria-labelledby', t.id);
        t.addEventListener('click', function () { show(ids[i]); changed(ids[i]); });
      });
      show(current);
    }
    return root;
  }

  /* Tabs over elements the page already has (the rail's five tabs, whose panels are separate panes
     elsewhere in the document): options { list, triggers, panels, values, value, onChange(value) }.
     Ark's tabs own the roles, aria-selected / aria-controls, the roving tab stop and the arrow keys
     (automatic activation: an arrow selects as it moves, as the rail always did). `onChange` is told of
     a choice the PERSON made; the returned select(value) moves the selection for a change made by
     another route (a lens that opens its own tab) and reports nothing. Without ArkKit the same
     buttons work by click and arrow keys with the same attributes. */
  function arkTabsOn(options) {
    var values = options.values, triggers = options.triggers, panels = options.panels;
    var current = values.indexOf(options.value) >= 0 ? options.value : values[0];
    var told = function (value) { if (value && value !== current) { current = value; if (typeof options.onChange === 'function') options.onChange(value); } };
    var host = arkHost(), kit = window.ArkKit;
    if (host && typeof kit.createArkTabs === 'function') {
      var ready = false, syncing = false;
      var handle = kit.createArkTabs(host, { listRef: host.bind(options.list, 'tablist'), tabRefs: triggers.map(function (t) { return host.bind(t, 'tab'); }),
        panelRefs: panels.map(function (p) { return host.bind(p, 'tabpanel'); }), values: values, defaultValue: current, activationMode: 'automatic',
        onValueChange: function (value) { if (ready && !syncing) told(value); } });
      ready = true;
      return { select: function (value) {
        if (values.indexOf(value) < 0 || value === current) return;
        current = value; syncing = true; try { handle.setValue(value); } finally { syncing = false; }
      } };
    }
    var show = function (value) {
      triggers.forEach(function (t, i) {
        var on = values[i] === value;
        t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; panels[i].hidden = !on;
      });
    };
    options.list.setAttribute('role', 'tablist');
    triggers.forEach(function (t, i) { t.setAttribute('role', 'tab'); t.addEventListener('click', function () { show(values[i]); told(values[i]); }); });
    options.list.addEventListener('keydown', function (e) {
      var i = triggers.indexOf(document.activeElement);
      if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      e.preventDefault();
      var next = (i + (e.key === 'ArrowRight' ? 1 : triggers.length - 1)) % triggers.length;
      show(values[next]); told(values[next]); triggers[next].focus();
    });
    show(current);
    return { select: function (value) { if (values.indexOf(value) >= 0) { current = value; show(value); } } };
  }

  /* A disclosure: Ark's `disclosure` block markup (its trigger with the +/- icon, its panel),
     wired as a one-item collapsible accordion -- the kit ships createArkAccordion, not
     createArkDisclosure, and a single collapsible item has the same contract (aria-expanded,
     aria-controls, a region named by its trigger, the panel hidden="until-found" while closed
     so find-in-page can still open it). `data-ark-primitive="disclosure"` is the editor's own
     hook for its drivers. */
  function arkDisclosure(options) {
    var open = !!options.defaultOpen;
    var root = h('section', { class: 'ark-block ark-disclosure' + (options.className ? ' ' + options.className : ''), 'data-ark-primitive': 'disclosure',
      'data-preview': '0', 'data-fold-below': 'always', 'data-hidden-by': 'attribute', 'data-state': open ? 'open' : 'closed' });
    var trigger = h('button', { type: 'button', class: 'ark-disclosure__trigger' },
      h('span', { class: 'ark-disclosure__label', text: options.label || 'Details' }), h('span', { class: 'ark-disclosure__icon', 'aria-hidden': 'true' }));
    var panel = h('div', { class: 'ark-disclosure__panel' });
    panel.appendChild(options.content);
    root.appendChild(trigger); root.appendChild(panel);
    var toggled = function (isOpen) { if (isOpen !== open) { open = isOpen; if (typeof options.onToggle === 'function') options.onToggle(open); } };
    var host = arkHost(), kit = window.ArkKit;
    if (host && typeof kit.createArkAccordion === 'function') {
      var ready = false;
      kit.createArkAccordion(host, { listRef: host.bind(root, 'disclosure'), itemRefs: [host.bind(root, 'disclosure-item')],
        triggerRefs: [host.bind(trigger, 'disclosure-trigger')], panelRefs: [host.bind(panel, 'disclosure-panel')],
        values: ['details'], type: 'single', collapsible: true, defaultValue: open ? 'details' : [], hiddenUntilFound: true, animation: false,
        onValueChange: function (openValues) { if (ready) toggled(openValues.length > 0); } });
      ready = true;
    } else {
      trigger.id = fallbackId('disclosure-trigger'); panel.id = fallbackId('disclosure-panel');
      trigger.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'region'); panel.setAttribute('aria-labelledby', trigger.id);
      var sync = function () {
        trigger.setAttribute('aria-expanded', String(open)); trigger.setAttribute('data-state', open ? 'open' : 'closed');
        root.setAttribute('data-state', open ? 'open' : 'closed');
        if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', 'until-found');
      };
      trigger.addEventListener('click', function () { open = !open; sync(); if (typeof options.onToggle === 'function') options.onToggle(open); });
      sync();
    }
    return root;
  }

  /* A segmented group over existing buttons: `selected` is the pressed index (-1: none),
     onPick(index, button) runs on a NEW choice. The returned select(index) is for the owner's
     state changing by another route (a shortcut, a restore): it moves the pressed state and the
     tab stop without reporting a pick. */
  function arkSegGroup(root, buttons, options) {
    options = options || {};
    var current = typeof options.selected === 'number' ? options.selected : -1;
    buttons.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === current)); });
    var pick = function (i) { if (i < 0 || i === current) return; current = i; if (typeof options.onPick === 'function') options.onPick(i, buttons[i]); };
    var host = arkHost(), kit = window.ArkKit;
    if (host && typeof kit.createArkToggleGroup === 'function' && buttons.length) {
      var refs = buttons.map(function (b) { return host.bind(b, 'seg'); }), ready = false;
      var api = kit.createArkToggleGroup(host, { rootRef: host.bind(root, 'seg'), itemRefs: refs, selectedRefs: current >= 0 ? [refs[current]] : [],
        onValueChange: function (selected) { if (ready) pick(refs.indexOf(selected[0])); } });
      ready = true;
      return { select: function (i) {
        if (i < 0 || i >= refs.length || i === current) return;
        current = i; ready = false; api.select(refs[i]); ready = true;
      } };
    }
    buttons.forEach(function (b, i) { b.addEventListener('click', function () { buttons.forEach(function (x, j) { x.setAttribute('aria-pressed', String(i === j)); }); pick(i); }); });
    return { select: function (i) { if (i < 0 || i >= buttons.length) return; current = i; buttons.forEach(function (x, j) { x.setAttribute('aria-pressed', String(i === j)); }); } };
  }

  /* An accordion over sections the caller built: items [{ value, item, header, trigger, panel }]
     inside `list` (the group Ark names by `label`); several open at once. `open` is the values
     open at first (default: all); onChange(openValues) reports a change the person made. The
     returned open(value) / close(value) are for the owner (a search that must show a closed
     group's matches); they report through onChange too, so the owner guards its own calls. The
     look is the owner's (the Library's compact group heads): this wires the behaviour only. */
  function arkAccordion(list, items, options) {
    options = options || {};
    var values = items.map(function (it) { return it.value; });
    var openSet = new Set(Array.isArray(options.open) ? options.open : values);
    var change = function (openValues) { if (typeof options.onChange === 'function') options.onChange(openValues); };
    var host = arkHost(), kit = window.ArkKit;
    if (host && typeof kit.createArkAccordion === 'function' && items.length) {
      var ready = false;
      var handle = kit.createArkAccordion(host, { listRef: host.bind(list, 'accordion'), label: options.label,
        itemRefs: items.map(function (it) { return host.bind(it.item, 'accordion-item'); }),
        headerRefs: items.every(function (it) { return it.header; }) ? items.map(function (it) { return host.bind(it.header, 'accordion-header'); }) : undefined,
        triggerRefs: items.map(function (it) { return host.bind(it.trigger, 'accordion-trigger'); }),
        panelRefs: items.map(function (it) { return host.bind(it.panel, 'accordion-panel'); }),
        values: values, type: 'multiple', defaultValue: values.filter(function (v) { return openSet.has(v); }), animation: false,
        onValueChange: function (openValues) { if (ready) change(openValues.slice()); } });
      ready = true;
      /* Ark reports every open()/close() call, a no-op included: only a real change is passed on */
      var isOpen = function (v) { return handle.getState().openValues.indexOf(v) >= 0; };
      return { open: function (v) { if (!isOpen(v)) handle.open(v); }, close: function (v) { if (isOpen(v)) handle.close(v); } };
    }
    var sync = function () {
      items.forEach(function (it) {
        var open = openSet.has(it.value);
        it.trigger.setAttribute('aria-expanded', String(open)); it.item.setAttribute('data-state', open ? 'open' : 'closed');
        it.panel.hidden = !open;
      });
    };
    items.forEach(function (it) {
      it.trigger.id = fallbackId('accordion-trigger'); it.panel.id = fallbackId('accordion-panel');
      it.trigger.setAttribute('aria-controls', it.panel.id);
      it.panel.setAttribute('role', 'region'); it.panel.setAttribute('aria-labelledby', it.trigger.id);
      it.trigger.addEventListener('click', function () { if (openSet.has(it.value)) openSet.delete(it.value); else openSet.add(it.value); sync(); change(values.filter(function (v) { return openSet.has(v); })); });
    });
    if (list) { list.setAttribute('role', 'group'); if (options.label) list.setAttribute('aria-label', options.label); }
    sync();
    var set = function (v, open) { if (openSet.has(v) === open) return; if (open) openSet.add(v); else openSet.delete(v); sync(); change(values.filter(function (x) { return openSet.has(x); })); };
    return { open: function (v) { set(v, true); }, close: function (v) { set(v, false); } };
  }

  A.provide({ arkAccordion: arkAccordion, arkDisclosure: arkDisclosure, arkHost: arkHost, arkSegGroup: arkSegGroup, arkTabs: arkTabs, arkTabsOn: arkTabsOn });
})();
