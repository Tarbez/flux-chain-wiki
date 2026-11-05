/* The sign-in page's show (docs/design/space/SPACE.md "Shows"). /auth draws its own scene (auth and authtall are
   OWN_SCENE in js/world2/world2-host.mjs): the built world steps out and the stage keeps its own camera, and the FXN ID
   card there follows the sign-in state. The captions are true in every state (none, file, connected, failed). So this show never sends a shot and never spawns: captions only. */
export const SHOW = () => ({ id: 'auth', steps: [
  { at: 0, light: [], say: 'Your FXN ID file signs you in.', n: '01' },
  { at: 3.5, say: 'It is read here and never uploaded.', n: '02' },
  { at: 7, say: null }
] });
