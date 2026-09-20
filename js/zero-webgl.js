/* Particle depth-of-field zero, inspired by the rendering idea in Blurry:
   https://github.com/Domenicobrz/Blurry
   This is a new, dependency-free implementation: one point buffer, one shader,
   one draw call at rest, and two additional delayed traces during transitions. */
(function () {
  'use strict';

  var scene = document.querySelector('#scene > [data-pattern="F-SCENE-RZERO_V0"]');
  var persistent = scene && scene.querySelector('[data-ark-layer="persistent"]');
  var fallback = persistent && persistent.querySelector('canvas[role="presentation"]');
  var state = ArkUI.sceneState;
  if (!scene || !fallback) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'zero-webgl';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  fallback.insertAdjacentElement('afterend', canvas);

  var dragSurface = document.createElement('div');
  dragSurface.className = 'mesh-drag-surface';
  scene.appendChild(dragSurface);
  var dragControl = ArkUI.bindMeshDrag(dragSurface, state);

  var contextOptions = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    preserveDrawingBuffer: false
  };
  var gl = canvas.getContext('webgl', contextOptions) ||
    canvas.getContext('experimental-webgl', contextOptions);
  if (!gl) {
    dragSurface.remove();
    canvas.remove();
    return;
  }

  var vertexSource = ParticleShaders.vertex;
  var fragmentSource = ParticleShaders.fragment;

  function shader(type, source) {
    var result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      gl.deleteShader(result);
      return null;
    }
    return result;
  }

  var vertex = shader(gl.VERTEX_SHADER, vertexSource);
  var fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) {
    dragSurface.remove();
    canvas.remove();
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    dragSurface.remove();
    canvas.remove();
    return;
  }
  gl.useProgram(program);

  var cores = Math.max(2, navigator.hardwareConcurrency || 4);
  var compact = window.matchMedia('(max-width:760px)').matches;
  var count = compact ? Math.min(10000, cores * 1500) : Math.min(24000, cores * 3000);
  count = Math.max(compact ? 6000 : 12000, count);
  var primaryCount = Math.floor(count * .8);
  var surfaceCount = compact ? 12000 : 24000;
  count = primaryCount + surfaceCount;
  var points = new Float32Array(count * 8);
  var proximity = ProximityGeometry.create();
  var randomState = 1847;
  function random() { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; }
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < count; i++) {
    var seed = random();
    var theta = i * golden;
    var phi = ((i * 97) % count) / count * Math.PI * 2;
    var surface = .265 + (seed - .5) * .026;
    var ring = .735 + Math.cos(phi) * surface;
    var o = i * 8;
    points[o] = Math.cos(theta) * ring;
    points[o + 1] = Math.sin(theta) * ring;
    points[o + 2] = Math.sin(phi) * surface;
    points[o + 3] = seed;
    // Stratified length sampling preserves thin filaments, including at 50% dissolve.
    var target = proximity.sample(((i % primaryCount) + random()) / primaryCount);
    points[o + 4] = target[0];
    points[o + 5] = target[1];
    points[o + 6] = target[2];
    // Layer two has its own budget; it does not take particles from the zero.
    points[o + 7] = i >= primaryCount ? (i - primaryCount + 1) / surfaceCount : 0;
  }

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
  var stride = 8 * Float32Array.BYTES_PER_ELEMENT;
  var position = gl.getAttribLocation(program, 'aPosition');
  var seedLocation = gl.getAttribLocation(program, 'aSeed');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(seedLocation);
  gl.vertexAttribPointer(seedLocation, 1, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

  var proximityLocation = gl.getAttribLocation(program, 'aProximity');
  gl.enableVertexAttribArray(proximityLocation);
  gl.vertexAttribPointer(proximityLocation, 3, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);

  var recessLocation = gl.getAttribLocation(program, 'aRecess');
  gl.enableVertexAttribArray(recessLocation);
  gl.vertexAttribPointer(recessLocation, 1, gl.FLOAT, false, stride, 7 * Float32Array.BYTES_PER_ELEMENT);

  var wordBuffer = gl.createBuffer();
  var wordData = new Float32Array(count * 6);
  gl.bindBuffer(gl.ARRAY_BUFFER, wordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, wordData, gl.DYNAMIC_DRAW);
  var wordFromLocation = gl.getAttribLocation(program, 'aWordFrom');
  var wordLocation = gl.getAttribLocation(program, 'aWord');
  gl.enableVertexAttribArray(wordFromLocation);
  gl.vertexAttribPointer(wordFromLocation, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
  gl.enableVertexAttribArray(wordLocation);
  gl.vertexAttribPointer(wordLocation, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

  var referenceALocation = gl.getUniformLocation(program, 'uReferenceA');
  var referenceBLocation = gl.getUniformLocation(program, 'uReferenceB');
  var pageSurfaceLocation = gl.getUniformLocation(program, 'uPageSurface');
  var icebergPlacementLocation = gl.getUniformLocation(program, 'uIcebergPlacement');
  var icebergBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, icebergBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, IcebergGeometry.create(primaryCount, surfaceCount), gl.STATIC_DRAW);
  var icebergLocation = gl.getAttribLocation(program, 'aIceberg');
  gl.enableVertexAttribArray(icebergLocation);
  gl.vertexAttribPointer(icebergLocation, 4, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
  var surfaceTimeLocation = gl.getUniformLocation(program, 'uSurfaceTime');
  var lightThemeLocation = gl.getUniformLocation(program, 'uLightTheme');
  var layerPoseLocation = gl.getUniformLocation(program, 'uLayerPose');
  var homeLocation = gl.getUniformLocation(program, 'uHome');
  var lightTheme = false;
  var surfaceLocation = gl.getUniformLocation(program, 'uSurface');
  var projectionLocation = gl.getUniformLocation(program, 'uProjection');
  var extentLocation = gl.getUniformLocation(program, 'uFieldExtent');
  var timeLocation = gl.getUniformLocation(program, 'uTime');
  var ratioLocation = gl.getUniformLocation(program, 'uPixelRatio');
  var pointerLocation = gl.getUniformLocation(program, 'uPointer');
  var stateLocation = gl.getUniformLocation(program, 'uState');
  var dissolveLocation = gl.getUniformLocation(program, 'uDissolve');
  var burstLocation = gl.getUniformLocation(program, 'uBurst');
  var trailLocation = gl.getUniformLocation(program, 'uTrail');
  var shapeLocation = gl.getUniformLocation(program, 'uShape');
  var wordBlendLocation = gl.getUniformLocation(program, 'uWordBlend');
  var rotationLocation = gl.getUniformLocation(program, 'uRotation');
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)');
  var visible = true;
  var motionEnabled = !reduced.matches;
  var frame = 0;
  var contextLost = false;
  var start = performance.now();
  var lastTime = start;
  var elapsed = 0;
  var surfaceElapsed = 0;
  var shapeTarget = [0, 0, 0, 0];
  var shapeNow = [0, 0, 0, 0];
  var shapeFrom = [0, 0, 0, 0];
  var stateFrom = 0;
  var duration = 1.8;
  var transitionTime = duration;
  var dissolveNow = 0, dissolveFrom = 0;
  var burstNow = 0, burstFrom = 0;
  var traces = [];
  function smooth(value) { var t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); }
  var pointerTarget = { x: 0, y: 0 };
  var pointerNow = { x: 0, y: 0 };
  var pixelRatio = 1;
  var stateTarget = 0;
  var stateNow = 0;
  var currentWord = '';
  var wordAvailable = false;
  var wordTime = 1.2;
  var rotation = [0, 0];
  var pageNow = 'zero';
  var pageSurfaceNow = SurfaceMotion.forPage('zero');
  var pageSurfaceFrom = pageSurfaceNow.slice();
  var pageSurfaceTarget = pageSurfaceNow.slice();
  var placeNow = { x: 0, y: 0, scale: 1.2 };
  var placeFrom = { x: 0, y: 0, scale: 1.2 };
  var icebergPlacement = [scene.clientWidth * .52 / canvas.clientWidth, 0, .7];
  var icebergMeasureNeeded = true;
  function measureIceberg() {
    if (!icebergMeasureNeeded || pageNow !== 'concept') return;
    var concept = scene.querySelector('[data-ark-page="concept"]');
    var anchor = concept && concept.querySelector('[data-iceberg-anchor]');
    if (!anchor || !anchor.getBoundingClientRect) return;
    var bounds = anchor.getBoundingClientRect(), rootBounds = scene.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    var x = bounds.left + bounds.width / 2 - rootBounds.left - scene.clientWidth / 2;
    var y = bounds.top + bounds.height / 2 - rootBounds.top - scene.clientHeight * .49;
    icebergPlacement = [x * 2 / canvas.clientWidth, -y * 2 / canvas.clientHeight,
      Math.min(bounds.width / (meshSize() * .90), bounds.height / (meshSize() * .90))];
    icebergMeasureNeeded = false;
  }

  function updateWord(text, force) {
    if (currentWord === text && !force) return;
    var next = null;
    try { next = WordGeometry.create(text, primaryCount); } catch (error) { /* Keep the semantic title available. */ }
    wordAvailable = !!next;
    scene.classList.toggle('has-word-mesh', !!next);
    currentWord = text;
    if (!next) return;
    var t = Math.min(1, wordTime / 1.2);
    var blend = t * t * (3 - 2 * t);
    for (var i = 0; i < primaryCount; i++) for (var axis = 0; axis < 3; axis++) {
      var offset = i * 6 + axis;
      wordData[offset] += (wordData[offset + 3] - wordData[offset]) * blend;
      wordData[offset + 3] = next[i * 3 + axis];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, wordBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, wordData);
    wordTime = reduced.matches || state.get().paused ? 1.2 : 0;
  }

  function meshSize() { return Math.min(scene.clientWidth * .8472, scene.clientHeight * 1.1944); }

  function placement() {
    var width = scene.clientWidth, height = scene.clientHeight;
    if (pageNow.indexOf('article/') === 0 || pageNow === 'learnings') {
      var article = scene.querySelector('[data-ark-page="' + pageNow + '"]');
      var anchor = article && article.querySelector('[data-mesh-anchor]');
      if (anchor) {
        var target = anchor.getBoundingClientRect(), root = scene.getBoundingClientRect();
        return { x: target.left + target.width / 2 - root.left - width / 2,
          y: target.top + target.height / 2 - root.top - height * .49,
          scale: Math.min(target.width / (meshSize() * .72), target.height / (meshSize() * .38)) };
      }
    }
    if (pageNow === 'learnings') return { x: width * .25, y: -height * .18, scale: .6 };
    return { x: stateTarget * (compact ? .20 : .23) * width, y: stateTarget * (compact ? .18 : .03) * height, scale: pageNow === 'zero' ? 1.2 : 1 };
  }

  function resize() {
    var memory = Number(navigator.deviceMemory || 8);
    pixelRatio = Math.min(window.devicePixelRatio || 1, memory <= 4 ? 1 : 1.35);
    var width = Math.max(2, Math.round(canvas.clientWidth * pixelRatio));
    var height = Math.max(2, Math.round(canvas.clientHeight * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function draw(now) {
    frame = 0;
    if (contextLost) return;
    measureIceberg();
    resize();
    var dt = Math.min(Math.max((now - lastTime) / 1000, 0), .05);
    lastTime = now;
    if (motionEnabled && visible && !document.hidden) {
      elapsed += dt;
      if (pageNow === 'zero' && transitionTime >= duration) surfaceElapsed += dt;
      wordTime = Math.min(1.2, wordTime + dt);
    }
    pointerNow.x += (pointerTarget.x - pointerNow.x) * .035;
    pointerNow.y += (pointerTarget.y - pointerNow.y) * .035;
    if (motionEnabled) transitionTime = Math.min(duration, transitionTime + dt);
    var t = transitionTime / duration;
    var travel = smooth(t);
    var burst = smooth(t / .3) * (1 - smooth((t - .45) / .55));
    burstNow = burstFrom * (1 - travel) + burst;
    dissolveNow = dissolveFrom + (stateTarget * .5 - dissolveFrom) * travel;
    dissolveNow = Math.min(1, dissolveNow + .45 * burst);
    stateNow = stateFrom + (stateTarget - stateFrom) * travel;
    for (var si = 0; si < 4; si++) shapeNow[si] = shapeFrom[si] + (shapeTarget[si] - shapeFrom[si]) * travel;
    for (var pi = 0; pi < pageSurfaceNow.length; pi++) pageSurfaceNow[pi] = travel === 1 ? pageSurfaceTarget[pi] : pageSurfaceFrom[pi] + (pageSurfaceTarget[pi] - pageSurfaceFrom[pi]) * travel;
    var pose = placement();
    ['x', 'y'].forEach(function (key) { placeNow[key] = placeFrom[key] + (pose[key] - placeFrom[key]) * travel; });
    placeNow.scale = placeFrom.scale + (pose.scale - placeFrom.scale) * travel;
    canvas.style.transform = 'translate3d(' + placeNow.x + 'px,' + placeNow.y + 'px,0) scale(' + placeNow.scale + ')';
    // The hit surface follows the projected form, not the whole viewport.
    dragSurface.style.width = (meshSize() * placeNow.scale * .74) + 'px';
    dragSurface.style.height = (meshSize() * placeNow.scale * .74) + 'px';
    dragSurface.style.transform = 'translate3d(' + placeNow.x + 'px,' + placeNow.y + 'px,0)';
    dragSurface.hidden = pageNow.indexOf('article/') === 0 || pageNow === 'learnings';
    // State owns dissolution: 0 = whole, 1 = half dispersed until Back.
    var dissolve = dissolveNow;
    gl.clear(gl.COLOR_BUFFER_BIT);
    var surface = SurfaceMotion.sample(surfaceElapsed);
    gl.uniform4f(surfaceLocation, surface.weights[0], surface.weights[1], surface.weights[2], surface.weights[3]);
    canvas.dataset.surfaceState = surface.name;
    canvas.dataset.surfaceStage = surface.stage;
    gl.uniform1f(surfaceTimeLocation, surface.time);
    gl.uniform1f(lightThemeLocation, lightTheme ? 1 : 0);
    gl.uniform1f(homeLocation, pageSurfaceNow[4]);
    gl.uniform4f(referenceALocation, pageSurfaceNow[5],pageSurfaceNow[6],pageSurfaceNow[7],pageSurfaceNow[8]);
    gl.uniform2f(referenceBLocation, pageSurfaceNow[9],pageSurfaceNow[10]);
    gl.uniform4f(pageSurfaceLocation, pageSurfaceNow[0], pageSurfaceNow[1], pageSurfaceNow[2], pageSurfaceNow[3]);
    gl.uniform3f(layerPoseLocation, placeNow.x * 2 / canvas.clientWidth, -placeNow.y * 2 / canvas.clientHeight, placeNow.scale);
    var baseSize = meshSize();
    gl.uniform3f(icebergPlacementLocation, icebergPlacement[0], icebergPlacement[1], icebergPlacement[2]);
    gl.uniform2f(projectionLocation, baseSize / canvas.clientWidth, baseSize / canvas.clientHeight);
    gl.uniform2f(extentLocation, canvas.clientWidth / baseSize * 1.75, canvas.clientHeight / baseSize * 1.75);
    gl.uniform1f(timeLocation, elapsed);
    gl.uniform1f(dissolveLocation, dissolve);
    gl.uniform1f(ratioLocation, pixelRatio);
    gl.uniform4f(shapeLocation, shapeNow[0], shapeNow[1], shapeNow[2], shapeNow[3]);
    var wordT = Math.min(1, wordTime / 1.2);
    gl.uniform1f(wordBlendLocation, wordT * wordT * (3 - 2 * wordT));
    gl.uniform2f(rotationLocation, rotation[0] * Math.PI / 180, rotation[1] * Math.PI / 180);
    gl.uniform2f(pointerLocation, pointerNow.x, pointerNow.y);
    gl.uniform1f(stateLocation, stateNow);
    var sample = { at: now, shape: shapeNow.slice(), state: stateNow, dissolve: dissolve, burst: burstNow };
    traces.push(sample);
    traces = traces.filter(function (item) { return now - item.at <= 420; });
    var trailCount = 0;
    if (motionEnabled && t < 1) [300, 150].forEach(function (delay, index) {
      var past = traces.find(function (item) { return now - item.at <= delay; });
      if (!past || now - past.at < delay * .7) return;
      gl.uniform4f(shapeLocation, past.shape[0], past.shape[1], past.shape[2], past.shape[3]);
      gl.uniform1f(stateLocation, past.state);
      gl.uniform1f(dissolveLocation, past.dissolve);
      gl.uniform1f(burstLocation, past.burst);
      gl.uniform1f(trailLocation, 2 - index);
      gl.drawArrays(gl.POINTS, 0, primaryCount); trailCount++;
    });
    gl.uniform4f(shapeLocation, shapeNow[0], shapeNow[1], shapeNow[2], shapeNow[3]);
    gl.uniform1f(stateLocation, stateNow);
    gl.uniform1f(dissolveLocation, dissolveNow);
    gl.uniform1f(burstLocation, burstNow);
    gl.uniform1f(trailLocation, 0);
    gl.drawArrays(gl.POINTS, 0, count);
    canvas.dataset.drawCalls = String(1 + trailCount);
    canvas.dataset.phase = t >= 1 ? 'settled' : 'travel';
    if (motionEnabled && visible && !document.hidden) frame = window.requestAnimationFrame(draw);
  }

  function requestDraw() {
    if (!frame) frame = window.requestAnimationFrame(draw);
  }

  function syncTheme() {
    if (typeof getComputedStyle !== 'function') return;
    var token = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim();
    var parts = token.split(/\s+/);
    lightTheme = parseFloat(parts[2]) > 55;
    canvas.style.mixBlendMode = lightTheme ? 'multiply' : 'screen';
    requestDraw();
  }
  syncTheme();
  if (typeof MutationObserver !== 'undefined') {
    var themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('pagehide', function () { themeObserver.disconnect(); }, { once: true });
  }

  scene.addEventListener('pointermove', function (event) {
    if (event.pointerType !== 'mouse' || !motionEnabled) return;
    var rect = scene.getBoundingClientRect();
    pointerTarget.x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    pointerTarget.y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    requestDraw();
  }, { passive: true });
  scene.addEventListener('pointerleave', function () {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  });

  document.addEventListener('hero:motionchange', function (event) {
    motionEnabled = !!(event.detail && event.detail.enabled) && !reduced.matches;
    canvas.classList.toggle('is-still', !motionEnabled);
    if (motionEnabled) requestDraw();
  });
  function syncScene(current) {
    var target = state.mesh(current);
    var shape = target.shape;
    var nextShape = shape === 'orb' ? [1, 0, 0, 0] : shape === 'knot' ? [0, 1, 0, 0] : shape === 'proximity' ? [0, 0, 1, 0] : shape === 'word' ? [0, 0, 0, 1] : [0, 0, 0, 0];
    rotation = current.rotation.slice();
    if (shape === 'word') {
      updateWord(target.text);
      if (!wordAvailable) nextShape = [0, 0, 1, 0];
    }
    requestDraw();
    if (pageNow !== current.page || target.depth !== stateTarget || nextShape.some(function (value, index) { return value !== shapeTarget[index]; })) {
      pageSurfaceFrom = pageSurfaceNow.slice();
      pageSurfaceTarget = SurfaceMotion.forPage(current.page);
      pageNow = current.page;
      if (pageNow === 'concept') icebergMeasureNeeded = true;
      placeFrom = Object.assign({}, placeNow);
      stateFrom = stateNow;
      dissolveFrom = dissolveNow; burstFrom = burstNow;
      shapeFrom = shapeNow.slice();
      transitionTime = 0;
      stateTarget = target.depth;
      shapeTarget = nextShape;
      if (reduced.matches || current.paused) {
        stateNow = stateTarget;
        shapeNow = shapeTarget.slice();
        transitionTime = duration;
      }
      requestDraw();
    }
  }
  state.subscribe(syncScene);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) requestDraw();
  });
  reduced.addEventListener('change', function () {
    motionEnabled = !reduced.matches;
    canvas.classList.toggle('is-still', reduced.matches);
    if (reduced.matches) { stateNow = stateTarget; shapeNow = shapeTarget.slice(); transitionTime = duration; wordTime = 1.2; }
    requestDraw();
  });
  scene.addEventListener('scroll', function () { icebergMeasureNeeded = true; requestDraw(); }, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (currentWord) { updateWord(currentWord, true); syncScene(state.get()); requestDraw(); } });
  window.addEventListener('resize', function () { compact = window.matchMedia('(max-width:760px)').matches; icebergMeasureNeeded = true; requestDraw(); }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) requestDraw();
    }, { threshold: 0 }).observe(scene);
  }

  canvas.addEventListener('webglcontextlost', function (event) {
    event.preventDefault();
    contextLost = true;
    dragControl.cancel();
    dragSurface.remove();
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    fallback.classList.remove('zero-fallback-hidden');
    canvas.classList.remove('is-ready');
    scene.classList.remove('has-particle-shapes');
    scene.classList.remove('has-word-mesh');
  });
  window.addEventListener('pagehide', function () {
    var lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }, { once: true });

  if (frame) window.cancelAnimationFrame(frame);
  draw(start);
  fallback.classList.add('zero-fallback-hidden');
  canvas.classList.add('is-ready');
  scene.classList.add('has-particle-shapes');
  canvas.dataset.points = String(count);
  canvas.dataset.primaryPoints = String(primaryCount);
  canvas.dataset.surfacePoints = String(surfaceCount);
  canvas.dataset.drawCalls = '1';
})();
