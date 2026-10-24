/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "download",
  "title": "Get DEFXN Grid",
  "route": "/download",
  "group": "page",
  "meta": {
    "next": "deploy"
  },
  "fields": {
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "DEFXN Grid has no public download yet."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "DEFXN Grid opens DEFXN sites and holds your FXN ID. Its build targets macOS only, and no download address is published. You can create your FXN ID on this site now. The five steps on this page are for people who run a miner: start one from an owner-approved checkout."
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
      "value": "In ark-miner-cli, install, copy .env.example to .env, review it, then start. The DEFXN miner is the flux-miner command."
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
      "value": "A clean local start proves your miner starts. It does not mean any resolver is served, and says nothing about the public network or production."
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
    },
    "GUIDE.HREF": {
      "label": "Operator documentation target",
      "kind": "link",
      "section": "Links",
      "value": "doc:docs/operators/run-from-source.md"
    },
    "ASIDE.HREF": {
      "label": "Bundle Deployer aside link",
      "kind": "link",
      "section": "Links",
      "value": "route:bundledeployer"
    },
    "APPS.TITLE": {
      "label": "Apps: heading",
      "kind": "line",
      "section": "Apps",
      "value": "Get the apps"
    },
    "APP.CLI.NAME": {
      "label": "flux-miner (command line): name",
      "kind": "line",
      "section": "Apps",
      "value": "flux-miner (command line)"
    },
    "APP.CLI.PLATFORMS": {
      "label": "flux-miner (command line): systems",
      "kind": "line",
      "section": "Apps",
      "value": "Terminal"
    },
    "APP.CLI.TEXT": {
      "label": "flux-miner (command line): what it is",
      "kind": "text",
      "section": "Apps",
      "value": "A miner without a window. It runs your machine’s share of the network from a terminal. Not public yet: run it from source below."
    },
    "APP.CLI.URL": {
      "label": "flux-miner (command line): download address (https://..., empty until published)",
      "kind": "line",
      "section": "Apps",
      "value": ""
    },
    "APP.DESKTOP.NAME": {
      "label": "Flux Miner Desktop: name",
      "kind": "line",
      "section": "Apps",
      "value": "Flux Miner Desktop"
    },
    "APP.DESKTOP.PLATFORMS": {
      "label": "Flux Miner Desktop: systems",
      "kind": "line",
      "section": "Apps",
      "value": "Desktop"
    },
    "APP.DESKTOP.TEXT": {
      "label": "Flux Miner Desktop: what it is",
      "kind": "text",
      "section": "Apps",
      "value": "The same miner with a desktop window. Not public yet."
    },
    "APP.DESKTOP.URL": {
      "label": "Flux Miner Desktop: download address (https://..., empty until published)",
      "kind": "line",
      "section": "Apps",
      "value": ""
    },
    "APP.BROWSER.NAME": {
      "label": "DEFXN Grid: name",
      "kind": "line",
      "section": "Apps",
      "value": "DEFXN Grid"
    },
    "APP.BROWSER.PLATFORMS": {
      "label": "DEFXN Grid: systems",
      "kind": "line",
      "section": "Apps",
      "value": "macOS"
    },
    "APP.BROWSER.TEXT": {
      "label": "DEFXN Grid: what it is",
      "kind": "text",
      "section": "Apps",
      "value": "Opens DEFXN sites and holds your FXN ID. Windows and Linux builds are not made yet."
    },
    "APP.BROWSER.URL": {
      "label": "DEFXN Grid: download address (https://..., empty until published)",
      "kind": "line",
      "section": "Apps",
      "value": ""
    },
    "APP.MOBILE.NAME": {
      "label": "DEFXN Grid for phones: name",
      "kind": "line",
      "section": "Apps",
      "value": "DEFXN Grid for phones"
    },
    "APP.MOBILE.PLATFORMS": {
      "label": "DEFXN Grid for phones: systems",
      "kind": "line",
      "section": "Apps",
      "value": "iOS · Android"
    },
    "APP.MOBILE.TEXT": {
      "label": "DEFXN Grid for phones: what it is",
      "kind": "text",
      "section": "Apps",
      "value": "Opens DEFXN sites and runs a node on your phone. Built and run on one iPhone and one Android phone. It is in no store yet."
    },
    "APP.MOBILE.URL": {
      "label": "DEFXN Grid for phones: download address (https://..., empty until published)",
      "kind": "line",
      "section": "Apps",
      "value": ""
    }
  }
});
