/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "resolver",
  "title": "What is a resolver?",
  "route": "/what-is-a-resolver",
  "group": "page",
  "meta": {
    "next": "deployment",
    "back": "zero"
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
      "value": "The logic that turns an input into a checkable claim."
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
      "value": "A resolver is named, deterministic logic: give it a defined input and anyone can run the same logic and get the same claim."
    },
    "BODY1": {
      "label": "First paragraph",
      "kind": "text",
      "section": "Page",
      "value": "A resolver is addressed, deterministic logic on Flux. It accepts a defined input and produces a defined claim, so participants can refer to the exact logic they are evaluating."
    },
    "BODY2": {
      "label": "Second paragraph",
      "kind": "text",
      "section": "Page",
      "value": "For example, a resolver can accept a document identifier and return whether that document satisfies a named policy. Its address identifies the logic; a checker and authority rule determine whether a result is accepted."
    },
    "BODY3": {
      "label": "Closing paragraph",
      "kind": "text",
      "section": "Page",
      "value": "Publishing makes a resolver addressable. It is deployed only when an admitted active provider reports fresh capacity. A signature identifies the signer; it does not make the claim true."
    },
    "FLOW.LABEL": {
      "label": "Flow label",
      "kind": "line",
      "section": "Flow",
      "value": "One deterministic path"
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
      "value": "Send a defined input."
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
      "value": "Run named, inspectable logic."
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
      "value": "Receive a signed claim."
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
      "value": "Everyone evaluates the same rule — not a hidden service that can quietly change underneath them."
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
      "value": "A signature tells you who signed. The checker and authority rules decide whether to trust the claim."
    },
    "SOURCE": {
      "label": "Source link",
      "kind": "line",
      "section": "Links",
      "value": "Read the resolver spec"
    },
    "NEXT": {
      "label": "Onward link",
      "kind": "line",
      "section": "Links",
      "value": "Follow the resolver flow"
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
      "value": "A resolver only accepts input in its defined shape. This one takes a document identifier and checks it against a named size policy."
    },
    "RESOLVE.BODY": {
      "label": "Resolve step text",
      "kind": "text",
      "section": "Flow",
      "value": "The address names one exact rule. Run it on the same input as often as you like: the claim does not change."
    },
    "CHECK.BODY": {
      "label": "Check step text",
      "kind": "text",
      "section": "Flow",
      "value": "The provider signs the claim. The signature shows who produced it and that it was not altered; a checker and the authority rules decide whether it is accepted."
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
      "value": "Four rules every resolver follows, as the specification states them."
    },
    "LAW1": {
      "label": "Law 1",
      "kind": "line",
      "section": "Laws",
      "value": "Same address, same input, same claim."
    },
    "LAW1.TEXT": {
      "label": "Law 1 detail",
      "kind": "text",
      "section": "Laws",
      "value": "A resolver is addressed, deterministic logic: it accepts defined input and produces a claim."
    },
    "LAW2": {
      "label": "Law 2",
      "kind": "line",
      "section": "Laws",
      "value": "The address names the exact logic."
    },
    "LAW2.TEXT": {
      "label": "Law 2 detail",
      "kind": "text",
      "section": "Laws",
      "value": "Its address lets participants refer to the exact logic under evaluation."
    },
    "LAW3": {
      "label": "Law 3",
      "kind": "line",
      "section": "Laws",
      "value": "Published is not deployed."
    },
    "LAW3.TEXT": {
      "label": "Law 3 detail",
      "kind": "text",
      "section": "Laws",
      "value": "Publishing makes a resolver addressable. It is deployed only when an admitted active provider reports fresh capacity for it."
    },
    "LAW4": {
      "label": "Law 4",
      "kind": "line",
      "section": "Laws",
      "value": "A signature is not a verdict."
    },
    "LAW4.TEXT": {
      "label": "Law 4 detail",
      "kind": "text",
      "section": "Laws",
      "value": "A signature identifies the signer and protects the output from unnoticed alteration. Acceptance comes from the checker, authority cell, agreement and governance rules."
    }
  }
});
