/* DEFXN mockup ring kit: the one 3D world the mockup app draws (network, chain, record, card).

   One home for the clear canvas and its glow and tone pass, the theme colours and their repaint
   (rule R33), the tile with its glyph, pin, post, bead and chain link, the dotted lines, the
   pearls, the soft shadow, the timeline and the mouse reaction. The app says where things go.

   Camera. The app owns the camera's view: k.cam = { aim, dist, elev, yaw, tilt } and the design
   frame (k.setFrame), and may change them every frame, so one view flies into the next with no
   cut. On first load the kit adds a short fly-in on top.

   Mouse. The camera leans by k.cam.tilt toward the pointer, and the tile under the pointer
   lifts. Both ease and stop when they arrive: frames run only while something moves (home motion
   law: every animation settles, no idle frame loop). Reduced motion: no lean, no fly-in.

   Speed, measured against what each frame costs. The renderer is made once for the whole app,
   never per page. Shadows are drawn only while tiles move (k.moved), not while only the camera
   moves. The glow pass works at a quarter of the screen and smaller. Drawn pixels are capped near
   2.6 million.
   SKINS: a card skin never recolours the grid (the owner, 2026-10-24: "never"). The theme is the site's own; a host
   that wants its world to follow a skin opts in with data-world-skin="follow" (below).
   Needs window.DEFXNDependencies (js/vendor/three-r180-defxn.js, the one copy, shared with the NFT card). */
(function () {
  'use strict';
  window.DEFXNRingKit = { start: start };

  function start(o) {
    var canvas = o.canvas, k = null;
    function bail() { canvas.parentElement.remove(); return null; }
    var deps = window.DEFXNDependencies;
    if (!deps) return bail();
    var THREE = deps.THREE, RoundedBoxGeometry = deps.RoundedBoxGeometry, RoomEnvironment = deps.RoomEnvironment;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return bail(); }
    if (!renderer.capabilities.isWebGL2) return bail();
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   /* the composite pass encodes sRGB itself */
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;

    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var scene = new THREE.Scene();
    k = { THREE: THREE, scene: scene, renderer: renderer, reduced: reduced, C: {}, sets: [], ptr: { x: 0, y: 0 } };

    /* ---------- theme ---------- */
    /* SKINS (docs/home-redesign/SKIN-CONTRACT.md). The owner, 2026-10-24: a card skin never recolours the core 3D
       grid ("do not alter our core 3D illustrations of the grid"; asked whether it takes the card's colours: "never").
       So the theme is read from body, the site's own theme: a skin set on a wrapper below body (#scene) is not seen,
       and a skin change does not repaint. The world repaints on the :root class, style, data-theme and dark-mode
       triggers only; there is no polling and no style observer.
       A host whose world should follow a skin (the Genesis scene copies this kit) puts data-world-skin="follow" on an
       ancestor of the canvas: then the theme is read from the nearest data-defxn-skin / data-ark-skin wrapper, and the
       world repaints once on the bubbling defxn:skin and ark:skin events (k.go). Even then the chain kinds, the networks
       and --ember are never skinned: they are always read from body. */
    var LOCKED = /^--(chain-|net-|ember$)/;
    function follows() { return !!(canvas.closest && canvas.closest('[data-world-skin="follow"]')); }
    function themeBox() { return (follows() && canvas.closest('[data-defxn-skin],[data-ark-skin]')) || document.body || document.documentElement; }
    function readTheme() {
      var css = getComputedStyle(themeBox()), locked = getComputedStyle(document.body || document.documentElement);
      function tok(name, fallback) {
        var v = (LOCKED.test(name) ? locked : css).getPropertyValue(name).trim();
        return new THREE.Color(v ? 'hsl(' + v.split(/\s+/).join(', ') + ')' : fallback);
      }
      k.C = { canvas: tok('--canvas', '#0a100d'), strong: tok('--text-strong', '#f3f8f4'), text: tok('--text', '#c3cdd6'),
        muted: tok('--text-muted', '#9aa3a8'), record: tok('--record', '#e6e1d8'), signal: tok('--signal', '#3fd1a8'),
        identity: tok('--chain-identity', '#bcc3c8'), network: tok('--chain-network', '#378f7c'),
        token: tok('--chain-token', '#525a5d'), resolver: tok('--chain-resolver', '#667e88'), pool: tok('--chain-pool', '#8e8a9f'),
        ledger: tok('--chain-ledger', '#3aa88a'), ember: tok('--ember', '#f7752a'),   /* the record descent's chain-block edge */
        netFxn: tok('--net-fxn', '#3d8f7c'), netDeark: tok('--net-deark', '#b5764a'), netCr3tv: tok('--net-cr3tv', '#b07890'),   /* a network's coin ledger, at its centre (main, audit 4) */
        other: tok('--chain-other', '#525a5d') };
    }
    readTheme();
    function mix(a, b, t) { return k.C[a].clone().lerp(k.C[b], t); }
    k.mix = mix;

    /* ---------- light ---------- */
    var pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, .04).texture; scene.environmentIntensity = .16;   /* cinematic pass (2026-10-24): start from darkness */
    room.dispose(); pmrem.dispose();
    var hemi = new THREE.HemisphereLight(0xffffff, 0x000000, .9); scene.add(hemi);
    /* the key comes from the left and from behind, never from the camera: the camera side of each ring
       sits mostly in shade, and the backlight below draws its edge off the floor (the law of the dark side) */
    var key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-30, 26, -8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -40; key.shadow.camera.right = 40; key.shadow.camera.top = 40; key.shadow.camera.bottom = -40;
    key.shadow.camera.near = 1; key.shadow.camera.far = 140;
    key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.radius = 9;   /* a large soft key for the calm wide network */
    scene.add(key); scene.add(key.target);
    var KEY_OFF = new THREE.Vector3(-30, 26, -8);
    /* The shadow map covers only the area in view (audit 3, fix 37): one 2048 map over 80 world
       units is soft and blocky up close; over the view's own area it is sharp. Fitted to the union of
       both views at a flight's start, then to the new view at its end; shadows redraw only then. */
    k.shadowFit = function (c, r) {
      key.target.position.copy(c); key.target.updateMatrixWorld();
      key.position.copy(c).add(KEY_OFF);
      var cam = key.shadow.camera; cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate = true;
    };
    var fill = new THREE.DirectionalLight(0xffffff, .2); fill.position.set(18, 8, 22); scene.add(fill);   /* the cool sky: low, so the camera side stays in shade but its words still read */
    /* art direction (audit 4, MOTION-SPEC.md): a cool light from behind draws each object's edge,
       so shapes read against the dark canvas without lifting the whole scene's brightness */
    var rimL = new THREE.DirectionalLight(0xffffff, 1.05); rimL.position.set(10, 14, -34); scene.add(rimL);
    hemi.intensity = .22;   /* near darkness: forms read by their key and rim light, and by the lights in frame */
    /* motivated lights: each has its source in frame. The ground logo's teal glow and, on #/trace, the
       ember record block (home-descent.js places them and sets their strength; 0 is off). They are
       always in the scene, so turning one on never recompiles a shader. */
    k.lights = { logo: new THREE.PointLight(0xffffff, 0, 16, 2), ember: new THREE.PointLight(0xffffff, 0, 12, 2) };
    scene.add(k.lights.logo); scene.add(k.lights.ember);
    /* atmosphere: a cool, thin fog that starts just before what the view looks at and thickens behind
       it, so far rings lose contrast and take the air's colour (the fake depth of field); set per view */
    scene.fog = new THREE.Fog(0x000000, 80, 200);

    /* ---------- camera ---------- */
    var cfg = o.camera;   /* { fov, elev (deg), dist, aim: [x, y, z], design: aspect } */
    var camera = new THREE.PerspectiveCamera(cfg.fov, cfg.design || 1.6, cfg.near || 1, cfg.far || 400);
    k.camera = camera;
    k.cam = { aim: new THREE.Vector3().fromArray(cfg.aim || [0, 0, 0]), dist: cfg.dist, elev: THREE.MathUtils.degToRad(cfg.elev), yaw: 0,
      tilt: reduced ? 0 : THREE.MathUtils.degToRad(o.tilt == null ? 2.2 : o.tilt) };
    var intro = o.intro || {};
    var FLY_AT = 0, FLY_WAIT = 0, FLY = intro.fly || 4400, FROM_DIST = intro.dist || 1.16, FROM_ELEV = THREE.MathUtils.degToRad(intro.elev == null ? 3 : intro.elev),
      FROM_YAW = THREE.MathUtils.degToRad(intro.yaw == null ? 2 : intro.yaw);
    /* a first view that is not the network starts in place: no fly-in to undo */
    k.skipIntro = function () { FROM_DIST = 1; FROM_ELEV = 0; FROM_YAW = 0; };
    /* a first view that brings its own arrival (the intro's welcome, chains-scene.js api.to): where the camera
       starts relative to the view (distance factor, extra height and turn in degrees) and how long it takes */
    k.setIntro = function (o) {
      FROM_DIST = o.dist; FROM_ELEV = THREE.MathUtils.degToRad(o.elev); FROM_YAW = THREE.MathUtils.degToRad(o.yaw); FLY = o.fly;
      /* Counted from the second frame drawn after this, the first one the page shows (world-host.js reveals the canvas
         two frames after the first flight): the first frame compiles every shader, 100-380 ms on a slow CPU and seconds
         in a software renderer, and a clock started earlier spent the glide while the canvas was still hidden. Not the
         world's clock either: a return visit's skipped build has moved that past any fly-in. */
      FLY_AT = null; FLY_WAIT = 1;
    };
    function place(cam, aim, dist, elev, yaw) {
      cam.position.set(aim.x + dist * Math.cos(elev) * Math.sin(yaw), aim.y + dist * Math.sin(elev), aim.z + dist * Math.cos(elev) * Math.cos(yaw));
      cam.lookAt(aim); cam.updateMatrixWorld();
    }
    /* a point of the design frame (u, v from 0 to 1, top left), cast onto the plane at height h,
       as seen from the design view (the start view, no fly-in) */
    var design = new THREE.PerspectiveCamera(cfg.fov, cfg.design || 1.6, cfg.near || 1, cfg.far || 400);
    place(design, k.cam.aim, cfg.dist, k.cam.elev, 0);
    var caster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2();
    k.at = function (u, v, h) {
      ndc.set(u * 2 - 1, 1 - v * 2); caster.setFromCamera(ndc, design);
      plane.constant = -h; var out = new THREE.Vector3(); caster.ray.intersectPlane(plane, out); return out;
    };
    var W = 1, H = 1;
    /* a world point to screen pixels (null when behind the camera) */
    var pv = new THREE.Vector3();
    k.project = function (v, out) {
      pv.copy(v).project(camera);
      if (pv.z > 1) return null;
      out = out || {}; out.x = (pv.x + 1) / 2 * W; out.y = (1 - pv.y) / 2 * H; return out;
    };

    /* ---------- easing ---------- */
    function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function bezier(x1, y1, x2, y2) {
      function at(a, b, t) { return ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t; }
      function slope(a, b, t) { return 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a; }
      return function (x) {
        x = clamp01(x); if (x === 0 || x === 1) return x;
        var t = x;
        for (var i = 0; i < 6; i++) { var d = slope(x1, x2, t); if (Math.abs(d) < 1e-6) break; t -= (at(x1, x2, t) - x) / d; }
        return at(y1, y2, clamp01(t));
      };
    }
    k.ease = {
      clamp01: clamp01,
      out: function (x) { return 1 - Math.pow(1 - x, 3); },
      inOut: function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
      back: function (x) { var c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
      /* the CSS --glide curve, cubic-bezier(.22,.7,.18,1): the words and the things they name land alike */
      glide: bezier(.22, .7, .18, 1)
    };

    /* ---------- the tile ----------
       Tile units: width 1, x along the chain, y up, z out of the face. */
    var LIFT = .16, HALF_D = .15;
    k.LIFT = LIFT; k.HALF_D = HALF_D; k.SLOT = 1.28;
    /* "Cyber pro" (owner, 2026-10-23: "angular, with a touch of softness"): a chamfered slab with a
       micro-rounded edge, not a pillow. The face sits flush with the glyph bars, so they read engraved. */
    var bodyGeo = new RoundedBoxGeometry(1, 1, .28, 4, .028);    /* the bevel rule: a tenth of its thinnest side */
    var panelGeo = new RoundedBoxGeometry(1, 1, .28, 4, .028);   /* a tile that opens into a page: the same corner */
    var barGeo = new THREE.BoxGeometry(1, 1, 1);
    var pinGeo = new THREE.CylinderGeometry(.03, .03, .16, 8);
    var postGeo = new THREE.CylinderGeometry(.025, .025, LIFT, 6);
    var beadGeo = new THREE.SphereGeometry(.045, 10, 6);
    var linkGeo = new RoundedBoxGeometry(1, .24, .12, 4, .012);   /* a link: a precise bar, not a sausage */
    var holeGeo = new THREE.BoxGeometry(.2, .11, .16);
    var glyphMat = new THREE.MeshStandardMaterial({ roughness: .85 });
    var metalMat = new THREE.MeshStandardMaterial({ roughness: .35, metalness: .45 });
    var beadMat = new THREE.MeshStandardMaterial({ emissiveIntensity: .45 });
    var linkMat = new THREE.MeshStandardMaterial({ roughness: .55, metalness: .2 });
    var holeMat = new THREE.MeshStandardMaterial({ roughness: .9 });
    function M4() { return new THREE.Matrix4(); }
    function local(x, y, z) { return M4().makeTranslation(x, y, z); }
    var P = { body: local(0, LIFT + .5, 0), pin: local(0, LIFT + 1.08, 0), post: local(0, LIFT / 2, -.08),
      bead: local(0, .045, -.1), link: local(0, LIFT + .5, -.03) };
    k.P = P;
    /* glyph bars: x, y (from the face centre), width, height, turn (radians) */
    var GLYPH = {
      iii: [[-.11, 0, .055, .3], [0, 0, .055, .3], [.11, 0, .055, .3]],
      doc: [[0, .1, .3, .035], [0, .03, .3, .035], [0, -.04, .3, .035], [-.04, -.11, .22, .035]],
      img: [[0, .14, .4, .03], [0, -.14, .4, .03], [-.185, 0, .03, .28], [.185, 0, .03, .28],
        [-.07, -.06, .17, .03, .8], [.05, -.07, .15, .03, -.7], [.09, .06, .05, .05]],
      /* one glyph per kind of chain (audit 4: the kinds differed only by colour) */
      person: [[0, .1, .11, .11], [0, -.07, .27, .07], [-.12, -.1, .05, .07], [.12, -.1, .05, .07]],                  /* identity */
      rules: [[-.16, 0, .035, .28], [.03, .1, .26, .035], [.03, .02, .26, .035], [.03, -.06, .26, .035], [-.02, -.13, .16, .035]],   /* resolver: a rulebook */
      coin: [[0.130, 0.000, .075, .032, 1.571], [0.092, 0.092, .075, .032, 2.356], [0.000, 0.130, .075, .032, 3.142], [-0.092, 0.092, .075, .032, 3.927], [-0.130, 0.000, .075, .032, 4.712], [-0.092, -0.092, .075, .032, 5.498], [-0.000, -0.130, .075, .032, 6.283], [0.092, -0.092, .075, .032, 7.069], [0, 0, .035, .12]],   /* token ledger */
      arrows: [[0, .06, .26, .035], [.1, .1, .085, .03, -.75], [.1, .02, .085, .03, .75], [0, -.07, .26, .035], [-.1, -.03, .085, .03, .75], [-.1, -.11, .085, .03, -.75]],   /* pool: a swap */
      net: [[-.12, -.07, .07, .07], [.12, -.07, .07, .07], [0, .12, .07, .07], [-.06, .025, .03, .19, -.55], [.06, .025, .03, .19, .55], [0, -.07, .19, .03]],   /* network chain */
      none: []
    };
    k.GLYPH = GLYPH;   /* shared with pieces built outside the kit (home-helix.js) */
    function glyphParts(g) {
      var out = [];
      (GLYPH[g] || GLYPH.none).forEach(function (b) {
        [HALF_D, -HALF_D].forEach(function (z) {
          out.push(local(b[0], LIFT + .48 + b[1], z).multiply(M4().makeRotationZ(b[4] || 0)).multiply(M4().makeScale(b[2], b[3], .03)));
        });
      });
      return out;
    }

    /* Tile colour by kind: the theme's chain colours as they are (they are calm already). */
    var NODE = { hub: 1, identity: 1, resolver: 1, token: 1, pool: 1, network: 1, ledger: 1 };
    function tone(kind, m) {
      m.emissive.setRGB(0, 0, 0); m.emissiveIntensity = 0; m.transparent = false; m.opacity = 1; m.depthWrite = true;
      if (kind === 'hub') m.color.copy(mix('identity', 'strong', .25));
      else if (kind === 'record') m.color.copy(k.C.record);
      else if (kind === 'ghost') { m.color.copy(mix('record', 'other', .3)); m.transparent = true; m.opacity = .26; m.depthWrite = false; }
      else if (kind === 'plain') m.color.setRGB(1, 1, 1);   /* the app tints each tile (set.tint) */
      /* a page: dark glass the words sit on; a faint gloss on its face and a soft sheen on its edge (fix 39) */
      /* audit 4: the page read as grey gloss with a light streak; it is matte dark glass now, with
         the sheen kept on its edge only */
      else if (kind === 'page') { m.color.copy(k.C.canvas).multiplyScalar(.2); m.roughness = .78; m.clearcoat = .1; m.clearcoatRoughness = .5;
        m.sheen = .45; m.sheenRoughness = .5; m.sheenColor.copy(k.C.muted).multiplyScalar(.4); m.envMapIntensity = .35; }
      else if (kind === 'rim') { m.color.copy(mix('canvas', 'muted', .32)); m.roughness = .4; }   /* the thin light edge round a page */
      else m.color.copy(k.C[kind] || k.C.other);
      /* a coin ledger glows from within: the coin at its network's centre (owner: "an inner glow") */
      if (kind === 'ledger') { m.emissive.copy(k.C.ledger); m.emissiveIntensity = .32; }
      /* a clear glass coat over the satin core, and a faint cool sheen on the edge: the touch of softness */
      if (m.sheenColor && kind !== 'page') { m.sheen = .32; m.sheenRoughness = .42; m.sheenColor.copy(mix('strong', 'signal', .35)).multiplyScalar(.3); }
      /* the network's nodes are matte ceramic in their brand colours (the record descent board's palette,
         2026-10-24): almost no coat, a soft sheen. Records keep the glass coat. */
      if (NODE[kind]) { m.roughness = .72; m.clearcoat = .12; m.clearcoatRoughness = .55; m.sheen = .18; m.sheenRoughness = .7; }
      /* FLOATING GLASS CHAINS (owner, 2026-10-25: the chains take the glass of the /auth screens). A chain's tile is
         translucent glass now (auth-stage.js's card: low roughness, a full clear coat, some metal, no depth written),
         so a ring over another ring, or over the grid, shows through it. Its edge catches light: the glass-edge map
         lights a thin band round every face, tinted by the tile's own colour (tileMaterial below), the way the auth
         card's lit frame bars outline its body. The ledger keeps its inner glow, on its edge. */
      if (NODE[kind]) {
        m.transparent = true; m.opacity = k.GLASS; m.depthWrite = false;
        m.roughness = .2; m.metalness = .35; m.clearcoat = 1; m.clearcoatRoughness = .1; m.envMapIntensity = 1;
        m.sheen = .3; m.sheenRoughness = .35;
        m.emissiveMap = k.glassEdge;
        if (kind === 'ledger') m.emissiveIntensity = 1.8; else { m.emissive.copy(m.color); m.emissiveIntensity = 1.5; }
      } else m.emissiveMap = null;
      m.needsUpdate = true;
      return m;
    }
    /* the glass edge (2026-10-25): white where a face meets its edge, a fainter hairline on the engraved inset, black
       elsewhere. Laid as the emissive map of a chain's glass tile, so only its edges glow. */
    k.GLASS = .34;
    k.glassEdge = (function () {
      var cv = document.createElement('canvas'); cv.width = cv.height = 256;
      var g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 7; g.strokeRect(3.5, 3.5, 249, 249);
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 6; g.strokeRect(10, 10, 236, 236);
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.5; g.strokeRect(19.5, 19.5, 217, 217);
      var t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    })();
    /* the engraved panel: a hairline inset round each face, and two short ticks on its top edge, the
       way a data slab is machined. It darkens the colour it is laid on (a multiply), so it reads on
       every tone; it is the one texture the world shares. */
    k.panelMap = (function () {
      var cv = document.createElement('canvas'); cv.width = cv.height = 256;
      var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(0,0,0,.34)'; g.lineWidth = 2.2; g.strokeRect(17, 17, 222, 222);
      g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 1; g.strokeRect(19.5, 19.5, 217, 217);
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(44, 17); g.lineTo(44, 31); g.moveTo(212, 17); g.lineTo(212, 31); g.stroke();
      var t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    })();
    /* the grain (cinematic pass, 2026-10-24: "the roughness map is king"): a world-space noise and a
       few fine scratches break up every highlight. It is computed in the shader from the surface's
       position in the world, so a big tile and a small one carry the same grain at the same scale;
       a texture laid on each face's own UVs would stretch on a big tile and shrink on a small one.
       rough: how far the grain moves the roughness; normal: a faint bump, only for what is seen up
       close (the record block on #/trace, the open card, the record view). */
    var GRAIN_GLSL = 'varying vec3 vGrainP; uniform float grainR; uniform float grainN;' +
      'float gH(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }' +
      'float gV(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);' +
      ' return mix(mix(mix(gH(i), gH(i + vec3(1,0,0)), f.x), mix(gH(i + vec3(0,1,0)), gH(i + vec3(1,1,0)), f.x), f.y),' +
      '  mix(mix(gH(i + vec3(0,0,1)), gH(i + vec3(1,0,1)), f.x), mix(gH(i + vec3(0,1,1)), gH(i + vec3(1,1,1)), f.x), f.y), f.z); }' +
      'float grain(vec3 p){ float n = gV(p * 6.) * .62 + gV(p * 21.) * .26; float sc = gV(vec3(p.x * 1.7, p.y * 55., p.z * 1.7)); return n + .2 * smoothstep(.78, .96, sc); }';
    var grainScale = 1;   /* ArkWorld look.grain: 1 is the grain as drawn, 0 is none (k.setLook) */
    k.grain = function (m, rough, normal) {
      m.userData.grain = { r: rough == null ? .55 : rough, n: normal || 0 };
      m.onBeforeCompile = function (sh) {
        sh.uniforms.grainR = { get value() { return m.userData.grain.r * grainScale; } };
        sh.uniforms.grainN = { get value() { return m.userData.grain.n * grainScale; } };
        sh.vertexShader = 'varying vec3 vGrainP;\n' + sh.vertexShader.replace('#include <project_vertex>',
          '#include <project_vertex>\n vec4 grainW = vec4(transformed, 1.);\n #ifdef USE_INSTANCING\n grainW = instanceMatrix * grainW;\n #endif\n vGrainP = (modelMatrix * grainW).xyz;');
        sh.fragmentShader = GRAIN_GLSL + '\n' + sh.fragmentShader
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor * (1. + grainR * (grain(vGrainP) - .45)), .04, 1.);')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n if (grainN > 0.) { float g0 = gV(vGrainP * 21.); vec3 gg = vec3(gV((vGrainP + vec3(.02, 0., 0.)) * 21.) - g0, gV((vGrainP + vec3(0., .02, 0.)) * 21.) - g0, gV((vGrainP + vec3(0., 0., .02)) * 21.) - g0) * 50.;' +
            ' normal = normalize(normal - grainN * .025 * (viewMatrix * vec4(gg, 0.)).xyz); }');
      };
      m.customProgramCacheKey = function () { return 'grain'; };
      m.needsUpdate = true;
      return m;
    };
    function tileMaterial(kind) {
      /* less plastic: a satin face, a softer clear coat (audit 4); the engraved panel on every face */
      var m = tone(kind, new THREE.MeshPhysicalMaterial({ roughness: .6, metalness: .08, clearcoat: .55, clearcoatRoughness: .14, envMapIntensity: .75, map: kind === 'page' || kind === 'ghost' ? null : k.panelMap }));
      k.grain(m, kind === 'page' ? .25 : .55, kind === 'record' ? .4 : kind === 'page' ? .08 : 0);   /* records are seen up close; the page under the words only a breath of it */
      if (!NODE[kind]) return m;
      /* a glass tile's lit edge wears the tile's own colour (its kind's, times its family tint), and where it glows the
         glass is less clear, so the edge reads as a solid rim round a clear body */
      var grained = m.onBeforeCompile;
      m.onBeforeCompile = function (sh) {
        grained(sh);
        sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' +
          '#if defined( USE_INSTANCING_COLOR ) || defined( USE_COLOR )\n totalEmissiveRadiance *= vColor;\n#endif\n' +
          '#ifdef USE_EMISSIVEMAP\n diffuseColor.a = min(1., diffuseColor.a + emissiveColor.r * .55);\n#endif');
      };
      m.customProgramCacheKey = function () { return 'grain-glass'; };
      return m;
    }

    var all = [];   /* instanced meshes flagged for upload each frame */
    function instanced(geo, mat, count, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
      m.count = count; m.frustumCulled = false; m.castShadow = !!shadow; m.receiveShadow = !!shadow;
      scene.add(m); all.push(m); return m;
    }
    k.instanced = instanced;

    /* A set of tiles: list of { kind, glyph, link }. The app places each tile with a world matrix
       (scale included) and, for a chain, each link with a matrix and a length in tile units. */
    k.tileSet = function (list, opts) {
      opts = opts || {};
      var n = list.length, set = { n: n, list: list, bodies: {}, hov: new Float32Array(n),
        base: [], linkBase: [], linkLen: new Float32Array(n),
        stretch: new Float32Array(n).fill(1), glyph: new Float32Array(n).fill(1), noBody: new Uint8Array(n), force: -1,
        pickable: null, onPick: null, liftable: null, label: null };
      var where = [], count = {};
      list.forEach(function (t) { count[t.kind] = (count[t.kind] || 0) + 1; });
      Object.keys(count).forEach(function (kind) {
        var m = instanced(opts.panel ? panelGeo : bodyGeo, tileMaterial(kind), count[kind], kind !== 'ghost' && !opts.noShadow);
        m.userData.kind = kind; m.userData.tiles = []; m.renderOrder = kind === 'ghost' ? 3 : 0;
        set.bodies[kind] = m;
      });
      list.forEach(function (t, j) { var m = set.bodies[t.kind]; where[j] = m.userData.tiles.length; m.userData.tiles.push(j); });
      var WHITE = new THREE.Color(1, 1, 1);
      if (set.bodies.plain) list.forEach(function (t, j) { if (t.kind === 'plain') set.bodies.plain.setColorAt(where[j], WHITE); });
      set.tint = function (j, c) {
        var m = set.bodies[list[j].kind]; if (!m.instanceColor) return;
        m.setColorAt(where[j], c); m.instanceColor.needsUpdate = true;
      };
      var parts = list.map(function (t) { return glyphParts(t.glyph || 'iii'); }), glyphAt = [], total = 0;
      parts.forEach(function (p, j) { glyphAt[j] = total; total += p.length; });
      var glyphs = instanced(barGeo, glyphMat, total, false);
      var pins = instanced(pinGeo, metalMat, n, !opts.noShadow), posts = instanced(postGeo, metalMat, n, !opts.noShadow), beads = instanced(beadGeo, beadMat, n, false);
      var links = instanced(linkGeo, linkMat, n, true), holes = instanced(holeGeo, holeMat, n, false);
      /* a set nobody sees is not drawn at all: no draw call, no shadow pass, nothing to pick */
      var meshes = Object.keys(set.bodies).map(function (kd) { return set.bodies[kd]; }).concat([glyphs, pins, posts, beads, links, holes]);
      set.shown = true;
      set.show = function (on) { if (on === set.shown) return; set.shown = on; meshes.forEach(function (m) { m.visible = on; }); };
      for (var j = 0; j < n; j++) { set.base[j] = M4().makeScale(1e-4, 1e-4, 1e-4); set.linkBase[j] = M4().makeScale(1e-4, 1e-4, 1e-4); }
      set.place = function (j, m) { set.base[j].copy(m); };
      set.placeLink = function (j, m, len) { set.linkBase[j].copy(m); set.linkLen[j] = len; };
      var F = M4(), X = M4(), S = M4(), ZERO = M4().makeScale(1e-4, 1e-4, 1e-4);
      set.commit = function () {
        if (!set.shown) return;
        for (var j = 0; j < n; j++) {
          var h = set.hov[j];
          F.copy(set.base[j]);
          /* one hover rule for everything: lift 12% of the object's height */
          if (h > 0 && !set.groupLift) F.multiply(X.makeTranslation(0, h * .12, 0)).multiply(S.makeScale(1 + h * .04, 1 + h * .04, 1 + h * .04));   /* a set with groupLift lifts a whole group itself */
          set.final = set.final || []; (set.final[j] = set.final[j] || M4()).copy(F);
          set.bodies[list[j].kind].setMatrixAt(where[j], set.noBody[j] ? ZERO : X.copy(F).multiply(P.body).multiply(S.makeScale(set.stretch[j], 1, 1)));
          var g = set.glyph[j], p = parts[j];
          for (var q = 0; q < p.length; q++) glyphs.setMatrixAt(glyphAt[j] + q, g < .01 ? ZERO : X.copy(F).multiply(p[q]).multiply(S.makeScale(1, g, g)));
          /* pin, post and bead go with the slots: a tile that becomes a card is bare */
          if (g < .999) S.makeScale(g, g, g); else S.identity();
          /* (2026-10-23) the pins, posts and beads read as toys; a precise slab has none */
          pins.setMatrixAt(j, ZERO); posts.setMatrixAt(j, ZERO); beads.setMatrixAt(j, ZERO);
          if (list[j].link && set.linkLen[j] > .01) {
            links.setMatrixAt(j, X.copy(set.linkBase[j]).multiply(P.link).multiply(S.makeScale(set.linkLen[j], 1, 1)));
            holes.setMatrixAt(j, X.copy(set.linkBase[j]).multiply(P.link));
          } else { links.setMatrixAt(j, ZERO); holes.setMatrixAt(j, ZERO); }
        }
        Object.keys(set.bodies).forEach(function (kd) { set.bodies[kd].boundingSphere = null; });
      };
      set.tileAt = function (mesh, id) { return mesh.userData.tiles ? mesh.userData.tiles[id] : -1; };
      set.repaint = function () { Object.keys(set.bodies).forEach(function (kd) { tone(kd, set.bodies[kd].material); }); };
      k.sets.push(set);
      return set;
    };
    /* A set of plain blocks (cubes, slabs): one instanced mesh with a colour per block. It takes part
       in hover and pick like a tile set: the block under the pointer lifts by `lift` of its own size. */
    k.blockSet = function (n, geo, opts) {
      opts = opts || {};
      var mat = new THREE.MeshPhysicalMaterial({ roughness: opts.rough == null ? .6 : opts.rough, metalness: .08, clearcoat: .55, clearcoatRoughness: .14, envMapIntensity: .75,
        sheen: .3, sheenRoughness: .42, sheenColor: new THREE.Color(.12, .16, .15),
        map: opts.plain ? null : k.panelMap });   /* satin, as the tiles, with the same engraved panel */
      k.grain(mat, .55, opts.grainNormal || 0);
      var mesh = instanced(geo, mat, n, opts.shadow !== false);
      var set = { n: n, list: [], bodies: { block: mesh }, hov: new Float32Array(n), base: [], shown: true, force: -1,
        pickable: null, onPick: null, liftable: null, label: null, lift: .12, mesh: mesh };
      var WHITE = new THREE.Color(1, 1, 1);
      for (var j = 0; j < n; j++) { set.base[j] = M4().makeScale(1e-4, 1e-4, 1e-4); set.list.push({ kind: 'block' }); mesh.setColorAt(j, WHITE); }
      var F = M4(), X = M4();
      set.place = function (j, m) { set.base[j].copy(m); };
      set.tint = function (j, c) { mesh.setColorAt(j, c); mesh.instanceColor.needsUpdate = true; };
      set.show = function (on) { set.shown = on; mesh.visible = on; };
      set.commit = function () {
        if (!set.shown) return;
        for (var j = 0; j < n; j++) {
          F.copy(set.base[j]);
          if (set.hov[j] > 0) F.multiply(X.makeTranslation(0, set.hov[j] * set.lift, 0));
          mesh.setMatrixAt(j, F);
        }
        mesh.boundingSphere = null;
      };
      set.tileAt = function (m, id) { return id; };
      set.repaint = function () {};
      k.sets.push(set);
      return set;
    };

    /* Dotted lines that move: up to n beads, laid along segments every frame by the app.
       line(a, b, count, reveal, r): `count` beads from a to b; the first `reveal` share of them show,
       each growing in as the reveal passes it, so a line draws itself from a to b and settles.
       Call begin() before a frame's lines and end() after: unused beads are put away. */
    /* the floor: a faint grid every 2 units and rings every 6 round a centre, fading out with
       distance. It gives the network and the stages above it a ground to stand over (owner, 2026-10-23:
       "faint floor rings or a grid under the network"). Static: it costs one draw, no frames. */
    k.floor = function (c, radius) {
      var mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
        uniforms: { color: { value: new THREE.Vector3() }, c: { value: new THREE.Vector2(c.x, c.z) }, R: { value: radius } },
        vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: 'uniform vec3 color; uniform vec2 c; uniform float R; varying vec3 vW;' +
          'float line(float v){ float d = abs(fract(v - .5) - .5) / max(fwidth(v), 1e-4); return 1. - min(d, 1.); }' +
          'void main(){ vec2 p = vW.xz - c; float r = length(p);' +
          'float g = max(line(vW.x * .5), line(vW.z * .5)) * .4; float ring = line(r / 6.) * .75;' +
          'float a = max(g, ring) * (1. - smoothstep(R * .4, R, r)) * .2; if (a < .004) discard; gl_FragColor = vec4(color, a); }' });
      var m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2).rotateX(-Math.PI / 2), mat);
      m.position.set(c.x, .004, c.z); m.renderOrder = 1; scene.add(m);
      k.onPaint(function () { var col = mix('muted', 'signal', .25); mat.uniforms.color.value.set(col.r, col.g, col.b); });
      return m;
    };

    /* an angular block: a chamfered box with a micro-rounded edge, the stages' one shape */
    /* one corner language for every 3D form (owner, 2026-10-23: "soften the corners in a perfect
       way"): crisp planes, and a smooth continuous bevel whose radius is the same share of each
       form's thinnest side, so big and small forms read as one family. Four bevel segments keep it
       free of facets up close. Build a form at its true size and scale it evenly: a cube stretched
       into a plate would stretch its bevel into a pinched highlight. */
    var BEVEL = .1;
    k.bevel = function (w, h, d, share) { return new RoundedBoxGeometry(w, h, d, 4, (share == null ? BEVEL : share) * Math.min(w, h, d)); };

    /* edge light: a thin emissive frame round a face (4 bars), for the chosen or signed thing.
       set(i, m, w, h, amt, t): m is the face's frame (centre, facing +z), w and h its size in that
       frame, amt grows each bar out from its middle, t the line's thickness. */
    k.edgeLight = function (n, tone, gain) {
      var mat = new THREE.MeshBasicMaterial({ toneMapped: false }), mesh = instanced(new THREE.BoxGeometry(1, 1, 1), mat, n * 4, false);
      mesh.renderOrder = 5;
      var e = { mesh: mesh, tone: tone || 'signal', gain: gain || 1.7 }, A = M4(), B = M4(), Z = M4().makeScale(1e-4, 1e-4, 1e-4), PV = new THREE.Vector3(), QI = new THREE.Quaternion(), SV = new THREE.Vector3();
      e.set = function (i, m, w, h, amt, t) {
        t = t || .018;
        if (!(amt > .01)) { for (var q = 0; q < 4; q++) mesh.setMatrixAt(i * 4 + q, Z); return; }
        var parts = [[0, h / 2, w * amt, t], [0, -h / 2, w * amt, t], [-w / 2, 0, t, h * amt], [w / 2, 0, t, h * amt]];
        parts.forEach(function (b, q) { mesh.setMatrixAt(i * 4 + q, A.copy(m).multiply(B.compose(PV.set(b[0], b[1], 0), QI, SV.set(b[2], b[3], t)))); });
      };
      e.bar = function (i, q, m, x, y, w, t) { mesh.setMatrixAt(i * 4 + q, w > .001 ? A.copy(m).multiply(B.compose(PV.set(x, y, 0), QI, SV.set(w, t || .02, t || .02))) : Z); };
      e.paint = function () { mat.color.copy(k.C[e.tone] || k.C.signal).multiplyScalar(e.gain); };
      k.onPaint(e.paint); e.paint();
      return e;
    };

    /* a plate of engraved words on a face: real words only (a record's title, revision and date;
       a name). draw(g, w, h) paints a canvas; the plate is laid on with place(m) like a decal. */
    k.textPlate = function (w, h, draw) {
      var px = 512, cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * h / w);
      var tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 });
      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.matrixAutoUpdate = false; mesh.visible = false; mesh.renderOrder = 6; mesh.frustumCulled = false;
      scene.add(mesh);
      var tp = { mesh: mesh, canvas: cv };
      tp.redraw = function () { var g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); draw(g, cv.width, cv.height); tex.needsUpdate = true; };
      tp.place = function (m) { if (!m) { mesh.visible = false; return; } mesh.visible = true; mesh.matrix.copy(m); mesh.matrixWorldNeedsUpdate = true; };
      tp.redraw();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { tp.redraw(); k.redraw(); });
      k.onPaint(function () { tp.redraw(); });
      return tp;
    };

    k.beads = function (n, tone) {
      var mat = new THREE.MeshBasicMaterial({ toneMapped: false });
      var mesh = instanced(new THREE.SphereGeometry(1, 8, 6), mat, n, false);
      mesh.renderOrder = 4;
      var used = 0, last = 0, BM = M4(), ZERO = M4().makeScale(1e-4, 1e-4, 1e-4);
      var b = { mesh: mesh, tone: tone || 'muted', gain: 1 };
      b.begin = function () { used = 0; };
      b.line = function (a, c, count, reveal, r) {
        reveal = reveal == null ? 1 : reveal;
        for (var q = 0; q < count && used < n; q++) {
          var u = count > 1 ? q / (count - 1) : 0, g = clamp01((reveal * (count + 2) - q) / 2), s = g <= 0 ? 1e-4 : (r || .05) * k.ease.back(g);
          BM.makeScale(s, s, s).setPosition(a.x + (c.x - a.x) * u, a.y + (c.y - a.y) * u, a.z + (c.z - a.z) * u);
          mesh.setMatrixAt(used++, BM);
        }
      };
      b.end = function () { for (var i = used; i < last; i++) mesh.setMatrixAt(i, ZERO); last = used; mesh.visible = used > 0; };
      b.paint = function () { var c = b.tone === 'signal' ? k.C.signal : mix('muted', 'canvas', .25); mat.color.copy(c).multiplyScalar(b.gain); };
      beadSets.push(b);
      return b;
    };
    var beadSets = [];

    /* the tile frame on a flat ring: centre c, radius R, angle theta, scale s; a = build (0..1) */
    var bx = new THREE.Vector3(), by = new THREE.Vector3(0, 1, 0), bz = new THREE.Vector3(), sv = new THREE.Vector3();
    k.ringFrame = function (c, R, theta, s, a, out) {
      out = out || M4();
      var co = Math.cos(theta), si = Math.sin(theta);
      bx.set(si, 0, -co); bz.set(co, 0, si);
      out.makeBasis(bx, by, bz);
      var e = a == null ? 1 : a, sc = e <= 0 || s <= 0 ? 1e-4 : s * k.ease.back(clamp01(e));
      out.scale(sv.set(sc, sc, sc));
      out.setPosition(c.x + R * co, c.y + (1 - k.ease.out(clamp01(e))) * 1.4 * s, c.z + R * si);
      return out;
    };

    /* ---------- a tile laid over a box of the screen ----------
       Where a tile must stand so its face exactly covers the screen box r (CSS pixels), with the
       face d world units in front of the camera, as the camera is NOW. The app calls it after the
       camera moves each frame, so a page stays glued to its box while the camera leans or flies. */
    var pr = new THREE.Raycaster(), pfwd = new THREE.Vector3(), pup = new THREE.Vector3(), pn = new THREE.Vector2();
    var pc = new THREE.Vector3(), pt = new THREE.Vector3(), pb = new THREE.Vector3(), pl = new THREE.Vector3(), pq = new THREE.Vector3();
    function rayAt(x, y, d, out) {
      pn.set(x / W * 2 - 1, 1 - y / H * 2); pr.setFromCamera(pn, camera);
      return out.copy(pr.ray.origin).addScaledVector(pr.ray.direction, d / pr.ray.direction.dot(pfwd));
    }
    k.panel = function (r, d, out, dz) {
      dz = dz == null ? 1 : dz;   /* how deep the tile is, as a share of a normal tile's depth */
      camera.getWorldDirection(pfwd);
      rayAt(r.x + r.w / 2, r.y + r.h / 2, d, pc);
      var h = rayAt(r.x + r.w / 2, r.y, d, pt).distanceTo(rayAt(r.x + r.w / 2, r.y + r.h, d, pb));
      var w = rayAt(r.x, r.y + r.h / 2, d, pl).distanceTo(rayAt(r.x + r.w, r.y + r.h / 2, d, pq));
      pup.set(0, 1, 0).applyQuaternion(camera.quaternion);
      out.quat.copy(camera.quaternion); out.s = h; out.stretch = w / h;
      out.pos.copy(pc).addScaledVector(pfwd, HALF_D * h * dz).addScaledVector(pup, -(LIFT + .5) * h);
      return out;
    };

    /* ---------- dotted lines ----------
       paths: [{ pts: [Vector3...], at: ms, dur: ms, lit }]; dots every `step` world units, drawn in over dur.
       tone: 'muted' (default) or 'signal' (the teal of the mark) */
    var dotMats = [];
    k.dots = function (paths, step, size, tone) {
      var pos = [], at = [], lit = [];
      step = step || .15;
      paths.forEach(function (p, n) {
        var pts = p.pts, L = 0, segs = [];
        for (var i = 1; i < pts.length; i++) { var d = pts[i].distanceTo(pts[i - 1]); segs.push(d); L += d; }
        var m = Math.max(2, Math.floor(L / step));
        for (var q = 0; q <= m; q++) {
          var want = L * q / m, s = 0;
          while (s < segs.length - 1 && want > segs[s]) { want -= segs[s]; s++; }
          var u = segs[s] ? Math.min(1, want / segs[s]) : 0, a = pts[s], b = pts[s + 1] || a;
          pos.push(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + .02, a.z + (b.z - a.z) * u);
          at.push((p.at || 0) + (q / m) * (p.dur || 500));
          lit.push((p.lit || .55) + .2 * Math.abs(Math.sin(n * 12.9898 + q * 78.233)));
        }
      });
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('reveal', new THREE.Float32BufferAttribute(at, 1));
      geo.setAttribute('lit', new THREE.Float32BufferAttribute(lit, 1));
      var mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
        uniforms: { time: { value: 0 }, size: { value: size || .06 }, scale: { value: 500 }, color: { value: new THREE.Vector3() }, fade: { value: 1 } },
        vertexShader: 'attribute float reveal; attribute float lit; uniform float time, size, scale, fade; varying float vA;' +
          'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;' +
          'float a = clamp((time - reveal) / 140., 0., 1.); vA = a * lit * fade; gl_PointSize = max(1.5, size * scale / -mv.z) * a; }',
        fragmentShader: 'uniform vec3 color; varying float vA; void main(){' +
          'float m = smoothstep(.5, .25, length(gl_PointCoord - .5)) * vA; if (m < .01) discard;' +
          'gl_FragColor = vec4(color, m); }' });
      mat.userData.tone = tone || 'muted';
      dotMats.push(mat);
      var pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 4; scene.add(pts);
      return pts;
    };

    /* ---------- pearls ----------
       list: [{ p: Vector3, r: radius, lit: bool, at: ms }]; p is the bottom of the pearl */
    var pearlMat = new THREE.MeshPhysicalMaterial({ roughness: .22, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: 1.1 });
    var litMat = new THREE.MeshStandardMaterial({ emissiveIntensity: .9, roughness: .3 });
    var ballSets = [];
    k.balls = function (list) {
      var sphere = new THREE.SphereGeometry(1, 20, 14), nW = 0, nL = 0;
      list.forEach(function (b) { b.i = b.lit ? nL++ : nW++; });
      var bs = { list: list, white: instanced(sphere, pearlMat, nW, true), lit: instanced(sphere, litMat, nL, false) };
      ballSets.push(bs); return bs;
    };
    var BM = M4();
    function poseBalls(ms) {
      ballSets.forEach(function (bs) {
        bs.list.forEach(function (b) {
          var a = clamp01((ms - (b.at || 0)) / 380), s = a <= 0 ? 1e-4 : b.r * k.ease.back(a);
          BM.makeScale(s, s, s).setPosition(b.p.x, b.p.y + b.r, b.p.z);
          (b.lit ? bs.lit : bs.white).setMatrixAt(b.i, BM);
        });
      });
    }

    /* ---------- soft shadow on the page ---------- */
    k.shadow = function (c, size, opacity) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(size || 110, size || 110).rotateX(-Math.PI / 2),
        new THREE.ShadowMaterial({ color: 0x000000, opacity: opacity == null ? .42 : opacity }));
      m.position.copy(c); m.position.y += .003; m.receiveShadow = true; m.renderOrder = 2; scene.add(m);
      return m;
    };

    /* ---------- post: glow, tone, clear edges ---------- */
    var post = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); post.add(quad);
    var VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
    var blurMat = new THREE.ShaderMaterial({ vertexShader: VERT, depthTest: false, depthWrite: false,
      uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } },
      fragmentShader: 'uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){' +
        'vec4 c = texture2D(tex, vUv) * .2270270270;' +
        'c += texture2D(tex, vUv + dir * 1.3846153846) * .3162162162; c += texture2D(tex, vUv - dir * 1.3846153846) * .3162162162;' +
        'c += texture2D(tex, vUv + dir * 3.2307692308) * .0702702703; c += texture2D(tex, vUv - dir * 3.2307692308) * .0702702703;' +
        'gl_FragColor = c; }' });
    var brightMat = new THREE.ShaderMaterial({ vertexShader: VERT, depthTest: false, depthWrite: false,
      uniforms: { tex: { value: null }, threshold: { value: 1.05 } },
      fragmentShader: 'uniform sampler2D tex; uniform float threshold; varying vec2 vUv; void main(){' +
        'vec3 c = texture2D(tex, vUv).rgb; float l = max(c.r, max(c.g, c.b));' +
        'gl_FragColor = vec4(c * smoothstep(threshold, threshold + 1.2, l), 1.); }' });
    var compMat = new THREE.ShaderMaterial({ vertexShader: VERT, depthTest: false, depthWrite: false,
      uniforms: { tex: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null },
        centre: { value: new THREE.Vector2(.5, .5) }, edge: { value: o.edge == null ? .8 : o.edge }, exposure: { value: 1.12 }, contrast: { value: .32 } },
      fragmentShader: 'uniform sampler2D tex, b1, b2, b3; uniform vec2 centre; uniform float edge, exposure, contrast; varying vec2 vUv;' +
        'vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }' +
        /* the scene is premultiplied over a clear target: rgb is colour times coverage */
        'void main(){ vec4 s = texture2D(tex, vUv);' +
        'vec3 glow = texture2D(b1, vUv).rgb * .3 + texture2D(b2, vUv).rgb * .4 + texture2D(b3, vUv).rgb * .5;' +
        'vec3 c = s.rgb + glow; float a = clamp(s.a + max(glow.r, max(glow.g, glow.b)), 0., 1.);' +
        'vec3 d = a > .0001 ? c / a * exposure : vec3(0.);' +
        /* Khronos PBR Neutral highlight roll-off: everything below .76 is exact */
        'float peak = max(d.r, max(d.g, d.b));' +
        'if (peak > .76) { float q = .24; float np = 1. - q * q / (peak + q - .76); d *= np / peak;' +
        '  float g = 1. - 1. / (.15 * (peak - np) + 1.); d = mix(d, vec3(np), g); }' +
        /* far edges of the screen fade to clear, so the scene has no frame */
        'float v = smoothstep(.6, 1.15, length((vUv - centre) * vec2(1., 1.1))); a *= 1. - v * edge;' +
        /* a high-contrast film curve on the encoded value: deeper shadows, brighter highlights, the
           middle kept, so the teal, the lime and the card's words keep their place (cinematic pass) */
        'vec3 e = clamp(srgb(d), 0., 1.); e = mix(e, e * e * (3. - 2. * e), contrast);' +
        'gl_FragColor = vec4(e * a, a); }' });
    k.look = compMat.uniforms;   /* exposure and contrast, for tuning */
    /* The editable look (js/content/world.js ArkWorld.look): one place applies every knob, from the
       defaults (the values this file was tuned to) or from a draft the CMS previews. The motivated
       lights' own numbers (logo and ember strength and reach, beam, dust) are kept in k.knobs; the stage
       files that own those lights read them each frame, and k.onLook tells them to re-apply what is not
       read each frame (reach, dust count). Nothing here draws: it asks for one redraw. */
    k.knobs = { logoLight: 22, logoReach: 16, emberLight: 26, emberReach: 12, beam: 1, dust: 150 };
    var lookHooks = [];
    k.onLook = function (fn) { lookHooks.push(fn); fn(k.knobs); };
    k.setLook = function (look) {
      if (!look) return;
      function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
      key.intensity = num(look.keyStrength, 2.3);
      KEY_OFF.set(num(look.keyX, -30), num(look.keyY, 26), num(look.keyZ, -8));
      key.position.copy(key.target.position).add(KEY_OFF);
      key.shadow.radius = num(look.keySoftness, 9);
      rimL.intensity = num(look.backStrength, 1.05);
      fill.intensity = num(look.fillStrength, .2);
      hemi.intensity = num(look.skyStrength, .22);
      scene.environmentIntensity = num(look.envStrength, .16);
      compMat.uniforms.exposure.value = num(look.exposure, 1.12);
      compMat.uniforms.contrast.value = num(look.contrast, .32);
      fogStart = num(look.fogStart, .93); fogEnd = Math.max(fogStart + .05, num(look.fogEnd, 2.4));
      grainScale = num(look.grain, 1);
      ['logoLight', 'logoReach', 'emberLight', 'emberReach', 'beam', 'dust'].forEach(function (n) { k.knobs[n] = num(look[n], k.knobs[n]); });
      k.lights.logo.distance = k.knobs.logoReach; k.lights.ember.distance = k.knobs.emberReach;
      renderer.shadowMap.needsUpdate = true;
      lookHooks.forEach(function (fn) { fn(k.knobs); });
      k.wake(80); k.moved(80);
    };
    k.edge = function (v) { compMat.uniforms.edge.value = v; };
    function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(post, postCam); }
    function rt(w, h, samples) {
      return new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: THREE.HalfFloatType, samples: samples || 0, depthBuffer: !!samples });
    }
    var T = {};
    function sizeTargets(w, h) {
      Object.keys(T).forEach(function (key) { T[key].dispose(); });
      T.main = rt(w, h, 4);
      /* the glow needs no detail: a quarter, an eighth and a sixteenth of the screen */
      T.b1 = rt(w >> 2, h >> 2); T.b1t = rt(w >> 2, h >> 2);
      T.b2 = rt(w >> 3, h >> 3); T.b2t = rt(w >> 3, h >> 3);
      T.b3 = rt(w >> 4, h >> 4); T.b3t = rt(w >> 4, h >> 4);
    }
    function blur(src, tmp, dst, spread, times) {
      for (var i = 0; i < times; i++) {
        blurMat.uniforms.tex.value = i === 0 ? src.texture : dst.texture;
        blurMat.uniforms.dir.value.set(spread / tmp.width, 0); pass(blurMat, tmp);
        blurMat.uniforms.tex.value = tmp.texture;
        blurMat.uniforms.dir.value.set(0, spread / tmp.height); pass(blurMat, dst);
      }
    }
    function draw() {
      if (!T.main) return;
      renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(T.main); renderer.render(scene, camera);
      brightMat.uniforms.tex.value = T.main.texture; pass(brightMat, T.b1);
      blur(T.b1, T.b1t, T.b1, 1, 1);
      blurMat.uniforms.tex.value = T.b1.texture; blurMat.uniforms.dir.value.set(0, 0); pass(blurMat, T.b2);
      blur(T.b2, T.b2t, T.b2, 1, 1);
      blurMat.uniforms.tex.value = T.b2.texture; blurMat.uniforms.dir.value.set(0, 0); pass(blurMat, T.b3);
      blur(T.b3, T.b3t, T.b3, 1, 1);
      var u = compMat.uniforms;
      u.tex.value = T.main.texture; u.b1.value = T.b1.texture; u.b2.value = T.b2.texture; u.b3.value = T.b3.texture;
      renderer.setClearColor(0x000000, 0); pass(compMat, null);
    }

    /* ---------- theme repaint (rule R33) ---------- */
    var paintHooks = [];
    k.onPaint = function (fn) { paintHooks.push(fn); };
    function paint() {
      readTheme();
      /* colour temperature: a cool sky and fill against a warm-neutral key; the warm local lights are ember */
      hemi.color.copy(mix('text', 'resolver', .55)); hemi.groundColor.copy(k.C.canvas); key.color.copy(mix('strong', 'record', .45)); fill.color.copy(mix('text', 'resolver', .6));
      rimL.color.copy(mix('text', 'signal', .35));
      scene.fog.color.copy(mix('canvas', 'resolver', .1));
      k.lights.logo.color.copy(k.C.signal); if (k.C.ember) k.lights.ember.color.copy(k.C.ember);
      glyphMat.color.copy(mix('canvas', 'other', .12)); metalMat.color.copy(mix('identity', 'canvas', .45));
      beadMat.color.copy(k.C.muted); beadMat.emissive.copy(k.C.text);
      linkMat.color.copy(mix('other', 'canvas', .45)); holeMat.color.copy(k.C.canvas);
      pearlMat.color.copy(mix('strong', 'muted', .25)); litMat.color.copy(k.C.signal); litMat.emissive.copy(k.C.signal);
      dotMats.forEach(function (m) {
        var c = m.userData.tone === 'signal' ? k.C.signal : mix('muted', 'canvas', .2);
        m.uniforms.color.value.set(c.r, c.g, c.b);
      });
      k.sets.forEach(function (s) { s.repaint(); });
      beadSets.forEach(function (b) { b.paint(); });
      paintHooks.forEach(function (fn) { fn(k.C); });
      k.moved(50);
    }

    /* ---------- pointer: lean and lift ---------- */
    var pointer = { x: 0, y: 0, cx: -1, cy: -1, moved: false, inside: false, downX: 0, downY: 0 };
    var hover = { set: null, j: -1 };
    /* what is under the pointer now: a set and its item (a set may lift a whole group itself) */
    k.hovered = function () { return hover; };
    function overUI(t) { return !!(t && t.closest && t.closest('a,button,input,select,textarea,label,[role="tab"],[data-ui]')); }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1;
      pointer.cx = e.clientX; pointer.cy = e.clientY; pointer.inside = !overUI(e.target); pointer.moved = true;
      wake();
    }, { passive: true });
    document.addEventListener('pointerleave', function () { pointer.x = pointer.y = 0; pointer.inside = false; pointer.moved = true; wake(); });
    window.addEventListener('pointerdown', function (e) { pointer.downX = e.clientX; pointer.downY = e.clientY; }, { passive: true });
    window.addEventListener('click', function (e) {
      if (overUI(e.target) || document.body.classList.contains('no-scene')) return;
      if (Math.hypot(e.clientX - pointer.downX, e.clientY - pointer.downY) > 6) return;
      pick(e.clientX, e.clientY);
      if (hover.set && hover.j >= 0 && hover.set.onPick && (!hover.set.pickable || hover.set.pickable(hover.j))) hover.set.onPick(hover.j);
    });
    var hitRay = new THREE.Raycaster(), hitNdc = new THREE.Vector2();
    function pick(x, y) {
      hover.set = null; hover.j = -1;
      hitNdc.set(x / W * 2 - 1, 1 - y / H * 2);
      hitRay.setFromCamera(hitNdc, camera);
      var meshes = [], owner = [];
      k.sets.forEach(function (s) {
        if ((!s.onPick && !s.liftable) || s.shown === false) return;   /* a set nobody can touch, or nobody sees, is not tested */
        Object.keys(s.bodies).forEach(function (kd) { if (kd !== 'ghost' || s.label) { meshes.push(s.bodies[kd]); owner.push(s); } });
      });
      var hits = hitRay.intersectObjects(meshes, false);
      if (hits.length) {
        var h = hits[0], s = owner[meshes.indexOf(h.object)];
        hover.set = s; hover.j = s.tileAt(h.object, h.instanceId);
      }
    }
    var lean = { x: 0, y: 0 };
    /* one easing step; true while anything still moves */
    function settleStep() {
      var moving = false;
      if (pointer.moved) {
        pointer.moved = false;
        var was = hover.set, wasJ = hover.j;
        if (pointer.inside) pick(pointer.cx, pointer.cy); else { hover.set = null; hover.j = -1; }
        if (was !== hover.set || wasJ !== hover.j) {
          if (was && was.onHover) was.onHover(-1);
          if (hover.set && hover.set.onHover) hover.set.onHover(hover.j);
        }
        var can = hover.set && hover.j >= 0 && hover.set.onPick && (!hover.set.pickable || hover.set.pickable(hover.j));
        document.body.classList.toggle('picking', !!can);
        /* name what is under the pointer and what a click does (a hover tag) */
        if (k.onHover) k.onHover(hover.set && hover.j >= 0 && hover.set.label && (!hover.set.liftable || hover.set.liftable(hover.j)) ? hover.set.label(hover.j) : null, pointer.cx, pointer.cy, hover.set, hover.j);
      }
      var tx = reduced ? 0 : pointer.x, ty = reduced ? 0 : pointer.y;   /* k.ptr follows the pointer; the camera leans by k.cam.tilt */
      lean.x += (tx - lean.x) * .08; lean.y += (ty - lean.y) * .08;
      if (Math.abs(tx - lean.x) > .001 || Math.abs(ty - lean.y) > .001) moving = true;
      k.ptr.x = lean.x; k.ptr.y = lean.y;
      k.sets.forEach(function (s) {
        for (var j = 0; j < s.n; j++) {
          var want = (hover.set === s && hover.j === j && (!s.liftable || s.liftable(j))) || s.force === j ? 1 : 0, d = want - s.hov[j];
          if (reduced) s.hov[j] = want; else if (Math.abs(d) > .002) { s.hov[j] += d * .16; moving = true; } else s.hov[j] = want;
        }
      });
      return moving;
    }

    /* ---------- the timeline ---------- */
    var fogStart = .93, fogEnd = 2.4;   /* times the view distance (ArkWorld look.fogStart, look.fogEnd) */
    var END = o.end || 4700, raf = 0, startAt = null, aliveUntil = 0, shadowUntil = 0, OFFSET = 0;
    k.END = END;
    /* a return visit starts at the end of the build: the world is already there (record descent, 2026-10-24) */
    k.skipBuild = function () { k.skipIntro(); OFFSET = END + 1000; };
    k.wake = function (ms) { aliveUntil = Math.max(aliveUntil, performance.now() + (ms || 0)); wake(); };
    k.moved = function (ms) { shadowUntil = Math.max(shadowUntil, performance.now() + (ms || 0)); wake(); };
    /* a wake during a frame does not ask for a second frame: the frame's own end decides, so one
       frame is ever queued (two queued frames would each queue two more) */
    var ticking = false;
    function wake() { if (!raf && !ticking && !document.body.classList.contains('no-scene') && startAt !== null) raf = requestAnimationFrame(tick); }
    function setView(ms) {
      if (FLY_AT === null && FLY_WAIT-- <= 0) FLY_AT = ms;
      var c = k.cam, f = reduced ? 1 : FLY_AT === null ? 0 : k.ease.inOut(clamp01((ms - FLY_AT) / FLY)), d = c.dist * (FROM_DIST + (1 - FROM_DIST) * f);
      place(camera, c.aim, d, c.elev + FROM_ELEV * (1 - f) - lean.y * c.tilt * .6,
        c.yaw + FROM_YAW * (1 - f) + lean.x * c.tilt);
      scene.fog.near = d * fogStart; scene.fog.far = d * fogEnd;   /* clear up to the subject, thickening behind it */
    }
    function render(ms, now) {
      if (o.pose) o.pose(ms, now);
      setView(ms);
      if (o.after) o.after(ms, now);
      k.sets.forEach(function (s) { s.commit(); });
      poseBalls(ms);
      dotMats.forEach(function (m) { m.uniforms.time.value = ms; });
      all.forEach(function (m) { m.instanceMatrix.needsUpdate = true; });
      if (ms < END || now < shadowUntil) renderer.shadowMap.needsUpdate = true;
      draw();
    }
    /* A view may steer the build clock (js/world/download-stage.js): the network's tiles, links and cubes all build
       at their own moment on this clock, so winding it back takes the network apart and winding it forward builds it
       again. clockTo(ms, dur) eases the clock to ms and holds it there; clockRelease() hands it back to real time, the
       network built. Reduced motion jumps. */
    var CLOCK = null;
    function clockNow(now) {
      if (!CLOCK) return null;
      var f = CLOCK.dur > 0 ? k.ease.inOut(clamp01((now - CLOCK.t0) / CLOCK.dur)) : 1;
      return CLOCK.from + (CLOCK.to - CLOCK.from) * f;
    }
    k.clockTo = function (ms, dur) {
      var now = performance.now(), from = CLOCK ? clockNow(now) : k.time();
      CLOCK = { from: Math.min(from, END + 1000), to: ms, t0: now, dur: reduced ? 0 : (dur || 0) };
      k.wake((reduced ? 0 : dur || 0) + 200); k.moved((reduced ? 0 : dur || 0) + 200);
    };
    k.clockRelease = function () {
      if (!CLOCK) return;
      CLOCK = null; OFFSET = END + 1000 - (startAt === null ? 0 : performance.now() - startAt);
      k.wake(400); k.moved(400);
    };
    k.clocked = function () { return !!CLOCK; };
    function tick(now) {
      raf = 0; ticking = true;
      if (startAt === null) startAt = now;
      var held = clockNow(now);
      var ms = reduced ? END + 1000 : held !== null ? held : now - startAt + OFFSET;
      var moving = settleStep();
      render(ms, now);
      ticking = false;
      if (ms < END || now < aliveUntil || now < shadowUntil || moving) raf = requestAnimationFrame(tick);
    }
    k.start = function () {
      if (startAt !== null || raf) return;
      if (document.body.classList.contains('no-scene')) return;
      raf = requestAnimationFrame(tick);
    };
    k.time = function () { var held = clockNow(performance.now()); return reduced ? END + 1000 : held !== null ? held : startAt === null ? OFFSET : performance.now() - startAt + OFFSET; };
    k.redraw = function () { if (!raf && T.main) { var now = performance.now(); render(k.time(), now); } };

    /* ---------- size and frame ---------- */
    var frameRect = { x: 0, y: 0, w: 1, h: 1 }, ratio = 1;
    /* the design frame: the screen box the camera's lens is set for (a view offset) */
    k.setFrame = function (f) {
      frameRect = f;
      camera.aspect = f.w / f.h; camera.fov = cfg.fov;
      camera.setViewOffset(f.w, f.h, -f.x, -f.y, W, H);
      camera.updateProjectionMatrix();
      var scale = f.h * ratio / (2 * Math.tan(THREE.MathUtils.degToRad(cfg.fov / 2)));
      dotMats.forEach(function (m) { m.uniforms.scale.value = scale; });
      compMat.uniforms.centre.value.set((f.cx == null ? f.x + f.w / 2 : f.cx) / W, 1 - (f.cy == null ? f.y + f.h / 2 : f.cy) / H);
    };
    k.frame = function () { return frameRect; };
    k.size = function () { return { w: W, h: H }; };
    function resize() {
      var box = canvas.parentElement.getBoundingClientRect();
      if (!box.width || !box.height) return;
      W = box.width; H = box.height;
      /* drawn pixels: 2.6 million, or 4.2 million on a big screen (above 3.2 million screen pixels),
         so a 2560x1440 screen draws one pixel per screen pixel and stays sharp (fix 36) */
      ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt((W * H > 3.2e6 ? 4.2e6 : 2.6e6) / (W * H)));
      renderer.setPixelRatio(ratio);
      renderer.setSize(W, H, false);
      sizeTargets(Math.round(W * ratio), Math.round(H * ratio));
      if (o.onResize) o.onResize(W, H); else if (o.frame) k.setFrame(o.frame(W, H));
      k.moved(50);
      k.redraw();
    }

    /* after the app has built its world */
    k.go = function () {
      paint();
      var repaint = function () { paint(); k.redraw(); };
      var watch = new MutationObserver(repaint), WATCH = { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] };
      watch.observe(document.documentElement, WATCH);
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);
      if (follows()) { document.addEventListener('defxn:skin', repaint); document.addEventListener('ark:skin', repaint); }   /* one repaint per skin change, only for a world that follows skins */
      new ResizeObserver(resize).observe(canvas.parentElement);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
      resize();
      /* compile every material once, now: a stage's meshes are hidden until first shown, and their
         shaders compiled in the first frame of the first flight there (100-380 ms at a 4x slower CPU,
         audit 4). Hidden meshes are shown for the compile only; their matrices are all at scale zero. */
      var hiddenNow = [];
      /* light that is drawn (glows, edges, words) keeps its strength: fog would wash it into the air */
      scene.traverse(function (o) { var m = o.material; if (m && !Array.isArray(m) && 'fog' in m && (m.toneMapped === false || m.blending === THREE.AdditiveBlending)) m.fog = false; });
      scene.traverse(function (o) { if ((o.isMesh || o.isPoints) && !o.visible) { hiddenNow.push(o); o.visible = true; } });
      try { renderer.compile(scene, camera); } catch (e) { /* a browser without it compiles on first use, as before */ }
      hiddenNow.forEach(function (o) { o.visible = false; });
    };
    return k;
  }
})();
