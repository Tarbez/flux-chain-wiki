/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "download",
  "title": "Get FXN Browser",
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
      "value": "Get FXN Browser"
    },
    "LEDE": {
      "label": "Lede under the title",
      "kind": "line",
      "section": "Page",
      "value": "The FXN Browser opens DEFXN sites and keeps your FXN ID on your own machine. It has no public download yet."
    },
    "BACK": {
      "label": "Link above the title, back to the products",
      "kind": "line",
      "section": "Page",
      "value": "Back to products"
    },
    "NEXT.LINE": {
      "label": "Next card, one line under its name",
      "kind": "line",
      "section": "Page",
      "value": "Do this once your miner runs."
    },
    "APPS.NOTE": {
      "label": "Line under Get the apps",
      "kind": "line",
      "section": "Page",
      "value": "Each app gets its download here when it is published."
    },
    "ASIDE.LINE": {
      "label": "Related link: Bundle Deployer, one line",
      "kind": "line",
      "section": "Page",
      "value": "Put a DEFXN site on the network."
    },
    "GUIDE.LINE": {
      "label": "Related link: operator guide, one line",
      "kind": "line",
      "section": "Page",
      "value": "Every step in full, with the defaults."
    },
    "MOMENT1.TITLE": {
      "label": "What it does, 1: name",
      "kind": "line",
      "section": "Page",
      "value": "Opens DEFXN sites"
    },
    "MOMENT1.LINE": {
      "label": "What it does, 1: one line",
      "kind": "line",
      "section": "Page",
      "value": "Type a defxn:// address and the site opens in the browser."
    },
    "MOMENT2.TITLE": {
      "label": "What it does, 2: name",
      "kind": "line",
      "section": "Page",
      "value": "Holds your FXN ID"
    },
    "MOMENT2.LINE": {
      "label": "What it does, 2: one line",
      "kind": "line",
      "section": "Page",
      "value": "Sites ask the browser to sign. Your key stays on your machine."
    },
    "MOMENT3.TITLE": {
      "label": "What it does, 3: name",
      "kind": "line",
      "section": "Page",
      "value": "Reaches the network"
    },
    "MOMENT3.LINE": {
      "label": "What it does, 3: one line",
      "kind": "line",
      "section": "Page",
      "value": "It connects to the DEFXN devnet. Nothing on it is live money yet."
    },
    "MOMENTS.LABEL": {
      "label": "What it does: the list name",
      "kind": "line",
      "section": "Page",
      "value": "What the FXN Browser does"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "The first build is for macOS. Until it is published, you can do two things today. Create your FXN ID on this site, or run a miner from source with the five steps in the terminal."
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
      "value": "Install Node.js 22 or newer with npm. The miner also needs a folder it can write to and a free status port."
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
      "value": "The daemon should stay running and answer on its status listener. Note the source revision and package version. Keep a copy of the configuration you started with."
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
      "value": "Read the operator guide"
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
      "label": "FXN Browser: name",
      "kind": "line",
      "section": "Apps",
      "value": "FXN Browser"
    },
    "APP.BROWSER.PLATFORMS": {
      "label": "FXN Browser: systems",
      "kind": "line",
      "section": "Apps",
      "value": "macOS"
    },
    "APP.BROWSER.TEXT": {
      "label": "FXN Browser: what it is",
      "kind": "text",
      "section": "Apps",
      "value": "Opens DEFXN sites and holds your FXN ID. Windows and Linux builds are not made yet."
    },
    "APP.BROWSER.URL": {
      "label": "FXN Browser: download address (https://..., empty until published)",
      "kind": "line",
      "section": "Apps",
      "value": ""
    },
    "APP.MOBILE.NAME": {
      "label": "FXN Browser for phones: name",
      "kind": "line",
      "section": "Apps",
      "value": "FXN Browser for phones"
    },
    "APP.MOBILE.PLATFORMS": {
      "label": "FXN Browser for phones: systems",
      "kind": "line",
      "section": "Apps",
      "value": "iOS · Android"
    },
    "APP.MOBILE.TEXT": {
      "label": "FXN Browser for phones: what it is",
      "kind": "text",
      "section": "Apps",
      "value": "Opens DEFXN sites and runs a node on your phone. Built and run on one iPhone and one Android phone. It is in no store yet."
    },
    "APP.MOBILE.URL": {
      "label": "FXN Browser for phones: download address (https://..., empty until published)",
      "kind": "line",
      "section": "Apps",
      "value": ""
    }
  }
});
