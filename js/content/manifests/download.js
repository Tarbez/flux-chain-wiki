/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "download",
  "title": "Download",
  "route": "/download",
  "group": "page",
  "meta": {
    "next": "deploy"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "GET FLUX PROTOCOL"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Run it from source. Today."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "No one-click installer yet. Build and run the CLI or Desktop from source — both are real, working software today."
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "CLI: flux-miner"
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "git clone ark-miner-cli, then npm install && npm start. A headless daemon: relay, presence, network directory, agreement-fabric provider."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Desktop: Flux Miner Desktop"
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "git clone ark-miner-desktop, then npm install && npm run dev. Same daemon as the CLI, behind an operator UI — not a lighter build."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Signed releases are a real mechanism, not yet a public one"
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "flux-release:v1 is real: pinned Ed25519 publisher, SHA-256, mesh-quorum discovery. Public hosting isn't live — build from source until it is."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "What you should expect."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "This is operator software, not an app-store install. You are expected to run a daemon, inspect logs, and choose the network you intend to join."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "What is intentionally absent."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "No public binary channel is promised on this page. Until release hosting is live, source builds are the honest path and the release mechanism is described as infrastructure in progress."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "DEPLOY A NETWORK"
    }
  }
});
