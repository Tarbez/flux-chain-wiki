/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "deployment",
  "title": "Deploy a resolver",
  "route": "/how-deployment-works",
  "group": "page",
  "meta": {
    "next": "download",
    "back": "resolver",
    "primary": true,
    "diagrams": [
      {
        "id": "deploy-flow",
        "place": "how-deployment-works: above the three cards (desktop), replacing the card meshes on phones",
        "caption": "Illustration · relationships, not live state",
        "stations": [
          "grammar",
          "capabilities",
          "control",
          "review and sign",
          "serve",
          "explorer"
        ],
        "fork": {
          "at": "control",
          "branches": [
            "immutable",
            "one control key"
          ]
        },
        "badges": {
          "serve": "proof"
        },
        "refusals": [
          {
            "at": "grammar",
            "when": "before signing",
            "name": "grammar does not compile"
          },
          {
            "at": "capabilities",
            "when": "at the node",
            "name": "CapabilityNotLaunched"
          }
        ],
        "note": "refusals are drawn as short side exits carrying their exact refusal names: a refusal names the problem, it never fails silently"
      }
    ]
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "DEFXN / DEPLOY A RESOLVER"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Deploy a resolver"
    },
    "BODY1": {
      "label": "First paragraph",
      "kind": "text",
      "section": "Page",
      "value": "Say exactly what your records look like: their kinds, their fields, and which fields every record carries. Derive it from real sample records, not by hand. The deployer compiles it with the network’s own compiler before you sign."
    },
    "BODY2": {
      "label": "Second paragraph",
      "kind": "text",
      "section": "Page",
      "value": "List the shared mechanisms your resolver uses: signatures, custody, a ledger, escrow. The network refuses a launch that names one it has not launched."
    },
    "BODY3": {
      "label": "Third paragraph",
      "kind": "text",
      "section": "Page",
      "value": "Immutable: nobody, ever, including you. Or one control key: only that key can sign an upgrade, and every upgrade is a new record that sits beside the old one."
    },
    "BODY4": {
      "label": "Fourth paragraph",
      "kind": "text",
      "section": "Page",
      "value": "The deployer shows the exact unsigned record. You sign only after you have read it. The network answers with the record’s ID, or a refusal that says what is missing."
    },
    "BODY5": {
      "label": "Fifth paragraph",
      "kind": "text",
      "section": "Page",
      "value": "A provider announces an address for your chain. If your resolver uses capabilities, the provider first proves it runs them by passing their test vectors."
    },
    "BODY6": {
      "label": "Step 6 text",
      "kind": "text",
      "section": "Steps",
      "value": "Every record your resolver admits appears in the explorer, oldest first, re-checked in your browser. The signature on a record is the result. Whether to rely on that resolver is decided before anyone sends it anything: its grammar, its capabilities, who can change it. Steps 1 to 3 set all three."
    },
    "STEP1": {
      "label": "Step 1 title",
      "kind": "line",
      "section": "Steps",
      "value": "Write the grammar"
    },
    "STEP2": {
      "label": "Step 2 title",
      "kind": "line",
      "section": "Steps",
      "value": "Name your capabilities"
    },
    "STEP3": {
      "label": "Step 3 title",
      "kind": "line",
      "section": "Steps",
      "value": "Choose who can change it"
    },
    "STEP4": {
      "label": "Step 4 title",
      "kind": "line",
      "section": "Steps",
      "value": "Review and sign"
    },
    "STEP5": {
      "label": "Step 5 title",
      "kind": "line",
      "section": "Steps",
      "value": "Serve it"
    },
    "STEP6": {
      "label": "Step 6 title",
      "kind": "line",
      "section": "Steps",
      "value": "Watch it"
    },
    "NEXT": {
      "label": "Main button",
      "kind": "line",
      "section": "Links",
      "value": "Get DEFXN Grid"
    },
    "BACK": {
      "label": "Back link",
      "kind": "line",
      "section": "Links",
      "value": "What is a resolver?"
    },
    "SUMMARY": {
      "label": "Primary answer",
      "kind": "text",
      "section": "Story",
      "value": "You deploy a resolver by signing one launch record. It gives your resolver its own chain, names the capabilities it uses, and publishes the grammar every record must follow. Then a provider serves it."
    },
    "BOUNDARY": {
      "label": "Essential boundary",
      "kind": "text",
      "section": "Story",
      "value": "Launched is not served: a resolver with no announcing provider answers nothing. The explorer and deployer run on the development network today. Public hosting is not established."
    },
    "FABRIC.NETWORK": {
      "label": "Network fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "A name for miner presence. Not a resolver chain."
    },
    "FABRIC.LOGIC": {
      "label": "Logic fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "A resolver, launched on a chain of its own."
    },
    "FABRIC.INTENT": {
      "label": "Intent fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "A request waits for an offer and accepted terms (earlier agreement path)."
    },
    "FABRIC.FULFILLMENT": {
      "label": "Fulfillment fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "Signed evidence lands on the provider’s chain, citing the agreement (earlier agreement path)."
    },
    "FABRIC.RECEIPT": {
      "label": "Receipt fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "An outcome is recorded under identified rules (earlier agreement path)."
    },
    "SIMPLE.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Simple story",
      "value": "Deploy a resolver"
    },
    "SIMPLE.INTRO": {
      "label": "Intro",
      "kind": "text",
      "section": "Simple story",
      "value": "You deploy a resolver in three stages: write its grammar, sign one launch record, and have a provider serve it."
    },
    "SIMPLE.WRITE.TITLE": {
      "label": "Card 1 title",
      "kind": "line",
      "section": "Deploy cards",
      "value": "Write it"
    },
    "SIMPLE.WRITE.SIGNAL": {
      "label": "Card 1 signal",
      "kind": "line",
      "section": "Deploy cards",
      "value": "GRAMMAR · CAPABILITIES"
    },
    "SIMPLE.WRITE.TEXT": {
      "label": "Card 1 text",
      "kind": "text",
      "section": "Deploy cards",
      "value": "Your records’ grammar, and the shared capabilities you build on."
    },
    "SIMPLE.LAUNCH.TITLE": {
      "label": "Card 2 title",
      "kind": "line",
      "section": "Deploy cards",
      "value": "Launch it"
    },
    "SIMPLE.LAUNCH.SIGNAL": {
      "label": "Card 2 signal",
      "kind": "line",
      "section": "Deploy cards",
      "value": "CONTROL · SIGN"
    },
    "SIMPLE.LAUNCH.TEXT": {
      "label": "Card 2 text",
      "kind": "text",
      "section": "Deploy cards",
      "value": "Choose who can change it, then read and sign one record."
    },
    "SIMPLE.SERVE.TITLE": {
      "label": "Card 3 title",
      "kind": "line",
      "section": "Deploy cards",
      "value": "Serve it"
    },
    "SIMPLE.SERVE.SIGNAL": {
      "label": "Card 3 signal",
      "kind": "line",
      "section": "Deploy cards",
      "value": "PROVIDER · EXPLORER"
    },
    "SIMPLE.SERVE.TEXT": {
      "label": "Card 3 text",
      "kind": "text",
      "section": "Deploy cards",
      "value": "A provider proves and announces it. Every record it admits shows in the explorer."
    },
    "SIMPLE.CAUTION.TITLE": {
      "label": "Caution disclosure title",
      "kind": "line",
      "section": "Deploy cards",
      "value": "Before you sign"
    },
    "SIMPLE.CAUTION": {
      "label": "Caution disclosure text",
      "kind": "text",
      "section": "Deploy cards",
      "value": "A launch uses a position on your own key’s chain. Signing two different records at the same position freezes that key for good. Launch once per key, or use a fresh key."
    },
    "SIMPLE.PLANNED.TITLE": {
      "label": "Planned disclosure title",
      "kind": "line",
      "section": "Deploy cards",
      "value": "What’s next · Planned"
    },
    "SIMPLE.PLANNED": {
      "label": "Planned disclosure text",
      "kind": "text",
      "section": "Deploy cards",
      "value": "One deployer for sites, apps, databases, packages, modules and code repositories, each as records on its own resolver chain. Audits and bounties for capabilities. Service pools. None of these is built yet."
    },
    "SIMPLE.DEPLOYER.LINK": {
      "label": "Action: Deploy product",
      "kind": "line",
      "section": "Deploy cards",
      "value": "Open Deploy"
    },
    "SIMPLE.DEPLOYER.HREF": {
      "label": "Action target: Deploy product",
      "kind": "link",
      "section": "Deploy cards",
      "value": "url:https://deploy.defxn.com"
    },
    "SIMPLE.EXPLORE.LINK": {
      "label": "Action: Explore product",
      "kind": "line",
      "section": "Deploy cards",
      "value": "See launched resolvers in Explore"
    },
    "SIMPLE.EXPLORE.HREF": {
      "label": "Action target: Explore product",
      "kind": "link",
      "section": "Deploy cards",
      "value": "url:https://explore.defxn.com"
    },
    "SIMPLE.REGISTRY.LINK": {
      "label": "Action: resolvers and capabilities",
      "kind": "line",
      "section": "Deploy cards",
      "value": "Every resolver and capability"
    },
    "SIMPLE.REGISTRY.HREF": {
      "label": "Action target: resolvers and capabilities",
      "kind": "link",
      "section": "Deploy cards",
      "value": "route:resolvers"
    },
    "SIMPLE.AGREEMENT.TITLE": {
      "label": "Agreement chapters heading",
      "kind": "line",
      "section": "Deploy cards",
      "value": "Hire a provider: the earlier path"
    },
    "SIMPLE.AGREEMENT.TEXT": {
      "label": "Agreement chapters text",
      "kind": "text",
      "section": "Deploy cards",
      "value": "Request, terms, result: how a client hired a provider under the earlier agreement path. It is no longer the direction and is kept read-only for reference."
    },
    "SIMPLE.ASK.TITLE": {
      "label": "Ask Title",
      "kind": "line",
      "section": "Simple story",
      "value": "State the request"
    },
    "SIMPLE.ASK.TEXT": {
      "label": "Ask Text",
      "kind": "text",
      "section": "Simple story",
      "value": "Name the work, the result you expect, and the limits that matter."
    },
    "SIMPLE.ASK.ACTION": {
      "label": "Ask action",
      "kind": "line",
      "section": "Simple story",
      "value": "Explore the request"
    },
    "SIMPLE.ASK.HREF": {
      "label": "Ask card target",
      "kind": "link",
      "section": "Simple story",
      "value": "route:how/ask"
    },
    "SIMPLE.WORK.TITLE": {
      "label": "Work Title",
      "kind": "line",
      "section": "Simple story",
      "value": "Agree on the terms"
    },
    "SIMPLE.WORK.TEXT": {
      "label": "Work Text",
      "kind": "text",
      "section": "Simple story",
      "value": "A provider proposes terms. Work begins after both sides accept the same promise."
    },
    "SIMPLE.WORK.ACTION": {
      "label": "Work action",
      "kind": "line",
      "section": "Simple story",
      "value": "Explore the agreement"
    },
    "SIMPLE.WORK.HREF": {
      "label": "Work card target",
      "kind": "link",
      "section": "Simple story",
      "value": "route:how/work"
    },
    "SIMPLE.CHECK.TITLE": {
      "label": "Check Title",
      "kind": "line",
      "section": "Simple story",
      "value": "Verify the result"
    },
    "SIMPLE.CHECK.TEXT": {
      "label": "Check Text",
      "kind": "text",
      "section": "Simple story",
      "value": "Return the work with evidence, check it against the agreement, and record the outcome."
    },
    "SIMPLE.CHECK.ACTION": {
      "label": "Check action",
      "kind": "line",
      "section": "Simple story",
      "value": "Explore verification"
    },
    "SIMPLE.CHECK.HREF": {
      "label": "Check card target",
      "kind": "link",
      "section": "Simple story",
      "value": "route:how/check"
    },
    "SIMPLE.BOUNDARY": {
      "label": "Boundary",
      "kind": "text",
      "section": "Simple story",
      "value": "Launched is not served: a resolver with no announcing provider answers nothing. Explore and Deploy run on the development network today. Public hosting is not established."
    },
    "SIMPLE.CONTEXT": {
      "label": "Context disclosure",
      "kind": "line",
      "section": "Simple story",
      "value": "Context / the earlier agreement path"
    },
    "SIMPLE.PATH": {
      "label": "Lifecycle context",
      "kind": "text",
      "section": "Simple story",
      "value": "The full path records intent, offer, agreement, fulfillment, and receipt."
    },
    "SIMPLE.HOME.HREF": {
      "label": "Breadcrumb home link",
      "kind": "link",
      "section": "Simple story",
      "value": "route:zero"
    },
    "SIMPLE.NEXT.HREF": {
      "label": "Footer onward link (trace the lifecycle)",
      "kind": "link",
      "section": "Simple story",
      "value": "route:lifecycle"
    },
    "CHAPTER.BANNER": {
      "label": "Chapter banner: earlier direction",
      "kind": "text",
      "section": "Chapters",
      "value": "Written for the earlier agreement path, which is no longer the direction. For resolvers today, read What is a resolver."
    },
    "CHAPTER.BANNER.HREF": {
      "label": "Chapter banner link target",
      "kind": "link",
      "section": "Chapters",
      "value": "route:resolver"
    },
    "CHAPTER.SERIES": {
      "label": "Chapters' series name (the eyebrow says \"<name> · n of 3\")",
      "kind": "line",
      "section": "Chapters",
      "value": "Hire a provider"
    },
    "CHAPTER.ASK.TITLE": {
      "label": "Ask Title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Tell a provider what you need."
    },
    "CHAPTER.ASK.INTRO": {
      "label": "Ask Intro",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Every job on DEFXN starts as a signed request, called an intent: the fixed point every later record refers back to."
    },
    "CHAPTER.ASK.JOB": {
      "label": "Ask Job",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Make a copy of these files."
    },
    "CHAPTER.ASK.CHOICE1": {
      "label": "Ask step 1 title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Name the exact thing"
    },
    "CHAPTER.ASK.CHOICE2": {
      "label": "Ask step 2 title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Say what done looks like"
    },
    "CHAPTER.ASK.CHOICE3": {
      "label": "Ask step 3 title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Set the limits and sign"
    },
    "CHAPTER.ASK.DETAIL1": {
      "label": "Ask step 1 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Point at the files by their content ID: a fingerprint computed from the bytes themselves. Change one byte and the ID changes, so nobody can quietly swap in a different version."
    },
    "CHAPTER.ASK.DETAIL2": {
      "label": "Ask step 2 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Describe a result someone else can check. For a copy, that can be as simple as \"the copy has the same content ID\". If done cannot be checked, it cannot be verified later."
    },
    "CHAPTER.ASK.DETAIL3": {
      "label": "Ask step 3 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Attach the rules that apply and sign the request with your key. The signed intent gets its own content ID, and every later step cites it."
    },
    "CHAPTER.WORK.TITLE": {
      "label": "Work Title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Make the same promise."
    },
    "CHAPTER.WORK.INTRO": {
      "label": "Work Intro",
      "kind": "text",
      "section": "How it works chapters",
      "value": "A provider answers with an offer. When you both sign the same terms, it becomes an agreement: one record everyone can point to."
    },
    "CHAPTER.WORK.CHOICE1": {
      "label": "Work step 1 title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Your request stays fixed"
    },
    "CHAPTER.WORK.CHOICE2": {
      "label": "Work step 2 title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The provider proposes terms"
    },
    "CHAPTER.WORK.DETAIL1": {
      "label": "Work step 1 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The provider never edits your intent. Their offer cites its content ID, so the offer is always attached to exactly what you asked for."
    },
    "CHAPTER.WORK.DETAIL2": {
      "label": "Work step 2 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The offer says what they will do, on what terms, and what evidence they will hand back. It is signed, so it is attributable, but it is still only a proposal, not proof they have the capacity."
    },
    "CHAPTER.WORK.JOIN": {
      "label": "Work Join",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The same job. The same rules."
    },
    "CHAPTER.CHECK.TITLE": {
      "label": "Check Title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Look at what came back."
    },
    "CHAPTER.CHECK.INTRO": {
      "label": "Check Intro",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Finishing the job and checking it are separate steps. The provider returns a result with evidence. A named checker compares it with the agreement, and approvers chosen for this one decision sign off on the outcome."
    },
    "CHAPTER.CHECK.CHOICE1": {
      "label": "Check step 1 title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Start from the agreement"
    },
    "CHAPTER.CHECK.CHOICE2": {
      "label": "Check step 2 title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The provider submits a fulfillment"
    },
    "CHAPTER.CHECK.CHOICE3": {
      "label": "Check step 3 title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "A checker and authority decide"
    },
    "CHAPTER.CHECK.DETAIL1": {
      "label": "Check step 1 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The result is compared with the accepted terms, not with the provider's own description of what they did."
    },
    "CHAPTER.CHECK.DETAIL2": {
      "label": "Check step 2 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "This signed record cites the agreement, what went in and what came out. The signature proves who submitted it and that it is unaltered, not that it is correct."
    },
    "CHAPTER.CHECK.DETAIL3": {
      "label": "Check step 3 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "A checker evaluates the result, and approvers chosen by the active policy for this one decision sign off once a threshold is met. The outcome is recorded as a receipt citing the fulfillment."
    },
    "CHAPTER.ASK.RECORD.LABEL": {
      "label": "Ask record label",
      "kind": "line",
      "section": "How it works chapters",
      "value": "THE SIGNED INTENT / EXAMPLE"
    },
    "CHAPTER.ASK.RECORD": {
      "label": "Ask record rows (one \"name: meaning\" per line; \"[1] \" lights a row for choice 1)",
      "kind": "text",
      "section": "How it works chapters",
      "value": "[1] Snapshot: The exact files, by content ID\n[2] Outcome: What the finished copy must match\n[3] Policy: The rules and limits that apply\n[3] Signed by: You, the client\n[3] Produces: An intent ID that offers must cite"
    },
    "CHAPTER.ASK.NOW": {
      "label": "Ask true now",
      "kind": "text",
      "section": "How it works chapters",
      "value": "One signed, addressable request exists."
    },
    "CHAPTER.ASK.NOT": {
      "label": "Ask not yet true",
      "kind": "text",
      "section": "How it works chapters",
      "value": "No provider has committed and no work has happened."
    },
    "CHAPTER.WORK.RECORD.LABEL": {
      "label": "Work record label",
      "kind": "line",
      "section": "How it works chapters",
      "value": "THE AGREEMENT / AN EARLIER-PATH TRANSFER RECORD"
    },
    "CHAPTER.WORK.RECORD": {
      "label": "Work record rows (one \"name: meaning\" per line; \"[1] \" lights a row for choice 1)",
      "kind": "text",
      "section": "How it works chapters",
      "value": "kind: A signed agreement (flux.fabric-transfer.v1)\n[1] inputCid: What you asked to move\n[2] recipientId: Who receives it\n[2] asset, amount: The terms on offer\n[3] nextSequence: The input's next version\n[3] cid: SHA-256 of the signed record"
    },
    "CHAPTER.WORK.NOW": {
      "label": "Work true now",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Both sides hold one inspectable set of terms."
    },
    "CHAPTER.WORK.NOT": {
      "label": "Work not yet true",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Accepted terms do not prove the work happened."
    },
    "CHAPTER.CHECK.RECORD.LABEL": {
      "label": "Check record label",
      "kind": "line",
      "section": "How it works chapters",
      "value": "THE FULFILLMENT / AN EARLIER-PATH TRANSFER RECORD"
    },
    "CHAPTER.CHECK.RECORD": {
      "label": "Check record rows (one \"name: meaning\" per line; \"[1] \" lights a row for choice 1)",
      "kind": "text",
      "section": "How it works chapters",
      "value": "kind: A signed fulfillment (flux.fabric-transfer.v1)\n[1] agreementCid: The terms it is checked against\n[2] inputCid, outputCid: What went in and what came out\n[2] signatureB64: The provider's Ed25519 signature\n[3] cid: What the receipt points back to"
    },
    "CHAPTER.CHECK.NOW": {
      "label": "Check true now",
      "kind": "text",
      "section": "How it works chapters",
      "value": "One rule-bound outcome, traceable back to the request."
    },
    "CHAPTER.CHECK.NOT": {
      "label": "Check not yet true",
      "kind": "text",
      "section": "How it works chapters",
      "value": "A receipt is not universal truth, a legal settlement, or a payment."
    },
    "CHAPTER.CHECK.RESULT": {
      "label": "Check heading",
      "kind": "line",
      "section": "How it works chapters",
      "value": "A result, with its evidence."
    },
    "CHAPTER.ASK.WHY1.TITLE": {
      "label": "Ask why 1 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Addresses, not locations"
    },
    "CHAPTER.ASK.WHY1.TEXT": {
      "label": "Ask why 1 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "DEFXN refers to data by what it is, not where it is stored. A server link can change or disappear. A content ID always means the same bytes."
    },
    "CHAPTER.ASK.WHY2.TITLE": {
      "label": "Ask why 2 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Nobody is committed yet"
    },
    "CHAPTER.ASK.WHY2.TEXT": {
      "label": "Ask why 2 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "An intent is an open request. No provider has promised anything and no work has happened. That changes only when you accept an offer."
    },
    "CHAPTER.ASK.WHY3.TITLE": {
      "label": "Ask why 3 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Your request travels with the work"
    },
    "CHAPTER.ASK.WHY3.TEXT": {
      "label": "Ask why 3 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The offer, the agreement, the result and the receipt all cite this intent, so anyone can follow the trail back to what you actually asked for."
    },
    "CHAPTER.WORK.CHOICE3": {
      "label": "Work step 3 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Both sides sign one agreement"
    },
    "CHAPTER.WORK.DETAIL3": {
      "label": "Work step 3 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Accepting turns the matching request and offer into an agreement record. Its ID is a hash of the exact signed terms, so changing any term later makes it a different agreement."
    },
    "CHAPTER.WORK.WHY1.TITLE": {
      "label": "Work why 1 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Every chain runs in its own lane"
    },
    "CHAPTER.WORK.WHY1.TEXT": {
      "label": "Work why 1 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "There is no single global queue. Each party writes to its own chain, so unrelated work never waits behind yours, unlike one shared queue that every record has to wait in."
    },
    "CHAPTER.WORK.WHY2.TITLE": {
      "label": "Work why 2 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Terms that cannot drift"
    },
    "CHAPTER.WORK.WHY2.TEXT": {
      "label": "Work why 2 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Because records are addressed by their content, \"the agreement\" always means these exact signed bytes. Both sides, and any checker, start from the same document."
    },
    "CHAPTER.WORK.WHY3.TITLE": {
      "label": "Work why 3 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Agreed is not done"
    },
    "CHAPTER.WORK.WHY3.TEXT": {
      "label": "Work why 3 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "An agreement fixes what the result will be checked against. It does not prove the work happened or that anyone has been paid. That is the next step."
    },
    "CHAPTER.CHECK.WHY1.TITLE": {
      "label": "Check why 1 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Trust is decided before"
    },
    "CHAPTER.CHECK.WHY1.TEXT": {
      "label": "Check why 1 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "A signature proves who submitted a result, not that the result is right. The result is judged against the agreement both sides signed before the work began."
    },
    "CHAPTER.CHECK.WHY2.TITLE": {
      "label": "Check why 2 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Authority for one decision only"
    },
    "CHAPTER.CHECK.WHY2.TEXT": {
      "label": "Check why 2 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The approvers are selected for this one object and step. They can certify only that step, publish the evidence, and then their mandate ends."
    },
    "CHAPTER.CHECK.WHY3.TITLE": {
      "label": "Check why 3 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Signed, then stored"
    },
    "CHAPTER.CHECK.WHY3.TEXT": {
      "label": "Check why 3 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The resolver signs the result. That signature is the result. Copies go to other peers, which store it without redoing the work. Anyone can check it later by walking the signatures."
    }
  }
});
