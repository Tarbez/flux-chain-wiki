/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "download",
  "title": "Run Flux from source",
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
      "value": "OPERATE FLUX / SOURCE PATH"
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
      "value": "The source packages define a runnable miner and network CLI. Public repository URLs and packaged downloads are not yet verified here, so obtain an owner-approved checkout before running these commands."
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
      "value": "Use Node.js 22 or newer. Confirm npm is available and the configured storage directory and status port are writable and free."
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
      "value": "From ark-miner-cli, run npm install, copy .env.example to .env, review the configuration, then run npm start. The package exposes flux-miner; ark-miner is a legacy alias."
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
      "value": "Confirm the daemon remains running and its status endpoint responds on the configured listener. The documented default is 127.0.0.1:8766. Record the source revision, package version, configuration, and observation time."
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
      "value": "A successful local start proves local startup. It does not prove public-network membership, deployed resolver capacity, independent-host readiness, or production activation."
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
      "value": "Once the miner and flux-network CLI are installed, create or select a network ID and start the miner against it. Named networks partition presence only today."
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
