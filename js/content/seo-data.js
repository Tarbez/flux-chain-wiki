/* Live-tunable page/article titles, descriptions, social images, canonical URLs,
   structured data, search/AI visibility, and the site's base URL, language, owner
   and AI-crawler policy (used to generate sitemap.xml/robots.txt/llms.txt). Edit
   these in each page in admin.html; this file is not meant for hand editing. */
ArkSEO.define({
  "site": {
    "name": "DEFXN",
    "baseUrl": "https://defxn.com",
    "defaultDescription": "Explore DEFXN: independent signed histories, connected applications and inspectable results. Understand the protocol, build with resolvers, or help run the network.",
    "lang": "en",
    "org": "Organization",
    "handle": "",
    "bots": {},
    "llms": 1
  },
  "pages": {
    "home": {
      "title": "Not one chain. A world of them. — DEFXN",
      "description": "Explore DEFXN: independent signed histories, connected applications and inspectable results. Understand the protocol, build with resolvers, or help run the network.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "chain": {
      "title": "Every identity, its own chain — DEFXN",
      "description": "Walk the record that joins a chain: signed, checked against its grammar and signature, replicated to peers, then read by a resolver. Every identity and every resolver runs its own chain.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolver": {
      "title": "What is a resolver? — DEFXN",
      "description": "A resolver is a rulebook with its own chain: launched by one signed record, built from shared capabilities anyone can check, and refusing any record that does not fit its grammar.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "A DEFXN resolver is launched by one signed record that gives it its own chain, names the capabilities it composes, and publishes the grammar every record must follow. It is immutable unless a control key was named at launch, and launched is not served: it answers only while a provider announces for it. Its signature is its result; whether to rely on it is decided before sending anything: its grammar, its capabilities, who can change it.",
      "aiBlocked": false
    },
    "resolvermath": {
      "title": "Resolver Math — DEFXN",
      "description": "A record is a tuple of symbols and meaning is symbol x position x observer. See which dimensions of the FLX grammar are closed, which are unbounded, and resolve a dense block yourself.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "references": {
      "title": "Reference resolvers — DEFXN",
      "description": "Inspect source-backed reference evidence and its limits. Separate documented behavior from verified live operation before choosing an operator path.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "deployment": {
      "title": "Deploy a resolver — DEFXN",
      "description": "Deploy a resolver in six steps: write its grammar, name its capabilities, choose who can change it, review and sign one launch record, serve it, and watch it in the explorer.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "You deploy a DEFXN resolver by signing one launch record, which gives it its own chain, names the capabilities it uses and publishes its grammar; then a provider serves it. The explorer and deployer run on the development network; public hosting is not established.",
      "aiBlocked": false
    },
    "concept": {
      "title": "The operating model — DEFXN",
      "description": "Explore networks, agreement execution, and authority. Start with the core idea, then open mechanics, current limits, and source evidence.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "about": {
      "title": "Overview — DEFXN",
      "description": "DEFXN is a self-scaling fractal network where everyone is a business partner. The mesh is the database, the host and the cloud: no database, no hosting, no fees, no cloud.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions": {
      "title": "Resolutions for the mesh — DEFXN",
      "description": "Resolve your website, payments, data, governance, communications and more on the DEFXN mesh, with encrypted peer-to-peer hosting and permanence instead of renewals.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/website": {
      "title": "Resolve your website — DEFXN",
      "description": "Publish a signed website bundle to the DEFXN mesh without a database, hosting plan, cloud account, or yearly renewal.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/content": {
      "title": "Resolve your content — DEFXN",
      "description": "Publish named, signed content to the DEFXN mesh so it remains addressable, traceable to its origin, and independent of a platform.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/files": {
      "title": "Resolve your files — DEFXN",
      "description": "Encrypt, distribute, and retrieve verifiable files through peer storage while keeping access under keys you control.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/deployments": {
      "title": "Resolve your deployments — DEFXN",
      "description": "Package and sign an exact release, then publish its addressable bundle to the mesh instead of a rented deployment server.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/payments": {
      "title": "Resolve your payments — DEFXN",
      "description": "Describe direct partner settlement in an agreement and retain a signed receipt both sides can independently verify.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/finance": {
      "title": "Resolve your personal finance — DEFXN",
      "description": "Keep inspectable books and balances under your keys, reconciling changes from partner agreements and signed receipts.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/community": {
      "title": "Resolve your community — DEFXN",
      "description": "Build a community whose members retain identity and history while shared membership rules remain explicit and checkable.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/communications": {
      "title": "Resolve your communications — DEFXN",
      "description": "Establish encrypted peer channels and resolve shared conversation records without placing message custody in a platform.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/collaborations": {
      "title": "Resolve your collaborations — DEFXN",
      "description": "Coordinate shared work through signed changes and resolve the agreed state without a central application owner.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/governance": {
      "title": "Resolve your governance — DEFXN",
      "description": "Write decision rules before a vote, gather the required approvals, and activate an outcome with its evidence attached.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/intelligence": {
      "title": "Resolve your intelligence — DEFXN",
      "description": "Run agreed intelligence beside relevant mesh data and return a claim with evidence that participating partners can check.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/data": {
      "title": "Resolve your data — DEFXN",
      "description": "Write signed, addressed records, replicate them through peers, and query the mesh instead of maintaining a database server.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/algorithms": {
      "title": "Resolve your algorithms — DEFXN",
      "description": "Publish deterministic algorithms as named resolvers so anyone can run the logic and check the resulting claim.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/information": {
      "title": "Resolve your information — DEFXN",
      "description": "Give information a stable address and preserve its source trail so the current claim remains findable and inspectable.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/rules": {
      "title": "Resolve your rules and patterns — DEFXN",
      "description": "Express rules as deterministic resolver logic, agree on a named version, and apply it consistently with retained evidence.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/network": {
      "title": "Resolve your network — DEFXN",
      "description": "Create or join a named network, participate from a local node, and discover peers as the network grows.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/encryptions": {
      "title": "Resolve your encryptions — DEFXN",
      "description": "Choose who may read, encrypt before information enters the mesh, and keep decryption under the required partner keys.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/automation": {
      "title": "Resolve your automation — DEFXN",
      "description": "Define a permitted action, bind it to an agreement, and run it when verifiable evidence satisfies the rule.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/productivity": {
      "title": "Resolve your productivity — DEFXN",
      "description": "Build repeatable work around shared records and resolvers while keeping the resulting work under partner control.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/logistics": {
      "title": "Resolve your logistics — DEFXN",
      "description": "Name items and expected movements, sign each custody handoff, and resolve responsibility from a shared trail.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "purpose": {
      "title": "Network isolation today — DEFXN",
      "description": "Named networks currently isolate miner-presence discovery, not accounts, identities, or treasuries. Explore the supported commands and limits.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "depth": {
      "title": "Verifiable agreements — DEFXN",
      "description": "Trace a signed agreement from intent to receipt across each party's own chain. Inspect the record links and the limits of current production evidence.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "practice": {
      "title": "Authority for a transition — DEFXN",
      "description": "See how a policy derives a bounded authority cell for one object and transition, with threshold evidence and explicit production limitations.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "notes": {
      "title": "Approval and activation — DEFXN",
      "description": "Understand why approval is not activation. Explore the readiness and safety gates for applying a change, and the current evidence limitations.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "studio": {
      "title": "Verify a named network — DEFXN",
      "description": "Check a network ID against command behavior, source revision, participants, observation time, and the current miner-presence isolation boundary.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "spec": {
      "title": "Benchmark evidence and limits — DEFXN",
      "description": "Six benchmark records are verified at stated boundaries; the rest remain partial, historical or superseded. A result counts only with its workload, environment, method and raw evidence.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "download": {
      "title": "Run from source — DEFXN",
      "description": "Start a local miner from an owner-approved source checkout. Follow prerequisites and verification steps; public binaries remain unverified.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "bundledeployer": {
      "title": "FXN Bundle Deployer — DEFXN",
      "description": "Site deployment requires the FXN Bundle Deployer running locally. The CLI is in development. Review what becomes public and how mesh ownership controls maintainer access.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "deploy": {
      "title": "Create or join a network — DEFXN",
      "description": "Use the current network CLI to choose a miner-presence namespace. Follow the source-backed procedure and understand what it does not isolate.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "dao": {
      "title": "How DEFXN is governed — DEFXN",
      "description": "Compare shared-substrate governance with network DAO governance. Explore separate rosters, thresholds, activation rules, and evidence limits.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "proximity": {
      "title": "Interactive model — DEFXN",
      "description": "An illustrative model of threshold agreement, authority, lifecycle and network boundaries. Hands-on controls; not live network data or a benchmark.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "learnings": {
      "title": "Protocol notes — DEFXN",
      "description": "Read technical notes on agreement execution, named networks, and authority. Pair historical explanations with current source and evidence boundaries.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "explorer": {
      "title": "Mesh Explorer — DEFXN",
      "description": "Inspect live, bounded records and health from a local Flux Miner. Connection and operator access are explicit; no fixture data is shown as live evidence.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "palette": {
      "title": "Interface palette — DEFXN",
      "description": "Inspect the shared DEFXN color, typography, spacing, control, and component treatments used to keep every public route visually consistent.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolvers": {
      "title": "Resolvers and capabilities — DEFXN",
      "description": "Every first-party resolver chain and the capabilities resolvers are built from, read from a dated snapshot of the code: chain ids, compositions, grammar state, links into Explore.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "A DEFXN resolver is a rulebook with its own chain, launched by one signed record and built from shared capabilities. This page lists the first-party resolver chains and capability manifests from a dated snapshot of the code, with the commit and date it was read at; the live view is explore.defxn.com.",
      "aiBlocked": false
    },
    "account": {
      "title": "Your account — DEFXN",
      "description": "Verify an Auth Kit locally and inspect its identity facts. Live FXN holdings, Credits, and mesh standing are not linked until their read contracts are verified.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "account/domains": {
      "title": "Your domains — DEFXN",
      "description": "Review the local domain names connected to your DEFXN identity and the exact ownership records required before a name can resolve on the mesh.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "treasury": {
      "title": "Treasury design preview — DEFXN",
      "description": "Explore a clearly labeled mock treasury view for FXN, the Tier 1 native token, and identity-bound, non-transferable Credits. No balances are live.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "deposits": {
      "title": "Deposit design preview — DEFXN",
      "description": "Try a reversible, local-only FXN deposit preview. It does not connect to a wallet, move funds, or create a network record.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "stats": {
      "title": "Mesh performance — DEFXN",
      "description": "How fast the protocol is, why, and how we found out: a real transfer taken apart block by block, where server time goes, and every wrong turn on the way.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "stats/gpu": {
      "title": "GPU benchmark detail — DEFXN",
      "description": "Why a rented RTX PRO 6000 box was fast: its CPU. The protocol never addresses the GPU; it is signatures and hashing, measured and corrected.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "stats/ledger": {
      "title": "Ledger benchmark detail — DEFXN",
      "description": "The finance ledger, measured: each identity appends to its own chain of value moves, and one position holds one record. Real signed samples.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "how/ask": {
      "title": "State the request — DEFXN",
      "description": "Chapter one of how DEFXN works: state the request as a signed intent, and see the record it produces and what that record does not prove.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "how/work": {
      "title": "Agree on the terms — DEFXN",
      "description": "Chapter two of how DEFXN works: a provider offers terms, both sides accept them, and the agreement links both records by content address.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "how/check": {
      "title": "Verify the result — DEFXN",
      "description": "Chapter three of how DEFXN works: check the fulfillment against the agreement and close the trail with a policy-bound receipt.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "reference": {
      "title": "",
      "description": "",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "lifecycle": {
      "title": "Agreement lifecycle — DEFXN",
      "description": "Follow an illustrative request through intent, offer, agreement, fulfillment, and receipt. Inspect what each signed record establishes—and what it does not.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "lifecycle/intent": {
      "title": "Intent: state the need — DEFXN",
      "description": "Start the agreement lifecycle with a signed request for an exact outcome. Inspect its references and why an intent is not a provider commitment.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "lifecycle/offer": {
      "title": "Offer: propose the terms — DEFXN",
      "description": "See how a provider's signed offer answers an intent by CID. Inspect proposed terms and why an offer is not an agreement or proof of capacity.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "lifecycle/agreement": {
      "title": "Agreement: accept shared terms — DEFXN",
      "description": "Link the accepted intent and offer into inspectable shared terms. Understand why agreement alone does not prove fulfillment or settlement.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "lifecycle/fulfillment": {
      "title": "Fulfillment: submit the result — DEFXN",
      "description": "Connect submitted work and result evidence to its agreement. Understand why a signed fulfillment record still needs checking and acceptance.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "lifecycle/receipt": {
      "title": "Receipt: close the evidence trail — DEFXN",
      "description": "Trace a policy-bound verification outcome back to fulfillment and intent. A receipt is not universal truth, settlement, or production-readiness evidence.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    }
  },
  "articles": {
    "why-the-chain-was-retired": {
      "title": "",
      "description": "How DEFXN went from one block chain, through the agreement fabric, to one grammar chain per identity, and which measurements back the current design.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "one-substrate-many-networks": {
      "title": "",
      "description": "Learn what named networks isolate today, how the shared substrate differs from a network, and which named examples still need live evidence.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "governance-without-a-validator-set": {
      "title": "",
      "description": "Explore ephemeral authority cells and the distinction between shared mesh-operations governance and an individual network DAO's roster.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "how-we-got-fast-and-what-we-got-wrong": {
      "title": "",
      "description": "The full trail from under 7 transfers a second to about 25,000 across ten machines, including every wrong turn, and what the final number does and does not prove.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "the-grammar-does-almost-no-work": {
      "title": "",
      "description": "What a DEFXN transfer looks like on the wire, why a parser that only knows the dash can still reject bad input, and why the speed comes from somewhere else.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "a-resolver-by-construction": {
      "title": "",
      "description": "See how a finance resolver makes double-spend unrepresentable using one registered letter, a chain per identity, six resolver steps, and a measured 51,065 ops/s result.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "the-chain-prototype-is-the-chosen-path": {
      "title": "",
      "description": "Review the sustained six-node benchmark from the retired chain direction, what that run measured, and the limits on what it establishes.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    }
  }
});
