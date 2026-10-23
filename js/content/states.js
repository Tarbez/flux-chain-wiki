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
  /* The persistent shell's scope -- a state group made of header elements works on every route
     (js/content/layout.js, "scopes": ArkLayout.SHELL is the same '*'; repeated here so a draft
     sanitizes without that file loaded, held equal by tests/layout-shell-scope.cjs). */
  var SHELL = '*';
  function isScope(route) { return route === SHELL || ROUTE.test(route || ''); }
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

  /* Edits saved under a scope that has since been split per document (/reference) are read
     under the scope they belong to: ArkLayout.moveScopes, the one table (js/content/layout.js,
     "moved scopes"). Without js/content/layout.js loaded they stay where they were stored. */
  function moveScopes(map) { return typeof ArkLayout !== 'undefined' && ArkLayout && ArkLayout.moveScopes ? ArkLayout.moveScopes(map) : map; }
  function sanitize(value) {
    var out = { version: 1, routes: {} };
    var rawRoutes = moveScopes(value && value.routes);
    if (!isPlainObject(rawRoutes)) rawRoutes = {};
    Object.keys(rawRoutes).slice(0, 500).forEach(function (route) {
      if (!isScope(route)) return;
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

  /* A group id is unique (a time stamp plus randomness), so the scope holding it is `route`'s
     own or SHELL's: every caller names the route it shows, and finds a group stored for every
     route too. null: no such group. */
  function scopeOfGroup(draft, route, groupId) {
    if (draft.routes[route] && draft.routes[route][groupId]) return route;
    return draft.routes[SHELL] && draft.routes[SHELL][groupId] ? SHELL : null;
  }
  function groupIn(draft, route, groupId) { var scope = scopeOfGroup(draft, route, groupId); return scope ? draft.routes[scope][groupId] : null; }
  function groupFor(value, route, groupId) { return groupIn(sanitize(value), route, groupId); }
  /* every group id that applies on `route`: its own, then SHELL's */
  function groupIdsOn(draft, route) {
    var ids = Object.keys(draft.routes[route] || {});
    if (route !== SHELL) Object.keys(draft.routes[SHELL] || {}).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    return ids;
  }

  function createStateGroup(value, route, groupId, memberKeys, trigger) {
    var draft = sanitize(value);
    if (!isScope(route) || !ID.test(groupId || '')) return draft;
    var keys = Array.isArray(memberKeys) ? Array.from(new Set(memberKeys.map(cleanKey).filter(Boolean))).slice(0, MAX_MEMBERS) : [];
    if (!keys.length) return draft;
    var groups = draft.routes[route] || (draft.routes[route] = {});
    groups[groupId] = { trigger: trigger === 'self' || trigger === undefined ? 'self' : (cleanKey(trigger) || 'self'), current: 0, states: [{ label: 'Default', members: keys }] };
    return sanitize(draft);
  }

  function addState(value, route, groupId, label) {
    var draft = sanitize(value), group = groupIn(draft, route, groupId);
    if (!group || group.states.length >= MAX_STATES) return draft;
    group.states.push({ label: String(label || 'New state').slice(0, 120), members: [] });
    return sanitize(draft);
  }

  /* State 0 can never be removed -- it is the real original content, there is no
     concept of deleting it, only of cycling past it -- consistent with Part A's "real
     content is hidden, never destroyed" rule applied one level up (to whole states). */
  function removeState(value, route, groupId, index) {
    var draft = sanitize(value), group = groupIn(draft, route, groupId);
    index = Number(index);
    if (!group || !Number.isFinite(index) || index <= 0 || index >= group.states.length) return draft;
    group.states.splice(index, 1);
    if (group.current === index) group.current = 0;
    else if (group.current > index) group.current -= 1;
    return sanitize(draft);
  }

  function removeGroup(value, route, groupId) {
    var draft = sanitize(value);
    route = scopeOfGroup(draft, route, groupId) || route;
    var groups = draft.routes[route];
    if (!groups || !groups[groupId]) return draft;
    delete groups[groupId];
    if (!Object.keys(groups).length) delete draft.routes[route];
    return sanitize(draft);
  }

  function setTrigger(value, route, groupId, trigger) {
    var draft = sanitize(value), group = groupIn(draft, route, groupId);
    if (!group) return draft;
    group.trigger = trigger === 'self' ? 'self' : (cleanKey(trigger) || 'self');
    return sanitize(draft);
  }

  /* Studio's own "preview this state" control -- see js/main.js and js/admin/admin.js for
     how a preview click is distinguished from an explicit Save (the module itself has
     no such concept: whatever is in the draft when the caller chooses to persist it
     is what gets saved, the same as every other Studio mutator in this codebase). */
  function setCurrent(value, route, groupId, index) {
    var draft = sanitize(value), group = groupIn(draft, route, groupId);
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
    var draft = sanitize(value), group = groupIn(draft, route, groupId);
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
  /* The keyed elements of `route`'s scope, in document order. Through ArkLayout's own
     annotate() whenever it is loaded, so a key means here exactly what it means there (ONE key
     function, js/content/layout.js) and the page a route is replacing -- still mounted while it
     leaves, with keys of the same shape -- never answers for this route. The root itself
     counts (regression: tests/states-root-member.cjs): annotate() keys the root too, so the
     persistent scene (#scene, key 'id:scene') can be picked as a state-0 member, and a
     querySelectorAll() below the root never found it. */
  function keyedIn(root, route) {
    if (typeof ArkLayout !== 'undefined' && ArkLayout.annotate) return ArkLayout.annotate(root, route);
    var list = elementsWithAttr(root, 'data-ark-layout-key');
    if (root && root.getAttribute && root.getAttribute('data-ark-layout-key')) list.unshift(root);
    return list;
  }
  /* `list` is keyedIn()'s; a key it misses may still name an element annotate() does not tag */
  function findByKey(root, key, route, list) {
    if (!key) return null;
    list = list || keyedIn(root, route);
    for (var i = 0; i < list.length; i++) if (list[i].getAttribute('data-ark-layout-key') === key) return list[i];
    return typeof ArkLayout !== 'undefined' && ArkLayout.find ? ArkLayout.find(root, key, route) : null;
  }
  /* A state's anchor goes right after state 0's last member -- which, when that member is the
     root itself, is OUTSIDE the root. So a miss below the root also looks document-wide (state
     anchor ids are unique per group); otherwise every render created another anchor. */
  function findAnchor(root, id, route) {
    var found = null;
    /* never the leaving page's anchor: it can carry the same id while two routes are mounted */
    var mine = function (el) { return typeof ArkLayout === 'undefined' || !ArkLayout.inRoute || ArkLayout.inRoute(el, route); };
    function scan(scope) {
      elementsWithAttr(scope, 'data-ark-insert').some(function (el) {
        if (el.getAttribute('data-ark-insert') === id && mine(el)) { found = el; return true; }
        return false;
      });
    }
    scan(root);
    if (!found && root && root.ownerDocument && root.ownerDocument !== root) scan(root.ownerDocument);
    return found;
  }
  /* The real key-bearing element that sits LAST in document order among `members` --
     a new state's anchor is inserted right after it, so it occupies state 0's own
     visual position (document order is render order for every flex/stack container
     this site uses, the same assumption ArkLayout's buildGroups() already relies on). */
  function lastMemberElement(list, members) {
    var last = null;
    list.forEach(function (el) { if (members.indexOf(el.getAttribute('data-ark-layout-key')) >= 0) last = el; });
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
     An explicit element key, by contrast, is that one literal element -- PLUS, while
     that element is hidden because it sits inside state 0 and another state is
     showing, the showing state's own content (the 'self' rule). Without that, the
     owner's own worked example (make a container into states, then pick ONE button
     inside it as the trigger) advanced once and then stranded the group on state 1
     forever: the only trigger was display:none, so nothing could ever be clicked to
     move on (regression: tests/states-trigger-strand.cjs). */
  function selfTargets(host, route, group, groupId, list) {
    if (group.current === 0) return group.states[0].members.map(function (key) { return findByKey(host, key, route, list); }).filter(Boolean);
    var anchor = findAnchor(host, anchorId(groupId, group.current), route);
    return anchor ? [anchor] : [];
  }
  function triggerTargets(host, route, value, groupId) {
    var draft = sanitize(value), group = groupIn(draft, route, groupId);
    if (!group) return [];
    /* a SHELL group's members and anchors are looked up in the shell alone */
    route = scopeOfGroup(draft, route, groupId);
    var list = keyedIn(host, route);
    if (group.trigger === 'self') return selfTargets(host, route, group, groupId, list);
    var el = findByKey(host, group.trigger, route, list);
    if (group.current === 0) return el ? [el] : [];
    var hiddenWithZero = !el || group.states[0].members.some(function (key) { var member = findByKey(host, key, route, list); return member && (member === el || (member.contains && member.contains(el))); });
    return hiddenWithZero ? (el ? [el] : []).concat(selfTargets(host, route, group, groupId, list)) : [el];
  }

  /* Delegated-click resolution: which group (if any) does this click target belong
     to, for the route's whole set of groups. js/main.js's one real-visitor click
     listener calls this once per click, instead of each group registering its own
     listener. */
  function findTriggerMatch(host, route, value, target) {
    if (!host || !target) return null;
    var draft = sanitize(value);
    var found = null;
    groupIdsOn(draft, route).some(function (groupId) {
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
    var draft = sanitize(value), group = groupIn(draft, route, groupId);
    if (!group) return;
    /* elements are looked up in the group's own scope (a SHELL group: the shell alone); its
       states' content renders for the route shown (a link field's `from`) */
    var page = route; route = scopeOfGroup(draft, route, groupId);
    var activeIndex = group.current, list = keyedIn(host, route);
    /* Tagged with the group id (Studio's own selection reporting reads this back, the
       same way js/content/components.js tags an instance root with data-ark-component-
       key/anchor/master) so a click on any member or anchor resolves to "this is part
       of state group X" without a second, parallel lookup table. */
    group.states[0].members.forEach(function (key) {
      var el = findByKey(host, key, route, list);
      if (!el) return;
      if (el.setAttribute) el.setAttribute('data-ark-state-group', groupId);
      if (el.style) el.style.display = activeIndex === 0 ? '' : 'none';
    });
    for (var i = 1; i < group.states.length; i++) {
      var id = anchorId(groupId, i), existing = findAnchor(host, id, route);
      if (i === activeIndex) {
        var anchor = existing || createAnchor(host, lastMemberElement(list, group.states[0].members), id);
        if (anchor) {
          if (anchor.setAttribute) { anchor.setAttribute('data-ark-state-group', groupId); anchor.setAttribute('data-ark-state-index', String(i)); }
          if (anchor.style) anchor.style.display = '';
          /* A state's content IS a click target (the 'self' trigger, and the fallback when
             an explicit trigger hid with state 0), but the anchor inherits its container's
             pointer-events: made from a container inside the site header -- whose own CSS
             is pointer-events:none, only its links opt back in -- state 1 rendered, could
             not be clicked, and stranded the group (regression: tests/states-anchor-clickable.cjs). */
          if (anchor.style) anchor.style.pointerEvents = 'auto';
          if (typeof ArkComponents !== 'undefined') ArkComponents.render(anchor, page, id, componentsValue);
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
    var draft = sanitize(value);
    var ids = groupIdsOn(draft, route);
    ids.forEach(function (groupId) { render(host, route, groupId, draft, componentsValue); });
    return ids;
  }

  return {
    define: define, get: get, sanitize: sanitize, serialize: serialize,
    createStateGroup: createStateGroup, addState: addState, removeState: removeState, removeGroup: removeGroup,
    setTrigger: setTrigger, setCurrent: setCurrent, advance: advance,
    anchorId: anchorId, render: render, renderAll: renderAll, groupFor: groupFor, groupScope: function (value, route, groupId) { return scopeOfGroup(sanitize(value), route, groupId); }, groupIdsOn: function (value, route) { return groupIdsOn(sanitize(value), route); }, SHELL: SHELL,
    triggerTargets: triggerTargets, findTriggerMatch: findTriggerMatch,
    MAX_STATES: MAX_STATES
  };
})();
