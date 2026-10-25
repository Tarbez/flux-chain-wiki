/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "worldmeasure",
  "title": "Measure pages",
  "route": "/stats/capabilities",
  "group": "page",
  "fields": {
    "COMMON.ROOT": {
      "label": "Shared: root crumb",
      "kind": "line",
      "section": "Shared",
      "value": "DEFXN"
    },
    "COMMON.BACK": {
      "label": "Shared: back link",
      "kind": "line",
      "section": "Shared",
      "value": "Back to network"
    },
    "COMMON.WHERE": {
      "label": "Shared: \"where you are\" label",
      "kind": "line",
      "section": "Shared",
      "value": "Where you are"
    },
    "COMMON.ALL": {
      "label": "Shared: \"show all\" text",
      "kind": "line",
      "section": "Shared",
      "value": "Show all {n}"
    },
    "COMMON.FEWER": {
      "label": "Shared: \"show fewer\" text",
      "kind": "line",
      "section": "Shared",
      "value": "Show fewer"
    },
    "RESOLVERS.HERE": {
      "label": "Resolvers page: breadcrumb for this page",
      "kind": "line",
      "section": "Resolvers",
      "value": "Resolvers"
    },
    "RESOLVERS.KICKER": {
      "label": "Resolvers page: small heading above",
      "kind": "line",
      "section": "Resolvers",
      "value": "Resolvers · {n}"
    },
    "RESOLVERS.NOTE": {
      "label": "Resolvers page: note",
      "kind": "text",
      "section": "Resolvers",
      "value": "Each cube is a resolver. The blocks below are the capabilities they name. Price: {price} for {n} of {total}."
    },
    "RESOLVERS.TITLE.MANY": {
      "label": "Resolvers page: heading, many",
      "kind": "line",
      "section": "Resolvers",
      "value": "Built from {n} capabilities."
    },
    "RESOLVERS.TITLE.ONE": {
      "label": "Resolvers page: heading, one",
      "kind": "line",
      "section": "Resolvers",
      "value": "Built from 1 capability."
    },
    "RESOLVERS.TITLE.NONE": {
      "label": "Resolvers page: heading, empty text",
      "kind": "line",
      "section": "Resolvers",
      "value": "Built on no shared capability."
    },
    "RESOLVERS.EMPTY.TITLE": {
      "label": "Resolvers page: empty state, heading",
      "kind": "line",
      "section": "Resolvers",
      "value": "Resolvers."
    },
    "RESOLVERS.EMPTY.LINE": {
      "label": "Resolvers page: empty state, line",
      "kind": "line",
      "section": "Resolvers",
      "value": "No resolver list is loaded."
    },
    "RESOLVERS.STRIP.GRAMMAR": {
      "label": "Resolvers page: summary strip label, grammar",
      "kind": "line",
      "section": "Resolvers",
      "value": "Grammar"
    },
    "RESOLVERS.STRIP.CAPS": {
      "label": "Resolvers page: summary strip label, capabilities",
      "kind": "line",
      "section": "Resolvers",
      "value": "Capabilities"
    },
    "RESOLVERS.STRIP.OFFERS": {
      "label": "Resolvers page: summary strip label, offers",
      "kind": "line",
      "section": "Resolvers",
      "value": "Offers"
    },
    "RESOLVERS.GRAMMAR.CHECKED": {
      "label": "Resolvers page: grammar, \"checked\" text",
      "kind": "line",
      "section": "Resolvers",
      "value": "Checked"
    },
    "RESOLVERS.GRAMMAR.OPEN": {
      "label": "Resolvers page: grammar, open state",
      "kind": "line",
      "section": "Resolvers",
      "value": "Not specified"
    },
    "RESOLVERS.FACT.BUILT": {
      "label": "Resolvers page: fact label, built from",
      "kind": "line",
      "section": "Resolvers",
      "value": "Built from"
    },
    "RESOLVERS.FACT.OFFERS": {
      "label": "Resolvers page: fact label, offers",
      "kind": "line",
      "section": "Resolvers",
      "value": "Offers"
    },
    "RESOLVERS.FACT.PRICE": {
      "label": "Resolvers page: fact label, price",
      "kind": "line",
      "section": "Resolvers",
      "value": "Price"
    },
    "RESOLVERS.FACT.WHO": {
      "label": "Resolvers page: fact label, who can change it",
      "kind": "line",
      "section": "Resolvers",
      "value": "Who can change it"
    },
    "RESOLVERS.OWNRULES": {
      "label": "Resolvers page: \"own rules only\" text",
      "kind": "line",
      "section": "Resolvers",
      "value": "Its own rules only"
    },
    "RESOLVERS.UNKNOWN": {
      "label": "Resolvers page: \"not in manifest\" text",
      "kind": "line",
      "section": "Resolvers",
      "value": "Not in its manifest"
    },
    "RESOLVERS.MORE": {
      "label": "Resolvers page: \"more\" text",
      "kind": "line",
      "section": "Resolvers",
      "value": "+{n} more"
    },
    "RESOLVERS.PICK": {
      "label": "Resolvers page: picker prompt",
      "kind": "line",
      "section": "Resolvers",
      "value": "Choose a resolver"
    },
    "RESOLVERS.OPEN": {
      "label": "Resolvers page: open state",
      "kind": "line",
      "section": "Resolvers",
      "value": "Grammar not specified yet"
    },
    "RESOLVERS.CTA.CAPS": {
      "label": "Resolvers page: button, capabilities",
      "kind": "line",
      "section": "Resolvers",
      "value": "See its capabilities"
    },
    "RESOLVERS.CTA.RESOLVE": {
      "label": "Resolvers page: button, result view",
      "kind": "line",
      "section": "Resolvers",
      "value": "How a result is made"
    },
    "RESOLVERS.LINK": {
      "label": "Resolvers page: link text",
      "kind": "line",
      "section": "Resolvers",
      "value": "How a result is made"
    },
    "RESOLVERS.LINK.HREF": {
      "label": "Resolvers page: link text, link target",
      "kind": "link",
      "section": "Resolvers",
      "value": "route:works/resolve"
    },
    "RESOLVERS.TAG.NAMES": {
      "label": "Resolvers page: label drawn in the 3D scene, names",
      "kind": "line",
      "section": "Resolvers",
      "value": "Names {n} of the blocks below"
    },
    "RESOLVERS.TAG.NONE": {
      "label": "Resolvers page: label drawn in the 3D scene, empty text",
      "kind": "line",
      "section": "Resolvers",
      "value": "Names no shared block"
    },
    "MEASURED.HERE": {
      "label": "Measured page: breadcrumb for this page",
      "kind": "line",
      "section": "Measured",
      "value": "Measured"
    },
    "MEASURED.KICKER": {
      "label": "Measured page: small heading above",
      "kind": "line",
      "section": "Measured",
      "value": "Measured"
    },
    "MEASURED.TABS": {
      "label": "Measured page: tab group name",
      "kind": "line",
      "section": "Measured",
      "value": "Measured"
    },
    "MEASURED.TAB.CAPS": {
      "label": "Measured page: tab name, capabilities",
      "kind": "line",
      "section": "Measured",
      "value": "Capabilities"
    },
    "MEASURED.TAB.RUNS": {
      "label": "Measured page: tab name, benchmark runs",
      "kind": "line",
      "section": "Measured",
      "value": "Benchmark runs"
    },
    "MEASURED.TITLE": {
      "label": "Measured page: heading",
      "kind": "line",
      "section": "Measured",
      "value": "{n} checked cases."
    },
    "MEASURED.STRIP.CASES": {
      "label": "Measured page: summary strip label, checked cases",
      "kind": "line",
      "section": "Measured",
      "value": "Checked cases"
    },
    "MEASURED.STRIP.OF": {
      "label": "Measured page: summary strip label, \"of\" connector",
      "kind": "line",
      "section": "Measured",
      "value": "{n} of {total}"
    },
    "MEASURED.STRIP.SPEED": {
      "label": "Measured page: summary strip label, speed",
      "kind": "line",
      "section": "Measured",
      "value": "Speed"
    },
    "MEASURED.STRIP.NOSPEED": {
      "label": "Measured page: summary strip label, \"no run yet\" text",
      "kind": "line",
      "section": "Measured",
      "value": "No run of its own yet"
    },
    "MEASURED.STRIP.VERSION": {
      "label": "Measured page: summary strip label, version",
      "kind": "line",
      "section": "Measured",
      "value": "Version"
    },
    "MEASURED.FACT.FOR": {
      "label": "Measured page: fact label, \"checked for\"",
      "kind": "line",
      "section": "Measured",
      "value": "Checked for"
    },
    "MEASURED.FACT.MORE": {
      "label": "Measured page: fact label, \"more\" text",
      "kind": "line",
      "section": "Measured",
      "value": "+{n} more cases"
    },
    "MEASURED.FACT.USEDBY": {
      "label": "Measured page: fact label, \"used by\"",
      "kind": "line",
      "section": "Measured",
      "value": "Used by"
    },
    "MEASURED.FACT.NOUSERS": {
      "label": "Measured page: fact label, \"no users\" text",
      "kind": "line",
      "section": "Measured",
      "value": "No first-party resolver yet"
    },
    "MEASURED.PICK": {
      "label": "Measured page: picker prompt",
      "kind": "line",
      "section": "Measured",
      "value": "Choose a capability"
    },
    "MEASURED.CTA.USERS": {
      "label": "Measured page: button, users",
      "kind": "line",
      "section": "Measured",
      "value": "See resolvers that use it"
    },
    "MEASURED.CTA.ALL": {
      "label": "Measured page: button, \"show all\" text",
      "kind": "line",
      "section": "Measured",
      "value": "See all resolvers"
    },
    "MEASURED.CTA.RESOLVE": {
      "label": "Measured page: button, result view",
      "kind": "line",
      "section": "Measured",
      "value": "How a result is made"
    },
    "MEASURED.LINK": {
      "label": "Measured page: link text",
      "kind": "line",
      "section": "Measured",
      "value": "How a result is made"
    },
    "MEASURED.LINK.HREF": {
      "label": "Measured page: link text, link target",
      "kind": "link",
      "section": "Measured",
      "value": "route:works/resolve"
    },
    "MEASURED.NOTE.CAPS": {
      "label": "Measured page: note, capabilities",
      "kind": "line",
      "section": "Measured",
      "value": "One column per capability. One cube per checked case."
    },
    "MEASURED.NOTE.RUNS": {
      "label": "Measured page: note, benchmark runs",
      "kind": "line",
      "section": "Measured",
      "value": "Runs measure the whole fleet, not one capability."
    },
    "MEASURED.RULES.TITLE": {
      "label": "Measured page: rules, heading",
      "kind": "line",
      "section": "Measured",
      "value": "How to read these numbers"
    },
    "MEASURED.RULES.TEXT": {
      "label": "Measured page: rules, text",
      "kind": "text",
      "section": "Measured",
      "value": "“Not measured yet” is different from 0. A dash means nobody has measured it."
    },
    "MEASURED.TAG.CASES": {
      "label": "Measured page: label drawn in the 3D scene, checked cases",
      "kind": "line",
      "section": "Measured",
      "value": "{n} checked cases"
    },
    "FXN.HERE": {
      "label": "FXN supply page: breadcrumb for this page",
      "kind": "line",
      "section": "FXN supply",
      "value": "FXN"
    },
    "FXN.KICKER": {
      "label": "FXN supply page: small heading above",
      "kind": "line",
      "section": "FXN supply",
      "value": "FXN · owner decisions"
    },
    "FXN.TITLE": {
      "label": "FXN supply page: heading",
      "kind": "line",
      "section": "FXN supply",
      "value": "{supply} FXN."
    },
    "FXN.LEDE": {
      "label": "FXN supply page: intro",
      "kind": "text",
      "section": "FXN supply",
      "value": "The starting supply and how each part is released, as the dense-wire code sets them (checked against commit a3dc2e8 on 2026-10-24). Some limits are the code’s own assumptions, and the owner has not set them yet."
    },
    "FXN.NOTE": {
      "label": "FXN supply page: note",
      "kind": "line",
      "section": "FXN supply",
      "value": "One tile is 1% of the supply: {unit} FXN."
    },
    "FXN.TABS": {
      "label": "FXN supply page: tab group name",
      "kind": "line",
      "section": "FXN supply",
      "value": "FXN"
    },
    "FXN.TAB.SUPPLY": {
      "label": "FXN supply page: tab name, supply",
      "kind": "line",
      "section": "FXN supply",
      "value": "Starting supply"
    },
    "FXN.TAB.FEES": {
      "label": "FXN supply page: tab name, fees",
      "kind": "line",
      "section": "FXN supply",
      "value": "Fees"
    },
    "FXN.TAB.MONEY": {
      "label": "FXN supply page: tab name, money",
      "kind": "line",
      "section": "FXN supply",
      "value": "Money"
    },
    "FXN.RULE": {
      "label": "FXN supply page: rule",
      "kind": "line",
      "section": "FXN supply",
      "value": "{name} · {pct}% · {amount} FXN"
    },
    "FXN.SCHEDULE": {
      "label": "FXN supply page: release schedule label",
      "kind": "line",
      "section": "FXN supply",
      "value": "Release days"
    },
    "FXN.DAY": {
      "label": "FXN supply page: day label",
      "kind": "line",
      "section": "FXN supply",
      "value": "Day {d}"
    },
    "FXN.FEES.TITLE": {
      "label": "FXN supply page: fees, heading",
      "kind": "line",
      "section": "FXN supply",
      "value": "The cost of running work"
    },
    "FXN.FEES.NOPRICE": {
      "label": "FXN supply page: fees, noprice",
      "kind": "line",
      "section": "FXN supply",
      "value": "No price is set yet"
    },
    "FXN.MONEY.COINS.KIND": {
      "label": "FXN supply page: money, coins, kind line",
      "kind": "line",
      "section": "FXN supply",
      "value": "Network coins"
    },
    "FXN.MONEY.COINS.WHAT": {
      "label": "FXN supply page: money, coins, what it is",
      "kind": "line",
      "section": "FXN supply",
      "value": "FXN, DARO and CR3 are the planned coins of the FXN, DeArk and CR3TV network chains. Each coin lives on its own chain. No coin is live."
    },
    "FXN.MONEY.CREDITS.KIND": {
      "label": "FXN supply page: money, credits, kind line",
      "kind": "line",
      "section": "FXN supply",
      "value": "Credits"
    },
    "FXN.MONEY.CREDITS.WHAT": {
      "label": "FXN supply page: money, credits, what it is",
      "kind": "text",
      "section": "FXN supply",
      "value": "Usage credits for features inside apps and networks. They stay with one identity and cannot be sent on. How they are bought is not decided."
    },
    "FXN.MONEY.TOKENS.KIND": {
      "label": "FXN supply page: money, tokens, kind line",
      "kind": "line",
      "section": "FXN supply",
      "value": "App tokens"
    },
    "FXN.MONEY.TOKENS.WHAT": {
      "label": "FXN supply page: money, tokens, what it is",
      "kind": "text",
      "section": "FXN supply",
      "value": "Planned: one per shipped app, named after the app and traded against its network’s coin. None is registered yet."
    },
    "FXN.MONEY.MOVES": {
      "label": "FXN supply page: money, \"moves\" label",
      "kind": "line",
      "section": "FXN supply",
      "value": "Moves"
    },
    "FXN.MONEY.STAYS": {
      "label": "FXN supply page: money, \"stays\" label",
      "kind": "line",
      "section": "FXN supply",
      "value": "Stays"
    },
    "FXN.CTA": {
      "label": "FXN supply page: button",
      "kind": "line",
      "section": "FXN supply",
      "value": "Create your identity"
    },
    "FXN.CTA.HREF": {
      "label": "FXN supply page: button, link target",
      "kind": "link",
      "section": "FXN supply",
      "value": "route:identity"
    },
    "FXN.LINK": {
      "label": "FXN supply page: link text",
      "kind": "line",
      "section": "FXN supply",
      "value": "What is measured"
    },
    "FXN.LINK.HREF": {
      "label": "FXN supply page: link text, link target",
      "kind": "link",
      "section": "FXN supply",
      "value": "route:measured"
    },
    "FXN.WHY": {
      "label": "FXN supply page: reason",
      "kind": "line",
      "section": "FXN supply",
      "value": "The public sale caps each identity at 50,000 FXN, which is 0.05% of the sale."
    },
    "FXN.TAG.TILES": {
      "label": "FXN supply page: label drawn in the 3D scene, tiles",
      "kind": "line",
      "section": "FXN supply",
      "value": "{pct} tiles · {amount} FXN"
    },
    "FXN.TAG.TILE": {
      "label": "FXN supply page: label drawn in the 3D scene, tile",
      "kind": "line",
      "section": "FXN supply",
      "value": "1 tile · {amount} FXN"
    },
    "FXN.TAG.PCT": {
      "label": "FXN supply page: label drawn in the 3D scene, percentage",
      "kind": "line",
      "section": "FXN supply",
      "value": "{pct}%"
    },
    "FXN.TAG.FUND": {
      "label": "FXN supply page: label drawn in the 3D scene, network fund",
      "kind": "line",
      "section": "FXN supply",
      "value": "Network fund"
    },
    "FXN.TAG.COMPUTERS": {
      "label": "FXN supply page: label drawn in the 3D scene, computers",
      "kind": "line",
      "section": "FXN supply",
      "value": "Computers"
    },
    "RING.HERE": {
      "label": "Network ring page: breadcrumb for this page",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Network"
    },
    "RING.STRIP.KIND": {
      "label": "Network ring page: summary strip label, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Kind"
    },
    "RING.STRIP.COIN": {
      "label": "Network ring page: summary strip label, coin",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Coin"
    },
    "RING.STRIP.STATE": {
      "label": "Network ring page: summary strip label, build state",
      "kind": "line",
      "section": "A chain of the network",
      "value": "State"
    },
    "RING.STRIP.LOGO": {
      "label": "Network ring page: summary strip label, logo",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Logo"
    },
    "RING.NONE": {
      "label": "Network ring page: empty text",
      "kind": "line",
      "section": "A chain of the network",
      "value": "None"
    },
    "RING.SHOWN": {
      "label": "Network ring page: \"shown\" text",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Shown"
    },
    "RING.NOTGIVEN": {
      "label": "Network ring page: \"not given yet\" text",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Not given yet"
    },
    "RING.LOGO": {
      "label": "Network ring page: logo",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Logo"
    },
    "RING.LOGO.LABEL": {
      "label": "Network ring page: logo, label",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Logo: not given yet"
    },
    "RING.LOGO.OF": {
      "label": "Network ring page: logo, \"of\" connector",
      "kind": "line",
      "section": "A chain of the network",
      "value": "{name} logo"
    },
    "RING.INSIDE": {
      "label": "Network ring page: \"inside\" line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "{kind} · inside {home}"
    },
    "RING.SUB.INSIDE": {
      "label": "Network ring page: line under the heading, \"inside\" line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Inside {home}."
    },
    "RING.SUB.FIRST": {
      "label": "Network ring page: line under the heading, first line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "The first chain. Its coin is {coin}."
    },
    "RING.SUB.COIN": {
      "label": "Network ring page: line under the heading, coin",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Its coin is {coin}."
    },
    "RING.NOTE.HUB": {
      "label": "Network ring page: note, DEFXN kernel",
      "kind": "line",
      "section": "A chain of the network",
      "value": "DEFXN, the base chain kernel. A shape, not live data."
    },
    "RING.NOTE.NAMED": {
      "label": "Network ring page: note, named",
      "kind": "text",
      "section": "A chain of the network",
      "value": "FXN, DeArk and CR3TV are the named network chains in the plan. This picture shows shapes, not live data."
    },
    "RING.NOTE.KIND": {
      "label": "Network ring page: note, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "This ring shows a kind of chain, not a live chain."
    },
    "RING.RULE.NETWORK": {
      "label": "Network ring page: rule, network chain",
      "kind": "line",
      "section": "A chain of the network",
      "value": ""
    },
    "RING.RULE.HUB": {
      "label": "Network ring page: rule, DEFXN kernel",
      "kind": "line",
      "section": "A chain of the network",
      "value": "The base chain: it never learns what a business record means. It knows no currency."
    },
    "RING.GROUP.KINDS": {
      "label": "Network ring page: group heading, kinds",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Kinds"
    },
    "RING.GROUP.NETWORKS": {
      "label": "Network ring page: group heading, networks",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Networks"
    },
    "RING.OTHER": {
      "label": "Network ring page: other chains label",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Other chains"
    },
    "RING.CHIP.IDENTITY": {
      "label": "Network ring page: chip, identity chain",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Identity"
    },
    "RING.CHIP.RESOLVER": {
      "label": "Network ring page: chip, resolver chain",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Resolver"
    },
    "RING.CHIP.TOKEN": {
      "label": "Network ring page: chip, token ledger",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Token ledger"
    },
    "RING.CHIP.POOL": {
      "label": "Network ring page: chip, pool chain",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Pool"
    },
    "RING.CHIP.KERNEL": {
      "label": "Network ring page: chip, DEFXN kernel",
      "kind": "line",
      "section": "A chain of the network",
      "value": "DEFXN kernel"
    },
    "RING.CHIP.SUPPLY": {
      "label": "Network ring page: chip, supply",
      "kind": "line",
      "section": "A chain of the network",
      "value": "FXN supply"
    },
    "RING.CHIP.MINE": {
      "label": "Network ring page: chip, your chain",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Your chain"
    },
    "RING.PEER.PREV": {
      "label": "Network ring page: neighbour label, previous",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Previous {kind}"
    },
    "RING.PEER.NEXT": {
      "label": "Network ring page: neighbour label, next",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Next {kind}"
    },
    "RING.PEER.OF": {
      "label": "Network ring page: neighbour label, \"of\" connector",
      "kind": "line",
      "section": "A chain of the network",
      "value": "{kind} {n} of {total}"
    },
    "RING.CTA.FXN": {
      "label": "Network ring page: button, fxn",
      "kind": "line",
      "section": "A chain of the network",
      "value": "See the FXN supply"
    },
    "RING.CTA.FXN.HREF": {
      "label": "Network ring page: button, fxn, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:fxn"
    },
    "RING.CTA.RESOLVE": {
      "label": "Network ring page: button, result view",
      "kind": "line",
      "section": "A chain of the network",
      "value": "How a result is made"
    },
    "RING.CTA.RESOLVE.HREF": {
      "label": "Network ring page: button, result view, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:works/resolve"
    },
    "RING.TAG.COIN": {
      "label": "Network ring page: label drawn in the 3D scene, coin",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Coin {coin}"
    },
    "RING.TAG.NOCOIN": {
      "label": "Network ring page: label drawn in the 3D scene, nocoin",
      "kind": "line",
      "section": "A chain of the network",
      "value": "No coin"
    },
    "RING.TAG.KIND": {
      "label": "Network ring page: label drawn in the 3D scene, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "A kind of chain"
    },
    "RING.IDENTITY.KIND": {
      "label": "Network ring page: identity chain, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Identity chain"
    },
    "RING.IDENTITY.TITLE": {
      "label": "Network ring page: identity chain, heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Identity chain."
    },
    "RING.IDENTITY.SUB": {
      "label": "Network ring page: identity chain, line under the heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "One key signs it."
    },
    "RING.IDENTITY.WHAT": {
      "label": "Network ring page: identity chain, what it is",
      "kind": "line",
      "section": "A chain of the network",
      "value": "A person, a team or an app keeps its own history of signed records."
    },
    "RING.IDENTITY.ALSO": {
      "label": "Network ring page: identity chain, more about it",
      "kind": "line",
      "section": "A chain of the network",
      "value": "A new record links to the one before it. Nothing is rewritten."
    },
    "RING.IDENTITY.CTA": {
      "label": "Network ring page: identity chain, button",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Create your identity"
    },
    "RING.IDENTITY.CTA.HREF": {
      "label": "Network ring page: identity chain, button, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:identity"
    },
    "RING.IDENTITY.STATE": {
      "label": "Network ring page: identity chain, build state",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Built"
    },
    "RING.IDENTITY.MORE": {
      "label": "Network ring page: identity chain, \"more\" text",
      "kind": "line",
      "section": "A chain of the network",
      "value": "FXN ID: your key file"
    },
    "RING.IDENTITY.MORE.HREF": {
      "label": "Network ring page: identity chain, \"more\" text, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:identity"
    },
    "RING.NETWORK.KIND": {
      "label": "Network ring page: network chain, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Network chain"
    },
    "RING.NETWORK.WHAT": {
      "label": "Network ring page: network chain, what it is",
      "kind": "line",
      "section": "A chain of the network",
      "value": "A native network chain. Its coin lives here, with its own genesis."
    },
    "RING.NETWORK.ALSO": {
      "label": "Network ring page: network chain, more about it",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Each network chain runs on the DEFXN kernel, with its own coin and its own genesis."
    },
    "RING.NETWORK.CTA": {
      "label": "Network ring page: network chain, button",
      "kind": "line",
      "section": "A chain of the network",
      "value": "How a result is made"
    },
    "RING.NETWORK.CTA.HREF": {
      "label": "Network ring page: network chain, button, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:works/resolve"
    },
    "RING.NETWORK.MORE": {
      "label": "Network ring page: network chain, \"more\" text",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Three layers"
    },
    "RING.NETWORK.MORE.HREF": {
      "label": "Network ring page: network chain, \"more\" text, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:works/layers"
    },
    "RING.HUB.KIND": {
      "label": "Network ring page: DEFXN kernel, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Base chain kernel"
    },
    "RING.HUB.TITLE": {
      "label": "Network ring page: DEFXN kernel, heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "DEFXN."
    },
    "RING.HUB.SUB": {
      "label": "Network ring page: DEFXN kernel, line under the heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "The base chain kernel."
    },
    "RING.HUB.WHAT": {
      "label": "Network ring page: DEFXN kernel, what it is",
      "kind": "line",
      "section": "A chain of the network",
      "value": "The kernel every network chain runs on. It knows no currency."
    },
    "RING.HUB.ALSO": {
      "label": "Network ring page: DEFXN kernel, more about it",
      "kind": "line",
      "section": "A chain of the network",
      "value": "FXN is the first chain built on it. DeArk and CR3TV are planned network chains on it too."
    },
    "RING.HUB.CTA": {
      "label": "Network ring page: DEFXN kernel, button",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Three layers: the base chain"
    },
    "RING.HUB.CTA.HREF": {
      "label": "Network ring page: DEFXN kernel, button, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:works/layers"
    },
    "RING.HUB.STATE": {
      "label": "Network ring page: DEFXN kernel, build state",
      "kind": "line",
      "section": "A chain of the network",
      "value": ""
    },
    "RING.HUB.MORE": {
      "label": "Network ring page: DEFXN kernel, \"more\" text",
      "kind": "line",
      "section": "A chain of the network",
      "value": "How a result is made"
    },
    "RING.HUB.MORE.HREF": {
      "label": "Network ring page: DEFXN kernel, \"more\" text, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:works/resolve"
    },
    "RING.RESOLVER.KIND": {
      "label": "Network ring page: resolver chain, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Resolver chain"
    },
    "RING.RESOLVER.TITLE": {
      "label": "Network ring page: resolver chain, heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Resolver chain."
    },
    "RING.RESOLVER.SUB": {
      "label": "Network ring page: resolver chain, line under the heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "A rulebook."
    },
    "RING.RESOLVER.WHAT": {
      "label": "Network ring page: resolver chain, what it is",
      "kind": "text",
      "section": "A chain of the network",
      "value": "A resolver has its own chain. It reads signed records, applies its rules and signs the result."
    },
    "RING.RESOLVER.ALSO": {
      "label": "Network ring page: resolver chain, more about it",
      "kind": "text",
      "section": "A chain of the network",
      "value": "Builders launch their own. Each one shows its grammar, its capabilities and who can change it."
    },
    "RING.RESOLVER.CTA": {
      "label": "Network ring page: resolver chain, button",
      "kind": "line",
      "section": "A chain of the network",
      "value": "See the resolvers"
    },
    "RING.RESOLVER.CTA.HREF": {
      "label": "Network ring page: resolver chain, button, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:resolvers"
    },
    "RING.RESOLVER.STATE": {
      "label": "Network ring page: resolver chain, build state",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Partial"
    },
    "RING.RESOLVER.MORE": {
      "label": "Network ring page: resolver chain, \"more\" text",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Life of a resolver"
    },
    "RING.RESOLVER.MORE.HREF": {
      "label": "Network ring page: resolver chain, \"more\" text, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:works/life"
    },
    "RING.TOKEN.KIND": {
      "label": "Network ring page: token ledger, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Token ledger"
    },
    "RING.TOKEN.TITLE": {
      "label": "Network ring page: token ledger, heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Token ledger."
    },
    "RING.TOKEN.SUB": {
      "label": "Network ring page: token ledger, line under the heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Who held how much."
    },
    "RING.TOKEN.WHAT": {
      "label": "Network ring page: token ledger, what it is",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Each token keeps its own ledger: the history of who held how much."
    },
    "RING.TOKEN.ALSO": {
      "label": "Network ring page: token ledger, more about it",
      "kind": "line",
      "section": "A chain of the network",
      "value": "A token lives inside one network chain. It is not a chain of its own."
    },
    "RING.TOKEN.CTA": {
      "label": "Network ring page: token ledger, button",
      "kind": "line",
      "section": "A chain of the network",
      "value": "See the FXN supply"
    },
    "RING.TOKEN.CTA.HREF": {
      "label": "Network ring page: token ledger, button, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:fxn"
    },
    "RING.TOKEN.USE": {
      "label": "Network ring page: token ledger, what it is used for",
      "kind": "text",
      "section": "A chain of the network",
      "value": "Planned: one per shipped app, named after the app and traded against its network’s coin. None is registered yet."
    },
    "RING.POOL.KIND": {
      "label": "Network ring page: pool chain, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Pool chain"
    },
    "RING.POOL.TITLE": {
      "label": "Network ring page: pool chain, heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Pool chain."
    },
    "RING.POOL.SUB": {
      "label": "Network ring page: pool chain, line under the heading",
      "kind": "line",
      "section": "A chain of the network",
      "value": "It signs each swap."
    },
    "RING.POOL.WHAT": {
      "label": "Network ring page: pool chain, what it is",
      "kind": "line",
      "section": "A chain of the network",
      "value": "A pool signs each swap result on its own chain. It trades the two tokens it is joined to."
    },
    "RING.POOL.ALSO": {
      "label": "Network ring page: pool chain, more about it",
      "kind": "text",
      "section": "A chain of the network",
      "value": "A swap is two signed records: the trader's intent on the trader's own chain, and the pool's result on the pool's chain."
    },
    "RING.POOL.CTA": {
      "label": "Network ring page: pool chain, button",
      "kind": "line",
      "section": "A chain of the network",
      "value": "How a result is made"
    },
    "RING.POOL.CTA.HREF": {
      "label": "Network ring page: pool chain, button, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:works/resolve"
    },
    "RING.POOL.MORE": {
      "label": "Network ring page: pool chain, \"more\" text",
      "kind": "line",
      "section": "A chain of the network",
      "value": "How a result is made: a swap"
    },
    "RING.POOL.MORE.HREF": {
      "label": "Network ring page: pool chain, \"more\" text, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:works/resolve"
    },
    "RING.LEDGER.KIND": {
      "label": "Network ring page: coin ledger, kind line",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Coin ledger"
    },
    "RING.LEDGER.WHAT": {
      "label": "Network ring page: coin ledger, what it is",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Balances of the network's own coin, worked out from the chain's events."
    },
    "RING.LEDGER.ALSO": {
      "label": "Network ring page: coin ledger, more about it",
      "kind": "text",
      "section": "A chain of the network",
      "value": "It sits at the centre of its network chain. Every token ledger and pool of that network sits round it."
    },
    "RING.LEDGER.CTA": {
      "label": "Network ring page: coin ledger, button",
      "kind": "line",
      "section": "A chain of the network",
      "value": "See the FXN supply"
    },
    "RING.LEDGER.CTA.HREF": {
      "label": "Network ring page: coin ledger, button, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:fxn"
    },
    "RING.LEDGER.USE": {
      "label": "Network ring page: coin ledger, what it is used for",
      "kind": "line",
      "section": "A chain of the network",
      "value": "FXN, DARO and CR3 are planned coins. Each lives on its own network chain."
    },
    "RING.LEDGER.MORE": {
      "label": "Network ring page: coin ledger, \"more\" text",
      "kind": "line",
      "section": "A chain of the network",
      "value": "Three layers"
    },
    "RING.LEDGER.MORE.HREF": {
      "label": "Network ring page: coin ledger, \"more\" text, link target",
      "kind": "link",
      "section": "A chain of the network",
      "value": "route:works/layers"
    }
  }
});
