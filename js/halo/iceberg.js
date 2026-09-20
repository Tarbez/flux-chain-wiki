/* Deterministic faceted iceberg: first mesh above, second mesh below + water. */
var IcebergGeometry = Object.freeze({
  create: function (primaryCount, surfaceCount) {
    var data = new Float32Array((primaryCount + surfaceCount) * 4);
    var golden = Math.PI * (3 - Math.sqrt(5));
    function section(angle) {
      var sector = angle / (Math.PI * 2) * 11;
      var k = Math.floor(sector), f = sector - k;
      function ridge(n) { return .85 + .12 * Math.sin(n * 2.31) + .06 * Math.cos(n * 4.1); }
      return ridge(k) * (1 - f) + ridge((k + 1) % 11) * f;
    }
    for (var i = 0; i < primaryCount + surfaceCount; i++) {
      var below = i >= primaryCount, local = below ? i - primaryCount : i;
      var total = below ? surfaceCount : primaryCount;
      var t = (local + .5) / total;
      var angle = (i * golden) % (Math.PI * 2);
      var x, y, z, light;
      if (below && t > .80) {
        // A thin water plane, with a gently rippled edge on the same waterline.
        x = (((local * .61803398875) % 1) * 2 - 1) * 1.25;
        z = ((t - .8) / .2 * 2 - 1) * .62;
        y = .20 + Math.sin(x * 28 + z * 19) * .006;
        light = .45 + .30 * Math.sin(x * 16 + z * 12) ** 2;
      } else {
        if (below) t /= .80;
        var radius = below ? .68 * Math.pow(1 - t, .48) * (1 + .22 * Math.sin(t * 3.14)) : .59 * Math.pow(t, .82);
        radius *= section(angle);
        var fracture = Math.sin(angle * 17 + t * 42) * Math.sin(t * 67) * .018;
        radius += fracture * Math.sin(t * Math.PI);
        x = Math.cos(angle) * radius + (below ? -.10 * t : -.12 * (1 - t));
        z = Math.sin(angle) * radius * .56;
        y = below ? .20 - t * 1.48 : .20 + (1 - t) * .80;
        light = .35 + .55 * Math.max(0, Math.cos(angle - .5)) + fracture * 5;
        if (below) light *= .62;
      }
      data.set([x,y,z,Math.max(.12,Math.min(1,light))],i*4);
    }
    return data;
  }
});
