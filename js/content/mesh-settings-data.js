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
      "primary": null,
      "surface": null
    },
    "proximity": {
      "primary": null,
      "surface": null
    },
    "lab": {
      "primary": null,
      "surface": null
    },
    "about": {
      "primary": null,
      "surface": null
    },
    "concept": {
      "primary": "iceberg-blocks",
      "surface": null
    }
  }
});
