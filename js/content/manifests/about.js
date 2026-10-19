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
      "value": "The mesh is the database, the host and the cloud. What you build resolves on the mesh instead of on servers you rent."
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
      "value": "THREE BOUNDED LAYERS"
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
      "value": "Each network gets a named ID so it can be found. Today that partitions miner presence only; isolating accounts, records and treasury is not built yet."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "FXN chain: one signed chain per identity."
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
      "value": "Run DEFXN from a trusted source revision, record the miner status response, then inspect the signed records on each holder’s chain. A successful local run proves that environment only; it does not establish production readiness."
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
      "value": "See how DEFXN works"
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
      "value": "RESOLVE YOUR WEBSITE"
    },
    "PROMISE.TITLE": {
      "label": "Promise heading",
      "kind": "line",
      "section": "Promise",
      "value": "No database. No hosting. No fees. No cloud."
    },
    "PROMISE.TEXT": {
      "label": "Promise text",
      "kind": "text",
      "section": "Promise",
      "value": "With encrypted peer-to-peer hosting, yearly renewals become permanence."
    },
    "NO1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Promise",
      "value": "No database"
    },
    "NO1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Promise",
      "value": "Records live on the mesh and are queried where they are."
    },
    "NO2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Promise",
      "value": "No hosting"
    },
    "NO2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Promise",
      "value": "Encrypted peer-to-peer hosting serves what you publish."
    },
    "NO3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Promise",
      "value": "No fees"
    },
    "NO3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Promise",
      "value": "No server bills or platform cuts between you and your partners."
    },
    "NO4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Promise",
      "value": "No cloud"
    },
    "NO4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Promise",
      "value": "No rented region, account or vendor to lock you in."
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
      "value": "Self-scaling fractal network"
    },
    "PILLAR1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Pillars",
      "value": "Every network can hold networks of its own, so the mesh grows by repeating one pattern at every scale."
    },
    "PILLAR2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Pillars",
      "value": "Everyone is our business partner"
    },
    "PILLAR2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Pillars",
      "value": "Builders, miners and members take part in the same agreements. Value moves between partners, not through a platform."
    },
    "PILLAR3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Pillars",
      "value": "The DEFXN coin: FXN"
    },
    "PILLAR3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Pillars",
      "value": "The unit partners use to settle agreements and reward the miners who keep the mesh running."
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
      "value": "One mesh. Every part of your work resolved on it."
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
      "value": "You state what you need: a site, a payment, a rule, a file."
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
      "value": "The signed result lands on the mesh, where every partner can find and check it."
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
      "value": "A network of partners, not a platform."
    },
    "CLOSE.TITLE": {
      "label": "Closing heading",
      "kind": "line",
      "section": "Page",
      "value": "See what resolves on the mesh."
    }
  }
});
