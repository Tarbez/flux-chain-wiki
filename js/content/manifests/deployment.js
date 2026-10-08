/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "deployment",
  "title": "How DEFXN works",
  "route": "/how-deployment-works",
  "group": "page",
  "meta": {
    "next": "download",
    "back": "resolver",
    "primary": true
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "DEFXN / HOW IT WORKS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "From a network ID to a verifiable receipt."
    },
    "BODY1": {
      "label": "First paragraph",
      "kind": "text",
      "section": "Page",
      "value": "1. Register or select a named network ID. Today this creates a miner-presence namespace, not a complete security boundary."
    },
    "BODY2": {
      "label": "Second paragraph",
      "kind": "text",
      "section": "Page",
      "value": "2. Publish or select the addressed resolver logic that defines the input and claim. Publication alone does not establish active execution capacity."
    },
    "BODY3": {
      "label": "Third paragraph",
      "kind": "text",
      "section": "Page",
      "value": "3. Open an intent describing the work and constraints. A provider can answer with an offer, but no agreement exists until terms are accepted."
    },
    "BODY4": {
      "label": "Fourth paragraph",
      "kind": "text",
      "section": "Page",
      "value": "4. Accept the offer, execute the resolver, and submit fulfillment evidence as signed records on your own chain; the agreements resolver links them."
    },
    "BODY5": {
      "label": "Fifth paragraph",
      "kind": "text",
      "section": "Page",
      "value": "5. Verify the receipt under the identified checker and authority rules. A receipt records that decision; it is not universal truth or proof of production readiness."
    },
    "NEXT": {
      "label": "Main button",
      "kind": "line",
      "section": "Links",
      "value": "Run DEFXN from source"
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
      "value": "DEFXN runs work as signed records on each party’s own chain, read by addressed resolvers. Register a named network, choose a resolver, agree on terms, submit work evidence, and verify the receipt under the applicable rules."
    },
    "BOUNDARY": {
      "label": "Essential boundary",
      "kind": "text",
      "section": "Story",
      "value": "Named-network isolation currently covers miner presence only. Publication does not establish active execution capacity; public production activation remains unverified."
    },
    "FABRIC.NETWORK": {
      "label": "Network fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "A name for miner presence."
    },
    "FABRIC.LOGIC": {
      "label": "Logic fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "Inputs and claims meet at an addressed resolver."
    },
    "FABRIC.INTENT": {
      "label": "Intent fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "A request waits for an offer and accepted terms."
    },
    "FABRIC.FULFILLMENT": {
      "label": "Fulfillment fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "Signed evidence lands on the provider’s chain, citing the agreement."
    },
    "FABRIC.RECEIPT": {
      "label": "Receipt fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "An outcome is recorded under identified rules."
    },
    "SIMPLE.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Simple story",
      "value": "One request. One agreement. One verifiable result."
    },
    "SIMPLE.INTRO": {
      "label": "Intro",
      "kind": "text",
      "section": "Simple story",
      "value": "DEFXN keeps the request, accepted terms, returned work, and verification connected."
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
    "SIMPLE.BOUNDARY": {
      "label": "Boundary",
      "kind": "text",
      "section": "Simple story",
      "value": "Named networks currently scope miner presence only. Public production activation remains unverified."
    },
    "SIMPLE.CONTEXT": {
      "label": "Context disclosure",
      "kind": "line",
      "section": "Simple story",
      "value": "Context / see the complete agreement path"
    },
    "SIMPLE.PATH": {
      "label": "Lifecycle context",
      "kind": "text",
      "section": "Simple story",
      "value": "The full path records intent, offer, agreement, fulfillment, and receipt."
    },
    "CHAPTER.ASK.TITLE": {
      "label": "Ask Title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Tell them what you need."
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
      "value": "Finishing the job and checking it are separate steps: the provider returns a result with evidence, then a named checker decides if it meets the agreement."
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
      "value": "THE AGREEMENT / A REAL FXN TRANSFER RECORD"
    },
    "CHAPTER.WORK.RECORD": {
      "label": "Work record rows (one \"name: meaning\" per line; \"[1] \" lights a row for choice 1)",
      "kind": "text",
      "section": "How it works chapters",
      "value": "kind: agreement, flux.fabric-transfer.v1\n[1] inputCid: What you asked to move\n[2] recipientId: Who receives it\n[2] asset, amount: The terms on offer\n[3] nextSequence: The input's next version\n[3] cid: SHA-256 of the signed record"
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
      "value": "THE FULFILLMENT / A REAL FXN TRANSFER RECORD"
    },
    "CHAPTER.CHECK.RECORD": {
      "label": "Check record rows (one \"name: meaning\" per line; \"[1] \" lights a row for choice 1)",
      "kind": "text",
      "section": "How it works chapters",
      "value": "kind: fulfillment, flux.fabric-transfer.v1\n[1] agreementCid: The terms it is checked against\n[2] inputCid, outputCid: What went in and what came out\n[2] signatureB64: The provider's Ed25519 signature\n[3] cid: What the receipt points back to"
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
      "value": "A receipt is not universal truth, legal finality, or settlement."
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
      "value": "DEFXN refers to data by what it is, not where it is stored. A server link can change or disappear; a content ID always means the same bytes."
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
      "value": "There is no single global queue. Each party writes to its own chain, so unrelated work never waits behind yours, unlike a blockchain where every transaction shares one block order."
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
      "value": "An agreement fixes what the result will be checked against. It does not prove the work happened or that anyone has been paid; that is the next step."
    },
    "CHAPTER.CHECK.WHY1.TITLE": {
      "label": "Check why 1 title",
      "kind": "line",
      "section": "How it works chapters",
      "value": "Signed does not mean true"
    },
    "CHAPTER.CHECK.WHY1.TEXT": {
      "label": "Check why 1 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "A signature answers \"who said this?\". Whether to accept it is answered by the checker and the authority rules. DEFXN keeps those two questions apart."
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
      "value": "Accepted, then durable"
    },
    "CHAPTER.CHECK.WHY3.TEXT": {
      "label": "Check why 3 text",
      "kind": "text",
      "section": "How it works chapters",
      "value": "A result is accepted once the quorum signs it, and durable after three attestations and a commit certificate. Locally that full path closed about 375 times a second."
    }
  }
});
