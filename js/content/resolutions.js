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

  /* The inner pages stay deliberately short: one shift and three movements.
     This is product framing, not a claim that every capability runs today. */
  var profiles = {
    WEBSITE: { shift: 'From rented infrastructure to a site you can resolve.', old: 'Databases, hosting plans and annual renewals.', steps: ['Build the site as a signed bundle.', 'Publish the bundle to the peer mesh.', 'Resolve the same address from any participating node.'] },
    CONTENT: { shift: 'From a publishing platform to permanent, named work.', old: 'Platform accounts, changing URLs and disappearing archives.', steps: ['Name the work and sign its origin.', 'Publish one durable version to the mesh.', 'Resolve it later without asking a platform.'] },
    FILES: { shift: 'From somebody else’s drive to encrypted peer storage.', old: 'Storage subscriptions, provider folders and shared custody.', steps: ['Encrypt the file under keys you control.', 'Distribute addressed pieces across peers.', 'Resolve and verify the original file when needed.'] },
    DEPLOYMENTS: { shift: 'From server releases to signed, addressable bundles.', old: 'Release servers, deployment accounts and mutable artifacts.', steps: ['Package code and assets into one bundle.', 'Sign the exact release that should run.', 'Publish and resolve it across the mesh.'] },
    PAYMENTS: { shift: 'From payment processors to direct partner settlement.', old: 'Processor accounts, settlement delays and platform tolls.', steps: ['Describe the value exchange in an agreement.', 'Authorize settlement with the participating keys.', 'Record a receipt both partners can verify.'] },
    FINANCE: { shift: 'From a finance dashboard to books held under your keys.', old: 'Hosted ledgers, exported statements and account lock-in.', steps: ['Keep balances in records you can inspect.', 'Agree each change with the relevant partners.', 'Reconcile from signed receipts, not screenshots.'] },
    COMMUNITY: { shift: 'From an audience owned by a platform to a network of partners.', old: 'Follower graphs, rented reach and opaque moderation.', steps: ['Define the community and its membership rules.', 'Let members hold their own identity and history.', 'Resolve shared activity through agreed records.'] },
    COMMUNICATIONS: { shift: 'From platform messages to encrypted partner channels.', old: 'Central inboxes, harvested metadata and provider custody.', steps: ['Establish who the channel belongs to.', 'Encrypt messages for the intended partners.', 'Resolve conversation history from shared records.'] },
    COLLABORATIONS: { shift: 'From shared SaaS documents to checkable shared work.', old: 'Seat licenses, one provider and conflicting copies.', steps: ['Define the work and the partners involved.', 'Record contributions as signed changes.', 'Resolve the agreed state without a central owner.'] },
    GOVERNANCE: { shift: 'From platform administration to explicit network rules.', old: 'Hidden privileges, global roles and informal decisions.', steps: ['Write the decision rule before the vote.', 'Collect the required partner approvals.', 'Activate the outcome with its evidence attached.'] },
    INTELLIGENCE: { shift: 'From sending data to a model to bringing logic to the data.', old: 'Remote inference silos and uncontrolled data copies.', steps: ['Name the intelligence task and its inputs.', 'Run agreed logic beside the relevant records.', 'Return a claim with evidence that can be checked.'] },
    DATA: { shift: 'From maintaining a database to resolving shared records.', old: 'Database servers, admin consoles and synchronization jobs.', steps: ['Write data as signed, addressed records.', 'Replicate it through participating peers.', 'Query the mesh and verify what comes back.'] },
    ALGORITHMS: { shift: 'From a private service endpoint to published resolver logic.', old: 'Opaque APIs, service accounts and changing implementations.', steps: ['Define the inputs and expected claim.', 'Publish the algorithm as a named resolver.', 'Run it anywhere and check the same result.'] },
    INFORMATION: { shift: 'From searching a silo to resolving a named source.', old: 'Provider indexes, broken links and missing provenance.', steps: ['Give the information a stable address.', 'Attach its source and transformation trail.', 'Resolve the current claim with that trail intact.'] },
    RULES: { shift: 'From policy prose to logic every participant can apply.', old: 'Interpretation drift, manual checks and private rule engines.', steps: ['Express the rule as deterministic resolver logic.', 'Name the version partners agree to use.', 'Apply it consistently and retain the evidence.'] },
    NETWORK: { shift: 'From provisioning infrastructure to naming a network.', old: 'Cloud accounts, fixed clusters and manual scaling plans.', steps: ['Create or select the network identity.', 'Join with a participating local node.', 'Discover peers as the network grows.'] },
    ENCRYPTIONS: { shift: 'From provider-managed privacy to keys you keep.', old: 'Provider key custody, broad access and trust by policy.', steps: ['Choose the partners allowed to read.', 'Encrypt before information enters the mesh.', 'Resolve ciphertext only with the required keys.'] },
    AUTOMATION: { shift: 'From scheduled cloud jobs to agreement-triggered work.', old: 'Automation subscriptions, webhooks and privileged bots.', steps: ['Define the event and the permitted action.', 'Bind the automation to an agreement.', 'Run it when evidence satisfies the rule.'] },
    PRODUCTIVITY: { shift: 'From a stack of subscriptions to tools on the mesh.', old: 'Per-seat plans, scattered accounts and trapped work.', steps: ['Choose the shared record the work revolves around.', 'Use resolvers for the repeatable operations.', 'Keep the resulting work under partner control.'] },
    LOGISTICS: { shift: 'From a private tracking portal to a shared custody trail.', old: 'Disconnected trackers, reconciled spreadsheets and blind handoffs.', steps: ['Name the item, partners and expected movement.', 'Sign each handoff as custody changes.', 'Resolve location and responsibility from the trail.'] }
  };

  function copy(key) { return ArkCopy.text('RESOLUTIONS.' + key); }
  function item(key, group) {
    var profile = profiles[key] || {};
    return { key: key, slug: key.toLowerCase(), group: group, start: start[key] || null,
      title: copy(key + '.TITLE'), text: copy(key + '.TEXT'), shift: profile.shift || '',
      old: profile.old || '', steps: (profile.steps || []).slice() };
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
  function all() {
    return list().reduce(function (items, group) { return items.concat(group.items); }, []);
  }
  function groupFor(key) {
    return list().find(function (group) { return group.key === key; }) || null;
  }
  /* "Resolve your rules and patterns" -> "Rules and patterns" for compact lists. */
  function shortName(title) {
    var rest = String(title).replace(/^Resolve your\s+/i, '');
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  function keys() { return groups.reduce(function (all, group) { return all.concat(group.items); }, []); }

  return { groups: groups, list: list, all: all, find: find, groupFor: groupFor, keys: keys, copy: copy, shortName: shortName };
})();
