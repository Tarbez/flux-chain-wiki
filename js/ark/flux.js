/* =====================================================================
   FLUX PARSER
   ---------------------------------------------------------------------
   A Flux pattern is line-oriented text. Structure is decided by the first
   character of each line, never by a list of known names:

     F-<NAME>-<RESOLVER_ID>          opens a fence (the first one is the root)
     . F-<NAME>-<RESOLVER_ID>        opens a child fence
     .                               closes the innermost fence
     -<KEY>-<value>                  a property of the innermost open fence

   A value is everything after the second '-'. Underscores become spaces
   and nothing else is rewritten, so punctuation travels as itself:
   `-T-Pretty_is_good,_but_purpose_wins.` renders with its comma and stop.
   (An earlier revision stripped punctuation out of every text value.)

   parse(source) -> { name, resolver, props, children[] }
   ===================================================================== */
var ArkFlux = (function () {
  'use strict';

  function splitFence(line) {
    var body = line.slice(2);                       /* drop 'F-' */
    var i = body.indexOf('-');
    if (i === -1) return { name: body, resolver: body };
    return { name: body.slice(0, i), resolver: body.slice(i + 1) };
  }

  function parse(src) {
    var root = { name: 'SCENE', resolver: 'RZERO_V0', props: {}, children: [] };
    var stack = [root];
    var lines = String(src).split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var c = line.charCodeAt(0);

      if (c === 46) {                               /* '.'  open child / close */
        var rest = line.slice(1).trim();
        if (!rest) { if (stack.length > 1) stack.pop(); continue; }
        if (rest.slice(0, 2) === 'F-') {
          var f = splitFence(rest);
          var child = { name: f.name, resolver: f.resolver, props: {}, children: [] };
          stack[stack.length - 1].children.push(child);
          stack.push(child);
        }
        continue;
      }

      if (c === 45) {                               /* '-'  property */
        var j = line.indexOf('-', 1);
        if (j === -1) continue;
        stack[stack.length - 1].props[line.slice(1, j)] = line.slice(j + 1).replace(/_/g, ' ');
        continue;
      }

      if (line.slice(0, 2) === 'F-') {              /* root fence */
        var r = splitFence(line);
        root.name = r.name;
        root.resolver = r.resolver;
        stack.length = 0;
        stack.push(root);
      }
    }
    return root;
  }

  return { parse: parse };
})();
