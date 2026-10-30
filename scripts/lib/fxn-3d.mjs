/* The one door from defxn's Node scripts to the 3D engine, which lives in its own repo (flux/fxn-3d, moved 2026-10-29).
   The card encoder, the card grammar and its builder, and the world encoder import from here and from nowhere else, so
   the engine has one copy and one path. Names only: nothing here does work on import. The browser side reaches the
   engine as /fxn-3d/... (scripts/serve-site.mjs serves that folder from the sibling repo). */
export { loadAtlas, audit } from '../../../fxn-3d/scripts/lib/atlas.mjs';
/* the one sampler of an animation (fxn-3d docs/design/editor/ANIMATE.md): the stage records' tracks are sampled by it in the page and checked by it in the encoder */
export { sample, easeOf } from '../../../fxn-3d/scripts/lib/anim-sample.mjs';
export { NUM } from '../../../fxn-3d/scripts/lib/number-text.mjs';
export { buildReader, report } from '../../../fxn-3d/scripts/lib/grammar-build.mjs';
export { readGlb, primitives, primArea, imageOf, factorsOf, linearMean, channelMean, toSrgbByte, bmpPixels } from '../../../fxn-3d/scripts/lib/mesh/gltf.mjs';
export { WELD, weld, clean } from '../../../fxn-3d/scripts/lib/mesh/weld.mjs';
export { stats, statsLine } from '../../../fxn-3d/scripts/lib/mesh/stats.mjs';
export { voxelSolid } from '../../../fxn-3d/scripts/lib/mesh/voxel.mjs';
export { remesh } from '../../../fxn-3d/scripts/lib/mesh/project.mjs';
export { simplifier } from '../../../fxn-3d/scripts/lib/mesh/qem.mjs';
export { shade, writeBlob, boundsOf, sha } from '../../../fxn-3d/scripts/lib/mesh/blob.mjs';
export { MODE, FLAT, TONE } from '../../../fxn-3d/engine/core/world-tables.mjs';
/* the kit encoder (scripts/lib/kit-three.mjs, 2026-10-30): the engine's procedural geometry (Vec3, Quat, Euler, Mat4, Geo and the primitive surfaces), the same
   rounded box the renderer builds, earcut (Three.js's own triangulator, copied unchanged into the engine), the one spelling of a number, and the MESH writer */
export * as geom from '../../../fxn-3d/engine/authoring/geom.mjs';
export { default as earcut } from '../../../fxn-3d/engine/authoring/earcut.mjs';
export { roundedBox } from '../../../fxn-3d/engine/render/shapes.mjs';
export { numberOf, textOf } from '../../../fxn-3d/scripts/lib/number-text.mjs';
export { writeMesh } from '../../../fxn-3d/engine/formats/mesh.mjs';
