/* Layered states: a general "select some real elements as state zero, add further
   states, a click cycles through them in place" primitive, authored in DEFXN Studio.
   Mirrors js/content/layout.js's and js/content/components.js's proven shape: a small
   sanitized model, a set of pure mutators that take the current draft and return a new
   sanitized one, and a module-level `current` used only when no explicit draft is
   passed in (the real deployed site, reading the baked states-data.js).

   Shape: { version, routes: { route: { groupId: { trigger: 'self'|key, current, states: [
            { label, members: [key,...] }, { label }, { label }, ... ] } } } }
   `route` keys the same way ArkLayout.routes/ArkComponents.routes already do.

   State 0's `members` are the REAL element keys (ArkLayout's own data-ark-layout-key
   values) the owner selected when the group was created -- kept in the DOM forever,
   hidden via the exact same CSS mechanism (style.display = 'none') Part B's Layers-
   panel hide toggle already uses, never a parallel hide system. Every state i >= 1 is
   NOT a list of real keys: its real content lives in js/content/components.js's own
   routes[route][anchorId] storage, under the deterministic anchor id anchorId(groupId,
   i) ('state:'+groupId+':'+i) -- this module creates that anchor element on demand and
   renders it through ArkComponents.render() wholesale, rather than inventing a second
   content-insertion mechanism. `members` is still written as [] for i >= 1, just
   unused, so every state entry has the same shape and a round trip is lossless. */
var ArkStates = (function () {
  'use strict';

  var current = { version: 1, routes: {} };

  var ID = /^[a-z][a-z0-9_-]{0,79}$/i;
  var ROUTE = /^\/\S{0,299}$/;
  var MAX_STATES = 20;
  var MAX_MEMBERS = 50;

  function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function cleanKey(key) { return typeof key === 'string' && key.length > 0 && key.length <= 500 ? key : null; }

  function cleanState(raw, isFirst) {
    var label = String((raw && raw.label) || (isFirst ? 'Default' : 'New state')).slice(0, 120);
    if (!isFirst) return { label: label, members: [] };
    var rawMembers = raw && raw.members;
    var members = Array.isArray(rawMembers) ? Array.from(new Set(rawMembers.map(cleanKey).filter(Boolean))).slice(0, MAX_MEMBERS) : [];
    return { label: label, members: members };
  }

  /* A group with no real state-0 members is meaningless (there would be nothing to
     show as the default, and nothing for a 'self' trigger to resolve to), so it is
     dropped entirely -- the same "self-healing, never throws" discipline render()
     below applies to a dangling pointer. */
  function cleanGroup(raw) {
    if (!isPlainObject(raw) || !Array.isArray(raw.states) || !raw.states.length) return null;
    var states = raw.states.slice(0, MAX_STATES).map(function (state, i) { return cleanState(state, i === 0); });
    if (!states.length || !states[0].members.length) return null;
    var current = Number(raw.current);
    if (!Number.isFinite(current) || current < 0 || current >= states.length) current = 0;
    var trigger = raw.trigger === 'self' ? 'self' : cleanKey(raw.trigger);
    if (!trigger) trigger = 'self';
    return { trigger: trigger, current: current, states: states };
  }

  function sanitize(value) {
    var out = { version: 1, routes: {} };
    var rawRoutes = value && value.routes;
    if (!isPlainObject(rawRoutes)) rawRoutes = {};
    Object.keys(rawRoutes).slice(0, 500).forEach(function (route) {
      if (!ROUTE.test(route)) return;
      var rawGroups = rawRoutes[route];
      if (!isPlainObject(rawGroups)) return;
      var cleanGroups = {};
      Object.keys(rawGroups).slice(0, 200).forEach(function (groupId) {
        if (!ID.test(groupId)) return;
        var clean = cleanGroup(rawGroups[groupId]);
        if (clean) cleanGroups[groupId] = clean;
      });
      if (Object.keys(cleanGroups).length) out.routes[route] = cleanGroups;
    });
    return out;
  }

  function define(value) { current = sanitize(value); return get(); }
  function get() { return JSON.parse(JSON.stringify(current)); }
  /* the exact file text; the Studio-driven edit and a hand edit produce the same
     bytes, the same contract js/content/layout.js's/components.js's serialize() keep. */
  function serialize(value) {
    return '/* Layered-state groups (click-to-cycle) authored in DEFXN Studio. */\nArkStates.define(' + JSON.stringify(sanitize(value), null, 2) + ');\n';
  }

  /* ArkComponents's own anchor id validation (js/content/components.js's ID regex) only
     accepts [a-z0-9_-], so this deterministic id uses dashes, never the colons an
     earlier draft of this module used -- colons silently failed ArkComponents's own
     sanitize() and the instance was dropped with no error, caught by states-dom.cjs. */
  function anchorId(groupId, index) { return 'state-' + groupId + '-' + index; }

  /* ---- mutators: pure, draft-in draft-out, exactly like ArkLayout.set/group/ungroup
     and ArkComponents's own createMaster/insertInstance/etc. The caller (js/main.js's
     cmsStatesDraft, admin.js's statesDraft) holds the draft and reassigns it from the
     return value. `groupId` is supplied by the caller, the same way ArkLayout.group()
     takes a caller-generated group id rather than inventing one here. */

  function createStateGroup(value, route, groupId, memberKeys, trigger) {
    var draft = sanitize(value);
    if (!ROUTE.test(route || '') || !ID.test(groupId || '')) return draft;
    var keys = Array.isArray(memberKeys) ? Array.from(new Set(memberKeys.map(cleanKey).filter(Boolean))).slice(0, MAX_MEMBERS) : [];
    if (!keys.length) return draft;
    var groups = draft.routes[route] || (draft.routes[route] = {});
    groups[groupId] = { trigger: trigger === 'self' || trigger === undefined ? 'self' : (cleanKey(trigger) || 'self'), current: 0, states: [{ label: 'Default', members: keys }] };
    return sanitize(draft);
  }

  function addState(value, route, groupId, label) {
    var draft = sanitize(value), group = draft.routes[route] && draft.routes[route][groupId];
    if (!group || group.states.length >= MAX_STATES) return draft;
    group.states.push({ label: String(label || 'New state').slice(0, 120), members: [] });
    return sanitize(draft);
  }

  /* State 0 can never be removed -- it is the real original content, there is no
     concept of deleting it, only of cycling past it -- consistent with Part A's "real
     content is hidden, never destroyed" rule applied one level up (to whole states). */
  function removeState(value, route, groupId, index) {
    var draft = sanitize(value), group = draft.routes[route] && draft.routes[route][groupId];
    index = Number(index);
    if (!group || !Number.isFinite(index) || index <= 0 || index >= group.states.length) return draft;
    group.states.splice(index, 1);
    if (group.current === index) group.current = 0;
    else if (group.current > index) group.current -= 1;
    return sanitize(draft);
  }

  function removeGroup(value, route, groupId) {
    var draft = sanitize(value), groups = draft.routes[route];
    if (!groups || !groups[groupId]) return draft;
    delete groups[groupId];
    if (!Object.keys(groups).length) delete draft.routes[route];
    return sanitize(draft);
  }

  function setTrigger(value, route, groupId, trigger) {
    var draft = sanitize(value), group = draft.routes[route] && draft.routes[route][groupId];
    if (!group) return draft;
    group.trigger = trigger === 'self' ? 'self' : (cleanKey(trigger) || 'self');
    return sanitize(draft);
  }

  /* Studio's own "preview this state" control -- see js/main.js/admin-studio.html for
     how a preview click is distinguished from an explicit Save (the module itself has
     no such concept: whatever is in the draft when the caller chooses to persist it
     is what gets saved, the same as every other Studio mutator in this codebase). */
  function setCurrent(value, route, groupId, index) {
    var draft = sanitize(value), group = draft.routes[route] && draft.routes[route][groupId];
    if (!group) return draft;
    index = Number(index);
    if (!Number.isFinite(index) || index < 0) index = 0;
    if (index >= group.states.length) index = group.states.length - 1;
    group.current = index;
    return sanitize(draft);
  }

  /* The one real-visitor-facing mutation: cycles to the next state, wrapping back to
     0 after the last one. A group with nothing to cycle to (0 or 1 states) is a safe
     no-op, never throws and never divides by zero. */
  function advance(value, route, groupId) {
    var draft = sanitize(value), group = draft.routes[route] && draft.routes[route][groupId];
    if (!group || group.states.length <= 1) return draft;
    group.current = (group.current + 1) % group.states.length;
    return sanitize(draft);
  }

  /* ---- DOM helpers: resolve a stored key/anchor id back to a real element. Scans
     [data-ark-layout-key]/[data-ark-insert] and filters in JS rather than building a
     dynamic attribute-VALUE selector string, the same way js/main.js's own
     cmsElementForKey avoids ever having to escape a key into CSS syntax. */
  function elementsWithAttr(root, attr) {
    if (!root || !root.querySelectorAll) return [];
    return Array.prototype.slice.call(root.querySelectorAll('[' + attr + ']'));
  }
  function findByKey(root, key) {
    if (!key) return null;
    var found = null;
    elementsWithAttr(root, 'data-ark-layout-key').some(function (el) {
      if (el.getAttribute('data-ark-layout-key') === key) { found = el; return true; }
      return false;
    });
    return found;
  }
  function findAnchor(root, id) {
    var found = null;
    elementsWithAttr(root, 'data-ark-insert').some(function (el) {
      if (el.getAttribute('data-ark-insert') === id) { found = el; return true; }
      return false;
    });
    return found;
  }
  /* The real key-bearing element that sits LAST in document order among `members` --
     a new state's anchor is inserted right after it, so it occupies state 0's own
     visual position (document order is render order for every flex/stack container
     this site uses, the same assumption ArkLayout's buildGroups() already relies on). */
  function lastMemberElement(host, members) {
    var last = null;
    elementsWithAttr(host, 'data-ark-layout-key').forEach(function (el) {
      if (members.indexOf(el.getAttribute('data-ark-layout-key')) >= 0) last = el;
    });
    return last;
  }
  function createAnchor(host, afterEl, id) {
    var doc = (host && host.ownerDocument) || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.createElement) return null;
    var el = doc.createElement('div');
    el.setAttribute('data-ark-insert', id);
    el.setAttribute('data-ark-state-anchor', '');
    if (afterEl && afterEl.parentNode && afterEl.parentNode.insertBefore) afterEl.parentNode.insertBefore(el, afterEl.nextSibling || null);
    else if (host && host.appendChild) host.appendChild(el);
    return el;
  }

  /* Resolves which real DOM element(s) count as "the trigger" for a group right now.
     'self' deliberately resolves to whichever content is CURRENTLY VISIBLE for the
     group -- state 0's own members when current is 0, or the active state's anchor
     otherwise -- never a wrapping container around state 0's members: once those
     members are hidden, a container holding nothing else could collapse to zero size
     and become unclickable, silently stranding the group on a non-zero state forever.
     An explicit element key, by contrast, is always that one literal element -- a
     known v1 limitation if that element happens to be one of state 0's own members
     (it becomes unclickable once state 0 is hidden); documented, not fixed, per the
     plan's "doesn't need to be fancy" scope for this control. */
  function triggerTargets(host, route, value, groupId) {
    var draft = sanitize(value), group = draft.routes[route] && draft.routes[route][groupId];
    if (!group) return [];
    if (group.trigger !== 'self') { var el = findByKey(host, group.trigger); return el ? [el] : []; }
    if (group.current === 0) return group.states[0].members.map(function (key) { return findByKey(host, key); }).filter(Boolean);
    var anchor = findAnchor(host, anchorId(groupId, group.current));
    return anchor ? [anchor] : [];
  }

  /* Delegated-click resolution: which group (if any) does this click target belong
     to, for the route's whole set of groups. js/main.js's one real-visitor click
     listener calls this once per click, instead of each group registering its own
     listener. */
  function findTriggerMatch(host, route, value, target) {
    if (!host || !target) return null;
    var draft = sanitize(value), groups = draft.routes[route] || {};
    var found = null;
    Object.keys(groups).some(function (groupId) {
      var hit = triggerTargets(host, route, draft, groupId).some(function (el) { return el === target || (el.contains && el.contains(target)); });
      if (hit) { found = groupId; return true; }
      return false;
    });
    return found;
  }

  /* Renders one group's current state into the real DOM: hides every state-0 member
     unless current is 0 (showing them again just clears the inline display, the same
     reversible convention ArkLayout's own hide toggle already uses), and for every
     state i >= 1 either renders its dedicated ArkComponents anchor (creating it on
     demand, right after state 0's own content) when it is the current one, or hides
     it when it exists but is not current. Reuses ArkComponents.render() wholesale for
     all of a new state's own content -- never a second content-insertion mechanism. */
  function render(host, route, groupId, value, componentsValue) {
    if (!host) return;
    var draft = sanitize(value), group = draft.routes[route] && draft.routes[route][groupId];
    if (!group) return;
    var activeIndex = group.current;
    /* Tagged with the group id (Studio's own selection reporting reads this back, the
       same way js/content/components.js tags an instance root with data-ark-component-
       key/anchor/master) so a click on any member or anchor resolves to "this is part
       of state group X" without a second, parallel lookup table. */
    group.states[0].members.forEach(function (key) {
      var el = findByKey(host, key);
      if (!el) return;
      if (el.setAttribute) el.setAttribute('data-ark-state-group', groupId);
      if (el.style) el.style.display = activeIndex === 0 ? '' : 'none';
    });
    for (var i = 1; i < group.states.length; i++) {
      var id = anchorId(groupId, i), existing = findAnchor(host, id);
      if (i === activeIndex) {
        var anchor = existing || createAnchor(host, lastMemberElement(host, group.states[0].members), id);
        if (anchor) {
          if (anchor.setAttribute) { anchor.setAttribute('data-ark-state-group', groupId); anchor.setAttribute('data-ark-state-index', String(i)); }
          if (anchor.style) anchor.style.display = '';
          if (typeof ArkComponents !== 'undefined') ArkComponents.render(anchor, route, id, componentsValue);
        }
      } else if (existing && existing.style) {
        existing.style.display = 'none';
      }
    }
  }

  /* Every state group on `route`, rendered in one call -- mirrors ArkComponents.
     renderAll's own naming/shape, called as its sibling from the same js/main.js
     onMount hook. Returns the group ids found, for parity with renderAll/anchorsIn. */
  function renderAll(host, route, value, componentsValue) {
    var draft = sanitize(value), groups = draft.routes[route] || {};
    var ids = Object.keys(groups);
    ids.forEach(function (groupId) { render(host, route, groupId, draft, componentsValue); });
    return ids;
  }

  return {
    define: define, get: get, sanitize: sanitize, serialize: serialize,
    createStateGroup: createStateGroup, addState: addState, removeState: removeState, removeGroup: removeGroup,
    setTrigger: setTrigger, setCurrent: setCurrent, advance: advance,
    anchorId: anchorId, render: render, renderAll: renderAll,
    triggerTargets: triggerTargets, findTriggerMatch: findTriggerMatch
  };
})();
