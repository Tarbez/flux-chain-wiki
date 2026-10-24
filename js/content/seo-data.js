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
      "description": "No reference resolver is published yet. This page says what a reference needs and points to the resolver chains you can inspect today.",
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
      "description": "DEFXN is the kernel of the grid. FXN is its first chain and that chain’s coin. It runs on a development network today, and nothing is live.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions": {
      "title": "Resolutions for the mesh — DEFXN",
      "description": "Twenty ideas for what a DEFXN resolver can do, from publishing a site to settling a payment. Each page separates what works on devnet, what is being built and what is only an idea.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/website": {
      "title": "Resolve your website — DEFXN",
      "description": "Publish a site as a signed bundle. The Bundle Deployer that does this is not released, so this is a plan.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/content": {
      "title": "Resolve your content — DEFXN",
      "description": "Idea, not built. Sign what you publish so readers can see who published it and what changed.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/files": {
      "title": "Resolve your files — DEFXN",
      "description": "Idea, not built. Encrypt files to keys you hold and share them as addressed pieces. No file product is released.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/deployments": {
      "title": "Resolve your deployments — DEFXN",
      "description": "Sign an exact release so anyone can check what is running. The Bundle Deployer is not released yet.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/payments": {
      "title": "Resolve your payments — DEFXN",
      "description": "Idea, not built. Settle a transfer in FXN and keep a signed receipt on each side.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/finance": {
      "title": "Resolve your personal finance — DEFXN",
      "description": "Idea, not built. Keep your own books as signed records you can inspect.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/community": {
      "title": "Resolve your community — DEFXN",
      "description": "Idea, not built. Give members their own signed identity and history, with membership rules anyone can read.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/communications": {
      "title": "Resolve your communications — DEFXN",
      "description": "Idea, not built. Send messages encrypted to the recipient’s keys, with no platform holding them.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/collaborations": {
      "title": "Resolve your collaborations — DEFXN",
      "description": "Idea, not built. Record each contribution as a signed change and agree the shared state without a central owner.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/governance": {
      "title": "Resolve your governance — DEFXN",
      "description": "Set an approval threshold, collect signatures and record when a change applies. The DAO runs as a resolver chain on the development network.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/intelligence": {
      "title": "Resolve your intelligence — DEFXN",
      "description": "Idea, not built. Run agreed logic next to the data and return a result with the records it used.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/data": {
      "title": "Resolve your data — DEFXN",
      "description": "Write signed records and read them back from the network instead of running a database server.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/algorithms": {
      "title": "Resolve your algorithms — DEFXN",
      "description": "Publish deterministic logic as a resolver so anyone can run it and check the result.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/information": {
      "title": "Resolve your information — DEFXN",
      "description": "Idea, not built. Give information a stable address and a signed source trail.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/rules": {
      "title": "Resolve your rules and patterns — DEFXN",
      "description": "Write a rule as resolver logic so every party applies it the same way.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/network": {
      "title": "Resolve your network — DEFXN",
      "description": "Create or join a named network. Today the name groups miners for discovery and isolates nothing else.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/encryptions": {
      "title": "Resolve your encryptions — DEFXN",
      "description": "Idea, not built. Encrypt before information leaves your machine, with keys you hold.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/automation": {
      "title": "Resolve your automation — DEFXN",
      "description": "Idea, not built. Run a permitted action when signed evidence satisfies a rule.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/productivity": {
      "title": "Resolve your productivity — DEFXN",
      "description": "Idea, not built. Build tools around shared signed records instead of per-seat subscriptions.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "resolutions/logistics": {
      "title": "Resolve your logistics — DEFXN",
      "description": "Idea, not built. Sign each handoff of an item to keep a shared custody trail.",
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
      "description": "Six benchmark records are verified at stated boundaries. The rest remain partial, historical or superseded. A result counts only with its workload, environment, method and raw evidence.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "download": {
      "title": "Run from source — DEFXN",
      "description": "Start a local miner from an owner-approved source checkout. Follow prerequisites and verification steps. Public binaries remain unverified.",
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
      "description": "Inspect live, bounded records and health from a local Flux Miner. Connection and operator access are explicit. No fixture data is shown as live evidence.",
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
      "description": "Why a rented RTX PRO 6000 box was fast: its CPU. The protocol never addresses the GPU. It is signatures and hashing, measured and corrected.",
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
    },
    "chain/record": {
      "title": "Your chain: revisions — DEFXN",
      "description": "Step through the sample records on a chain and see each one’s revision. The records are samples, not live data.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "chain/open": {
      "title": "Your chain: one record — DEFXN",
      "description": "Open one sample record: its content, details, signature and history. The record is a sample, not live data.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "chain/links": {
      "title": "Your chain: connections — DEFXN",
      "description": "See what a sample record links to, what links to it and who signed it. The records are samples, not live data.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "identity": {
      "title": "Your FXN ID — DEFXN",
      "description": "An FXN ID is one key file, .auth.fxn, that identifies you on every network. The file stays on your device and is never uploaded.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "identity/sign": {
      "title": "Signing in — DEFXN",
      "description": "How a site asks your FXN ID to sign, in three steps. Your key never leaves your device. The site only receives a signature.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "identity/safe": {
      "title": "Keeping your FXN ID safe — DEFXN",
      "description": "What keeps your FXN ID key safe today, with the state of each protection.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "identity/you": {
      "title": "Your identity — DEFXN",
      "description": "A sample identity: the chain a key file starts and what it holds. Nothing on the page is live.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "measured": {
      "title": "Measured — DEFXN",
      "description": "The capabilities and resolvers DEFXN lists, with the checked cases for each and the dated benchmark runs. Absent measurements show as not measured, never as zero.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "fxn": {
      "title": "FXN supply — DEFXN",
      "description": "The owner’s decisions on FXN’s starting supply, release rules and fee split. Most of these rules are not in code yet, and nothing is live.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "ring": {
      "title": "A chain of the network — DEFXN",
      "description": "The kinds of chain in DEFXN: identity, resolver, token ledger, pool and network chains, on the DEFXN kernel. The picture shows kinds, not live chains.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "works": {
      "title": "How it works, in one minute — DEFXN",
      "description": "Five ideas: every identity has a chain, a resolver signs its results, other computers keep copies and anyone can check.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "works/resolve": {
      "title": "How a result is made — DEFXN",
      "description": "An illustrated swap: two parties sign, a resolver checks and signs the result, copies are stored and anyone can check. It shows no live state.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "works/layers": {
      "title": "Three layers — DEFXN",
      "description": "The DEFXN kernel, the capabilities and the resolvers, with the one rule each layer keeps. It shows no live state.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "works/life": {
      "title": "Life of a resolver — DEFXN",
      "description": "Build, launch, choose who can change it, serve and inspect: a resolver’s path from grammar to a served chain. It shows no live state.",
      "ogImage": "",
      "canonical": "",
      "schemaType": "",
      "noindex": false,
      "aiSummary": "",
      "aiBlocked": false
    },
    "trace": {
      "title": "Trace a record — DEFXN",
      "description": "Follow a sample chain from its newest record back to genesis and check each signature on the way. The chain is a sample.",
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
