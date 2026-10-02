/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "resolver",
  "title": "What is a resolver?",
  "route": "/what-is-a-resolver",
  "group": "page",
  "meta": {
    "next": "references",
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
    "NEXT": {
      "label": "Onward link",
      "kind": "line",
      "section": "Links",
      "value": "Inspect reference evidence"
    },
    "BACK": {
      "label": "Back link",
      "kind": "line",
      "section": "Links",
      "value": "Back home"
    }
  }
});
