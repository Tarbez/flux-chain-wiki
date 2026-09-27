/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "deployment",
  "title": "How deployment works",
  "route": "/how-deployment-works",
  "group": "page",
  "meta": {
    "next": "deploy",
    "back": "references",
    "primary": true
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / DEPLOYMENT"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "How deployment works"
    },
    "BODY1": {
      "label": "First paragraph",
      "kind": "text",
      "section": "Page",
      "value": "Like smart contracts on EVM. Like programs on Solana.\nExcept the unit is a resolver, and it lives on the mesh."
    },
    "BODY2": {
      "label": "Second paragraph",
      "kind": "text",
      "section": "Page",
      "value": "You write a manifest. You submit it. The mesh resolves it, registers\nit, and holds the space. From that moment, your network exists —\nwith its own DAO, its own rules, its own agreements."
    },
    "NEXT": {
      "label": "Main button",
      "kind": "line",
      "section": "Links",
      "value": "Deploy a Resolver"
    },
    "BACK": {
      "label": "Back link",
      "kind": "line",
      "section": "Links",
      "value": "Start from something real"
    }
  }
});
