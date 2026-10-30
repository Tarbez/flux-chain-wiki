/* =====================================================================
   THE KIT BOARDS (DefxnKitBoards): the owner's five DEFXN boards, 30 elements each
   ---------------------------------------------------------------------
   Source: the owner's design boards of 2026-10-26, "Category 01 - Actions & Inputs" to "Category 05 - Identity,
   Network & Micrographics". This file is their table of contents and nothing more: a board, its number, and each
   element's number and name, in the order the board shows them.

   What this file does NOT hold is whether an element is built. That is derived: an element is built when a
   renderer is registered for its id (js/kit/registry.js, DefxnKit.register; boards 01-04 in js/kit/board-*.js)
   or when the 3D kit has an object for it (board 05: js/world2/world2-kit.mjs, from world/kit.flx). An element with neither is
   "Not built" on the Kit page, never an empty box and never a 0.

   Ids are '<board>-<slug>' (01-primary-button). They are addresses: a renderer, a 3D builder and the Kit page all
   meet on them, so an id never changes once a renderer uses it. Read by js/pages/kit.js (the canvas) and
   js/admin/kit.js (the editor's Kit dock).
   ===================================================================== */
var DefxnKitBoards = (function () {
  'use strict';
  function slug(name) { return String(name).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  /* [board number, short key, title, what the board is drawn as, names in board order] */
  var RAW = [
    ['01', 'actions', 'Actions & Inputs', '2d', [
      'Primary button', 'Secondary button', 'Ghost button', 'Destructive button', 'Icon button', 'Split button',
      'Segmented control', 'Toggle switch', 'Checkbox', 'Radio button', 'Text input', 'Password input',
      'Search bar', 'Textarea', 'Dropdown', 'Select menu (open)', 'File upload', 'Inline field states',
      'Chips', 'Pills / Tags', 'Switch (icon)', 'Slider', 'Stepper input', 'Date input',
      'Command input', 'Copy control', 'CTA tile', 'Filter control', 'Confirmation buttons', 'Form submit footer']],
    ['02', 'panels', 'Panels & Data', '2d', [
      'Stat card', 'Metric card', 'Identity card', 'Wallet card', 'Info panel', 'Summary row',
      'Expandable accordion', 'Collapsible section', 'Key-value module', 'Table row module', 'List cell', 'Data block',
      'Code snippet', 'Terminal block', 'Chart frame', 'Mini graph card', 'Donut chart module', 'Bar chart module',
      'Timeline module', 'Activity feed tile', 'Note card', 'Resolver card', 'Network card', 'Chain card',
      'Resource card', 'Alert panel', 'Drawer preview tile', 'Modal card', 'Inspector panel', 'Details summary block']],
    ['03', 'navigation', 'Navigation & Structure', '2d', [
      'Top navigation bar', 'Side navigation', 'Bottom navigation', 'Breadcrumb trail', 'Tab set', 'Pill tabs',
      'Stepper', 'Progress rail', 'Section header', 'Sticky toolbar', 'Command bar', 'Dock',
      'Menu list', 'Context menu', 'Mega menu tile', 'Account switcher', 'Dropdown nav', 'Pagination',
      'Carousel controls', 'Split-pane divider', 'Resizable panel handle', 'Tree navigation', 'Explorer row', 'Item selector',
      'Section switcher', 'App launcher tile', 'Search overlay trigger', 'Footer navigation', 'Workspace switcher', 'Compact mobile nav']],
    ['04', 'status', 'Status, Feedback & Security', '2d', [
      'Status badge: Online', 'Status badge: Offline', 'Status badge: Syncing', 'Status badge: Error', 'Status badge: Success', 'Status badge: Warning',
      'Progress bar: Horizontal', 'Progress bar: Steps', 'Radial progress', 'Spinner', 'Skeleton loader', 'Toast: Success',
      'Toast: Error', 'Toast: Info', 'Inline alert: Warning', 'Inline alert: Error', 'Inline alert: Success', 'Empty state',
      'No data state', 'Verification checklist', 'Security level indicator', 'Signature valid state', 'Offline state', 'Endpoint unavailable',
      'Retry module', 'Locked state', 'Expired state', 'Revoked state', 'Permission gate', 'Upload state']],
    ['05', 'identity', 'Identity, Network & Micrographics', '3d', [
      'FXN ID card', 'Minimal ID card', 'ID card (stacked)', 'Wallet tile', 'Ghost identity token', 'Resolver stack',
      'Chain ring', 'Network node cluster', 'Chain link', 'Bundle tile', 'Domain tile', 'Record tile',
      'Permissions tile', 'Key object', 'Lock object', 'Shield object', 'Endpoint object', 'Node beacon',
      'Signature glyph', 'Encrypted packet', 'Explorer cube', 'Connection hub', 'Resource loader', 'Profile card',
      'No profile tile', 'Identity verification ring', 'Devnet warning badge', 'Session token', 'Authority chip', 'Micrographic asset']]
  ];
  var BOARDS = RAW.map(function (b) {
    return { id: b[0], key: b[1], title: b[2], kind: b[3],
      items: b[4].map(function (name, i) { return { n: i + 1, id: b[0] + '-' + slug(name), name: name, board: b[0] }; }) };
  });
  var BY_ID = Object.create(null);
  BOARDS.forEach(function (b) { b.items.forEach(function (it) { BY_ID[it.id] = it; }); });
  return {
    boards: function () { return BOARDS; },
    board: function (id) { return BOARDS.filter(function (b) { return b.id === id || b.key === id; })[0] || null; },
    item: function (id) { return BY_ID[id] || null; },
    slug: slug
  };
})();
