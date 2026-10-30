/* The card's grammar: its labels, in the atlas designer's input shape (docs/design/world-grammar/MESH.md, "Records").
   Owner directive 2026-10-29: "do not compound on one grammar only; build a grammar for each thing in isolation to
   maintain speed." Until that day the card's three kinds (MESH, TEX, PLACE) rode inside the world's W set and
   world/card.flx was read through the world's reader. Now the card has its own reader, generated from this list by
   scripts/card-grammar-build.mjs, and the world's reader no longer knows these kinds. The letters keep the meanings
   MESH.md gave them; only the reader that holds them changed. No fs here, so a page can show the labels too. */

import { NUM } from './fxn-3d.mjs';   /* bounded, one-spelled number text, shared by every grammar here */
export { NUM };

export const KINDS = [
  'MESH',    /* the blob of a view and its byte count: WMESH-R<view>-C<cid>-A<bytes> */
  'TEX',     /* a texture and the slot the blob's draw table refers to: WTEX-C<cid>-I<slot> */
  'PLACE'    /* where the card stands in a view: WPLACE-R<view>-X-Y-Z-D<height>-U<yaw degrees> */
];

export const LABELS = [
  { letter: 'W', name: 'record kind', payload: 'closed-set', values: KINDS, example: 'MESH' },
  { letter: 'R', name: 'view', payload: 'lowercase-alphanumeric', example: 'auth' },                 /* the world view the card is mounted in */
  { letter: 'C', name: 'content id', payload: 'lowercase-hex', evenLength: true, minLength: 64, example: 'a'.repeat(64) },   /* sha256 hex of the mesh blob or a texture */
  { letter: 'A', name: 'byte count', payload: 'digits', example: '31904' },
  { letter: 'I', name: 'texture slot', payload: 'digits', example: '0' },                           /* 0..7, what the draw table refers to */
  { letter: 'X', name: 'x', payload: 'lowercase-alphanumeric', pattern: NUM, example: '0' },
  { letter: 'Y', name: 'y', payload: 'lowercase-alphanumeric', pattern: NUM, example: '4p2' },
  { letter: 'Z', name: 'z', payload: 'lowercase-alphanumeric', pattern: NUM, example: 'm1p5' },
  { letter: 'D', name: 'height', payload: 'lowercase-alphanumeric', pattern: NUM, example: '6p3' },   /* the card's height in world units */
  { letter: 'U', name: 'turn', payload: 'lowercase-alphanumeric', pattern: NUM, example: 'm14' }     /* yaw about +Y in degrees, so the front faces the camera */
];

export const SAMPLE = 'WMESH-Rauth-C' + 'a'.repeat(64) + '-A31904';
export const KIND = 'CARD';
