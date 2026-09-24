/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "about",
  "title": "About",
  "route": "/about",
  "group": "page",
  "meta": {
    "next": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "ABOUT FLUX PROTOCOL"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "What Flux Protocol actually is."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "A network directory, agreement mechanics, and its own governance — any party registers its own network with its own DAO on top. DAO Chain is one network on Flux Protocol, not Flux Protocol itself."
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Any network, one substrate."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "network create registers a new, independently addressable network — like deploying a contract on an EVM chain. Isolation is real but shallow today: presence is partitioned per network, accounts and DAOs aren't yet. Not a security boundary."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Agreements, not a block order."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "No global transaction stream. Signed manifests close through INTENT → OFFER → AGREEMENT → FULFILLMENT → RECEIPT, finalized only by the peers who care about that one agreement."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Authority appears, then dissolves."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "No standing validator set. A small authority cell is derived for the exact change being made, certifies it, then dissolves. Mesh-operations governance — seven independent operators — is separate again from any network's DAO."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "EXPLORE THE FLUX SPEC"
    }
  }
});
