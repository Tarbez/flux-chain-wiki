/* Persistent signal field and zoomable lifecycle canvas. */
(function () {
  'use strict';
  var scene = document.querySelector('#scene > [data-pattern="F-SCENE-RZERO_V0"]');
  var state = window.ArkUI && ArkUI.sceneState;
  var persistent = scene && scene.querySelector('[data-ark-layer="persistent"]');
  if (!scene || !state || !persistent) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var cellWidth = 15.5;
  var cellHeight = 10.5;
  var handles = [
    'ZERO', 'FORM', 'FIELD', 'TRACE', 'SHIFT', 'SENSE', 'MESH', 'VOID',
    'LINK', 'DEPTH', 'ORBIT', 'STATE', 'ATLAS', 'AXIS', 'BEAM', 'BRIDGE',
    'CACHE', 'CHAIN', 'CIPHER', 'CLOUD', 'CORE', 'CREST', 'DELTA', 'DRIFT',
    'ECHO', 'EDGE', 'EMBER', 'EPOCH', 'ETHER', 'FACTOR', 'FIBER', 'FLOW',
    'FOCUS', 'FRAME', 'GATE', 'GLYPH', 'GRAPH', 'HALO', 'HASH', 'HELIX',
    'HERTZ', 'HIVE', 'INDEX', 'INPUT', 'ION', 'JOINT', 'KERNEL', 'KEY',
    'LAYER', 'LIGHT', 'LOGIC', 'LOOP', 'LUMEN', 'MATRIX', 'MERGE', 'MODE',
    'MOTION', 'NEXUS', 'NODE', 'NOVA', 'OFFSET', 'OMEGA', 'ONSET', 'ORDER',
    'ORIGIN', 'PACKET', 'PATH', 'PHASE', 'PIVOT', 'PLANE', 'POINT', 'PORT',
    'PRISM', 'PROOF', 'PULSE', 'QUANTA', 'QUERY', 'QUEUE', 'RANGE', 'RELAY',
    'RIFT', 'ROOT', 'ROUTE', 'SCALE', 'SCOPE', 'SEED', 'SHARD', 'SIGNAL',
    'SLATE', 'SOLAR', 'SPARK', 'SPECTRA', 'SPHERE', 'SPLICE', 'STACK', 'STREAM',
    'STRIDE', 'SYNC', 'TEMPO', 'THREAD', 'TOKEN', 'TORUS', 'UNION', 'UNIT',
    'VECTOR', 'VERTEX', 'VISTA', 'VOLT', 'WAVE', 'WEAVE', 'YIELD', 'ZENITH',
    'ARC', 'BIND', 'BURST', 'CYCLE', 'DATUM', 'FLUX', 'LATCH', 'LEDGER',
    'LIMEN', 'MERIT', 'MIRROR', 'PRIME', 'QUORUM', 'RADIUS', 'RATIO', 'RUNE',
    'SHAPE', 'TALLY', 'TETHER', 'THRESH', 'TRUST', 'VAULT', 'VERIFY', 'WITNESS'
  ];
  var symbols = ['+', '*', '<>', '//', '=', '#', '::', '^', '[]', '~', '>', '<'];
  var field = document.createElement('canvas');
  var activity = document.createElement('canvas');
  field.className = 'lattice lattice-field';
  activity.className = 'lattice lattice-activity';
  field.setAttribute('aria-hidden', 'true');
  activity.setAttribute('aria-hidden', 'true');
  activity.setAttribute('role', 'application');
  field.dataset.source = 'clean.html';
  var fallback = persistent.querySelector('canvas[role="presentation"]');
  [field, activity].forEach(function (el) {
    persistent.insertBefore(el, fallback || null);
  });

  var width = 0, height = 0, cols = 0, rows = 0, ratio = 1;
  var active = false, timer = 0, resizeTimer = 0, routes = [], blinks = [];
  var nodeRows = [];
  var nextRoute = 0, nextBlink = 0;
  var colors = {};
  var camera = { zoom: 1, x: 0, y: 0 };
  var lifecycleTiming = ArkUI.lifecycleTransition;
  var cameraFrame = 0, cameraRevision = 0, lifecyclePage = '', factIndex = 0;
  var initialized = false, fieldMode = 'home';
  var readingProgress = 0, readingFrame = 0, readingRevision = 0;
  var readingChoiceIndex = 0, readingChoiceTotal = 0;
  var hitRegions = [], keyboardIndex = 0, scrollY = 0, maxScroll = 0;
  var stageSymbols = ['?', '↗', '=', '→', '✓'];
  var factSymbols = ['↘', '◇', '↗'];

  function unit(value) { return Math.max(0,Math.min(1,value)); }

  function themeColor(style, name, alpha) {
    return 'hsl(' + style.getPropertyValue('--' + name).trim() + ' / ' + alpha + ')';
  }

  function clearActivity(preserveCanvas) {
    window.clearTimeout(timer);
    timer = 0;
    routes = [];
    blinks = [];
    if (!preserveCanvas) activity.getContext('2d').clearRect(0, 0, width, height);
  }

  function sizeCanvas(canvas) {
    var pixelWidth=Math.round(width*ratio),pixelHeight=Math.round(height*ratio);
    if(canvas.width!==pixelWidth)canvas.width=pixelWidth;
    if(canvas.height!==pixelHeight)canvas.height=pixelHeight;
    canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw() {
    homeMeshInvalid=true;
    var rect = scene.getBoundingClientRect();
    var theme = getComputedStyle(document.documentElement);
    colors = {
      line: themeColor(theme, 'text-strong', .11),
      dormant: themeColor(theme, 'text-strong', .07),
      dormantAccent: themeColor(theme, 'accent', .1),
      label: themeColor(theme, 'text-muted', .45),
      quietLabel: themeColor(theme, 'text-muted', .28),
      symbol: themeColor(theme, 'text-strong', .31),
      symbolAccent: themeColor(theme, 'accent', .57),
      stat: themeColor(theme, 'text-muted', .31),
      active: themeColor(theme, 'text-strong', .48),
      activeAccent: themeColor(theme, 'accent', .56),
      activeLabel: themeColor(theme, 'primary', .95),
      strong: themeColor(theme, 'text-strong', .98),
      body: themeColor(theme, 'text-strong', .68),
      muted: themeColor(theme, 'text-muted', .9),
      accent: themeColor(theme, 'accent', .95),
      surface: themeColor(theme, 'surface', .77),
      veil: themeColor(theme, 'canvas', .62),
      highlight: themeColor(theme, 'primary', .16)
    };
    width = Math.max(1, Math.round(rect.width || window.innerWidth));
    height = Math.max(1, Math.round(window.innerHeight || rect.height));
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    var gridWidth = cellWidth * (1 + readingProgress * 1.5);
    var gridHeight = cellHeight * (1 + readingProgress * 1.5);
    cols = Math.ceil(width / gridWidth);
    rows = Math.ceil(height / gridHeight);
    sizeCanvas(field);
    sizeCanvas(activity);
    var ctx = field.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.line;
    ctx.globalAlpha = 1 - readingProgress * .56;
    ctx.beginPath();
    for (var x = 1; x < cols; x++) {
      var gx = Math.round(x * gridWidth) + .5;
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
    }
    for (var y = 1; y < rows; y++) {
      var gy = Math.round(y * gridHeight) + .5;
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
    }
    ctx.stroke();

    // Faint dormant cells give the field texture without adding live elements.
    for (var cy = 1; cy < rows; cy++) {
      for (var cx = 1; cx < cols; cx++) {
        var hash = (cx * 37 + cy * 53 + cx * cy * 7) % 41;
        if (hash !== 0 && hash !== 3 && hash !== 19) continue;
        ctx.fillStyle = hash === 19 ? colors.dormantAccent : colors.dormant;
        ctx.fillRect(cx * gridWidth + 1, cy * gridHeight + 1, gridWidth - 2, gridHeight - 2);
      }
    }

    ctx.font = '500 5px ui-monospace, SFMono-Regular, Menlo, monospace';
    var index = 0;
    nodeRows = [];
    for (var row = 1; row < rows; row += 2) {
      var nodes = [];
      for (var col = row % 4 === 1 ? 1 : 2; col < cols; col += 3) {
        var px = col * gridWidth + 2, py = row * gridHeight + 6;
        var quiet = px < width * .62 && py > height * .3;
        ctx.globalAlpha = (1 - readingProgress * .56) *
          (px > width * (width <= 760 ? .04 : .35) && px < width * .94 ? 1 - readingProgress * .9 : 1);
        var handle = handles[index % handles.length];
        ctx.fillStyle = quiet ? colors.quietLabel : colors.label;
        ctx.fillText(handle, px, py, 34);
        ctx.fillStyle = index % 9 === 0 ? colors.symbolAccent : colors.symbol;
        ctx.fillText(symbols[(index * 7 + row) % symbols.length], px + 34, py);
        ctx.fillRect(px - 3, py - 4, 1, 1);
        if (index % 5 === 0) {
          ctx.fillStyle = colors.stat;
          ctx.fillText(String((index * 13 + row * 7) % 100).padStart(2, '0'), px + 2, py + gridHeight);
        }
        nodes.push({ col: col, row: row, x: px, y: py, handle: handle });
        index++;
      }
      nodeRows.push(nodes);
    }
    if (readingProgress > .01 && readingChoiceTotal) {
      ctx.globalAlpha = readingProgress * .76;
      for (var choice = 0; choice < readingChoiceTotal; choice++) {
        ctx.fillStyle = choice === readingChoiceIndex ? colors.accent : colors.symbol;
        var markerWidth = width <= 760 ? 7 : choice === readingChoiceIndex ? 24 : 11;
        ctx.fillRect(width - (width <= 760 ? 11 : markerWidth + 13),
          Math.round(height * .32 + choice * 28),markerWidth,choice === readingChoiceIndex ? 3 : 2);
      }
    }
    ctx.globalAlpha = 1;
    fieldMode = 'home';
  }

  function animateReading(page, outgoingPage) {
    var target = page.indexOf('article/') === 0 ? 1 : 0;
    field.classList.toggle('lattice-reading',!!target);
    var from = readingProgress;
    var revision = ++readingRevision;
    if (readingFrame && window.cancelAnimationFrame) window.cancelAnimationFrame(readingFrame);
    readingFrame=0;
    if (reduce.matches || document.hidden || !window.requestAnimationFrame || from === target ||
        isLifecycle(page) || isLifecycle(outgoingPage || '')) {
      readingProgress = target;
      draw();
      return;
    }
    var start = 0;
    function frame(now) {
      if (revision !== readingRevision) return;
      if (!start) start = now;
      var t = unit((now - start) / 460);
      readingProgress = from + (target - from) * (t * t * (3 - 2 * t));
      draw();
      if (t < 1) readingFrame = window.requestAnimationFrame(frame);
      else {
        readingFrame = 0;
        if (active && !timer && !cameraFrame && !reduce.matches) tick();
      }
    }
    readingFrame = window.requestAnimationFrame(frame);
  }

  function lifecycleNodes() {
    var mobile = width <= 760;
    var nodeWidth = mobile ? cellWidth * 7 : cellWidth * 3.3;
    var nodeHeight = mobile ? cellHeight * 4.2 : cellHeight * 10;
    var gap = mobile ? cellHeight : cellWidth;
    var startX = mobile ? width * .5 - nodeWidth / 2
      : width * .75 - (nodeWidth * 5 + gap * 4) / 2;
    var startY = mobile ? height * .56 - (nodeHeight * 5 + gap * 4) / 2
      : height * .72 - nodeHeight / 2;
    return ArkUI.lifecycleStages.map(function (stage, i) {
      return { id: stage.id, title: stage.title, index: i,
        x: mobile ? startX : startX + i * (nodeWidth + gap),
        y: mobile ? startY + i * (nodeHeight + gap) : startY,
        width: nodeWidth, height: nodeHeight };
    });
  }

  function makeRoute() {
    if (!nodeRows.length || !nodeRows[0].length) return null;
    var row = Math.floor(Math.random() * nodeRows.length);
    var col = Math.floor(Math.random() * nodeRows[row].length);
    var dx = Math.random() > .5 ? 1 : -1;
    var dy = Math.random() > .5 ? 1 : -1;
    if (col < 4) dx = 1;
    if (col > nodeRows[row].length - 5) dx = -1;
    if (row < 4) dy = 1;
    if (row > nodeRows.length - 5) dy = -1;
    var nodes = [nodeRows[row][col]];
    var length = 6 + Math.floor(Math.random() * 4);
    while (nodes.length < length) {
      var horizontal = col + dx >= 0 && col + dx < nodeRows[row].length;
      var vertical = row + dy >= 0 && row + dy < nodeRows.length && col < nodeRows[row + dy].length;
      if (!horizontal && !vertical) break;
      if (horizontal && (!vertical || Math.random() < .62)) col += dx;
      else row += dy;
      nodes.push(nodeRows[row][col]);
    }
    return { nodes: nodes, age: 0, accent: Math.random() > .45 };
  }

  function lightNode(ctx, node, strength, accent) {
    ctx.globalAlpha = strength;
    ctx.fillStyle = accent ? colors.activeAccent : colors.active;
    ctx.fillRect(node.col * cellWidth + 1, node.row * cellHeight + 1,
      cellWidth * 2.7, cellHeight - 2);
    ctx.fillStyle = colors.activeLabel;
    ctx.fillText(node.handle, node.x, node.y, 34);
    ctx.globalAlpha = 1;
  }

  function paintActivity() {
    var ctx = activity.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.font = '600 5px ui-monospace, SFMono-Regular, Menlo, monospace';
    routes.forEach(function (route) {
      route.nodes.forEach(function (node, index) {
        var moment = route.age - index * 3.7;
        if (moment < 0 || moment > 9) return;
        lightNode(ctx, node, Math.sin(moment / 9 * Math.PI), route.accent);
      });
      route.age++;
    });
    routes = routes.filter(function (route) { return route.age < route.nodes.length * 3.7 + 9; });
    blinks.forEach(function (blink) {
      var strength = Math.sin(blink.age / 8 * Math.PI);
      if (strength > 0) lightNode(ctx, blink.node, strength * .75, blink.accent);
      blink.age++;
    });
    blinks = blinks.filter(function (blink) { return blink.age <= 8; });
  }

  function isLifecycle(page) { return page === 'lifecycle' || page.indexOf('lifecycle/') === 0; }

  function targetCamera(page) {
    if (!isLifecycle(page)) return { zoom: 1, x: 0, y: 0 };
    var nodes = lifecycleNodes();
    var mobile = width <= 760;
    var stageId = page.split('/')[1];
    var selected = nodes.find(function (node) { return node.id === stageId; });
    var first = nodes[0], last = nodes[nodes.length - 1];
    var spanWidth = mobile ? first.width : last.x + last.width - first.x;
    var spanHeight = mobile ? last.y + last.height - first.y : first.height;
    var zoom = selected ? mobile ? 5.3 : Math.min(26,width / selected.width * 1.06)
      : Math.max(.75,Math.min(mobile ? 2 : 4.1, (width - (mobile ? 48 : 128)) / spanWidth,
        (height - (mobile ? 330 : 210)) / spanHeight));
    var centerX = selected ? selected.x + selected.width / 2 : first.x + spanWidth / 2;
    var centerY = selected ? selected.y + selected.height / 2 : first.y + spanHeight / 2;
    var screenY = mobile && !selected ? (height + 250) / 2 : (height + (mobile ? 72 : 76)) / 2;
    if (!mobile && !selected) screenY = Math.max(screenY,295 + spanHeight * zoom / 2);
    return { zoom: zoom, x: width / 2 - centerX * zoom, y: screenY - centerY * zoom };
  }

  function applyCamera() {
    field.style.transform = 'none';
    if (isLifecycle(lifecyclePage) || camera.zoom > 1.01) paintZoomField();
    else if (fieldMode !== 'home') draw();
  }

  function paintZoomField() {
    fieldMode = 'zoom';
    var ctx = field.getContext('2d');
    ctx.clearRect(0,0,width,height);
    paintGridLevel(ctx,16,unit((camera.zoom - 9) / 5) * .6);
    paintGridLevel(ctx,8,unit((camera.zoom - 5) / 2.5) * .65);
    paintGridLevel(ctx,4,unit((camera.zoom - 1.4) / 2) * .7);
    paintGridLevel(ctx,1,1);
  }

  function paintGridLevel(ctx, divisor, opacity) {
    if (!opacity) return;
    var stepX = cellWidth * camera.zoom / divisor;
    var stepY = cellHeight * camera.zoom / divisor;
    var firstCol = Math.floor(-camera.x / stepX) - 1;
    var lastCol = Math.ceil((width - camera.x) / stepX) + 1;
    var firstRow = Math.floor(-camera.y / stepY) - 1;
    var lastRow = Math.ceil((height - camera.y) / stepY) + 1;
    ctx.save();
    ctx.globalAlpha *= opacity;
    ctx.lineWidth = 1;
    ctx.strokeStyle = divisor === 1 ? colors.symbol : colors.line;
    ctx.beginPath();
    for (var col = firstCol; col <= lastCol; col++) {
      var gx = Math.round(camera.x + col * stepX) + .5;
      ctx.moveTo(gx,0);
      ctx.lineTo(gx,height);
    }
    for (var row = firstRow; row <= lastRow; row++) {
      var gy = Math.round(camera.y + row * stepY) + .5;
      ctx.moveTo(0,gy);
      ctx.lineTo(width,gy);
    }
    ctx.stroke();
    for (var fillRow = firstRow; fillRow <= lastRow; fillRow++) {
      for (var fillCol = firstCol; fillCol <= lastCol; fillCol++) {
        var hash = Math.abs(fillCol * 37 + fillRow * 53 + fillCol * fillRow * 7) % 41;
        if (hash !== 0 && hash !== 3 && hash !== 19) continue;
        ctx.fillStyle = hash === 19 ? colors.dormantAccent : colors.dormant;
        ctx.fillRect(camera.x + fillCol * stepX + 1,camera.y + fillRow * stepY + 1,
          Math.max(1,stepX - 2),Math.max(1,stepY - 2));
      }
    }
    if (stepX < 12 || stepY < 8) { ctx.restore(); return; }
    ctx.font = '500 ' + Math.min(8,Math.max(5,5 * camera.zoom / divisor))
      + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    for (var labelRow = firstRow; labelRow <= lastRow; labelRow++) {
      if ((labelRow % 2 + 2) % 2 !== 1) continue;
      for (var labelCol = firstCol; labelCol <= lastCol; labelCol++) {
        if ((labelCol % 3 + 3) % 3 !== 1) continue;
        var x = camera.x + labelCol * stepX + 2;
        var y = camera.y + labelRow * stepY + 6;
        var index = Math.abs(labelCol * 13 + labelRow * 17 + divisor * 23);
        ctx.fillStyle = lifecyclePage.indexOf('lifecycle/') === 0 && x > width * .43 && y > height * .28
          ? colors.quietLabel : colors.label;
        ctx.fillText(handles[index % handles.length],x,y,34);
        ctx.fillStyle = index % 9 === 0 ? colors.symbolAccent : colors.symbol;
        ctx.fillText(symbols[index % symbols.length],x + 34,y);
        if (index % 5 === 0) {
          ctx.fillStyle = colors.stat;
          ctx.fillText(String(index % 100).padStart(2,'0'),x + 2,y + stepY);
        }
      }
    }
    ctx.restore();
  }

  function animateCamera(page, outgoingPage) {
    var run = state.lifecycleRun;
    var target = targetCamera(page);
    var from = { zoom: camera.zoom, x: camera.x, y: camera.y };
    var nodes = ArkUI.lifecycleStages ? lifecycleNodes() : [];
    var stageId = page.split('/')[1];
    var selected = nodes.find(function (node) { return node.id === stageId; });
    var outgoingId = outgoingPage && outgoingPage.split('/')[1];
    var outgoingNode = nodes.find(function (node) { return node.id === outgoingId; });
    var anchorNode = selected || outgoingNode;
    var anchorX = anchorNode ? anchorNode.x + anchorNode.width / 2
      : page === 'lifecycle' && nodes.length ? (nodes[0].x + nodes[nodes.length - 1].x + nodes[nodes.length - 1].width) / 2
        : (width / 2 - from.x) / from.zoom;
    var anchorY = anchorNode ? anchorNode.y + anchorNode.height / 2
      : page === 'lifecycle' && nodes.length ? nodes[0].y + nodes[0].height / 2
        : (height / 2 - from.y) / from.zoom;
    var startX = from.x + anchorX * from.zoom, startY = from.y + anchorY * from.zoom;
    var endX = target.x + anchorX * target.zoom, endY = target.y + anchorY * target.zoom;
    var revision = ++cameraRevision;
    if (cameraFrame && window.cancelAnimationFrame) window.cancelAnimationFrame(cameraFrame);
    if (reduce.matches || document.hidden || !window.requestAnimationFrame ||
        Math.abs(target.zoom - from.zoom) + Math.abs(target.x - from.x) + Math.abs(target.y - from.y) < .01) {
      camera = target;
      applyCamera();
      if (isLifecycle(page) || isLifecycle(outgoingPage)) paintLifecycle();
      if (run) run.finish();
      return;
    }
    var start = 0;
    function frame(now) {
      if (revision !== cameraRevision) return;
      if (!start) start = now;
      var elapsed = Math.min(lifecycleTiming.totalMs,now - start);
      var zoomT = Math.min(1,elapsed / lifecycleTiming.zoomMs);
      var eased = zoomT * zoomT * (3 - 2 * zoomT);
      var zoom = from.zoom * Math.pow(target.zoom / from.zoom,eased);
      camera = {
        zoom: zoom,
        x: startX + (endX - startX) * eased - anchorX * zoom,
        y: startY + (endY - startY) * eased - anchorY * zoom
      };
      applyCamera();
      if (isLifecycle(page) || isLifecycle(outgoingPage)) paintLifecycle(elapsed,outgoingPage);
      if (run) run.advance(elapsed);
      if (elapsed < lifecycleTiming.totalMs) cameraFrame = window.requestAnimationFrame(frame);
      else {
        cameraFrame = 0;
        if (page === 'zero' && active && !timer) tick();
      }
    }
    cameraFrame = window.requestAnimationFrame(frame);
  }

  function projected(node) {
    return { x: node.x * camera.zoom + camera.x, y: node.y * camera.zoom + camera.y,
      width: node.width * camera.zoom, height: node.height * camera.zoom };
  }

  function drawWrapped(ctx, value, x, y, maxWidth, lineHeight, font, color) {
    ctx.font = font;
    ctx.fillStyle = color;
    var words = value.split(/\s+/);
    var line = '';
    words.forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      var measured = ctx.measureText ? ctx.measureText(next).width : next.length * lineHeight * .45;
      if (line && measured > maxWidth) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else line = next;
    });
    if (line) { ctx.fillText(line, x, y); y += lineHeight; }
    return y;
  }

  function hit(type, x, y, width, height, index) {
    hitRegions.push({ type: type, x: x, y: y, width: width, height: height, index: index });
  }

  function paintOverview(ctx, visibility) {
    var mobile = width <= 760;
    var margin = mobile ? 24 : Math.max(52, width * .05);
    var nav = mobile ? 72 : 76;
    ctx.textBaseline = 'top';
    ctx.globalAlpha = visibility(0);
    ctx.fillStyle = colors.muted;
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('FLUX PROTOCOL / HOME', margin, nav + 38);
    hit('home', margin, nav + 26, 190, 34);
    ctx.fillStyle = colors.accent;
    ctx.fillText('01 — 05 / CAUSAL TRAIL', margin, nav + 88);
    ctx.fillStyle = colors.strong;
    ctx.font = '800 ' + (mobile ? 37 : Math.min(60, width * .047)) + 'px Albert Sans, sans-serif';
    if (mobile) {
      ctx.fillText('AGREEMENT', margin, nav + 116);
      ctx.fillText('LIFECYCLE.', margin, nav + 154);
    } else ctx.fillText('AGREEMENT LIFECYCLE.', margin, nav + 116);
    lifecycleNodes().forEach(function (node) {
      ctx.globalAlpha = visibility(node.index + 1);
      var rect = projected(node);
      if (rect.width < 12 || rect.height < 12) return;
      ctx.fillStyle = colors.accent;
      ctx.fillRect(rect.x,rect.y,2,Math.min(24,rect.height * .12));
      var pad = Math.max(8,Math.min(20,rect.width * .08));
      ctx.fillStyle = colors.muted;
      ctx.font = '600 ' + Math.max(9,Math.min(13,rect.width * .06)) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(('0' + (node.index + 1)).slice(-2),rect.x + pad,rect.y + pad);
      if (mobile) {
        ctx.fillStyle = colors.accent;
        ctx.font = '300 32px Albert Sans, sans-serif';
        ctx.fillText(stageSymbols[node.index],rect.x + pad,rect.y + rect.height / 2 - 11);
        ctx.fillStyle = colors.strong;
        ctx.font = '700 19px Albert Sans, sans-serif';
        ctx.fillText(node.title.toUpperCase(),rect.x + pad + 54,rect.y + rect.height / 2 - 6,
          rect.width - pad * 2 - 54);
      } else {
        ctx.fillStyle = colors.accent;
        ctx.font = '300 ' + Math.max(24,Math.min(65,rect.height * .35)) + 'px Albert Sans, sans-serif';
        ctx.fillText(stageSymbols[node.index],rect.x + pad,rect.y + rect.height * .43);
        ctx.fillStyle = colors.strong;
        ctx.font = '700 ' + Math.max(14,Math.min(25,rect.width * .105)) + 'px Albert Sans, sans-serif';
        ctx.fillText(node.title.toUpperCase(),rect.x + pad,rect.y + rect.height - pad - 22,rect.width - pad * 2);
      }
      hit('stage',rect.x,rect.y,rect.width,rect.height,node.index);
    });
  }

  function paintStage(ctx, id, visibility) {
    var stages = ArkUI.lifecycleStages;
    var index = stages.findIndex(function (stage) { return stage.id === id; });
    var copy = ArkUI.lifecycleContent && ArkUI.lifecycleContent[id];
    if (index < 0 || !copy) return;
    var mobile = width <= 760, nav = mobile ? 72 : 76;
    var margin = mobile ? 24 : Math.max(52,width * .05);
    var offset = scrollY;
    ctx.textBaseline = 'top';
    ctx.globalAlpha = visibility(0);
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = colors.muted;
    ctx.fillText('FLUX PROTOCOL / HOME',margin,nav + 36 - offset);
    hit('home',margin,nav + 25 - offset,190,32);
    ctx.fillStyle = colors.accent;
    ctx.fillText('01 — 05 / CAUSAL TRAIL',margin,nav + 88 - offset);
    ctx.fillStyle = colors.strong;
    ctx.font = '800 ' + (mobile ? Math.min(27,width * .07) : Math.min(60,width * .047)) + 'px Albert Sans, sans-serif';
    ctx.fillText('AGREEMENT LIFECYCLE.',margin,nav + 116 - offset,width - margin * 2);
    var backX = width - margin - (mobile ? 96 : 116);
    ctx.fillStyle = colors.muted;
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('← ALL STAGES',backX,nav + (mobile ? 36 : 43) - offset);
    hit('overview',backX - 8,nav + (mobile ? 24 : 31) - offset,130,36);

    ctx.globalAlpha = visibility(1);
    var contentX = mobile ? margin : width * .48;
    var contentWidth = mobile ? width - margin * 2 : width - contentX - margin;
    var top = mobile ? nav + 190 : Math.max(nav + 190,Math.min(height * .34,nav + 260));
    ctx.fillStyle = colors.muted;
    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(('0' + (index + 1)).slice(-2),margin,top - offset);
    ctx.fillStyle = colors.accent;
    ctx.font = '300 ' + (mobile ? 58 : Math.min(110,width * .085)) + 'px Albert Sans, sans-serif';
    ctx.fillText(stageSymbols[index],mobile ? margin + 35 : margin,top + (mobile ? -18 : Math.max(170,height * .26)) - offset);
    ctx.fillStyle = colors.strong;
    ctx.font = '800 ' + (mobile ? Math.min(52,width * .12) : Math.min(88,width * .067)) + 'px Albert Sans, sans-serif';
    ctx.fillText(stages[index].title.toUpperCase(),mobile ? margin + 104 : margin,
      top + (mobile ? 1 : Math.max(265,height * .39)) - offset,mobile ? width - margin * 2 - 104 : width * .39);

    ctx.globalAlpha = visibility(2);
    var y = mobile ? top + 100 : top;
    y = drawWrapped(ctx,copy.heading.toUpperCase(),contentX,y - offset,contentWidth,mobile ? 32 : 44,
      '700 ' + (mobile ? 29 : Math.min(40,width * .032)) + 'px Albert Sans, sans-serif',colors.strong) + offset + 20;
    y = drawWrapped(ctx,copy.lead,contentX,y - offset,contentWidth,mobile ? 27 : 29,
      '500 ' + (mobile ? 18 : 21) + 'px Albert Sans, sans-serif',colors.strong) + offset + 27;
    ctx.globalAlpha = visibility(3);
    y = drawWrapped(ctx,copy.body,contentX,y - offset,contentWidth,mobile ? 21 : 23,
      '400 ' + (mobile ? 12 : 14) + 'px ui-monospace, SFMono-Regular, Menlo, monospace',colors.body) + offset + 24;
    y = drawWrapped(ctx,copy.note,contentX,y - offset,contentWidth,17,
      '400 11px ui-monospace, SFMono-Regular, Menlo, monospace',colors.muted) + offset;
    ctx.globalAlpha = visibility(4);
    var factsY = mobile ? y + 18 : Math.max(height - 153,y + 34);
    var labels = copy.facts.map(function (fact) { return fact[0]; });
    var buttonWidth = mobile ? Math.min(104,(contentWidth - 16) / 3) : 110;
    labels.forEach(function (label,i) {
      var x = contentX + i * (buttonWidth + 8), by = factsY - offset;
      ctx.fillStyle = i === factIndex ? colors.accent : colors.muted;
      ctx.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(factSymbols[i],x + 10,by + 11);
      ctx.fillStyle = i === factIndex ? colors.strong : colors.muted;
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(label.toUpperCase(),x + 31,by + 14,buttonWidth - 35);
      hit('fact',x,by,buttonWidth,42,i);
    });
    var outputY = factsY + (mobile ? 48 : 55) - offset;
    drawWrapped(ctx,copy.facts[factIndex][1],contentX + 10,outputY + 8,contentWidth - 20,20,
      '500 12px ui-monospace, SFMono-Regular, Menlo, monospace',colors.strong);
    maxScroll = Math.max(0,factsY + (mobile ? 105 + 80 : 112 + 24) - height);
  }

  function fullVisibility() { return 1; }

  function paintLifecyclePage(ctx, page, visibility) {
    if (!isLifecycle(page)) return;
    ctx.save();
    var id = page.split('/')[1];
    if (!id) paintOverview(ctx,visibility);
    else {
      var nav = width <= 760 ? 72 : 76;
      ctx.beginPath();
      ctx.rect(0,nav,width,height - nav);
      ctx.clip();
      paintStage(ctx,id,visibility);
    }
    ctx.restore();
  }

  function paintLifecycle(elapsed, outgoingPage) {
    var ctx = activity.getContext('2d');
    ctx.clearRect(0,0,width,height);
    hitRegions = [];
    if (outgoingPage && outgoingPage !== lifecyclePage && elapsed < lifecycleTiming.totalMs) {
      paintLifecyclePage(ctx,outgoingPage,function (index) { return lifecycleTiming.opacityOut(elapsed,index); });
      paintLifecyclePage(ctx,lifecyclePage,function (index) { return lifecycleTiming.opacityIn(elapsed,index); });
      hitRegions = [];
    } else paintLifecyclePage(ctx,lifecyclePage,fullVisibility);
    if (!isLifecycle(lifecyclePage)) return;
    var id = lifecyclePage.split('/')[1];
    activity.setAttribute('aria-label',id && ArkUI.lifecycleContent && ArkUI.lifecycleContent[id]
      ? ArkUI.lifecycleStages.find(function (stage) { return stage.id === id; }).title + '. '
        + ArkUI.lifecycleContent[id].lead + ' ' + ArkUI.lifecycleContent[id].facts[factIndex][0]
        + ': ' + ArkUI.lifecycleContent[id].facts[factIndex][1]
      : 'Agreement lifecycle. Five stages: Intent, Offer, Agreement, Fulfillment, Receipt.');
  }

  // Home interactions repaint existing grid cells on the activity canvas.
  // No pictograms or independent geometry: all fills share the substrate grid.
  var homeMeshStage='',homeMeshFrame=0,homeHover='',homeFocus='';
  var homeMeshRevision=0,homeMeshBounds=null,homeMeshStill=null,homeMeshInvalid=false;
  var homeMeshCells=[],homeMeshColor='',homeMeshLastPaint=-Infinity;
  function stopHomeMesh(){
    if(homeMeshFrame)window.cancelAnimationFrame(homeMeshFrame);
    homeMeshFrame=0;homeMeshRevision++;
    if(homeMeshBounds)activity.getContext('2d').clearRect(homeMeshBounds.x,homeMeshBounds.y,homeMeshBounds.width,homeMeshBounds.height);
    homeMeshBounds=null;homeMeshCells=[];
    delete activity.dataset.homeMeshStage;
  }
  function agreementCellLevel(stage,progress,cell){
    var x=cell.x,y=cell.y,col=cell.col,row=cell.row,level=0;
      if(stage==='intent'){
        var radius=Math.max(Math.abs(x-.18)*2,Math.abs(y-.5));
        level=radius<.1+progress*.22 ? .28 : 0;
        if(Math.abs(radius-(.1+progress*.22))<.055)level=.65;
      }else if(stage==='offer'){
        var band=Math.abs(y-.28)<.14||Math.abs(y-.72)<.14;
        level=band&&x>.12&&x<.12+progress*.56 ? .42 : 0;
        if(band&&Math.abs(x-(.12+progress*.56))<.055)level=.75;
      }else if(stage==='agreement'){
        var gap=(1-progress)*.35;
        level=Math.abs(y-.5)<.23&&Math.abs(x-.5)>gap&&Math.abs(x-.5)<gap+.13 ? .55 : 0;
        if(progress>.8&&Math.abs(x-.5)<.15&&Math.abs(y-.5)<.25)level=.5;
      }else if(stage==='fulfillment'){
        var frontier=progress*.95;
        level=x<frontier&&((col+row)%3===0) ? .32 : 0;
        if(Math.abs(x-frontier)<.05)level=.7;
      }else if(stage==='receipt'){
        var order=cell.order;
        level=order<progress&&row%2===0 ? .36 : 0;
        if(order<progress&&col%5===0&&row%2===0)level=.65;
      }
    return level;
  }
  ArkUI.agreementCellLevel=agreementCellLevel;
  function measureHomeMesh(){
    var box=scene.querySelector('.home-substrate-window');
    if(!box)return false;
    var area=box.getBoundingClientRect(),base=scene.getBoundingClientRect();
    if(!area.width||!area.height)return false;
    var left=Math.ceil((area.left-base.left)/cellWidth),right=Math.floor((area.right-base.left)/cellWidth);
    var top=Math.ceil((area.top-base.top+28)/cellHeight),bottom=Math.floor((area.bottom-base.top)/cellHeight);
    var countX=Math.max(1,right-left),countY=Math.max(1,bottom-top);
    homeMeshBounds={x:left*cellWidth,y:top*cellHeight,width:countX*cellWidth,height:countY*cellHeight};
    homeMeshCells=[];
    for(var row=top;row<bottom;row++)for(var col=left;col<right;col++)homeMeshCells.push({
      x:(col-left+.5)/countX,y:(row-top+.5)/countY,col:col,row:row,
      px:col*cellWidth+1,py:row*cellHeight+1,order:((row-top)*countX+col-left)/(countX*countY)
    });
    homeMeshColor=colors.activeLabel;homeMeshInvalid=false;
    return true;
  }
  function paintHomeMesh(stage,progress){
    if(!homeMeshBounds)return;
    var ctx=activity.getContext('2d');
    ctx.clearRect(homeMeshBounds.x,homeMeshBounds.y,homeMeshBounds.width,homeMeshBounds.height);
    ctx.fillStyle=homeMeshColor;
    for(var i=0;i<homeMeshCells.length;i++){
      var cell=homeMeshCells[i],x=cell.x,y=cell.y,col=cell.col,row=cell.row,level=0;
      level=agreementCellLevel(stage,progress,cell);
      if(level){ctx.globalAlpha=level;ctx.fillRect(cell.px,cell.py,cellWidth-2,cellHeight-2);}
    }
    ctx.globalAlpha=1;
  }
  function startHomeMesh(stage,still){
    stopHomeMesh();
    homeMeshStill=!!(still||reduce.matches||state.get().paused||document.hidden);
    if(!stage||state.get().page!=='zero'||document.hidden||!measureHomeMesh())return;
    activity.dataset.homeMeshStage=stage;
    if(homeMeshStill){paintHomeMesh(stage,1);return;}
    var started=performance.now(),revision=homeMeshRevision;homeMeshLastPaint=-Infinity;
    function frame(now){
      if(revision!==homeMeshRevision)return;
      if(document.hidden||state.get().page!=='zero'){stopHomeMesh();return;}
      var progress=unit((now-started)/850);
      if(progress===1||now-homeMeshLastPaint>=1000/30){paintHomeMesh(stage,progress);homeMeshLastPaint=now;}
      if(progress<1)homeMeshFrame=window.requestAnimationFrame(frame);else homeMeshFrame=0;
    }
    homeMeshFrame=window.requestAnimationFrame(frame);
  }
  function homeStep(target){var link=target&&target.closest&&target.closest('.home-cycle-step');return link&&scene.contains(link)?link.dataset.stage:'';}
  function refreshHomeMesh(){
    var next=homeHover||homeFocus;
    if(next===homeMeshStage)return;
    homeMeshStage=next;startHomeMesh(next,false);
  }
  scene.addEventListener('pointerover',function(event){homeHover=homeStep(event.target);refreshHomeMesh();});
  scene.addEventListener('pointerout',function(event){homeHover=homeStep(event.relatedTarget);refreshHomeMesh();});
  scene.addEventListener('focusin',function(event){homeFocus=homeStep(event.target);refreshHomeMesh();});
  scene.addEventListener('focusout',function(event){homeFocus=homeStep(event.relatedTarget);refreshHomeMesh();});

  function tick() {
    if(scene.querySelector('.home-lifecycle')){window.clearTimeout(timer);timer=0;return;}
    // The home diagram owns its ordered signal; retain this canvas as texture.
    var homeFlow = scene.querySelector('.home-agreement-flow');
    if (homeFlow && homeFlow.dataset && homeFlow.dataset.homeFlow === 'ordered') return clearActivity();
    if (!active || reduce.matches || document.hidden || readingProgress > .01) return clearActivity();
    var now = performance.now();
    if (now >= nextRoute && routes.length < 2) {
      var route = makeRoute();
      if (route) routes.push(route);
      nextRoute = now + 1100 + Math.random() * 1300;
    }
    if (now >= nextBlink && blinks.length < 5 && nodeRows.length) {
      var row = nodeRows[Math.floor(Math.random() * nodeRows.length)];
      var node = row[Math.floor(Math.random() * row.length)];
      if (node && !routes.some(function (route) { return route.nodes.includes(node); })) {
        blinks.push({ node: node, age: 0, accent: Math.random() > .6 });
      }
      nextBlink = now + 220 + Math.random() * 650;
    }
    paintActivity();
    timer = window.setTimeout(tick, 85);
  }

  function sync(current) {
    var page = current.page;
    var outgoingPage = lifecyclePage;
    var changed = page !== lifecyclePage;
    lifecyclePage = page;
    if (changed && page.indexOf('article/') === 0) readingChoiceIndex = -1;
    if (changed || !initialized) animateReading(page,outgoingPage);
    active = page === 'zero';
    var still = reduce.matches || current.paused || document.hidden;
    if (scene.dataset) scene.dataset.homeMotion = still ? 'paused' : 'running';
    field.classList.toggle('lattice-active', true);
    activity.classList.toggle('lattice-active', active);
    [field, activity].forEach(function (el) {
      el.classList.toggle('lattice-still', still);
    });
    activity.setAttribute('aria-hidden','true');
    activity.tabIndex = -1;
    if (!isLifecycle(page) && document.activeElement === activity && activity.blur) activity.blur();
    if (!active || still && !homeMeshStage) clearActivity(changed && isLifecycle(outgoingPage) && !still);
    if(page!=='zero'){stopHomeMesh();homeMeshStage=homeHover=homeFocus='';}
    else if(homeMeshStage&&(homeMeshStill!==still||homeMeshInvalid))startHomeMesh(homeMeshStage,still);
    if(document.hidden&&readingFrame){window.cancelAnimationFrame(readingFrame);readingFrame=0;readingRevision++;}
    if (document.hidden && state.lifecycleRun && !changed) {
      cameraRevision++;
      if (cameraFrame && window.cancelAnimationFrame) window.cancelAnimationFrame(cameraFrame);
      cameraFrame = 0;
      camera = targetCamera(page);
      applyCamera();
      paintLifecycle();
      state.lifecycleRun.finish();
    }
    if (!initialized) {
      initialized = true;
      var requested = ArkUI.route ? ArkUI.route.path().replace(/^\//,'') : '';
      camera = targetCamera(page === 'zero' && isLifecycle(requested || '') ? requested : page);
      applyCamera();
      if (isLifecycle(page)) paintLifecycle();
      else if (!still && !isLifecycle(requested || '')) { nextRoute = 0; nextBlink = 0; tick(); }
      return;
    }
    if (changed) {
      factIndex = 0;
      scrollY = 0;
      keyboardIndex = 0;
      if (active && !isLifecycle(outgoingPage)) activity.getContext('2d').clearRect(0,0,width,height);
      animateCamera(page,outgoingPage);
    } else if (isLifecycle(page)) paintLifecycle();
    if (active && !still && !timer && !cameraFrame) {
      nextRoute = 0;
      nextBlink = 0;
      tick();
    }
  }

  function regionAt(x,y) {
    for (var i = hitRegions.length - 1; i >= 0; i--) {
      var region = hitRegions[i];
      if (x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height) return region;
    }
    return null;
  }

  function activateRegion(region) {
    if (!region) return;
    if (region.type === 'fact') { factIndex = region.index; paintLifecycle(); return; }
    var page = region.type === 'home' ? 'zero' : region.type === 'overview' ? 'lifecycle'
      : 'lifecycle/' + ArkUI.lifecycleStages[region.index].id;
    ArkUI.pageRouter.navigate(page);
  }

  if (activity.addEventListener) {
    var pointerStart = null, pointerMoved = false;
    activity.addEventListener('pointerdown',function (event) {
      pointerStart = { y: event.clientY, scroll: scrollY };
      pointerMoved = false;
    });
    activity.addEventListener('pointermove',function (event) {
      if (!isLifecycle(lifecyclePage)) return;
      var rect = activity.getBoundingClientRect();
      var region = regionAt(event.clientX - rect.left,event.clientY - rect.top);
      activity.style.cursor = region ? 'pointer' : 'default';
      if (event.pointerType === 'touch' && pointerStart && maxScroll) {
        if (Math.abs(event.clientY - pointerStart.y) > 8) pointerMoved = true;
        if (pointerMoved) {
          scrollY = Math.max(0,Math.min(maxScroll,pointerStart.scroll + pointerStart.y - event.clientY));
          paintLifecycle();
        }
      }
    });
    activity.addEventListener('pointerup',function () { pointerStart = null; });
    activity.addEventListener('click',function (event) {
      if (!isLifecycle(lifecyclePage) || pointerMoved) { pointerMoved = false; return; }
      var rect = activity.getBoundingClientRect();
      activateRegion(regionAt(event.clientX - rect.left,event.clientY - rect.top));
    });
    activity.addEventListener('wheel',function (event) {
      if (!isLifecycle(lifecyclePage) || !maxScroll) return;
      event.preventDefault();
      scrollY = Math.max(0,Math.min(maxScroll,scrollY + event.deltaY));
      paintLifecycle();
    },{ passive:false });
    activity.addEventListener('keydown',function (event) {
      if (!isLifecycle(lifecyclePage)) return;
      var stage = lifecyclePage.split('/')[1];
      if (event.key === 'Escape') { event.preventDefault(); ArkUI.pageRouter.navigate(stage ? 'lifecycle' : 'zero'); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (stage && maxScroll && event.key === 'ArrowDown') scrollY = Math.min(maxScroll,scrollY + 75);
        else if (stage) factIndex = (factIndex + 1) % 3;
        else keyboardIndex = (keyboardIndex + 1) % 5;
        paintLifecycle();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if (stage && maxScroll && event.key === 'ArrowUp') scrollY = Math.max(0,scrollY - 75);
        else if (stage) factIndex = (factIndex + 2) % 3;
        else keyboardIndex = (keyboardIndex + 4) % 5;
        paintLifecycle();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!stage) ArkUI.pageRouter.navigate('lifecycle/' + ArkUI.lifecycleStages[keyboardIndex].id);
      }
    });
  }

  document.addEventListener('visibilitychange', function () { sync(state.get()); });
  window.addEventListener('article:choice', function (event) {
    readingChoiceIndex = event.detail.index;
    readingChoiceTotal = event.detail.total;
    if (lifecyclePage.indexOf('article/') === 0 && !readingFrame) draw();
  });
  reduce.addEventListener('change', function () { sync(state.get()); });
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      cameraRevision++;
      if (cameraFrame && window.cancelAnimationFrame) window.cancelAnimationFrame(cameraFrame);
      cameraFrame = 0;
      if (readingFrame && window.cancelAnimationFrame) window.cancelAnimationFrame(readingFrame);
      readingRevision++;
      readingFrame = 0;
      readingProgress = lifecyclePage.indexOf('article/') === 0 ? 1 : 0;
      clearActivity(); draw(); camera = targetCamera(lifecyclePage); applyCamera(); sync(state.get());
      if (state.lifecycleRun) state.lifecycleRun.finish();
    }, 180);
  }, { passive: true });
  new MutationObserver(function () {
    clearActivity();
    draw();
    applyCamera();
    sync(state.get());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  draw();
  state.subscribe(sync);
})();
