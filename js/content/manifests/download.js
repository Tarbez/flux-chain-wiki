/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "download",
  "title": "Run DEFXN from source",
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
      "value": "RUN DEFXN / FROM SOURCE"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Start a local miner from a trusted checkout."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "The source packages define a runnable miner and network CLI. Public repository URLs and packaged downloads are not yet verified here, so start from an owner-approved checkout."
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "1. Check the runtime."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Use Node.js 22 or newer with npm. The storage directory must be writable and the status port free."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "2. Install the trusted checkout."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "In ark-miner-cli, install, copy .env.example to .env, review it, then start. The package exposes flux-miner; ark-miner is a legacy alias."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "3. Verify the process."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "The daemon should stay running and answer on its status listener. Write down the source revision, package version, configuration and when you looked."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "4. Know what success proves."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "A clean local start proves your miner starts. It says nothing yet about the public network, resolver capacity or production."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "5. Continue with a named network."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "With the miner and flux-network CLI installed, pick or create a network ID and start the miner against it."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "CREATE OR JOIN A NETWORK"
    },
    "GUIDE": {
      "label": "Operator documentation link",
      "kind": "line",
      "section": "Links",
      "value": "OPEN THE FULL OPERATOR GUIDE"
    }
  }
});
