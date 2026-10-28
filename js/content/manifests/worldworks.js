/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "worldworks",
  "title": "How it works pages",
  "route": "/how-it-works",
  "group": "page",
  "meta": {},
  "fields": {
    "HERE": {
      "label": "Chapters: breadcrumb for this page",
      "kind": "line",
      "section": "Shared",
      "value": "How it works"
    },
    "CHAPTER.LABEL": {
      "label": "Chapters: label",
      "kind": "line",
      "section": "Chapters",
      "value": "How it works"
    },
    "CHAPTER.MINUTE": {
      "label": "Chapters: one-minute view",
      "kind": "line",
      "section": "Chapters",
      "value": "One minute"
    },
    "CHAPTER.RESOLVE": {
      "label": "Chapters: result view",
      "kind": "line",
      "section": "Chapters",
      "value": "A result"
    },
    "CHAPTER.LAYERS": {
      "label": "Chapters: three-layers view",
      "kind": "line",
      "section": "Chapters",
      "value": "Three layers"
    },
    "CHAPTER.LIFE": {
      "label": "Chapters: life-of-a-resolver view",
      "kind": "line",
      "section": "Chapters",
      "value": "A resolver's life"
    },
    "STEP": {
      "label": "Chapters: \"Step n of 5\" line",
      "kind": "line",
      "section": "Shared",
      "value": "Step {n} of 5."
    },
    "MINUTE.KICKER": {
      "label": "One minute: small heading above",
      "kind": "line",
      "section": "In one minute",
      "value": "How it works · in one minute"
    },
    "MINUTE.TITLE": {
      "label": "One minute: heading",
      "kind": "line",
      "section": "In one minute",
      "value": "A resolver signs its results."
    },
    "MINUTE.TITLE2": {
      "label": "One minute: second heading line",
      "kind": "line",
      "section": "In one minute",
      "value": "Anyone can check it."
    },
    "MINUTE.NOTE": {
      "label": "One minute: note",
      "kind": "line",
      "section": "In one minute",
      "value": "The network as it is drawn on home. Each idea lights what it names."
    },
    "MINUTE.LEDE.FIRST": {
      "label": "One minute: intro, first line",
      "kind": "line",
      "section": "In one minute",
      "value": "Anyone who has the signer’s public key can check a signed result."
    },
    "MINUTE.LEDE.LAST": {
      "label": "One minute: intro, last line",
      "kind": "line",
      "section": "In one minute",
      "value": "FXN is the first chain, and its coin is FXN."
    },
    "MINUTE.CTA.NEXT": {
      "label": "One minute: button, next",
      "kind": "line",
      "section": "In one minute",
      "value": "Next idea"
    },
    "MINUTE.CTA.RESOLVE": {
      "label": "One minute: button, result view",
      "kind": "line",
      "section": "In one minute",
      "value": "See how a result is made"
    },
    "MINUTE.CTA.RESOLVE.HREF": {
      "label": "One minute: button, result view, link target",
      "kind": "link",
      "section": "In one minute",
      "value": "route:works/resolve"
    },
    "MINUTE.BACK": {
      "label": "One minute: back link",
      "kind": "line",
      "section": "In one minute",
      "value": "Back an idea"
    },
    "MINUTE.STEP1.LEAD": {
      "label": "One minute: step 1, first sentence",
      "kind": "line",
      "section": "In one minute",
      "value": "Every identity has its own chain."
    },
    "MINUTE.STEP1.REST": {
      "label": "One minute: step 1, rest of the explanation",
      "kind": "line",
      "section": "In one minute",
      "value": "A person, a team or an app keeps its own history of signed records."
    },
    "MINUTE.TAG1.NAME": {
      "label": "One minute: label 1, name",
      "kind": "line",
      "section": "In one minute",
      "value": "Identity chains"
    },
    "MINUTE.TAG1.SUB": {
      "label": "One minute: label 1, line under the heading",
      "kind": "line",
      "section": "In one minute",
      "value": "One for each identity"
    },
    "MINUTE.STEP2.LEAD": {
      "label": "One minute: step 2, first sentence",
      "kind": "line",
      "section": "In one minute",
      "value": "Every token keeps its own ledger."
    },
    "MINUTE.STEP2.REST": {
      "label": "One minute: step 2, rest of the explanation",
      "kind": "line",
      "section": "In one minute",
      "value": "Each token has its own history of who held how much."
    },
    "MINUTE.TAG2.NAME": {
      "label": "One minute: label 2, name",
      "kind": "line",
      "section": "In one minute",
      "value": "Token ledgers"
    },
    "MINUTE.TAG2.SUB": {
      "label": "One minute: label 2, line under the heading",
      "kind": "line",
      "section": "In one minute",
      "value": "One for each token"
    },
    "MINUTE.STEP3.LEAD": {
      "label": "One minute: step 3, first sentence",
      "kind": "line",
      "section": "In one minute",
      "value": "Resolvers do the work and sign the result."
    },
    "MINUTE.STEP3.REST": {
      "label": "One minute: step 3, rest of the explanation",
      "kind": "text",
      "section": "In one minute",
      "value": "A resolver is a rulebook. It reads signed records, applies its rules, and signs what follows from them. That signature is the result."
    },
    "MINUTE.TAG3.NAME": {
      "label": "One minute: label 3, name",
      "kind": "line",
      "section": "In one minute",
      "value": "Resolver chains"
    },
    "MINUTE.TAG3.SUB": {
      "label": "One minute: label 3, line under the heading",
      "kind": "line",
      "section": "In one minute",
      "value": "Each signs its results"
    },
    "MINUTE.STEP4.LEAD": {
      "label": "One minute: step 4, first sentence",
      "kind": "line",
      "section": "In one minute",
      "value": "Other computers can keep a copy."
    },
    "MINUTE.STEP4.REST": {
      "label": "One minute: step 4, rest of the explanation",
      "kind": "line",
      "section": "In one minute",
      "value": "They store the signed result as it is. They do not redo the work."
    },
    "MINUTE.TAG4.NAME": {
      "label": "One minute: label 4, name",
      "kind": "line",
      "section": "In one minute",
      "value": "Computers"
    },
    "MINUTE.TAG4.SUB": {
      "label": "One minute: label 4, line under the heading",
      "kind": "line",
      "section": "In one minute",
      "value": "Each keeps a copy"
    },
    "MINUTE.STEP5.LEAD": {
      "label": "One minute: step 5, first sentence",
      "kind": "line",
      "section": "In one minute",
      "value": "Anyone can check."
    },
    "MINUTE.STEP5.REST": {
      "label": "One minute: step 5, rest of the explanation",
      "kind": "line",
      "section": "In one minute",
      "value": "A person who wants proof follows the signatures back to the start."
    },
    "MINUTE.TAG5.NAME": {
      "label": "One minute: label 5, name",
      "kind": "line",
      "section": "In one minute",
      "value": "Follow the signatures back"
    },
    "MINUTE.TAG5.SUB": {
      "label": "One minute: label 5, line under the heading",
      "kind": "line",
      "section": "In one minute",
      "value": "To the start"
    },
    "RESOLVE.KICKER": {
      "label": "How a result is made: small heading above",
      "kind": "line",
      "section": "How a result is made",
      "value": "How a result is made"
    },
    "RESOLVE.NOTE": {
      "label": "How a result is made: note",
      "kind": "line",
      "section": "How a result is made",
      "value": "Illustration. It shows no live state."
    },
    "RESOLVE.SEGS": {
      "label": "How a result is made: steps group name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Steps"
    },
    "RESOLVE.SEG": {
      "label": "How a result is made: step label",
      "kind": "line",
      "section": "How a result is made",
      "value": "Step {n}"
    },
    "RESOLVE.ASIDE": {
      "label": "How a result is made: side note",
      "kind": "text",
      "section": "How a result is made",
      "value": "You choose whom to trust before you send. Each resolver shows its grammar, its capabilities and who can change it."
    },
    "RESOLVE.ASIDE.LINK": {
      "label": "How a result is made: side note, link text",
      "kind": "line",
      "section": "How a result is made",
      "value": "See the resolvers"
    },
    "RESOLVE.ASIDE.HREF": {
      "label": "How a result is made: side note, link target",
      "kind": "link",
      "section": "How a result is made",
      "value": "route:resolvers"
    },
    "RESOLVE.CTA.NEXT": {
      "label": "How a result is made: button, next",
      "kind": "line",
      "section": "How a result is made",
      "value": "Next step"
    },
    "RESOLVE.CTA.LAST": {
      "label": "How a result is made: button, last line",
      "kind": "line",
      "section": "How a result is made",
      "value": "Create your identity"
    },
    "RESOLVE.CTA.LAST.HREF": {
      "label": "How a result is made: button, last line, link target",
      "kind": "link",
      "section": "How a result is made",
      "value": "route:identity"
    },
    "RESOLVE.BACK": {
      "label": "How a result is made: back link",
      "kind": "line",
      "section": "How a result is made",
      "value": "Step back"
    },
    "RESOLVE.TAG.ALICE.NAME": {
      "label": "How a result is made: label drawn in the 3D scene, Alice, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Alice signs"
    },
    "RESOLVE.TAG.ALICE.SUB": {
      "label": "How a result is made: label drawn in the 3D scene, Alice, line under the heading",
      "kind": "line",
      "section": "How a result is made",
      "value": "\"I give 10 A for B\""
    },
    "RESOLVE.TAG.BOB.NAME": {
      "label": "How a result is made: label drawn in the 3D scene, Bob, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Bob signs"
    },
    "RESOLVE.TAG.BOB.SUB": {
      "label": "How a result is made: label drawn in the 3D scene, Bob, line under the heading",
      "kind": "line",
      "section": "How a result is made",
      "value": "\"I give B for 10 A\""
    },
    "RESOLVE.TAG.RESOLVER.NAME": {
      "label": "How a result is made: label drawn in the 3D scene, resolver chain, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Resolver"
    },
    "RESOLVE.TAG.RESOLVER.SUB": {
      "label": "How a result is made: label drawn in the 3D scene, resolver chain, line under the heading",
      "kind": "line",
      "section": "How a result is made",
      "value": "Checks every signature, one price for the batch"
    },
    "RESOLVE.TAG.RESULT.NAME": {
      "label": "How a result is made: label drawn in the 3D scene, result, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Signed result"
    },
    "RESOLVE.TAG.RESULT.SUB": {
      "label": "How a result is made: label drawn in the 3D scene, result, line under the heading",
      "kind": "line",
      "section": "How a result is made",
      "value": "This signature is the result"
    },
    "RESOLVE.TAG.COPIES.NAME": {
      "label": "How a result is made: label drawn in the 3D scene, copies, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Other computers"
    },
    "RESOLVE.TAG.COPIES.SUB": {
      "label": "How a result is made: label drawn in the 3D scene, copies, line under the heading",
      "kind": "line",
      "section": "How a result is made",
      "value": "Each keeps a copy"
    },
    "RESOLVE.TAG.C1.NAME": {
      "label": "How a result is made: label drawn in the 3D scene, check 1, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Check 1"
    },
    "RESOLVE.TAG.C1.SUB": {
      "label": "How a result is made: label drawn in the 3D scene, check 1, line under the heading",
      "kind": "line",
      "section": "How a result is made",
      "value": "The resolver's signature"
    },
    "RESOLVE.TAG.C2.NAME": {
      "label": "How a result is made: label drawn in the 3D scene, check 2, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Check 2"
    },
    "RESOLVE.TAG.C2.SUB": {
      "label": "How a result is made: label drawn in the 3D scene, check 2, line under the heading",
      "kind": "line",
      "section": "How a result is made",
      "value": "Alice's signature"
    },
    "RESOLVE.TAG.C3.NAME": {
      "label": "How a result is made: label drawn in the 3D scene, check 3, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Check 3"
    },
    "RESOLVE.TAG.C3.SUB": {
      "label": "How a result is made: label drawn in the 3D scene, check 3, line under the heading",
      "kind": "line",
      "section": "How a result is made",
      "value": "Bob's signature"
    },
    "RESOLVE.STEP1.NAME": {
      "label": "How a result is made: step 1, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Two sign"
    },
    "RESOLVE.STEP1.TEXT": {
      "label": "How a result is made: step 1, text",
      "kind": "text",
      "section": "How a result is made",
      "value": "Alice and Bob each sign what they want: a swap of one token for another. Each intent is a record, and its last field is the signature."
    },
    "RESOLVE.STEP2.NAME": {
      "label": "How a result is made: step 2, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "A resolver resolves"
    },
    "RESOLVE.STEP2.TEXT": {
      "label": "How a result is made: step 2, text",
      "kind": "text",
      "section": "How a result is made",
      "value": "It checks every signature in one batch and refuses replays. It clears every swap in the batch at one price, so your place in the batch does not change your price."
    },
    "RESOLVE.STEP3.NAME": {
      "label": "How a result is made: step 3, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "It signs the result"
    },
    "RESOLVE.STEP3.TEXT": {
      "label": "How a result is made: step 3, text",
      "kind": "line",
      "section": "How a result is made",
      "value": "That signature is the result. Nothing has to happen afterwards to make it count."
    },
    "RESOLVE.STEP4.NAME": {
      "label": "How a result is made: step 4, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Copies are stored"
    },
    "RESOLVE.STEP4.TEXT": {
      "label": "How a result is made: step 4, text",
      "kind": "text",
      "section": "How a result is made",
      "value": "Other computers keep the signed result as it is. They do not check it again or redo the work."
    },
    "RESOLVE.STEP5.NAME": {
      "label": "How a result is made: step 5, name",
      "kind": "line",
      "section": "How a result is made",
      "value": "Anyone checks"
    },
    "RESOLVE.STEP5.TEXT": {
      "label": "How a result is made: step 5, text",
      "kind": "line",
      "section": "How a result is made",
      "value": "Follow the signatures back to the start. For a swap that takes three signature checks."
    },
    "LAYERS.KICKER": {
      "label": "Three layers: small heading above",
      "kind": "line",
      "section": "Three layers",
      "value": "How it works · three layers"
    },
    "LAYERS.TITLE": {
      "label": "Three layers: heading",
      "kind": "line",
      "section": "Three layers",
      "value": "Three layers."
    },
    "LAYERS.TITLE2": {
      "label": "Three layers: second heading line",
      "kind": "line",
      "section": "Three layers",
      "value": "Each has one rule."
    },
    "LAYERS.NOTE": {
      "label": "Three layers: note",
      "kind": "line",
      "section": "Three layers",
      "value": "An illustration of the three layers. It shows no live state."
    },
    "LAYERS.LEDE": {
      "label": "Three layers: intro",
      "kind": "line",
      "section": "Three layers",
      "value": "Three layers, from the DEFXN kernel up. Each layer has one rule."
    },
    "LAYERS.RULE": {
      "label": "Three layers: rule",
      "kind": "line",
      "section": "Three layers",
      "value": "Its one rule: {rule}"
    },
    "LAYERS.ASIDE": {
      "label": "Three layers: side note",
      "kind": "text",
      "section": "Three layers",
      "value": "{caps} capabilities have a manifest today, and {resolvers} resolvers are listed."
    },
    "LAYERS.CTA": {
      "label": "Three layers: button",
      "kind": "line",
      "section": "Three layers",
      "value": "See the life of a resolver"
    },
    "LAYERS.CTA.HREF": {
      "label": "Three layers: button, link target",
      "kind": "link",
      "section": "Three layers",
      "value": "route:works/life"
    },
    "LAYERS.LINK": {
      "label": "Three layers: link text",
      "kind": "line",
      "section": "Three layers",
      "value": "See the capabilities"
    },
    "LAYERS.LINK.HREF": {
      "label": "Three layers: link text, link target",
      "kind": "link",
      "section": "Three layers",
      "value": "route:measured"
    },
    "LAYERS.L1.NAME": {
      "label": "Three layers: layer 1, name",
      "kind": "line",
      "section": "Three layers",
      "value": "Base chain kernel (DEFXN)"
    },
    "LAYERS.L1.HOLDS": {
      "label": "Three layers: layer 1, what it holds",
      "kind": "text",
      "section": "Three layers",
      "value": "Grammar checks, one chain per signer, copies to several computers, the list of providers, and the launch list of every chain, resolver and capability."
    },
    "LAYERS.L1.RULE": {
      "label": "Three layers: layer 1, rule",
      "kind": "line",
      "section": "Three layers",
      "value": "It never learns what a business record means. It knows no currency."
    },
    "LAYERS.L2.NAME": {
      "label": "Three layers: layer 2, name",
      "kind": "line",
      "section": "Three layers",
      "value": "Capabilities"
    },
    "LAYERS.L2.HOLDS": {
      "label": "Three layers: layer 2, what it holds",
      "kind": "line",
      "section": "Three layers",
      "value": "Shared, tested building blocks with no network or disk access of their own."
    },
    "LAYERS.L2.RULE": {
      "label": "Three layers: layer 2, rule",
      "kind": "line",
      "section": "Three layers",
      "value": "Each one is launched with its checked cases and the hash of the source they ran against."
    },
    "LAYERS.L3.NAME": {
      "label": "Three layers: layer 3, name",
      "kind": "line",
      "section": "Three layers",
      "value": "Resolvers"
    },
    "LAYERS.L3.HOLDS": {
      "label": "Three layers: layer 3, what it holds",
      "kind": "line",
      "section": "Three layers",
      "value": "Rulebooks, each on its own chain, built from capabilities plus their own grammar."
    },
    "LAYERS.L3.RULE": {
      "label": "Three layers: layer 3, rule",
      "kind": "line",
      "section": "Three layers",
      "value": "A resolver names its building blocks. It never contains its own copy."
    },
    "LIFE.KICKER": {
      "label": "Life of a resolver: small heading above",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "How it works · life of a resolver"
    },
    "LIFE.NOTE": {
      "label": "Life of a resolver: note",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "An illustration of one resolver. It shows no live state."
    },
    "LIFE.LEDE": {
      "label": "Life of a resolver: intro",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "This is the builder's path, from building a resolver to anyone inspecting it."
    },
    "LIFE.ASIDE": {
      "label": "Life of a resolver: side note",
      "kind": "text",
      "section": "Life of a resolver",
      "value": "\"Launched\" and \"served\" are two different states. A dashed outline means launched. A solid outline with a proof badge means served."
    },
    "LIFE.CTA.NEXT": {
      "label": "Life of a resolver: button, next",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Next step"
    },
    "LIFE.CTA.LAST": {
      "label": "Life of a resolver: button, last line",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "See the resolvers"
    },
    "LIFE.CTA.LAST.HREF": {
      "label": "Life of a resolver: button, last line, link target",
      "kind": "link",
      "section": "Life of a resolver",
      "value": "route:resolvers"
    },
    "LIFE.BACK": {
      "label": "Life of a resolver: back link",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Step back"
    },
    "LIFE.TAG.CAPS.NAME": {
      "label": "Life of a resolver: label drawn in the 3D scene, capabilities, name",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Capabilities"
    },
    "LIFE.TAG.CAPS.SUB": {
      "label": "Life of a resolver: label drawn in the 3D scene, capabilities, line under the heading",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "It names them. It holds no copy."
    },
    "LIFE.TAG.GRAMMAR.NAME": {
      "label": "Life of a resolver: label drawn in the 3D scene, grammar, name",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Its grammar"
    },
    "LIFE.TAG.CHAIN.NAME": {
      "label": "Life of a resolver: label drawn in the 3D scene, chain, name",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Its own chain"
    },
    "LIFE.TAG.CHAIN.SUB": {
      "label": "Life of a resolver: label drawn in the 3D scene, chain, line under the heading",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "From one signed launch record"
    },
    "LIFE.TAG.KEY.NAME": {
      "label": "Life of a resolver: label drawn in the 3D scene, key, name",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Control key"
    },
    "LIFE.TAG.KEY.SUB": {
      "label": "Life of a resolver: label drawn in the 3D scene, key, line under the heading",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Only this key can upgrade it"
    },
    "LIFE.TAG.PROVIDER.NAME": {
      "label": "Life of a resolver: label drawn in the 3D scene, provider, name",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "A provider"
    },
    "LIFE.TAG.PROVIDER.SUB": {
      "label": "Life of a resolver: label drawn in the 3D scene, provider, line under the heading",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Passes the checked cases"
    },
    "LIFE.TAG.SERVED.NAME": {
      "label": "Life of a resolver: label drawn in the 3D scene, served, name",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Served"
    },
    "LIFE.TAG.SERVED.SUB": {
      "label": "Life of a resolver: label drawn in the 3D scene, served, line under the heading",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Solid, with a proof"
    },
    "LIFE.TAG.LAUNCHED.NAME": {
      "label": "Life of a resolver: label drawn in the 3D scene, launched, name",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Launched"
    },
    "LIFE.TAG.LAUNCHED.SUB": {
      "label": "Life of a resolver: label drawn in the 3D scene, launched, line under the heading",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Dashed: not served yet"
    },
    "LIFE.STEP1.LEAD": {
      "label": "Life of a resolver: step 1, first sentence",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Build."
    },
    "LIFE.STEP1.REST": {
      "label": "Life of a resolver: step 1, rest of the explanation",
      "kind": "text",
      "section": "Life of a resolver",
      "value": "The builder picks capabilities and writes the grammar for the records the resolver accepts. Resolver Studio is a canvas of nodes for this. A resolver can also wait on another resolver's result, for example \"when the payment is confirmed, give access\"."
    },
    "LIFE.STEP2.LEAD": {
      "label": "Life of a resolver: step 2, first sentence",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Launch."
    },
    "LIFE.STEP2.REST": {
      "label": "Life of a resolver: step 2, rest of the explanation",
      "kind": "text",
      "section": "Life of a resolver",
      "value": "One signed launch record gives the resolver its own chain. The builder sees the exact record before signing. The network refuses a launch that uses a capability that is not launched."
    },
    "LIFE.STEP3.LEAD": {
      "label": "Life of a resolver: step 3, first sentence",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Choose who can change it."
    },
    "LIFE.STEP3.REST": {
      "label": "Life of a resolver: step 3, rest of the explanation",
      "kind": "text",
      "section": "Life of a resolver",
      "value": "With no control key the resolver can never change. With a control key, only that key can sign an upgrade. An upgrade adds a new version. The old one stays on the line."
    },
    "LIFE.STEP4.LEAD": {
      "label": "Life of a resolver: step 4, first sentence",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Serve."
    },
    "LIFE.STEP4.REST": {
      "label": "Life of a resolver: step 4, rest of the explanation",
      "kind": "text",
      "section": "Life of a resolver",
      "value": "A provider runs it after it passes the checked cases of every capability inside. Until then the resolver is launched but not served."
    },
    "LIFE.STEP5.LEAD": {
      "label": "Life of a resolver: step 5, first sentence",
      "kind": "line",
      "section": "Life of a resolver",
      "value": "Inspect."
    },
    "LIFE.STEP5.REST": {
      "label": "Life of a resolver: step 5, rest of the explanation",
      "kind": "text",
      "section": "Life of a resolver",
      "value": "Explore, on the development network, shows each resolver’s grammar, parts, providers and history. It re-checks hashes and signatures in your browser."
    },
    "TRACE.HERE": {
      "label": "Trace a record: breadcrumb for this page",
      "kind": "line",
      "section": "Trace a record",
      "value": "Trace a record"
    },
    "TRACE.KICKER": {
      "label": "Trace a record: small heading above",
      "kind": "line",
      "section": "Trace a record",
      "value": "Trace a record · sample"
    },
    "TRACE.TITLE": {
      "label": "Trace a record: heading",
      "kind": "line",
      "section": "Trace a record",
      "value": "Every record leads somewhere."
    },
    "TRACE.TITLE2": {
      "label": "Trace a record: second heading line",
      "kind": "line",
      "section": "Trace a record",
      "value": "See for yourself."
    },
    "TRACE.NOTE": {
      "label": "Trace a record: note",
      "kind": "line",
      "section": "Trace a record",
      "value": "A sample chain. It shows no live state."
    },
    "TRACE.LEDE": {
      "label": "Trace a record: intro",
      "kind": "text",
      "section": "Trace a record",
      "value": "Each record links to the one before it, back to the chain's first record. Follow the links, and check each signature on the way."
    },
    "TRACE.LIST": {
      "label": "Trace a record: list heading",
      "kind": "line",
      "section": "Trace a record",
      "value": "The chain, newest record first"
    },
    "TRACE.GENESIS": {
      "label": "Trace a record: genesis",
      "kind": "line",
      "section": "Trace a record",
      "value": "Genesis"
    },
    "TRACE.REV": {
      "label": "Trace a record: short revision",
      "kind": "line",
      "section": "Trace a record",
      "value": "Rev {n}"
    },
    "TRACE.SIGNED": {
      "label": "Trace a record: \"Signed\" state",
      "kind": "line",
      "section": "Trace a record",
      "value": "Signed by {who}"
    },
    "TRACE.UNSIGNED": {
      "label": "Trace a record: unsigned text",
      "kind": "line",
      "section": "Trace a record",
      "value": "Not signed in this sample"
    },
    "TRACE.LINKS": {
      "label": "Trace a record: links",
      "kind": "line",
      "section": "Trace a record",
      "value": "Links to {title}"
    },
    "TRACE.FIRST": {
      "label": "Trace a record: first line",
      "kind": "line",
      "section": "Trace a record",
      "value": "The first record. It links to nothing before it."
    },
    "TRACE.CTA": {
      "label": "Trace a record: button",
      "kind": "line",
      "section": "Trace a record",
      "value": "Open this record"
    },
    "TRACE.CTA.HREF": {
      "label": "Trace a record: button, link target",
      "kind": "link",
      "section": "Trace a record",
      "value": "route:chain/open"
    },
    "TRACE.LINK": {
      "label": "Trace a record: link text",
      "kind": "line",
      "section": "Trace a record",
      "value": "See its links"
    },
    "TRACE.LINK.HREF": {
      "label": "Trace a record: link text, link target",
      "kind": "link",
      "section": "Trace a record",
      "value": "route:chain/links"
    },
    "TRACE.TAG.NEWEST": {
      "label": "Trace a record: label drawn in the 3D scene, newest",
      "kind": "line",
      "section": "Trace a record",
      "value": "Newest record"
    },
    "TRACE.TAG.CHOSEN": {
      "label": "Trace a record: label drawn in the 3D scene, chosen record",
      "kind": "line",
      "section": "Trace a record",
      "value": "The record you chose"
    },
    "TRACE.TAG.PREV.NAME": {
      "label": "Trace a record: label drawn in the 3D scene, previous, name",
      "kind": "line",
      "section": "Trace a record",
      "value": "Previous record"
    },
    "TRACE.TAG.PREV.SUB": {
      "label": "Trace a record: label drawn in the 3D scene, previous, line under the heading",
      "kind": "line",
      "section": "Trace a record",
      "value": "Points to {title}"
    },
    "TRACE.TAG.GENESIS.NAME": {
      "label": "Trace a record: label drawn in the 3D scene, genesis, name",
      "kind": "line",
      "section": "Trace a record",
      "value": "Genesis"
    },
    "TRACE.TAG.GENESIS.SUB": {
      "label": "Trace a record: label drawn in the 3D scene, genesis, line under the heading",
      "kind": "line",
      "section": "Trace a record",
      "value": "First record: {title}"
    }
  }
});
