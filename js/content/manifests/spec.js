/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "spec",
  "title": "Benchmarks",
  "route": "/concept/spec",
  "group": "theory",
  "meta": {
    "placement": "rail",
    "next": "download",
    "docs": "docs/protocol/benchmarks.md",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / BENCHMARKS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "What can the current benchmark evidence support?"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "No canonical public benchmark artifact is registered in this repository. Performance numbers remain unverified until their workload, environment, source revision, method, raw output, and digest can be inspected together."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "REVIEW THE EVIDENCE STANDARD"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Current conclusion: Unverified."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Historical numbers appear in project material, but the evidence registry does not contain the complete reproducible artifacts required to publish them as verified results."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Comparable tests must share a mode."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Sequential, concurrent, local-process, multi-host, and rate-limited external runs answer different questions. They must not be collapsed into one multiplier."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Incomplete runs remain incomplete."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "A smoke sample or unfinished soak cannot be presented as sustained performance, a ceiling, or a production-readiness result."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Every result needs its conditions."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "A publishable record names hardware, operating system, network conditions, dataset, warm-up, repetitions, aggregation method, units, uncertainty, and known limitations."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Raw artifacts come before the headline."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "The evidence registry must link the raw result and digest before a public page can promote a measurement from Unverified to Live or Partial."
    },
    "STATUS.TITLE": {
      "label": "Status heading",
      "kind": "line",
      "section": "Evidence",
      "value": "Status / Unverified"
    },
    "STATUS.TEXT": {
      "label": "Status text",
      "kind": "text",
      "section": "Evidence",
      "value": "BENCH-001 has no complete public benchmark artifact. This page therefore publishes the evidence standard, not unsupported performance numbers."
    },
    "LIMIT.TITLE": {
      "label": "Limitation heading",
      "kind": "line",
      "section": "Evidence",
      "value": "No cross-system conclusion"
    },
    "LIMIT.TEXT": {
      "label": "Limitation text",
      "kind": "text",
      "section": "Evidence",
      "value": "No current throughput, latency, scale, or external-chain comparison is verified by the evidence registered here."
    },
    "EVIDENCE": {
      "label": "Canonical evidence link",
      "kind": "line",
      "section": "Links",
      "value": "READ THE BENCHMARK STANDARD"
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "RUN FLUX FROM SOURCE"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
