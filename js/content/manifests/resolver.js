/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "resolver",
  "title": "What is a resolver?",
  "route": "/what-is-a-resolver",
  "group": "page",
  "meta": {
    "next": "deployment",
    "back": "zero",
    "diagrams": [
      {
        "id": "resolver-layers",
        "place": "what-is-a-resolver: Understand-why depth (BODY2), and /resolvers above the resolver chains",
        "caption": "Illustration · relationships, not live state",
        "bands": [
          {
            "id": "base",
            "label": "Base chain",
            "rule": "never learns a business kind",
            "marks": [
              "launch a resolver",
              "upgrade it",
              "launch a capability",
              "records"
            ]
          },
          {
            "id": "capabilities",
            "label": "Capabilities",
            "rule": "published with its tests",
            "from": "ArkRegistrySnapshot.capabilities",
            "badge": "vectors",
            "stub": "sourceHash"
          },
          {
            "id": "resolvers",
            "label": "Resolver chains",
            "rule": "composes, never copies",
            "from": "ArkRegistrySnapshot.resolvers",
            "show": [
              "dao",
              "treasury"
            ],
            "plus": "your-resolver",
            "lines": "composes"
          }
        ],
        "phone": "bands stack; composition lines become capability chips under each resolver"
      },
      {
        "id": "launched-vs-served",
        "place": "what-is-a-resolver: beside BODY3 (Essential boundary)",
        "caption": "Illustration · relationships, not live state",
        "frames": [
          {
            "state": "launched",
            "outline": "dashed",
            "note": "launched, no provider: answers nothing"
          },
          {
            "state": "served",
            "outline": "solid",
            "provider": true,
            "badge": "proof",
            "note": "a provider announces, with a proof for each composed capability"
          }
        ]
      }
    ]
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / RESOLVERS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "A rulebook with its own chain."
    },
    "DISPLAY.TITLE": {
      "label": "Display heading",
      "kind": "line",
      "section": "Page",
      "value": "Ask the mesh. Get a claim you can check."
    },
    "DISPLAY.LEDE": {
      "label": "Display introduction",
      "kind": "text",
      "section": "Page",
      "value": "A resolver is launched with one signed record. It gets its own chain, it is built from shared capabilities anyone can check, and it refuses any record that does not fit its grammar."
    },
    "BODY1": {
      "label": "First paragraph",
      "kind": "text",
      "section": "Page",
      "value": "A resolver is a rulebook that runs as its own chain. One signed launch record gives it a chain id, names the capabilities it is built from, and publishes the grammar every one of its records must follow."
    },
    "BODY2": {
      "label": "Second paragraph",
      "kind": "text",
      "section": "Page",
      "value": "Capabilities are the shared mechanisms: N-of-M signatures, custody, a ledger, escrow, a signer. Each is published once, with test vectors anyone can run. A resolver composes them and adds its own grammar; it never carries its own copy. So two resolvers that both hold funds hold them the same, checked way."
    },
    "BODY3": {
      "label": "Closing paragraph",
      "kind": "text",
      "section": "Page",
      "value": "Launched is not served. A resolver answers only while a provider announces for it. If it is built from capabilities, only a provider that passed their test vectors gets a seat."
    },
    "FLOW.LABEL": {
      "label": "Flow label",
      "kind": "line",
      "section": "Flow",
      "value": "One rulebook, one chain"
    },
    "INPUT": {
      "label": "Input title",
      "kind": "line",
      "section": "Flow",
      "value": "Ask"
    },
    "INPUT.TEXT": {
      "label": "Input description",
      "kind": "line",
      "section": "Flow",
      "value": "Send a record in its grammar."
    },
    "LOGIC": {
      "label": "Logic title",
      "kind": "line",
      "section": "Flow",
      "value": "Resolve"
    },
    "LOGIC.TEXT": {
      "label": "Logic description",
      "kind": "line",
      "section": "Flow",
      "value": "Apply its capabilities."
    },
    "CLAIM": {
      "label": "Claim title",
      "kind": "line",
      "section": "Flow",
      "value": "Check"
    },
    "CLAIM.TEXT": {
      "label": "Claim description",
      "kind": "line",
      "section": "Flow",
      "value": "Receive its signed result."
    },
    "WHY.LABEL": {
      "label": "Why label",
      "kind": "line",
      "section": "Page",
      "value": "Why it matters"
    },
    "WHY": {
      "label": "Why text",
      "kind": "text",
      "section": "Page",
      "value": "Anyone can read the rulebook before relying on it: its grammar, its capabilities and who can change it. Nothing about it can change quietly underneath you."
    },
    "BOUNDARY.LABEL": {
      "label": "Boundary label",
      "kind": "line",
      "section": "Page",
      "value": "Trust boundary"
    },
    "BOUNDARY": {
      "label": "Boundary text",
      "kind": "text",
      "section": "Page",
      "value": "Its signature is its result. Whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it."
    },
    "SOURCE": {
      "label": "Source link",
      "kind": "line",
      "section": "Links",
      "value": "Read the resolver spec"
    },
    "SOURCE.HREF": {
      "label": "Source link target",
      "kind": "link",
      "section": "Links",
      "value": "doc:docs/protocol/resolvers.md"
    },
    "HOME.HREF": {
      "label": "Breadcrumb: Home link",
      "kind": "link",
      "section": "Links",
      "value": "route:zero"
    },
    "INSPECT.HREF": {
      "label": "Inspect reference evidence link",
      "kind": "link",
      "section": "Links",
      "value": "route:references"
    },
    "STATUS.HREF": {
      "label": "Status page link",
      "kind": "link",
      "section": "Links",
      "value": "doc:docs/status.md"
    },
    "NEXT": {
      "label": "Onward link",
      "kind": "line",
      "section": "Links",
      "value": "Deploy a resolver"
    },
    "BACK": {
      "label": "Back link",
      "kind": "line",
      "section": "Links",
      "value": "← Home"
    },
    "ASK.BODY": {
      "label": "Ask step text",
      "kind": "text",
      "section": "Flow",
      "value": "A resolver only accepts records in its own grammar; anything else is refused before it reaches a peer. This example takes a document identifier and checks it against a named size rule."
    },
    "RESOLVE.BODY": {
      "label": "Resolve step text",
      "kind": "text",
      "section": "Flow",
      "value": "A provider of that resolver applies its capabilities to the record. The same capability, at the same version, gives the same answer on every provider: run it again on the same input and the result does not change."
    },
    "CHECK.BODY": {
      "label": "Check step text",
      "kind": "text",
      "section": "Flow",
      "value": "The provider signs the result, and its signature is its result. So the trust question comes first: before you send anything, read its grammar, its capabilities and who can change it. Explore re-checks every hash and signature in your browser."
    },
    "LAWS": {
      "label": "Laws step title",
      "kind": "line",
      "section": "Laws",
      "value": "Laws"
    },
    "LAWS.BODY": {
      "label": "Laws step text",
      "kind": "text",
      "section": "Laws",
      "value": "Four rules every resolver follows on the network."
    },
    "LAW1": {
      "label": "Law 1",
      "kind": "line",
      "section": "Laws",
      "value": "One launch, one chain."
    },
    "LAW1.TEXT": {
      "label": "Law 1 detail",
      "kind": "text",
      "section": "Laws",
      "value": "A single signed record gives a resolver its chain id, its providers and its manifests. Its whole history is readable, oldest first."
    },
    "LAW2": {
      "label": "Law 2",
      "kind": "line",
      "section": "Laws",
      "value": "Built from checked parts."
    },
    "LAW2.TEXT": {
      "label": "Law 2 detail",
      "kind": "text",
      "section": "Laws",
      "value": "A resolver names the capabilities it composes. The network refuses a launch that names a capability that is not launched, or not the current version."
    },
    "LAW3": {
      "label": "Law 3",
      "kind": "line",
      "section": "Laws",
      "value": "Its grammar is the gate."
    },
    "LAW3.TEXT": {
      "label": "Law 3 detail",
      "kind": "text",
      "section": "Laws",
      "value": "Every record is checked against the grammar the resolver published at launch, before it reaches any peer. A record that does not fit is refused, with the reason."
    },
    "LAW4": {
      "label": "Law 4",
      "kind": "line",
      "section": "Laws",
      "value": "Fixed unless you said otherwise."
    },
    "LAW4.TEXT": {
      "label": "Law 4 detail",
      "kind": "text",
      "section": "Laws",
      "value": "A resolver is immutable by default. Only the control key named at launch can upgrade it, and an upgrade adds a new declaration; it never rewrites the old one."
    },
    "VERIFIED.TITLE": {
      "label": "Verified-on-chain heading",
      "kind": "line",
      "section": "Hub",
      "value": "What “verified on chain” means"
    },
    "VERIFIED.FACT1": {
      "label": "Verified fact 1: vectors",
      "kind": "text",
      "section": "Hub",
      "value": "Its tests are its own. A capability’s test vectors come from its crate’s own test suite, with a hash of the exact source they ran against."
    },
    "VERIFIED.FACT2": {
      "label": "Verified fact 2: provider proof",
      "kind": "text",
      "section": "Hub",
      "value": "Providers prove them. A provider that serves a resolver built on a capability must pass that capability’s vectors first, and the provider list records the proof."
    },
    "VERIFIED.FACT3": {
      "label": "Verified fact 3: composition check",
      "kind": "text",
      "section": "Hub",
      "value": "Launches are checked. A launch that names a capability that is not launched, or not the current version, is refused."
    },
    "VERIFIED.PLANNED": {
      "label": "Verified: planned line",
      "kind": "text",
      "section": "Hub",
      "value": "Planned, not built: audits by providers and reviewers, bounties for findings, and an option to require audited capabilities."
    },
    "REGISTRY.LINK": {
      "label": "Hub link: resolvers and capabilities",
      "kind": "line",
      "section": "Hub",
      "value": "Every resolver and capability"
    },
    "REGISTRY.HREF": {
      "label": "Hub link target: resolvers and capabilities",
      "kind": "link",
      "section": "Hub",
      "value": "route:resolvers"
    },
    "DEPLOY.LINK": {
      "label": "Hub link: deploy a resolver",
      "kind": "line",
      "section": "Hub",
      "value": "Deploy a resolver"
    },
    "DEPLOY.HREF": {
      "label": "Hub link target: deploy a resolver",
      "kind": "link",
      "section": "Hub",
      "value": "route:deployment"
    },
    "EXPLORE.LINK": {
      "label": "Hub link: Explore product",
      "kind": "line",
      "section": "Hub",
      "value": "Open Explore"
    },
    "EXPLORE.HREF": {
      "label": "Hub link target: Explore product",
      "kind": "link",
      "section": "Hub",
      "value": "url:https://explore.defxn.com"
    },
    "DEPLOYER.LINK": {
      "label": "Hub link: Deploy product",
      "kind": "line",
      "section": "Hub",
      "value": "Open Deploy"
    },
    "DEPLOYER.HREF": {
      "label": "Hub link target: Deploy product",
      "kind": "link",
      "section": "Hub",
      "value": "url:https://deploy.defxn.com"
    },
    "PRODUCTS.NOTE": {
      "label": "Hub note: product hosting",
      "kind": "text",
      "section": "Hub",
      "value": "Explore and Deploy run on the development network; public hosting is not established yet."
    },
    "MATH.LINK": {
      "label": "Hub link: resolver math",
      "kind": "line",
      "section": "Hub",
      "value": "Why your resolver’s limits are yours"
    },
    "MATH.HREF": {
      "label": "Hub link target: resolver math",
      "kind": "link",
      "section": "Hub",
      "value": "route:resolver-math"
    },
    "REGISTRY.KICKER": {
      "label": "Registry page: kicker",
      "kind": "line",
      "section": "Registry page",
      "value": "A resolver runs its own chain · built from shared capabilities"
    },
    "REGISTRY.TITLE": {
      "label": "Registry page: heading",
      "kind": "line",
      "section": "Registry page",
      "value": "Resolvers and capabilities"
    },
    "REGISTRY.LEDE": {
      "label": "Registry page: introduction",
      "kind": "text",
      "section": "Registry page",
      "value": "A dated snapshot of every first-party resolver chain and every capability a resolver can be built from, read from the code that defines them. Each row opens in Explore, which reads a node directly."
    },
    "REGISTRY.BOUNDARY": {
      "label": "Registry page: boundary",
      "kind": "text",
      "section": "Registry page",
      "value": "A snapshot, not a live read. Every count here comes from the commit and the dated development-network observation named above; what a node holds right now is in Explore."
    },
    "REGISTRY.CHAINS.LABEL": {
      "label": "Registry page: resolver chains label",
      "kind": "line",
      "section": "Registry page",
      "value": "Resolver chains"
    },
    "REGISTRY.CHAINS.BODY": {
      "label": "Registry page: resolver chains text",
      "kind": "text",
      "section": "Registry page",
      "value": "Each resolver below is its own chain, launched by one signed record. “Grammar enforced” means every record is checked against the grammar the resolver published. “Unspecified” means a legacy grammar the network admits and reports, without checking."
    },
    "REGISTRY.CAPS.LABEL": {
      "label": "Registry page: capabilities label",
      "kind": "line",
      "section": "Registry page",
      "value": "Capabilities"
    },
    "REGISTRY.CAPS.BODY": {
      "label": "Registry page: capabilities text",
      "kind": "text",
      "section": "Registry page",
      "value": "A capability is one shared mechanism, published with the tests that define it. A provider must pass those tests before it may serve any resolver that uses it."
    },
    "REGISTRY.CAPS.EMPTY": {
      "label": "Registry page: no capability launched",
      "kind": "text",
      "section": "Registry page",
      "value": "Launched on the development network at its last recorded restart: none. That is a measured zero, not a missing feature; the manifests below are ready to launch."
    },
    "REGISTRY.BRIDGES.LABEL": {
      "label": "Registry page: bridge chains label",
      "kind": "line",
      "section": "Registry page",
      "value": "Bridge chains"
    },
    "REGISTRY.BRIDGES.BODY": {
      "label": "Registry page: bridge chains text",
      "kind": "text",
      "section": "Registry page",
      "value": "These products also write their records to resolver chains of their own, beside the older paths they still use."
    },
    "REGISTRY.DEPLOY.TITLE": {
      "label": "Registry page: deploy heading",
      "kind": "line",
      "section": "Registry page",
      "value": "Deploy your own"
    },
    "REGISTRY.DEPLOY.STEPS": {
      "label": "Registry page: deploy steps (one per line)",
      "kind": "text",
      "section": "Registry page",
      "value": "Write your grammar. Derive it from your own sample records.\nName the capabilities you build on.\nChoose: immutable, or upgradeable by one key.\nReview the exact record and sign it at deploy.defxn.com.\nRun a provider for it. If you compose capabilities, prove them first."
    },
    "REGISTRY.DEPLOY.LINK": {
      "label": "Registry page: deploy walkthrough link",
      "kind": "line",
      "section": "Registry page",
      "value": "Full walkthrough"
    },
    "REGISTRY.OPEN": {
      "label": "Registry page: per-row Explore link",
      "kind": "line",
      "section": "Registry page",
      "value": "Open in Explore"
    },
    "REGISTRY.APPS.LABEL": {
      "label": "Registry page: applications heading",
      "kind": "line",
      "section": "Registry page",
      "value": "Applications that read records but are not resolver chains yet"
    },
    "REGISTRY.APPS.BODY": {
      "label": "Registry page: applications text",
      "kind": "text",
      "section": "Registry page",
      "value": "Listed on this page before resolver chains existed. None of them is launched as a resolver chain; each keeps its own figures and open issues, dated where they were measured."
    }
  }
});
