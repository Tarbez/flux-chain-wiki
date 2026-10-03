/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "bundledeployer",
  "title": "FXN Bundle Deployer",
  "route": "/bundle-deployer",
  "group": "page",
  "meta": {
    "back": "account"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "DEPLOYMENT / LOCAL CLI"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "FXN Bundle Deployer"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Deploy from your own machine. Review what becomes public, then publish with your identity."
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Prepare locally."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Run the FXN Bundle Deployer on your machine when it is released. Your project and editing tools stay local."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Review what becomes public."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Review the content and assets you intend to share before sending your bundle to the mesh."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Publish with your identity."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Sign the site’s mesh ownership record. The current verified mesh owner becomes the site maintainer and controls deployed CMS access."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "The CLI is in development."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "The lightweight FXN Bundle Deployer is not available yet. Installation instructions and supported commands will appear here when it is released."
    },
    "BACK": {
      "label": "Back link",
      "kind": "line",
      "section": "Links",
      "value": "Back to your account"
    },
    "STATUS": {
      "label": "Status",
      "kind": "text",
      "section": "Deployer layout",
      "value": "CLI in development"
    },
    "REQUIREMENT": {
      "label": "Requirement",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Local CLI required"
    },
    "FLOW.TITLE": {
      "label": "Flow / Title",
      "kind": "text",
      "section": "Deployer layout",
      "value": "From your machine to the mesh"
    },
    "FLOW.LOCAL": {
      "label": "Flow / Local",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Your project"
    },
    "FLOW.BUNDLE": {
      "label": "Flow / Bundle",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Reviewed bundle"
    },
    "FLOW.MESH": {
      "label": "Flow / Mesh",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Public mesh"
    },
    "FLOW.NOTE": {
      "label": "Flow / Note",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Planned workflow / CLI not released"
    },
    "WORKFLOW.TITLE": {
      "label": "Workflow / Title",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Three steps. One local tool."
    },
    "BOUNDARY.TITLE": {
      "label": "Boundary / Title",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Choose what you share."
    },
    "BOUNDARY.PUBLIC": {
      "label": "Boundary / Public",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Becomes public"
    },
    "BOUNDARY.LOCAL": {
      "label": "Boundary / Local",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Stays on your machine"
    },
    "PUBLIC1": {
      "label": "Public1",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Site content and selected assets"
    },
    "PUBLIC2": {
      "label": "Public2",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Signed mesh ownership record"
    },
    "PUBLIC3": {
      "label": "Public3",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Public maintainer identity"
    },
    "LOCAL1": {
      "label": "Local1",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Auth Kit and private signing keys"
    },
    "LOCAL2": {
      "label": "Local2",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Recovery phrase, PIN and password"
    },
    "LOCAL3": {
      "label": "Local3",
      "kind": "text",
      "section": "Deployer layout",
      "value": "API credentials and local configuration"
    },
    "BOUNDARY.NOTE": {
      "label": "Boundary / Note",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Review this boundary before publishing. A public bundle is intended to be shared."
    },
    "RELEASE.NOTE": {
      "label": "Release / Note",
      "kind": "text",
      "section": "Deployer layout",
      "value": "Browsing this site or signing in does not deploy a bundle."
    }
  }
});
