/* The identity page's show (docs/design/space/SPACE.md "Shows"). The identity views (idstart, idsign, idsafe, idyou)
   draw their own scene (OWN_SCENE in js/world2/world2-host.mjs): the built world steps out and the stage keeps its
   own camera. So this show never sends a shot and never spawns: it only lights and captions. */
export const SHOW = () => ({ id: 'identity', steps: [
  { at: 0, light: [], say: 'Your FXN ID is one key file.', n: '01' },
  { at: 3, say: 'It stays on your device.', n: '02' },
  { at: 6, say: 'It signs you into every network.', n: '03' },
  { at: 9.5, say: null }
] });
