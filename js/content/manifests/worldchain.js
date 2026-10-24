/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "worldchain",
  "title": "Your chain",
  "route": "/chain",
  "group": "page",
  "meta": {},
  "fields": {
    "COMMON.ROOT": {
      "label": "Shared: root crumb",
      "kind": "line",
      "section": "Shared",
      "value": "DEFXN"
    },
    "COMMON.WHERE": {
      "label": "Shared: \"where you are\" label",
      "kind": "line",
      "section": "Shared",
      "value": "Where you are"
    },
    "COMMON.HERE": {
      "label": "Shared: breadcrumb for this page",
      "kind": "line",
      "section": "Shared",
      "value": "Your chain"
    },
    "COMMON.BACKNETWORK": {
      "label": "Shared: back link to the network",
      "kind": "line",
      "section": "Shared",
      "value": "Back to network"
    },
    "COMMON.BACKCHAIN": {
      "label": "Shared: back link to the chain",
      "kind": "line",
      "section": "Shared",
      "value": "Back to chain"
    },
    "COMMON.BACKRECORD": {
      "label": "Shared: back link to the record",
      "kind": "line",
      "section": "Shared",
      "value": "Back to record"
    },
    "COMMON.SAMPLE": {
      "label": "Shared: \"Sample\" tag",
      "kind": "line",
      "section": "Shared",
      "value": "Sample"
    },
    "COMMON.SIGNED": {
      "label": "Shared: \"Signed\" state",
      "kind": "line",
      "section": "Shared",
      "value": "Signed"
    },
    "COMMON.NOTSIGNED": {
      "label": "Shared: \"Not signed\" state",
      "kind": "line",
      "section": "Shared",
      "value": "Not signed"
    },
    "COMMON.REV": {
      "label": "Shared: short revision",
      "kind": "line",
      "section": "Shared",
      "value": "Rev {n}"
    },
    "COMMON.REVISION": {
      "label": "Shared: revision sentence",
      "kind": "line",
      "section": "Shared",
      "value": "Revision {n}."
    },
    "COMMON.SIGNEDBY": {
      "label": "Shared: \"signed by\" line",
      "kind": "line",
      "section": "Shared",
      "value": "Signed by {name}"
    },
    "COMMON.DEFAULTTYPE": {
      "label": "Shared: default record type",
      "kind": "line",
      "section": "Shared",
      "value": "Record"
    },
    "COMMON.KIND": {
      "label": "Shared: kind line",
      "kind": "line",
      "section": "Shared",
      "value": "{type} · {chain}"
    },
    "COMMON.MISSING": {
      "label": "Shared: dash for a missing value",
      "kind": "line",
      "section": "Shared",
      "value": "—"
    },
    "COMMON.EARLIER": {
      "label": "Shared: earlier revisions line",
      "kind": "line",
      "section": "Shared",
      "value": "Revisions {a}–{b}, kept on file"
    },
    "COMMON.FACT.TYPE": {
      "label": "Shared: fact label, type",
      "kind": "line",
      "section": "Shared",
      "value": "Type"
    },
    "COMMON.FACT.STATE": {
      "label": "Shared: fact label, build state",
      "kind": "line",
      "section": "Shared",
      "value": "State"
    },
    "COMMON.FACT.SIGNEDBY": {
      "label": "Shared: fact label, \"signed by\" line",
      "kind": "line",
      "section": "Shared",
      "value": "Signed by"
    },
    "COMMON.FACT.EARLIER": {
      "label": "Shared: fact label, earlier revisions line",
      "kind": "line",
      "section": "Shared",
      "value": "Earlier"
    },
    "COMMON.FACT.NEXT": {
      "label": "Shared: fact label, next",
      "kind": "line",
      "section": "Shared",
      "value": "Next in chain"
    },
    "COMMON.CONNECTIONS": {
      "label": "Shared: \"Connections\" label",
      "kind": "line",
      "section": "Shared",
      "value": "Connections"
    },
    "COMMON.HISTORY": {
      "label": "Shared: \"History\" label",
      "kind": "line",
      "section": "Shared",
      "value": "History"
    },
    "FLOW.LABEL": {
      "label": "Flow strip: label",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Your identity, in nine steps"
    },
    "FLOW.STEP": {
      "label": "Flow strip: step",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Step {n} of 9 · {label}"
    },
    "FLOW.BACK": {
      "label": "Flow strip: back link",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Back: {label}"
    },
    "FLOW.NEXT": {
      "label": "Flow strip: next",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Next: {label}"
    },
    "FLOW.GOTO": {
      "label": "Flow strip: jump-to-step link",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Step {n}: {label}"
    },
    "FLOW.S1": {
      "label": "Flow strip: step 1",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Your FXN ID"
    },
    "FLOW.S2": {
      "label": "Flow strip: step 2",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Signing in"
    },
    "FLOW.S3": {
      "label": "Flow strip: step 3",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Security"
    },
    "FLOW.S4": {
      "label": "Flow strip: step 4",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Your identity"
    },
    "FLOW.S5": {
      "label": "Flow strip: step 5",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Your chain"
    },
    "FLOW.S6": {
      "label": "Flow strip: step 6",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Revisions"
    },
    "FLOW.S7": {
      "label": "Flow strip: step 7",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Record"
    },
    "FLOW.S8": {
      "label": "Flow strip: step 8",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Connections"
    },
    "FLOW.S9": {
      "label": "Flow strip: step 9",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "One identity, many chains"
    },
    "CHAIN.TITLE": {
      "label": "Chain page: heading",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Your chain."
    },
    "CHAIN.SUB": {
      "label": "Chain page: line under the heading",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "{n} records."
    },
    "CHAIN.LEDE": {
      "label": "Chain page: intro",
      "kind": "text",
      "section": "Your chain (/chain)",
      "value": "A record counts once your key signs it. Each one links to the one before it."
    },
    "CHAIN.CELL.RECORDS": {
      "label": "Chain page: cell, records",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Records"
    },
    "CHAIN.CELL.NEWEST": {
      "label": "Chain page: cell, newest",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Newest"
    },
    "CHAIN.CELL.SIGNED": {
      "label": "Chain page: cell, \"Signed\" state",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Signed"
    },
    "CHAIN.OF": {
      "label": "Chain page: \"of\" connector",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "{n} of {total}"
    },
    "CHAIN.LINKSTO": {
      "label": "Chain page: \"links to\"",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Links to"
    },
    "CHAIN.ISFIRST": {
      "label": "Chain page: first-record text",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "It is the first record."
    },
    "CHAIN.TABS": {
      "label": "Chain page: tab group name",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Your chain"
    },
    "CHAIN.TAB.RECORDS": {
      "label": "Chain page: tab name, records",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Records"
    },
    "CHAIN.TAB.ACTIVITY": {
      "label": "Chain page: tab name, activity line",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Activity"
    },
    "CHAIN.NOACTIVITY": {
      "label": "Chain page: no-activity text",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "No activity in this sample."
    },
    "CHAIN.ACTIVITY": {
      "label": "Chain page: activity line",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "{title} · by {by}"
    },
    "CHAIN.TURN.LABEL": {
      "label": "Chain page: ring control, label",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Turn the ring"
    },
    "CHAIN.TURN.NEWER": {
      "label": "Chain page: ring control, newer",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Newer record"
    },
    "CHAIN.TURN.OLDER": {
      "label": "Chain page: ring control, older",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Older record"
    },
    "CHAIN.CTA": {
      "label": "Chain page: button",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "View record"
    },
    "CHAIN.TAG.KEY": {
      "label": "Chain page: label drawn in the 3D scene, key",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Your chain"
    },
    "CHAIN.TAG.KEYSUB": {
      "label": "Chain page: label drawn in the 3D scene, keysub",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "{n} records"
    },
    "CHAIN.TAG.OLDEST": {
      "label": "Chain page: label drawn in the 3D scene, oldest",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Oldest"
    },
    "CHAIN.TAG.NEWEST": {
      "label": "Chain page: label drawn in the 3D scene, newest",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Newest"
    },
    "RECORD.NODESC": {
      "label": "Revisions page: no-description text",
      "kind": "line",
      "section": "Revisions (/chain/record)",
      "value": "No description in this sample."
    },
    "RECORD.TIMELINE": {
      "label": "Revisions page: timeline label",
      "kind": "line",
      "section": "Revisions (/chain/record)",
      "value": "Records by date"
    },
    "RECORD.CTA": {
      "label": "Revisions page: button",
      "kind": "line",
      "section": "Revisions (/chain/record)",
      "value": "Open record"
    },
    "RECORD.TAG.NEXT": {
      "label": "Revisions page: label drawn in the 3D scene, next",
      "kind": "line",
      "section": "Revisions (/chain/record)",
      "value": "Next in chain"
    },
    "RECORD.TAG.REV": {
      "label": "Revisions page: label drawn in the 3D scene, short revision",
      "kind": "line",
      "section": "Revisions (/chain/record)",
      "value": "Rev {n}"
    },
    "OPEN.TABS": {
      "label": "Record page: tab group name",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Record"
    },
    "OPEN.TAB.CONTENT": {
      "label": "Record page: tab name, content",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Content"
    },
    "OPEN.TAB.DETAILS": {
      "label": "Record page: tab name, details",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Details"
    },
    "OPEN.TAB.SIGNATURE": {
      "label": "Record page: tab name, signature",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Signature"
    },
    "OPEN.TAB.HISTORY": {
      "label": "Record page: tab name, \"History\" label",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "History"
    },
    "OPEN.CTA": {
      "label": "Record page: button",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "See connections"
    },
    "OPEN.NOCONTENT": {
      "label": "Record page: no-content text",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "No content in this sample."
    },
    "OPEN.DETAILS.CHAIN": {
      "label": "Record page: details, chain",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Chain"
    },
    "OPEN.DETAILS.REVISION": {
      "label": "Record page: details, revision sentence",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Revision"
    },
    "OPEN.DETAILS.EARLIER": {
      "label": "Record page: details, earlier revisions line",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Earlier"
    },
    "OPEN.SIG.TYPE": {
      "label": "Record page: sig, type",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Type"
    },
    "OPEN.SIG.TITLE": {
      "label": "Record page: sig, heading",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Title"
    },
    "OPEN.SIG.DATE": {
      "label": "Record page: sig, date",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Date"
    },
    "OPEN.SIG.LINKS": {
      "label": "Record page: sig, links",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Links to"
    },
    "OPEN.SIG.SIGNATURE": {
      "label": "Record page: sig, signature",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Signature"
    },
    "OPEN.SIG.FIRST": {
      "label": "Record page: sig, first line",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Nothing: it is first"
    },
    "OPEN.SIG.YOURKEY": {
      "label": "Record page: sig, \"your key\" text",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Your key"
    },
    "OPEN.SIG.NOTSIGNED": {
      "label": "Record page: sig, \"Not signed\" state",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Not signed"
    },
    "OPEN.SIG.CAPTION": {
      "label": "Record page: sig, caption",
      "kind": "text",
      "section": "Record (/chain/open)",
      "value": "One signed entry on a chain. It is small, packed text in a fixed grammar, with the signature last."
    },
    "OPEN.SIG.SIGNED": {
      "label": "Record page: sig, \"Signed\" state",
      "kind": "text",
      "section": "Record (/chain/open)",
      "value": "Signed by {name}, on {date}. The signature is the last field of the record. Anyone with your public key can check it."
    },
    "OPEN.SIG.NOTE": {
      "label": "Record page: sig, note",
      "kind": "text",
      "section": "Record (/chain/open)",
      "value": "A signature shows who signed. It does not show that the words are right."
    },
    "OPEN.SIG.NONE": {
      "label": "Record page: sig, empty text",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Not signed in this sample. A record counts once its key signs it."
    },
    "OPEN.HISTORY.STEP": {
      "label": "Record page: \"History\" label, step",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "{what} by {by}"
    },
    "OPEN.HISTORY.KEPT": {
      "label": "Record page: \"History\" label, kept",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "Revisions {a}–{b} kept on file. Nothing is rewritten."
    },
    "OPEN.HISTORY.NONE": {
      "label": "Record page: \"History\" label, empty text",
      "kind": "line",
      "section": "Record (/chain/open)",
      "value": "No history in this sample."
    },
    "LINKS.EYEBROW": {
      "label": "Connections page: small heading above",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Connections"
    },
    "LINKS.SUB": {
      "label": "Connections page: line under the heading",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "What it links to."
    },
    "LINKS.G.LINKSTO": {
      "label": "Connections page: group, \"links to\"",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Links to"
    },
    "LINKS.G.LINKEDFROM": {
      "label": "Connections page: group, \"linked from\"",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Linked from"
    },
    "LINKS.G.EARLIER": {
      "label": "Connections page: group, earlier revisions line",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Earlier"
    },
    "LINKS.G.RELATED": {
      "label": "Connections page: group, related",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Related"
    },
    "LINKS.G.SIGNEDBY": {
      "label": "Connections page: group, \"signed by\" line",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Signed by"
    },
    "LINKS.BEFORE": {
      "label": "Connections page: record before",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "The record before it"
    },
    "LINKS.AFTER": {
      "label": "Connections page: record after",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "The record after it"
    },
    "LINKS.NONE.LINKSTO": {
      "label": "Connections page: empty text, \"links to\"",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Nothing. It is the first record."
    },
    "LINKS.NONE.LINKEDFROM": {
      "label": "Connections page: empty text, \"linked from\"",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Nothing yet. It is the newest record."
    },
    "LINKS.EARLIERNOTE": {
      "label": "Connections page: earliernote",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Kept on file. Nothing is rewritten."
    },
    "LINKS.NONE.EARLIER": {
      "label": "Connections page: empty text, earlier revisions line",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "No earlier versions in this sample."
    },
    "LINKS.NONE.RELATED": {
      "label": "Connections page: empty text, related",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "No related records in this sample."
    },
    "LINKS.RELATEDNOTE": {
      "label": "Connections page: related-record note",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "{note} · sample"
    },
    "LINKS.SIGNEDDATE": {
      "label": "Connections page: signed-date line",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Signed {date}"
    },
    "LINKS.NONE.SIGNEDBY": {
      "label": "Connections page: empty text, \"signed by\" line",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Not signed in this sample."
    },
    "LINKS.LEGEND": {
      "label": "Connections page: legend",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "What the lines mean"
    },
    "LINKS.LEGEND.LINK": {
      "label": "Connections page: legend, link text",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Chain link"
    },
    "LINKS.LEGEND.DOTS": {
      "label": "Connections page: legend, related-record legend",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Related record"
    },
    "LINKS.LEGEND.GHOST": {
      "label": "Connections page: legend, earlier-version legend",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Earlier version"
    },
    "LINKS.LEGEND.KEY": {
      "label": "Connections page: legend, key",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Signed by your key"
    },
    "LINKS.CTA": {
      "label": "Connections page: button",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Open record"
    },
    "LINKS.TAG.GHOSTS": {
      "label": "Connections page: label drawn in the 3D scene, earlier versions",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Earlier versions"
    },
    "LINKS.TAG.GHOSTSSUB": {
      "label": "Connections page: label drawn in the 3D scene, earlier versions caption",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Kept on file"
    },
    "LINKS.TAG.KEY": {
      "label": "Connections page: label drawn in the 3D scene, key",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Your key"
    },
    "LINKS.TAG.SIGNEDIT": {
      "label": "Connections page: label drawn in the 3D scene, \"signed it\"",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Signed it"
    },
    "LINKS.TAG.NOTSIGNED": {
      "label": "Connections page: label drawn in the 3D scene, \"Not signed\" state",
      "kind": "line",
      "section": "Connections (/chain/links)",
      "value": "Has not signed it"
    }
  }
});
