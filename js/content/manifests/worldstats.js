/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "worldstats",
  "title": "Stats pages",
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
      "value": "The fleet does not stream interactions yet."
    },
    "PULSE.WAIT": {
      "label": "Fleet pulse: waiting",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "Asking the fleet pulse."
    },
    "PULSE.HTTP": {
      "label": "Fleet pulse: answered with an error",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The fleet pulse answered HTTP {code}."
    },
    "PULSE.TIMEOUT": {
      "label": "Fleet pulse: no answer in time",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The fleet pulse did not answer in 6 seconds."
    },
    "PULSE.SHAPE": {
      "label": "Fleet pulse: answer in a shape the page does not read",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The fleet pulse answered in a shape this page does not read."
    },
    "PULSE.OFFLINE": {
      "label": "Fleet pulse: not reachable",
      "kind": "line",
      "section": "Why there is no reading",
      "value": "The fleet pulse could not be reached."
    },
    "NOW.ROW.PULSE": {
      "label": "Now: row, the fleet self-check",
      "kind": "line",
      "section": "Now",
      "value": "Fleet self-check"
    },
    "CEILING.STRIP.CORES": {
      "label": "Ceiling: cell, server cores in use",
      "kind": "line",
      "section": "Ceiling",
      "value": "Server cores used"
    },
    "CEILING.CORES": {
      "label": "Ceiling: cores in use, of all",
      "kind": "line",
      "section": "Ceiling",
      "value": "{used} of {all}"
    },
    "FIG.ONE": {
      "label": "Figure: rate at one connection",
      "kind": "line",
      "section": "Weekly runs",
      "value": "One connection"
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
    "KPI.PULSE.SUB": {
      "label": "Dashboard: under the self-check rate: nodes that answered and the age of the answer",
      "kind": "line",
      "section": "Dashboard",
      "value": "{ok} of {total} nodes, {age}"
    },
    "STORY.CEILING.LIMIT.SUB": {
      "label": "Story: step 3, under the limit",
      "kind": "line",
      "section": "Dashboard",
      "value": "Sending one result to {peers} replicas takes {times} times as long as resolving it ({resolve} ms), and it is not pipelined yet. Measured in {record}."
    },
    "STORY.CEILING.LIMIT": {
      "label": "Story: step 3, the fact that says what limits it",
      "kind": "line",
      "section": "Dashboard",
      "value": "What limits it"
    },
    "STORY.NODE.MANY": {
      "label": "Story: unit, nodes",
      "kind": "line",
      "section": "Dashboard",
      "value": "nodes"
    },
    "STORY.NODE.ONE": {
      "label": "Story: unit, one node",
      "kind": "line",
      "section": "Dashboard",
      "value": "node"
    },
    "STORY.NOW.NODES": {
      "label": "Story: step 1, a fact",
      "kind": "line",
      "section": "Dashboard",
      "value": "Nodes"
    },
    "STORY.NOW.STORES": {
      "label": "Story: step 1, a fact",
      "kind": "line",
      "section": "Dashboard",
      "value": "Records stored"
    },
    "STORY.NOW.TRANSFERS": {
      "label": "Story: step 1, the transfers block and fact",
      "kind": "line",
      "section": "Dashboard",
      "value": "Transfers"
    },
    "STORY.NOW.SWAPS": {
      "label": "Story: step 1, the swaps block",
      "kind": "line",
      "section": "Dashboard",
      "value": "Swaps"
    },
    "STORY.NOW.MEANS": {
      "label": "Story: step 1, what the answer measures",
      "kind": "line",
      "section": "Dashboard",
      "value": "Every node at the same time, each measured inside its own machine with no network, then added up."
    },
    "STORY.NOW.Q": {
      "label": "Story: step 1, the question",
      "kind": "line",
      "section": "Dashboard",
      "value": "What do all the nodes do at once?"
    },
    "STORY.NOW.NAME": {
      "label": "Story: step 1, short name",
      "kind": "line",
      "section": "Dashboard",
      "value": "The network"
    },
    "STORY.STEPS": {
      "label": "Story: the stepper's name for screen readers",
      "kind": "line",
      "section": "Dashboard",
      "value": "The three steps"
    },
    "STORY.NEXT": {
      "label": "Story: a step's action, the next question",
      "kind": "line",
      "section": "Dashboard",
      "value": "Next: {q}"
    },
    "STORY.SOURCE": {
      "label": "Story: the line under a card, record, date and conditions",
      "kind": "line",
      "section": "Dashboard",
      "value": "{record} · {date}"
    },
    "STORY.CAPABILITIES.NAME": {
      "label": "Story: step 1, short name",
      "kind": "line",
      "section": "Dashboard",
      "value": "Capabilities"
    },
    "STORY.CAPABILITIES.Q": {
      "label": "Story: step 1, the question",
      "kind": "line",
      "section": "Dashboard",
      "value": "How fast is each operation?"
    },
    "STORY.CAPABILITIES.PICK": {
      "label": "Story: step 1, name of the operation chips",
      "kind": "line",
      "section": "Dashboard",
      "value": "Operation"
    },
    "STORY.CAPABILITIES.MEANS": {
      "label": "Story: step 1, what the answer measures",
      "kind": "line",
      "section": "Dashboard",
      "value": "The fastest way to run {op}: {variant}. One machine, no network."
    },
    "STORY.CAPABILITIES.NOTBUILT": {
      "label": "Story: step 1, the fact that lists what is not built",
      "kind": "line",
      "section": "Dashboard",
      "value": "Not built yet"
    },
    "STORY.NOTBUILT.TAG": {
      "label": "Story: step 1, the label under a dotted outline",
      "kind": "line",
      "section": "Dashboard",
      "value": "not built"
    },
    "STORY.CEILING.NAME": {
      "label": "Story: step 3, short name",
      "kind": "line",
      "section": "Dashboard",
      "value": "One node"
    },
    "STORY.CEILING.Q": {
      "label": "Story: step 3, the question",
      "kind": "line",
      "section": "Dashboard",
      "value": "How much does one node take, through the network?"
    },
    "STORY.CEILING.MEANS": {
      "label": "Story: step 3, what the answer measures",
      "kind": "line",
      "section": "Dashboard",
      "value": "At {n} connections, through the real WebSocket wire into one node on an {machine}."
    },
    "STORY.CONN.ONE": {
      "label": "Story: step 3, one connection",
      "kind": "line",
      "section": "Dashboard",
      "value": "{n} connection"
    },
    "STORY.CONN.MANY": {
      "label": "Story: step 3, many connections",
      "kind": "line",
      "section": "Dashboard",
      "value": "{n} connections"
    },
    "STORY.CORE.ONE": {
      "label": "Story: step 4, one core",
      "kind": "line",
      "section": "Dashboard",
      "value": "{n} core"
    },
    "STORY.CORE.MANY": {
      "label": "Story: step 4, many cores",
      "kind": "line",
      "section": "Dashboard",
      "value": "{n} cores"
    },
    "STORY.UNIT.TRANSFERS": {
      "label": "Story: unit, transfers a second",
      "kind": "line",
      "section": "Dashboard",
      "value": "transfers/s"
    },
    "STORY.UNIT.RECORDS": {
      "label": "Story: unit, records a second",
      "kind": "line",
      "section": "Dashboard",
      "value": "records/s"
    },
    "STORY.KEY.CUBE.RATE": {
      "label": "Story: legend, a cube on a rate",
      "kind": "line",
      "section": "Dashboard",
      "value": "One cube = {n} a second"
    },
    "STORY.KEY.CUBE.SWAPS": {
      "label": "Story: legend, a cube on a swap rate",
      "kind": "line",
      "section": "Dashboard",
      "value": "One cube = {n} swaps a second"
    },
    "STORY.KEY.NOTBUILT": {
      "label": "Story: legend, a dotted outline",
      "kind": "line",
      "section": "Dashboard",
      "value": "Dotted outline = not built yet"
    },
    "STORY.KEY.HIGHEST": {
      "label": "Story: legend, the highest column",
      "kind": "line",
      "section": "Dashboard",
      "value": "Highest"
    },
    "STORY.KEY.LIVE": {
      "label": "Story: legend, the live line",
      "kind": "line",
      "section": "Dashboard",
      "value": "Dotted line = live readings, none yet"
    },
    "STORY.LIVE.TAG": {
      "label": "Story: label of the live line",
      "kind": "line",
      "section": "Dashboard",
      "value": "Live readings"
    },
    "UNIT.OPS.S": {
      "label": "Dashboard: unit, operations a second",
      "kind": "line",
      "section": "Dashboard",
      "value": "ops/s"
    },
    "LEGEND.LABEL": {
      "label": "Dashboard: name of the legend of the 3D",
      "kind": "line",
      "section": "Dashboard",
      "value": "How to read the 3D"
    },
    "LEGEND.CHOSEN": {
      "label": "Dashboard: legend, the chosen capability",
      "kind": "line",
      "section": "Dashboard",
      "value": "Chosen"
    }
  }
});
