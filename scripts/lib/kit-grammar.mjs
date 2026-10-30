/* The Kit's grammar: its labels, in the atlas designer's input shape (docs/design/world-grammar/PORT.md, 2026-10-30 "kit").
   Owner directive 2026-10-29: "build a grammar for each thing in isolation to maintain speed". The Kit's 3D (board 05 of /kit: 30 objects, nine to a page) is its own thing, so it has its own
   grammar and its own reader (js/world2/kit-reader.mjs, generated from this list by scripts/kit-grammar-build.mjs). Nothing here is reserved for another grammar: the letters mean what this
   file says, in this resolver only. A record is one line of boxes split on `-`; each box takes the longest label it starts with; its value is checked against that label's payload rule.
   Free text enters as hex of UTF-8 (X). Big bytes (the shapes, the matrices, the words of the faces) are blobs named by a content id (C), never inlined.
   No fs here, so a page can show the labels too. */
import { NUM } from './fxn-3d.mjs';   /* bounded, one-spelled number text, shared by every grammar here */
export { NUM };

export const KINDS = [
  'CFG',     /* KCFG-N<name>-V<value>: a number of the stage (cells, spacing, scale, the pose's gains, the followers' time constants) */
  'BLOB',    /* KBLOB-N<geo|rows|words>-C<cid>-A<bytes>: a content-addressed file: the shapes (MESH blobs end to end), the part and ring matrices, the faces' words */
  'GEO',     /* KGEO-G<shape>-O<offset>-A<bytes>: where a shape's MESH blob sits in the shapes file */
  'MAT',     /* KMAT-N<name>-F<draw>-V<opacity>-W<metal>-U<rough>-T<coat>-S<coat rough>-B<emission>-L<grain>-J<flags>: how a material draws: F 0 the mesh pass, 1 additive light, 2 a face of words; J bit 0 two-sided, bit 1 no depth write */
  'TINT',    /* KTINT-N<material>-X<hex of a CSS token>-V<weight>-F<slot>: a material's colour is the sum of weights on theme tokens; slot 0 colour, 1 emissive, 2 ink, 3 accent, 4 warning */
  'TOKEN',   /* KTOKEN-X<hex of a CSS token>-N<skin|body>: which element the token is read from (a skin wrapper, or the site's body) */
  'OBJ',     /* KOBJ-I<object>-X<hex of its id>: an object, in the order the stage built them */
  'PART',    /* KPART-I<object>-G<shape>-N<material>-F<face + 1, 0 none>-J<ring + 1, 0 none>-O<draw order>-Q<row>: one part of an object; its matrix is row Q of the rows file */
  'RING',    /* KRING-I<object>-J<ring>-Q<row>: an orbit ring the stage tilts into place; its place, resting tilt and size are row Q of the ring table (the rows file, after the parts) */
  'FACE',    /* KFACE-F<face>-V<width>-W<height>-T<pixels wide>-S<pixels high>-O<offset>-A<bytes>: a face's size, its canvas, and where its calls sit in the words file */
  'CELL',    /* KCELL-I<cell>-V<x>-W<y>-U<z>-T<a>-S<b>-B<plate a>-H<plate b>: a place in the 3 x 3 grid and the windows of the stage's weight in which its object and its floor plate grow */
  'KNOT',    /* KKNOT-N<track>-V<t>-W<value>: one knot of a curve the stage derived (the grow curve, a follower's step response); t runs 0 to 1 */
  'VIEW',    /* KVIEW-N<grid|sel>-V<x>-W<y>-U<z>-T<fit width>-S<fit height>-B<fill>-H<elev>-D<yaw>-E<tilt>-P<step back>: a camera; sel's aim is an offset from its cell */
  'LABEL',   /* KLABEL-V<dx>-W<dy>-U<dz>: where an object's name hangs, from its cell */
  'SHEET'    /* KSHEET-F<0 plate, 1 rim>-G<shape>-N<material>-O<draw order>: the floor under each cell: its shape and material */
];

export const LABELS = [
  { letter: 'K', name: 'record kind', payload: 'closed-set', values: KINDS, example: 'CFG' },
  { letter: 'I', name: 'index', payload: 'digits', example: '3' },                       /* an object, or a cell */
  { letter: 'J', name: 'second index', payload: 'digits', example: '1' },                /* a ring, material flags */
  { letter: 'G', name: 'shape', payload: 'digits', example: '12' },                      /* a shape's number in the shapes file */
  { letter: 'F', name: 'face, draw or slot', payload: 'digits', example: '2' },
  { letter: 'O', name: 'offset or draw order', payload: 'digits', example: '1024' },
  { letter: 'A', name: 'byte count', payload: 'digits', example: '2048' },
  { letter: 'Q', name: 'row', payload: 'digits', example: '40' },
  { letter: 'N', name: 'name', payload: 'lowercase-alphanumeric', example: 'glass' },
  { letter: 'X', name: 'hex text', payload: 'lowercase-hex', evenLength: true, minLength: 2, example: '3035' },   /* hex of UTF-8: an object id, a CSS token's name */
  { letter: 'C', name: 'content id', payload: 'lowercase-hex', evenLength: true, minLength: 64, example: 'a'.repeat(64) },
  ...['V', 'W', 'U', 'T', 'S', 'B', 'H', 'D', 'E', 'P', 'R', 'L'].map((letter, i) => ({ letter, name: ['value', 'second value', 'third value', 'fourth value', 'fifth value', 'sixth value', 'seventh value', 'eighth value', 'ninth value', 'tenth value', 'eleventh value', 'twelfth value'][i], payload: 'lowercase-alphanumeric', pattern: NUM, example: ['2p4', 'm1p5', '0', '1p25', '0p46', '1', '16', '0', '0p8', '1p2', '0', '0'][i] }))
];

export const SAMPLE = 'KCFG-Nsp-V2p4';
export const KIND = 'KIT';
