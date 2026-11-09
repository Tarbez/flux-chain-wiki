/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "worldidentity",
  "title": "Your identity",
  "route": "/identity",
  "group": "page",
  "meta": {},
  "fields": {
    "COMMON.PARTIAL": {
      "label": "State: partial",
      "kind": "line",
      "section": "Shared",
      "value": "Partial"
    },
    "SIGN.TAG.REQUEST": {
      "label": "Label: the site asks",
      "kind": "line",
      "section": "Sign in",
      "value": "The site asks"
    },
    "SIGN.TAG.REQUESTSUB": {
      "label": "Label: the site asks, second line",
      "kind": "line",
      "section": "Sign in",
      "value": "Share or Don’t share"
    },
    "SIGN.TAG.KEY": {
      "label": "Label: you review",
      "kind": "line",
      "section": "Sign in",
      "value": "You review"
    },
    "SIGN.TAG.KEYSUB": {
      "label": "Label: you review, second line",
      "kind": "line",
      "section": "Sign in",
      "value": "The exact site and the exact bytes"
    },
    "SIGN.TAG.SERVER": {
      "label": "Label: the server",
      "kind": "line",
      "section": "Sign in",
      "value": "The server"
    },
    "SIGN.TAG.SERVERSUB": {
      "label": "Label: the server, second line",
      "kind": "line",
      "section": "Sign in",
      "value": "Checks the signature. Never holds the key."
    },
    "SAFE.R2.CHECKED": {
      "label": "Safeguard 3, cases checked",
      "kind": "line",
      "section": "Keep it safe",
      "value": "Checked against {n} cases."
    },
    "YOU.CELL.RECORDS": {
      "label": "Cell: records",
      "kind": "line",
      "section": "You",
      "value": "Records"
    },
    "YOU.CELL.SIGNED": {
      "label": "Cell: signed",
      "kind": "line",
      "section": "You",
      "value": "Signed"
    },
    "YOU.TAG.BADGE": {
      "label": "Label: the name, second line",
      "kind": "line",
      "section": "You",
      "value": "Sample"
    },
    "START.TAG.KEY": {
      "label": "Label: the key file",
      "kind": "line",
      "section": "The page (/identity)",
      "value": ".auth.fxn"
    },
    "START.TAG.KEYSUB": {
      "label": "Label: the key file, second line",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Your one key file"
    },
    "START.TAG.APPS": {
      "label": "Label: apps",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Apps"
    },
    "START.TAG.APPSSUB": {
      "label": "Label: apps, second line",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Sign in on your device"
    },
    "START.TAG.CHAINS": {
      "label": "Label: your chain",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Your chain"
    },
    "START.TAG.CHAINSSUB": {
      "label": "Label: your chain, second line",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "One list for each identity"
    },
    "START.TAG.RESOLVERS": {
      "label": "Label: resolvers",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Resolvers"
    },
    "START.TAG.RESOLVERSSUB": {
      "label": "Label: resolvers, second line",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Read your signed records"
    },
    "START.TAG.PRODUCTS": {
      "label": "Label: products",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Products"
    },
    "START.TAG.PRODUCTSSUB": {
      "label": "Label: products, second line",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Not public yet"
    },
    "KICKER": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Your identity"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "FXN ID."
    },
    "ANSWER": {
      "label": "The answer, one line",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "A key file made on your device. It signs your sign-ins and your records."
    },
    "NOTE": {
      "label": "Note under the 3D",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Illustration. The FXN ID gate is live on the old devnet."
    },
    "TABS": {
      "label": "Name of the section tabs",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Your identity, in three parts"
    },
    "TAB.SIGN": {
      "label": "Tab: sign in",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Sign in"
    },
    "TAB.SAFE": {
      "label": "Tab: keep it safe",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Keep it safe"
    },
    "TAB.YOU": {
      "label": "Tab: you",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "You"
    },
    "CTA": {
      "label": "The one action",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "See your chain"
    },
    "SIGN.S1": {
      "label": "Step 1",
      "kind": "line",
      "section": "Sign in",
      "value": "1. A site asks"
    },
    "SIGN.S1.TEXT": {
      "label": "Step 1, what happens",
      "kind": "line",
      "section": "Sign in",
      "value": "You choose Share or Don’t share. A yes lasts for that tab only."
    },
    "SIGN.S2": {
      "label": "Step 2",
      "kind": "line",
      "section": "Sign in",
      "value": "2. You sign"
    },
    "SIGN.S2.TEXT": {
      "label": "Step 2, what happens",
      "kind": "line",
      "section": "Sign in",
      "value": "You see the exact site and bytes, then sign on your device."
    },
    "SIGN.S3": {
      "label": "Step 3",
      "kind": "line",
      "section": "Sign in",
      "value": "3. The server checks"
    },
    "SIGN.S3.TEXT": {
      "label": "Step 3, what happens",
      "kind": "line",
      "section": "Sign in",
      "value": "It checks your signature. Your key never leaves your device."
    },
    "SAFE.R0": {
      "label": "Safeguard 1",
      "kind": "line",
      "section": "Keep it safe",
      "value": "Sealed file"
    },
    "SAFE.R0.TEXT": {
      "label": "Safeguard 1, what it does",
      "kind": "line",
      "section": "Keep it safe",
      "value": "It opens with your PIN, password, key word and icon, on your device. Nobody else needs them."
    },
    "SAFE.R1": {
      "label": "Safeguard 2",
      "kind": "line",
      "section": "Keep it safe",
      "value": "Gate"
    },
    "SAFE.R1.TEXT": {
      "label": "Safeguard 2, what it does",
      "kind": "line",
      "section": "Keep it safe",
      "value": "Servers that hold parts of your key. Any 2 of 3 release it on the devnet. 3 of 5 on mainnet. 3 wrong tries lock it for 24 hours."
    },
    "SAFE.R2": {
      "label": "Safeguard 3",
      "kind": "line",
      "section": "Keep it safe",
      "value": "New key"
    },
    "SAFE.R2.TEXT": {
      "label": "Safeguard 3, what it does",
      "kind": "line",
      "section": "Keep it safe",
      "value": "Move your identity to a new key if the old one is lost. Planned, not built."
    },
    "YOU.CELL.NAME": {
      "label": "Cell: name",
      "kind": "line",
      "section": "You",
      "value": "Name"
    },
    "YOU.SAMPLE": {
      "label": "Note: the sample",
      "kind": "line",
      "section": "You",
      "value": "A sample identity. Nothing here is live."
    },
    "COMMON.MISSING": {
      "label": "A value with no data",
      "kind": "line",
      "section": "Shared",
      "value": "—"
    },
    "STAT.DEVICES": {
      "label": "Number label: devices",
      "kind": "line",
      "section": "The page (/identity)",
      "value": "Devices"
    }
  }
});
