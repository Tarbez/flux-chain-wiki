/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "resolutions",
  "title": "Resolutions (products)",
  "route": "/resolutions",
  "group": "page",
  "meta": {
    "next": "about"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "DEFXN / RESOLUTIONS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Resolutions for the mesh."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "A resolution is a job a resolver can do, such as publishing a site or settling a payment. These are twenty ideas for what to build. Each page says which pieces work on devnet, which are being built, and which are only ideas. Everything runs on a development network."
    },
    "PROMISE": {
      "label": "Promise line",
      "kind": "line",
      "section": "Page",
      "value": "Development network only · Proposals, not products"
    },
    "START": {
      "label": "Card link (an arrow is added)",
      "kind": "line",
      "section": "Page",
      "value": "Start here"
    },
    "START.FALLBACK.HREF": {
      "label": "Fallback card link, when a resolution has no start page of its own",
      "kind": "link",
      "section": "Page",
      "value": "route:resolver"
    },
    "BACK.HOME.HREF": {
      "label": "Breadcrumb: Home link",
      "kind": "link",
      "section": "Page",
      "value": "route:zero"
    },
    "INDEX.HREF": {
      "label": "Link back to the resolutions index (breadcrumb and footer)",
      "kind": "link",
      "section": "Page",
      "value": "route:resolutions"
    },
    "MEGA.READY": {
      "label": "Menu heading over the resolutions you can use today",
      "kind": "line",
      "section": "Products menu",
      "value": "Works on devnet"
    },
    "MEGA.MORE": {
      "label": "Menu heading over every other resolver",
      "kind": "line",
      "section": "Products menu",
      "value": "More resolvers"
    },
    "MEGA.TEXT": {
      "label": "Menu intro",
      "kind": "text",
      "section": "Products menu",
      "value": "A resolution is a job done by a resolver: signed records go in and a signed result comes out."
    },
    "MEGA.ALL": {
      "label": "Menu link to every resolution (an arrow is added)",
      "kind": "line",
      "section": "Products menu",
      "value": "Browse all resolutions"
    },
    "MEGA.HOW": {
      "label": "Resolver explainer link",
      "kind": "line",
      "section": "Products menu",
      "value": "How resolvers work"
    },
    "GROUP.BUILD": {
      "label": "Group heading",
      "kind": "line",
      "section": "Groups",
      "value": "Build & publish"
    },
    "GROUP.VALUE": {
      "label": "Group heading",
      "kind": "line",
      "section": "Groups",
      "value": "Value & finance"
    },
    "GROUP.PEOPLE": {
      "label": "Group heading",
      "kind": "line",
      "section": "Groups",
      "value": "People & organisations"
    },
    "GROUP.INTELLIGENCE": {
      "label": "Group heading",
      "kind": "line",
      "section": "Groups",
      "value": "Intelligence & data"
    },
    "GROUP.OPERATIONS": {
      "label": "Group heading",
      "kind": "line",
      "section": "Groups",
      "value": "Infrastructure & operations"
    },
    "WEBSITE.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your website",
      "value": "Resolve your website"
    },
    "WEBSITE.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your website",
      "value": "Publish a site as a signed bundle. The Bundle Deployer is being built and is not released."
    },
    "CONTENT.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your content",
      "value": "Resolve your content"
    },
    "CONTENT.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your content",
      "value": "Idea, not built. Sign what you publish so readers can see who published it and what changed."
    },
    "FILES.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your files",
      "value": "Resolve your files"
    },
    "FILES.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your files",
      "value": "Idea, not built. Encrypt files to keys you hold and share them as addressed pieces."
    },
    "DEPLOYMENTS.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your deployments",
      "value": "Resolve your deployments"
    },
    "DEPLOYMENTS.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your deployments",
      "value": "Sign an exact release so anyone can check what is running. The Bundle Deployer is being built and is not released."
    },
    "PAYMENTS.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your payments",
      "value": "Resolve your payments"
    },
    "PAYMENTS.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your payments",
      "value": "Idea, not built. Settle a transfer in FXN and keep a signed receipt on each side. A design preview shows it with sample data."
    },
    "FINANCE.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your personal finance",
      "value": "Resolve your personal finance"
    },
    "FINANCE.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your personal finance",
      "value": "Idea, not built. Keep your own books as signed records you can inspect. A design preview shows it with sample data."
    },
    "COMMUNITY.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your community",
      "value": "Resolve your community"
    },
    "COMMUNITY.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your community",
      "value": "Idea, not built. Give members their own signed identity and history, with membership rules anyone can read."
    },
    "COMMUNICATIONS.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your communications",
      "value": "Resolve your communications"
    },
    "COMMUNICATIONS.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your communications",
      "value": "Idea, not built. Send messages encrypted to the recipient’s keys."
    },
    "COLLABORATIONS.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your collaborations",
      "value": "Resolve your collaborations"
    },
    "COLLABORATIONS.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your collaborations",
      "value": "Idea, not built. Record each contribution as a signed change and agree the shared state without a central owner."
    },
    "GOVERNANCE.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your governance",
      "value": "Resolve your governance"
    },
    "GOVERNANCE.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your governance",
      "value": "Set an approval threshold, collect signatures and record when the change applies. The DAO runs as a resolver chain on the development network."
    },
    "INTELLIGENCE.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your intelligence",
      "value": "Resolve your intelligence"
    },
    "INTELLIGENCE.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your intelligence",
      "value": "Idea, not built. Run agreed logic next to the data and return a result with the records it used."
    },
    "DATA.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your data",
      "value": "Resolve your data"
    },
    "DATA.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your data",
      "value": "Write signed records and read them back from the network instead of running a database server."
    },
    "ALGORITHMS.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your algorithms",
      "value": "Resolve your algorithms"
    },
    "ALGORITHMS.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your algorithms",
      "value": "Publish deterministic logic as a resolver so anyone can run it and check the result."
    },
    "INFORMATION.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your information",
      "value": "Resolve your information"
    },
    "INFORMATION.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your information",
      "value": "Idea, not built. Give information a stable address and a signed source trail."
    },
    "RULES.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your rules and patterns",
      "value": "Resolve your rules and patterns"
    },
    "RULES.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your rules and patterns",
      "value": "Write a rule as resolver logic so every party applies it the same way."
    },
    "NETWORK.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your network",
      "value": "Resolve your network"
    },
    "NETWORK.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your network",
      "value": "Create or join a named network. Today the name groups miners for discovery and isolates nothing else."
    },
    "ENCRYPTIONS.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your encryptions",
      "value": "Resolve your encryptions"
    },
    "ENCRYPTIONS.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your encryptions",
      "value": "Idea, not built. Encrypt before information leaves your machine, with keys you hold."
    },
    "AUTOMATION.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your automation",
      "value": "Resolve your automation"
    },
    "AUTOMATION.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your automation",
      "value": "Idea, not built. Run a permitted action when signed evidence satisfies a rule."
    },
    "PRODUCTIVITY.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your productivity",
      "value": "Resolve your productivity"
    },
    "PRODUCTIVITY.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your productivity",
      "value": "Idea, not built. Build tools around shared signed records instead of per-seat subscriptions."
    },
    "LOGISTICS.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Resolve your logistics",
      "value": "Resolve your logistics"
    },
    "LOGISTICS.TEXT": {
      "label": "One line",
      "kind": "text",
      "section": "Resolve your logistics",
      "value": "Idea, not built. Sign each handoff of an item to keep a shared custody trail."
    },
    "NOTE": {
      "label": "Status note",
      "kind": "text",
      "section": "Page",
      "value": "Resolutions describe where DEFXN is going. The current status page lists what runs today and what is still being built."
    },
    "NOTE.LINK": {
      "label": "Status link (an arrow is added)",
      "kind": "line",
      "section": "Page",
      "value": "Current status"
    },
    "NOTE.LINK.HREF": {
      "label": "Status link target",
      "kind": "link",
      "section": "Page",
      "value": "doc:docs/status.md"
    },
    "JUMP": {
      "label": "Group jump label",
      "kind": "line",
      "section": "Page",
      "value": "Jump to"
    }
  }
});
