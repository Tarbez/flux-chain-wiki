/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "deploy",
  "title": "Create or join a network",
  "route": "/deploy",
  "group": "page",
  "meta": {
    "back": "download"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "OPERATE DEFXN / NAMED NETWORKS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Choose a network for miner presence."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "A named network decides which group of miners your machine shows up in. Accounts, identities, DAOs, records and treasuries are shared by every network, so a network is not a security boundary."
    },
    "RESOLVER.NOTE": {
      "label": "Resolver deployment pointer",
      "kind": "text",
      "section": "Page",
      "value": "Deploying a resolver is a different action. A named network scopes miner presence; a resolver gets its own chain."
    },
    "RESOLVER.LINK": {
      "label": "Resolver deployment link",
      "kind": "line",
      "section": "Page",
      "value": "Deploy a resolver"
    },
    "RESOLVER.HREF": {
      "label": "Resolver deployment link target",
      "kind": "link",
      "section": "Page",
      "value": "route:deployment"
    },
    "BACK": {
      "label": "Link back (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "RUN DEFXN FROM SOURCE"
    },
    "BUNDLEDEPLOYER.HREF": {
      "label": "Bundle Deployer link",
      "kind": "link",
      "section": "Links",
      "value": "route:bundledeployer"
    },
    "GUIDE.HREF": {
      "label": "Network scope guide link",
      "kind": "link",
      "section": "Links",
      "value": "doc:docs/operators/networks.md"
    }
  }
});
