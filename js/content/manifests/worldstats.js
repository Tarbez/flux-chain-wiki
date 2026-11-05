/* One page's copy. Edit it in admin.html, or by hand: keep the object in the shape admin.html reads. */
ArkManifest.define({
  "id": "worldstats",
  "title": "Stats page",
  "route": "/stats/now",
  "group": "page",
  "meta": {},
  "fields": {
    "HERE": {
      "label": "Stats pages: breadcrumb",
      "kind": "line",
      "section": "Shared",
      "value": "Stats"
    },
    "NONE": {
      "label": "Stats pages: a reading that does not exist yet",
      "kind": "line",
      "section": "Shared",
      "value": "No reading"
    },
    "AGO.NOW": {
      "label": "Stats pages: just now",
      "kind": "line",
      "section": "Shared",
      "value": "just now"
    },
    "AGO.MIN": {
      "label": "Stats pages: minutes ago",
      "kind": "line",
      "section": "Shared",
      "value": "{n} min ago"
    },
    "AGO.HOUR": {
      "label": "Stats pages: hours ago",
      "kind": "line",
      "section": "Shared",
      "value": "{n} h ago"
    },
    "AGO.DAY": {
      "label": "Stats pages: days ago",
      "kind": "line",
      "section": "Shared",
      "value": "{n} days ago"
    },
    "WHY.INTERACTIONS": {
      "label": "No reading: interactions",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The nodes do not stream live requests yet."
    },
    "PULSE.WAIT": {
      "label": "Fleet pulse: waiting",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "Asking the nodes."
    },
    "PULSE.HTTP": {
      "label": "Fleet pulse: answered with an error",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The nodes’ self-check answered HTTP {code}."
    },
    "PULSE.TIMEOUT": {
      "label": "Fleet pulse: no answer in time",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The nodes’ self-check did not answer in 6 seconds."
    },
    "PULSE.SHAPE": {
      "label": "Fleet pulse: answer in a shape the page does not read",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The nodes’ self-check answered in a shape this page does not read."
    },
    "PULSE.OFFLINE": {
      "label": "Fleet pulse: not reachable",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The nodes’ self-check could not be reached."
    },
    "UNIT.MS": {
      "label": "Unit: milliseconds",
      "kind": "line",
      "section": "Weekly runs",
      "value": "ms"
    },
    "UNIT.SWAPS.S": {
      "label": "Unit: swaps a second",
      "kind": "line",
      "section": "Weekly runs",
      "value": "swaps/s"
    },
    "UNIT.OPS.S": {
      "label": "Dashboard: unit, operations a second",
      "kind": "line",
      "section": "Dashboard",
      "value": "ops/s"
    },
    "UNIT.REQ.S": {
      "label": "Unit: requests a second",
      "kind": "line",
      "section": "Live",
      "value": "requests/s"
    },
    "LEGEND.LABEL": {
      "label": "Dashboard: name of the legend of the 3D",
      "kind": "line",
      "section": "Dashboard",
      "value": "How to read the 3D"
    },
    "LIVE.WAIT": {
      "label": "Live: waiting",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "Asking the stats node."
    },
    "LIVE.NOCLIENT": {
      "label": "Live: the page did not load its client",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "This page did not load the stats client."
    },
    "LIVE.NOTCONFIGURED": {
      "label": "Live: the host has no stats node",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "This host is not connected to a stats node yet."
    },
    "LIVE.NOTSERVED": {
      "label": "Live: the host does not serve the feed",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "This host does not serve live stats."
    },
    "LIVE.TIMEOUT": {
      "label": "Live: no answer in time",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The stats node did not answer in time."
    },
    "LIVE.SHAPE": {
      "label": "Live: answer in a shape the page does not read",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The stats node answered in a shape this page does not read."
    },
    "LIVE.OFFLINE": {
      "label": "Live: not reachable",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The stats node could not be reached."
    },
    "LIVE.STALE": {
      "label": "Live: the last reading is too old",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "Stale. The last reading is from {age}."
    },
    "LIVE.NOCAPS": {
      "label": "Live: no capability has a rate",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The node lists no capability rate yet."
    },
    "LIVE.NORES": {
      "label": "Live: no resolver load",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "No node reports resolver load yet."
    },
    "RUN.NONE": {
      "label": "Runs: none filed, none scheduled",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "No benchmark run is scheduled yet."
    },
    "RUN.NEXT": {
      "label": "Runs: none filed, the next one is scheduled",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "No run is filed yet. The next one starts on {date}."
    },
    "RUN.NOSTRESS": {
      "label": "Runs: no stress or ceiling run",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "No stress run has been filed yet."
    },
    "CAP.UNLISTED": {
      "label": "Live table: the node does not list the capability",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The node does not list it."
    },
    "CAP.FEW": {
      "label": "Live table: too few requests for a p95",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "Under 20 requests in the window."
    },
    "CAP.NOCEILING": {
      "label": "Live table: no ceiling run for the capability",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "No ceiling run has driven it yet."
    },
    "CAP.NORUNS": {
      "label": "Live table: the runs list could not be read",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The benchmark runs could not be read."
    },
    "NOW.LIVE.SUB": {
      "label": "Now: under the live rate",
      "kind": "line",
      "section": "Live",
      "value": "{errors} errors in the last {s} s, node {node}, {age}"
    },
    "NOW.RUN": {
      "label": "Now: the latest benchmark run",
      "kind": "line",
      "section": "Live",
      "value": "Newest test run"
    },
    "NOW.RUN.SUB": {
      "label": "Now: under the latest run",
      "kind": "line",
      "section": "Live",
      "value": "{kind} run, week {week}, {date}. {device}"
    },
    "CAP.LIVE.META": {
      "label": "Operations: the live table window",
      "kind": "line",
      "section": "Live",
      "value": "last {s} s, node {node}, {age}"
    },
    "CAP.COL.NAME": {
      "label": "Operations: live table column",
      "kind": "line",
      "section": "Live",
      "value": "Operation"
    },
    "CEIL.RES": {
      "label": "One node: resolver load now",
      "kind": "line",
      "section": "Live",
      "value": "Swaps through the nodes now"
    },
    "CEIL.RES.SUB": {
      "label": "One node: under resolver load",
      "kind": "line",
      "section": "Live",
      "value": "Busiest: {resolver}. Batch {batch}, send {send}. Node {node}, {age}"
    },
    "CEIL.RUN": {
      "label": "One node: the newest ceiling run",
      "kind": "line",
      "section": "Live",
      "value": "Newest load test"
    },
    "CEIL.RUN.SUB": {
      "label": "One node: under the newest ceiling run",
      "kind": "line",
      "section": "Live",
      "value": "{run}, {n} connections, {date}. {device}"
    },
    "TITLE": {
      "label": "Stats: the title",
      "kind": "line",
      "section": "Page",
      "value": "Network stats"
    },
    "DEVNET": {
      "label": "Stats: beside the title, the network this page reads (said once per page)",
      "kind": "line",
      "section": "Page",
      "value": "Devnet"
    },
    "MORE": {
      "label": "Stats: the disclosure that holds a section’s detail",
      "kind": "line",
      "section": "Page",
      "value": "More"
    },
    "SEC.NOW": {
      "label": "Section name: now",
      "kind": "line",
      "section": "Now",
      "value": "Now"
    },
    "SEC.THROUGHPUT": {
      "label": "Section name: throughput",
      "kind": "line",
      "section": "Throughput",
      "value": "Throughput"
    },
    "SEC.OPS": {
      "label": "Section name: operations",
      "kind": "line",
      "section": "Operations",
      "value": "Operations"
    },
    "NOW.COUNT": {
      "label": "Now: nodes that answered, of all",
      "kind": "line",
      "section": "Now",
      "value": "{ok} of {total}"
    },
    "NOW.UNIT": {
      "label": "Now: unit after the count",
      "kind": "line",
      "section": "Now",
      "value": "nodes answering"
    },
    "NOW.AGE": {
      "label": "Now: when the nodes answered",
      "kind": "line",
      "section": "Now",
      "value": "Checked {age}"
    },
    "NOW.NONE": {
      "label": "Now: no node feed is live",
      "kind": "line",
      "section": "Now",
      "value": "Nothing is live yet"
    },
    "NOW.ROW.PULSE": {
      "label": "Now: the nodes’ hourly self-check rate",
      "kind": "line",
      "section": "Now",
      "value": "Self-check rate"
    },
    "NOW.LIVE": {
      "label": "Now: live requests over every operation",
      "kind": "line",
      "section": "Now",
      "value": "Live requests"
    },
    "NOW.SOURCE": {
      "label": "Now: where the reading comes from",
      "kind": "line",
      "section": "Now",
      "value": "Live, from each node’s hourly self-check"
    },
    "THRU.MEANS": {
      "label": "Throughput: what the headline measures, five words at most",
      "kind": "line",
      "section": "Throughput",
      "value": "Into one node, through the network"
    },
    "THRU.SOURCE": {
      "label": "Throughput: the source in plain words",
      "kind": "line",
      "section": "Throughput",
      "value": "Lab run on an {machine}, {date}"
    },
    "THRU.RUN": {
      "label": "Throughput: the run id, behind More",
      "kind": "line",
      "section": "Throughput",
      "value": "Run {record}"
    },
    "THRU.CAVEAT": {
      "label": "Throughput: the conditions, behind More",
      "kind": "line",
      "section": "Throughput",
      "value": "Client and node ran on one machine. Swaps move no balance yet, so real use will be slower."
    },
    "THRU.NODATA": {
      "label": "Throughput: the data file did not load",
      "kind": "line",
      "section": "Throughput",
      "value": "The throughput data file did not load."
    },
    "THRU.CONNS": {
      "label": "Throughput: connections at the headline",
      "kind": "line",
      "section": "Throughput",
      "value": "Connections at the top"
    },
    "THRU.ONE": {
      "label": "Throughput: rate at one connection",
      "kind": "line",
      "section": "Throughput",
      "value": "One connection gets {n} swaps/s."
    },
    "THRU.CORES": {
      "label": "Throughput: server cores in use at the top",
      "kind": "line",
      "section": "Throughput",
      "value": "Server cores used"
    },
    "THRU.CORES.OF": {
      "label": "Throughput: cores used, of all",
      "kind": "line",
      "section": "Throughput",
      "value": "{used} of {all}"
    },
    "THRU.LIMIT": {
      "label": "Throughput: what limits it",
      "kind": "line",
      "section": "Throughput",
      "value": "What limits it"
    },
    "THRU.LIMIT.SUB": {
      "label": "Throughput: under what limits it",
      "kind": "line",
      "section": "Throughput",
      "value": "Sending one result to {peers} copies takes {times} times as long as resolving it ({resolve} ms). Sends do not overlap yet. Run {record}."
    },
    "THRU.LAB": {
      "label": "Throughput: the summed lab figure, never the headline",
      "kind": "line",
      "section": "Throughput",
      "value": "Lab sum, no network"
    },
    "THRU.LAB.SUB": {
      "label": "Throughput: under the lab sum",
      "kind": "line",
      "section": "Throughput",
      "value": "{nodes} nodes, each measured alone with no network, then added up. No client sent these swaps. Run {record}, {date}."
    },
    "THRU.COL.CONNS": {
      "label": "Throughput: table column",
      "kind": "line",
      "section": "Throughput",
      "value": "Connections"
    },
    "OPS.MEANS": {
      "label": "Operations: what the number measures, five words at most",
      "kind": "line",
      "section": "Operations",
      "value": "{op}, fastest way: {variant}"
    },
    "OPS.SOURCE": {
      "label": "Operations: the source in plain words",
      "kind": "line",
      "section": "Operations",
      "value": "Lab run, one machine, no network, {date}"
    },
    "OPS.RUN": {
      "label": "Operations: the run id, behind More",
      "kind": "line",
      "section": "Operations",
      "value": "Run {record}"
    },
    "OPS.PICK": {
      "label": "Operations: name of the operation buttons",
      "kind": "line",
      "section": "Operations",
      "value": "Operation"
    },
    "OPS.NOTBUILT": {
      "label": "Operations: what is not built",
      "kind": "line",
      "section": "Operations",
      "value": "Not built yet"
    },
    "OPS.NODATA": {
      "label": "Operations: the data file did not load",
      "kind": "line",
      "section": "Operations",
      "value": "The operations data file did not load."
    },
    "CAP.LIVE.TITLE": {
      "label": "Operations: the live table, when it has no reading",
      "kind": "line",
      "section": "Operations",
      "value": "Each operation, live"
    },
    "CAP.COL.P95": {
      "label": "Operations: live table column, p95 explained",
      "kind": "line",
      "section": "Operations",
      "value": "Slowest 5% (p95)"
    },
    "CAP.COL.ROOM": {
      "label": "Operations: live table column, headroom explained",
      "kind": "line",
      "section": "Operations",
      "value": "Room left before the top"
    },
    "KEY.CUBE.RATE": {
      "label": "Legend: a cube on a rate",
      "kind": "line",
      "section": "3D",
      "value": "One cube = {n} a second"
    },
    "KEY.CUBE.SWAPS": {
      "label": "Legend: a cube on a swap rate",
      "kind": "line",
      "section": "3D",
      "value": "One cube = {n} swaps a second"
    },
    "KEY.CUBE.LAB": {
      "label": "Legend: a cube on the lab sum",
      "kind": "line",
      "section": "3D",
      "value": "One cube = {n} a second, lab sum, no network"
    },
    "KEY.NOTBUILT": {
      "label": "Legend: a dotted outline",
      "kind": "line",
      "section": "3D",
      "value": "Dotted outline = not built yet"
    },
    "KEY.HIGHEST": {
      "label": "Legend: the highest column",
      "kind": "line",
      "section": "3D",
      "value": "Highest"
    },
    "KEY.CHOSEN": {
      "label": "Legend: the chosen operation",
      "kind": "line",
      "section": "3D",
      "value": "Chosen"
    },
    "KEY.LIVE": {
      "label": "Legend: the live line",
      "kind": "line",
      "section": "3D",
      "value": "Dotted line = live requests, none yet"
    },
    "KEY.BEADS": {
      "label": "Legend: one bead for each request",
      "kind": "line",
      "section": "3D",
      "value": "One bead = one request, the latest {n}"
    },
    "TAG.SWAPS": {
      "label": "Label: the swaps block",
      "kind": "line",
      "section": "3D",
      "value": "Swaps"
    },
    "TAG.TRANSFERS": {
      "label": "Label: the transfers block",
      "kind": "line",
      "section": "3D",
      "value": "Transfers"
    },
    "TAG.LAB": {
      "label": "Label: under a lab block",
      "kind": "line",
      "section": "3D",
      "value": "lab sum, no network"
    },
    "TAG.LIVE": {
      "label": "Label: the live line",
      "kind": "line",
      "section": "3D",
      "value": "Live requests"
    },
    "TAG.LIVE.N": {
      "label": "Label: under the live line, with beads",
      "kind": "line",
      "section": "3D",
      "value": "latest {n}"
    },
    "TAG.CONN.ONE": {
      "label": "Label: one connection",
      "kind": "line",
      "section": "3D",
      "value": "{n} connection"
    },
    "TAG.CONN.MANY": {
      "label": "Label: many connections",
      "kind": "line",
      "section": "3D",
      "value": "{n} connections"
    },
    "TAG.NOTBUILT": {
      "label": "Label: under a dotted outline",
      "kind": "line",
      "section": "3D",
      "value": "not built"
    },
    "TABS": {
      "label": "HUD: name of the section tabs, for screen readers",
      "kind": "line",
      "section": "HUD",
      "value": "Sections"
    },
    "STATS": {
      "label": "HUD: name of the numbers column, for screen readers",
      "kind": "line",
      "section": "HUD",
      "value": "The numbers"
    },
    "GO": {
      "label": "HUD: the one action, to the explorer",
      "kind": "line",
      "section": "HUD",
      "value": "Browse the records"
    }
  }
});
