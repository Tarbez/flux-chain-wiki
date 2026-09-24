/* Minimal ARK admin primitives: unstyled accessible behavior, styled by css/admin.css.
   These mirror the ARK primitives contract in the no-build admin surface. */
var ArkAdminPrimitives = (function () {
  'use strict';

  function uid(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 9); }

  function tabs(options) {
    var items = options.items || [];
    var selected = Math.max(0, items.findIndex(function (item) { return item.id === options.value; }));
    if (selected < 0) selected = 0;
    var root = document.createElement('section');
    root.className = options.className || 'ark-tabs';
    root.setAttribute('data-ark-primitive', 'tabs');
    var list = document.createElement('div');
    list.className = 'ark-tabs-list';
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', options.label || 'Sections');
    var panels = document.createElement('div');
    panels.className = 'ark-tabs-panels';
    var triggers = [];
    var contents = [];

    function activate(index, focus) {
      selected = Math.max(0, Math.min(items.length - 1, index));
      triggers.forEach(function (trigger, i) {
        var active = i === selected;
        trigger.setAttribute('aria-selected', String(active));
        trigger.setAttribute('tabindex', active ? '0' : '-1');
        trigger.dataset.state = active ? 'active' : 'inactive';
        contents[i].hidden = !active;
        contents[i].dataset.state = active ? 'active' : 'inactive';
      });
      if (focus) triggers[selected].focus();
      if (typeof options.onChange === 'function') options.onChange(items[selected].id);
    }

    items.forEach(function (item, i) {
      var tabId = uid('ark-tab');
      var panelId = uid('ark-panel');
      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'ark-tab';
      trigger.id = tabId;
      trigger.setAttribute('role', 'tab');
      trigger.setAttribute('aria-controls', panelId);
      trigger.textContent = item.label;
      trigger.addEventListener('click', function () { activate(i, false); });
      trigger.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (selected + 1) % items.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (selected - 1 + items.length) % items.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = items.length - 1;
        if (next === null) return;
        event.preventDefault();
        activate(next, true);
      });
      var panel = document.createElement('div');
      panel.className = 'ark-tab-panel';
      panel.id = panelId;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);
      panel.appendChild(item.content);
      list.appendChild(trigger);
      panels.appendChild(panel);
      triggers.push(trigger);
      contents.push(panel);
    });
    root.appendChild(list);
    root.appendChild(panels);
    activate(selected, false);
    return root;
  }

  function disclosure(options) {
    var root = document.createElement('section');
    root.className = options.className || 'ark-disclosure';
    root.setAttribute('data-ark-primitive', 'disclosure');
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ark-disclosure-trigger';
    var content = document.createElement('div');
    content.className = 'ark-disclosure-content';
    var triggerId = uid('ark-disclosure-trigger');
    var contentId = uid('ark-disclosure-content');
    trigger.id = triggerId;
    content.id = contentId;
    trigger.setAttribute('aria-controls', contentId);
    content.setAttribute('role', 'region');
    content.setAttribute('aria-labelledby', triggerId);
    trigger.textContent = options.label || 'Details';
    var open = !!options.defaultOpen;
    function sync() {
      trigger.setAttribute('aria-expanded', String(open));
      trigger.dataset.state = open ? 'open' : 'closed';
      content.hidden = !open;
      content.dataset.state = open ? 'open' : 'closed';
    }
    trigger.addEventListener('click', function () { open = !open; sync(); });
    content.appendChild(options.content);
    root.appendChild(trigger);
    root.appendChild(content);
    sync();
    return root;
  }

  return { tabs: tabs, disclosure: disclosure };
})();
