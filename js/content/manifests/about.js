/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "about",
  "title": "DEFXN overview",
  "route": "/about",
  "group": "page",
  "meta": {
    "next": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "DEFXN / OVERVIEW"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Overview."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "DEFXN is the kernel of the grid. FXN is its first chain and that chain’s coin. A resolver turns signed records into a result that anyone can check. Everything here runs on a development network, and nothing is live."
    },
    "CONTEXT": {
      "label": "Supporting explanation disclosure",
      "kind": "line",
      "section": "Page",
      "value": "Under the hood / the three layers"
    },
    "MODEL.TITLE": {
      "label": "Model label",
      "kind": "line",
      "section": "Page",
      "value": "Three bounded layers"
    },
    "MODEL.TEXT": {
      "label": "Model summary",
      "kind": "line",
      "section": "Page",
      "value": "Discovery finds the network. The chain admits signed records. Authority stays bounded."
    },
    "ACTION": {
      "label": "Primary action",
      "kind": "line",
      "section": "Links",
      "value": "Explore resolutions"
    },
    "ACTION.HREF": {
      "label": "Primary action link",
      "kind": "link",
      "section": "Links",
      "value": "route:resolutions"
    },
    "BOUNDARY.TITLE": {
      "label": "Visible source boundary",
      "kind": "line",
      "section": "Status",
      "value": "Core paths exist in source. Production activation and packaged releases remain unverified."
    },
    "REFERENCE": {
      "label": "Reference disclosure",
      "kind": "line",
      "section": "Status",
      "value": "Evidence & verification"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Directory: address a network."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Each network gets a named ID so it can be found. Today that partitions miner presence only. Isolating accounts, records and treasury is not built yet."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Chains: one signed chain per identity."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Every identity writes to its own append-only chain, and every resolver runs its own. A record is admitted if its signature verifies, it extends the signer’s head, and it fits the grammar of the resolver it names."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Governance: identify who may change what."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Authority stays bound to a named scope and threshold. Network governance cannot silently take over the mesh, and mesh policy cannot take over a network."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "What the source establishes."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "The resolver model is implemented in source: launch and upgrade, shared capabilities with test vectors, grammar checks, and provider proofs. It runs on the development network. The DEFXN miner, network CLI and FXN chain prototype are implemented in source too, and fleet benchmarks are recorded on the stats page. Packaged releases and production activation remain unverified."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "How to verify it."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "Run DEFXN from a trusted source revision, record the miner status response, then inspect the signed records on each holder’s chain. A successful local run proves that environment only. It does not establish production readiness."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "EXPLORE THE DEFXN MODEL"
    },
    "STATUS": {
      "label": "Status documentation link",
      "kind": "line",
      "section": "Links",
      "value": "READ DEFXN STATUS"
    },
    "STATUS.HREF": {
      "label": "Status documentation target",
      "kind": "link",
      "section": "Links",
      "value": "doc:docs/status.md"
    },
    "ACTION2": {
      "label": "Secondary action",
      "kind": "line",
      "section": "Links",
      "value": "Deploy a resolver"
    },
    "ACTION2.HREF": {
      "label": "Secondary action link",
      "kind": "link",
      "section": "Links",
      "value": "route:deployment"
    },
    "FOOTER.HOME.HREF": {
      "label": "Footer: Home link",
      "kind": "link",
      "section": "Links",
      "value": "route:zero"
    },
    "FOOTER.RESOLUTIONS.HREF": {
      "label": "Footer: Resolutions link",
      "kind": "link",
      "section": "Links",
      "value": "route:resolutions"
    },
    "FOOTER.EXPLORER.HREF": {
      "label": "Footer: Explorer link",
      "kind": "link",
      "section": "Links",
      "value": "route:explorer"
    },
    "FOOTER.DOWNLOAD.HREF": {
      "label": "Footer: Run from source link",
      "kind": "link",
      "section": "Links",
      "value": "route:download"
    },
    "PROMISE.LABEL": {
      "label": "Promise label",
      "kind": "line",
      "section": "Promise",
      "value": "WHAT IS NOT BUILT YET"
    },
    "PROMISE.TITLE": {
      "label": "Promise heading",
      "kind": "line",
      "section": "Promise",
      "value": "A site as a signed bundle, not a rented server."
    },
    "PROMISE.TEXT": {
      "label": "Promise text",
      "kind": "text",
      "section": "Promise",
      "value": "Publishing a site this way is planned. The Bundle Deployer is not released, and public hosting is not established."
    },
    "NO1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Promise",
      "value": "Records, not a database server"
    },
    "NO1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Promise",
      "value": "Data is written as signed records on a chain per identity, and other computers keep copies. You do not run a database server for it."
    },
    "NO2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Promise",
      "value": "Nodes serve, not a rented host"
    },
    "NO2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Promise",
      "value": "Computers that run the store role serve what you publish. The development fleet does this today. A public network does not exist yet."
    },
    "NO3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Promise",
      "value": "Fees are decided, not set"
    },
    "NO3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Promise",
      "value": "Running work will cost FXN. A fee splits between the computers that do the work and a network fund, and the owner’s figure is 65% and 35%. No price is set."
    },
    "NO4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Promise",
      "value": "Your key, not an account"
    },
    "NO4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Promise",
      "value": "You sign with a key you hold, so no vendor account stands between you and your records. Nodes still have to run somewhere."
    },
    "PILLARS.LABEL": {
      "label": "Pillars label",
      "kind": "line",
      "section": "Pillars",
      "value": "WHAT DEFXN IS"
    },
    "PILLAR1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Pillars",
      "value": "One kernel, many chains"
    },
    "PILLAR1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Pillars",
      "value": "DEFXN is the base chain kernel. Network chains such as FXN run on it, and every identity and every resolver has a chain of its own."
    },
    "PILLAR2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Pillars",
      "value": "Everyone signs for themselves"
    },
    "PILLAR2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Pillars",
      "value": "Builders, node operators and users each sign their own records. An agreement links the records of the parties to it, and no platform account sits between them."
    },
    "PILLAR3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Pillars",
      "value": "FXN: the first chain and its coin"
    },
    "PILLAR3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Pillars",
      "value": "FXN is the first network chain on the kernel, and the kernel itself has no currency. The coin is for settling work and paying the computers that do it. Its supply and release rules are in the dense-wire code, checked 2026-10-24."
    },
    "RESOLVE.LABEL": {
      "label": "Resolutions label",
      "kind": "line",
      "section": "Resolutions",
      "value": "RESOLVE YOUR…"
    },
    "RESOLVE.TITLE": {
      "label": "Resolutions heading",
      "kind": "line",
      "section": "Resolutions",
      "value": "Twenty ideas for what a resolver can do."
    },
    "RESOLVE.ALL": {
      "label": "Link to all resolutions (an arrow is added)",
      "kind": "line",
      "section": "Resolutions",
      "value": "See every resolution"
    },
    "RESOLVE.ALL.HREF": {
      "label": "Link to all resolutions target",
      "kind": "link",
      "section": "Resolutions",
      "value": "route:resolutions"
    },
    "RESOLVE.GROUP.HREF": {
      "label": "Resolution group tile target",
      "kind": "link",
      "section": "Resolutions",
      "value": "route:resolutions"
    },
    "FLOW.LABEL": {
      "label": "Flow label",
      "kind": "line",
      "section": "Flow",
      "value": "HOW A RESOLUTION WORKS"
    },
    "FLOW1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Flow",
      "value": "Resolve"
    },
    "FLOW1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Flow",
      "value": "You send a signed record in the resolver’s grammar."
    },
    "FLOW2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Flow",
      "value": "Resolver"
    },
    "FLOW2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Flow",
      "value": "A resolver applies its own published grammar and capabilities to your request and signs the result."
    },
    "FLOW3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Flow",
      "value": "Resolution"
    },
    "FLOW3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Flow",
      "value": "Other computers store the signed result. Anyone can follow its signatures back and check them."
    },
    "FLOW.LINK": {
      "label": "Link to the resolver guide (an arrow is added)",
      "kind": "line",
      "section": "Flow",
      "value": "What is a resolver?"
    },
    "FLOW.LINK.HREF": {
      "label": "Link to the resolver guide target",
      "kind": "link",
      "section": "Flow",
      "value": "route:resolver"
    },
    "FLOW.TITLE": {
      "label": "Heading: how a resolution works",
      "kind": "line",
      "section": "Page",
      "value": "State it. Resolve it. Check it."
    },
    "PILLARS.TITLE": {
      "label": "Heading: what DEFXN is",
      "kind": "line",
      "section": "Page",
      "value": "A kernel, the chains on it, and the people who sign."
    },
    "CLOSE.TITLE": {
      "label": "Closing heading",
      "kind": "line",
      "section": "Page",
      "value": "See the resolver chains."
    }
  }
});
