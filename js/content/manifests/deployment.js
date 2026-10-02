/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "deployment",
  "title": "How Flux works",
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
      "value": "4. Accept the offer, execute the resolver, and submit fulfillment evidence through the signed agreement path."
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
      "value": "DEFXN runs work through addressed logic and signed agreements. Register a named network, choose a resolver, agree on terms, submit work evidence, and verify the receipt under the applicable rules."
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
      "value": "Signed evidence joins the agreement trail."
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
      "value": "A job, from ask to answer."
    },
    "SIMPLE.INTRO": {
      "label": "Intro",
      "kind": "text",
      "section": "Simple story",
      "value": "Think of asking someone to help with a job. There are three parts."
    },
    "SIMPLE.ASK.TITLE": {
      "label": "Ask Title",
      "kind": "line",
      "section": "Simple story",
      "value": "Ask for help."
    },
    "SIMPLE.ASK.TEXT": {
      "label": "Ask Text",
      "kind": "text",
      "section": "Simple story",
      "value": "Say what you need and what a good result should look like."
    },
    "SIMPLE.WORK.TITLE": {
      "label": "Work Title",
      "kind": "line",
      "section": "Simple story",
      "value": "Agree. Then do it."
    },
    "SIMPLE.WORK.TEXT": {
      "label": "Work Text",
      "kind": "text",
      "section": "Simple story",
      "value": "Someone offers to help. You both agree on the terms, then they do the work."
    },
    "SIMPLE.CHECK.TITLE": {
      "label": "Check Title",
      "kind": "line",
      "section": "Simple story",
      "value": "Check the result."
    },
    "SIMPLE.CHECK.TEXT": {
      "label": "Check Text",
      "kind": "text",
      "section": "Simple story",
      "value": "They share what they made. It is checked against the agreed rules, and that decision is recorded."
    },
    "SIMPLE.BOUNDARY": {
      "label": "Boundary",
      "kind": "text",
      "section": "Simple story",
      "value": "Naming a network does not make it private or secure. A fully automatic public service is not yet verified."
    }
  }
});
