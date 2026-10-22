/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "references",
  "title": "Reference resolvers",
  "route": "/start-from-something-real",
  "group": "page",
  "meta": {
    "next": "deployment",
    "back": "resolver"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "DEFXN / REFERENCE RESOLVERS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Reference resolvers are not published yet."
    },
    "BODY1": {
      "label": "First paragraph",
      "kind": "text",
      "section": "Page",
      "value": "A reference resolver is a worked example to start from when you build your own. CR3TV and DeArk are named as the first two, but neither has a public record you can inspect yet. Until one does, start from the resolver chains in Resolvers and capabilities: each one opens in Explore."
    },
    "BODY2": {
      "label": "Second paragraph",
      "kind": "text",
      "section": "Page",
      "value": "A name becomes a reference when its record is registered in the evidence registry. Until then, nothing here shows that CR3TV or DeArk is deployed or in production."
    },
    "BODY3": {
      "label": "Closing paragraph",
      "kind": "text",
      "section": "Page",
      "value": "A publishable reference must include its purpose, current status and observation date, resolver or network identifier, source or manifest location, and the exact boundary of what it proves."
    },
    "NEXT": {
      "label": "Onward link",
      "kind": "line",
      "section": "Links",
      "value": "Deploy a resolver"
    },
    "BACK": {
      "label": "Back link",
      "kind": "line",
      "section": "Links",
      "value": "What is a resolver"
    },
    "START.LINK": {
      "label": "Main action: where to start today",
      "kind": "line",
      "section": "Links",
      "value": "Every resolver and capability"
    },
    "START.HREF": {
      "label": "Main action target",
      "kind": "link",
      "section": "Links",
      "value": "route:resolvers"
    },
    "SOURCE.HREF": {
      "label": "Source link target",
      "kind": "link",
      "section": "Links",
      "value": "doc:docs/evidence/registry.md"
    },
    "HOME.HREF": {
      "label": "Breadcrumb: Home link",
      "kind": "link",
      "section": "Links",
      "value": "route:zero"
    }
  }
});
