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
      "value": "A resolver is named logic with nowhere to hide: give it a defined input and anyone can inspect how it reached the result."
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
      "value": "Receive a claim with a trail."
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
    }
  }
});
