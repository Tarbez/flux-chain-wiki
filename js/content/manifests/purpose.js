/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "purpose",
  "title": "Theory: Purpose",
  "route": "/concept/purpose",
  "group": "theory",
  "meta": {
    "placement": "row",
    "next": "learnings",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / 02"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Any network, one substrate."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Any party registers its own network with its own DAO — like deploying a contract on an EVM chain, no permission from the base layer."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "SEE HOW NETWORKS ARE CREATED"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "A network is a real, working primitive."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "network create returns a networkId. Point an app or miner at an existing one to join instead of creating a new one. DAO Chain and CR3TV are already registered."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Real, but not yet a full security boundary."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Today it partitions presence only. Accounts, identities, and DAOs aren't network-scoped yet — stated plainly, not hidden."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "One network is not the substrate."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "DAO Chain, De Ark OS's own network, is one tenant here — never a parent of Flux Protocol, never the source of its rules."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "READ THE NOTES"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
