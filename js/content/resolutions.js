/* =====================================================================
   RESOLUTIONS: the products, as structure
   ---------------------------------------------------------------------
   Which resolutions exist, how they are grouped, and which page (if any)
   a resolution starts from. The words live in the `resolutions` manifest
   (js/content/manifests/resolutions.js): RESOLUTIONS.<KEY>.TITLE and
   RESOLUTIONS.<KEY>.TEXT for each item, RESOLUTIONS.GROUP.<GROUP> for each
   group. The header's Products menu, the Resolutions page and the About
   page all read this one list.
   ===================================================================== */
var ArkResolutions = (function () {
  'use strict';

  var groups = [
    { key: 'BUILD', items: ['WEBSITE', 'CONTENT', 'FILES', 'DEPLOYMENTS'] },
    { key: 'VALUE', items: ['PAYMENTS', 'FINANCE'] },
    { key: 'PEOPLE', items: ['COMMUNITY', 'COMMUNICATIONS', 'COLLABORATIONS', 'GOVERNANCE'] },
    { key: 'INTELLIGENCE', items: ['INTELLIGENCE', 'DATA', 'ALGORITHMS', 'INFORMATION', 'RULES'] },
    { key: 'OPERATIONS', items: ['NETWORK', 'ENCRYPTIONS', 'AUTOMATION', 'PRODUCTIVITY', 'LOGISTICS'] }
  ];
  /* A resolution with a page that already does part of the work links to it. */
  var start = {
    WEBSITE: 'bundledeployer', DEPLOYMENTS: 'bundledeployer', PAYMENTS: 'treasury', GOVERNANCE: 'dao',
    DATA: 'explorer', INFORMATION: 'explorer', ALGORITHMS: 'resolver', NETWORK: 'deploy', RULES: 'resolver'
  };

  function copy(key) { return ArkCopy.text('RESOLUTIONS.' + key); }
  function item(key, group) {
    return { key: key, slug: key.toLowerCase(), group: group, start: start[key] || null,
      title: copy(key + '.TITLE'), text: copy(key + '.TEXT') };
  }
  function list() {
    return groups.map(function (group) {
      return { key: group.key, title: copy('GROUP.' + group.key),
        items: group.items.map(function (key) { return item(key, group.key); }) };
    });
  }
  function find(slug) {
    var found = null;
    groups.forEach(function (group) {
      group.items.forEach(function (key) { if (key.toLowerCase() === slug) found = item(key, group.key); });
    });
    return found;
  }
  /* "Resolve your rules and patterns" -> "Rules and patterns" for compact lists. */
  function shortName(title) {
    var rest = String(title).replace(/^Resolve your\s+/i, '');
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  function keys() { return groups.reduce(function (all, group) { return all.concat(group.items); }, []); }

  return { groups: groups, list: list, find: find, keys: keys, copy: copy, shortName: shortName };
})();
