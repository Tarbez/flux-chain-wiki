/* Live-tunable relief tuning and per-page shape images
   (js/halo/image-shape.js, js/zero-webgl.js). Edit these in
   admin.html -> a page's Shapes tab; this file is not meant for
   hand editing. */
ArkMeshSettings.define({
  "tuning": {
    "gamma": 1.5,
    "depth": 0.7,
    "lightLo": 0.4,
    "lightSpan": 0.34,
    "lightExp": 0.8,
    "minLight": 0.03,
    "loPercentile": 0.2,
    "hiPercentile": 0.95,
    "yBase": 0.2,
    "yScale": 0.8,
    "primaryParticles": 19200,
    "surfaceParticles": 24000
  },
  "pages": {
    "zero": {
      "primary": "iceberg-blocks",
      "surface": null,
      "primaryMode": "none",
      "surfaceMode": "none",
      "hidden": true,
      "size": 1,
      "x": 0,
      "y": 0
    },
    "proximity": {
      "primary": null,
      "surface": null,
      "primaryMode": "built-in",
      "surfaceMode": "built-in",
      "hidden": false,
      "size": 1,
      "x": 0,
      "y": 0
    },
    "lab": {
      "primary": null,
      "surface": null,
      "primaryMode": "built-in",
      "surfaceMode": "built-in",
      "hidden": false,
      "size": 1,
      "x": 0,
      "y": 0
    },
    "about": {
      "primary": null,
      "surface": null,
      "primaryMode": "built-in",
      "surfaceMode": "built-in",
      "hidden": false,
      "size": 1,
      "x": 0,
      "y": 0
    },
    "concept": {
      "primary": "iceberg-blocks",
      "surface": null,
      "primaryMode": "image",
      "surfaceMode": "built-in",
      "hidden": false,
      "size": 1,
      "x": 0,
      "y": 0
    }
  }
});
