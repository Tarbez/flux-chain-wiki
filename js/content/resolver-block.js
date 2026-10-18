/* One dense block in, one resolution out — the structural layer only.
 *
 * This is the engine behind /resolver-math's block explorer. It lives in
 * its own file rather than inline in the page for one reason: a page
 * cannot be tested, and the cases this implements are exactly the ones
 * the grammar registry warns about by name. `TYPEGHOST` resolving
 * SUCCESSFULLY and wrongly is the whole argument for a closed position
 * list; if that case ever quietly starts refusing, the page would still
 * look fine and the argument would be gone. So each registry-documented
 * collision is a named test in tests/resolver-algebra.cjs.
 *
 * Scope, stated so nothing reads more into it: this resolves SHAPE. It
 * says whether a block has a position in the tuple and whether its
 * payload fits that position's rule. It verifies no signature, admits no
 * record, and decides no value. A real resolver does all of that after
 * this layer has passed.
 *
 * Data comes from js/content/resolver-algebra.js, generated out of
 * flux-spec/registry. Nothing here hardcodes a letter, a label or a verb.
 *
 * A box opens with the LONGEST registered label it starts with. Most
 * labels are one letter; since specVersion 0.4.3 a few are longer (NAME,
 * KK, ...). This engine once read only the first character, so
 * `NAMEalice` was refused as the tooling letter N and `TITLE68656c6c6f`
 * resolved as an opaque Target "ITLE68656c6c6f" — the second is the
 * silent collision this page warns about, produced by the page's own
 * explorer. tests/resolver-algebra.cjs holds both as regression cases.
 */
(function () {
  'use strict';

  var ALPHABET_SIZE = 63; // [A-Za-z0-9] = 62, plus `-`, the only delimiter.

  function build(ALG) {
    var byLetter = {};
    ALG.roles.registered.forEach(function (r) { byLetter[r.letter] = r; });
    var invalid = {};
    ALG.roles.reservedInvalid.forEach(function (r) { invalid[r.letter] = r.reason; });
    var tooling = {};
    ALG.roles.reservedTooling.forEach(function (r) { tooling[r.letter] = r.reason; });
    var free = {};
    ALG.roles.free.forEach(function (l) { free[l] = true; });

    /* Longer labels, longest first, so the first one a block starts with
       IS the longest match. A census generated before labels existed has
       none, and the engine reads single letters exactly as before. */
    var labels = (ALG.roles.labels || []).slice().sort(function (a, b) {
      return b.label.length - a.label.length;
    });
    function longestLabel(block) {
      for (var i = 0; i < labels.length; i += 1) {
        if (block.indexOf(labels[i].label) === 0) return labels[i];
      }
      return null;
    }

    /* What a label was read INSTEAD of, in words. Derived from the
       label's recorded prefixes: a registered prefix is a live role whose
       payloads the label now takes; a reserved or free one is a letter
       that would have refused anyway. */
    var STATUS_WORDS = {
      registered: 'a registered role',
      reservedInvalid: 'reserved invalid',
      reservedTooling: 'reserved for tooling',
      free: 'free',
      label: 'a shorter label'
    };
    function takesFrom(label) {
      return (label.startsWith || []).filter(function (p) {
        return p.status === 'registered' || p.status === 'label';
      });
    }

    /* Shape rules, one per payload kind the registry declares. These are
       the structural rejections the registry's own notes describe: QUERY
       fails because UERY is not hex, UPDATE fails because PDATE is not a
       status, LABEL fails because ABEL is not digits. Deciding by
       position and shape rather than by membership in a hand-written word
       list is the point — a word list leaves gaps that become wrong
       answers. */
    function checkPayload(role, payload) {
      if (!payload.length) return { ok: false, why: 'empty payload' };

      switch (role.payload) {
        case 'digits':
        case 'lattice-scalar':
          return /^[0-9]+$/.test(payload)
            ? { ok: true, as: role.payload === 'lattice-scalar'
                  ? 'an integer lattice point (not the decimal it looks like)'
                  : 'digits' }
            : { ok: false, why: 'not digits' };

        case 'uppercase':
          return new RegExp(role.pattern).test(payload)
            ? { ok: true, as: 'a manifest type' }
            : { ok: false, why: 'not ' + role.pattern };

        case 'lowercase-hex':
          if (!/^[0-9a-f]+$/.test(payload)) return { ok: false, why: 'not lowercase hex' };
          if (role.evenLength && payload.length % 2) {
            return { ok: false, why: 'an odd number of hex digits' };
          }
          return { ok: true, as: 'hex of UTF-8 — an arbitrary string, addressed' };

        case 'effect-digit-then-hex':
          return new RegExp(role.pattern).test(payload)
            ? { ok: true, as: 'an effect digit then hex' }
            : { ok: false, why: 'not an effect digit (1 grants, 0 denies) followed by hex' };

        case 'closed-set':
          return role.values.indexOf(payload) >= 0
            ? { ok: true, as: 'one of ' + role.values.join(' / ') }
            : { ok: false, why: 'not one of ' + role.values.join(' / ') };

        case 'coded-fields':
          return /^[0-9]+([A-Z][0-9]+)*$/.test(payload)
            ? { ok: true, as: 'coded fields' }
            : { ok: false, why: 'missing a leading decimal run followed by letter+digit sub-fields' };

        case 'verb-and-flags': {
          var verbs = role.verbs || [];
          var hit = null;
          for (var i = 0; i < verbs.length; i += 1) {
            if (payload.indexOf(verbs[i]) === 0 && (!hit || verbs[i].length > hit.length)) {
              hit = verbs[i];
            }
          }
          if (!hit) {
            return {
              ok: false,
              unregisteredVerb: true,
              why: 'not a registered verb. An unregistered verb throws — it does not fall ' +
                   'back to a default meaning. This interaction is inexpressible until the ' +
                   'verb is registered'
            };
          }
          var rest = payload.slice(hit.length);
          var flags = role.flags || [];
          for (var j = 0; j < rest.length; j += 1) {
            if (flags.indexOf(rest[j]) < 0) {
              return { ok: false, why: '"' + rest[j] + '" after ' + hit + ' is not a known flag' };
            }
          }
          return { ok: true, as: 'verb ' + hit + (rest ? ' with flags ' + rest : '') };
        }

        case 'numeric-unit-or-opaque': {
          if (!/^[A-Za-z0-9]+$/.test(payload)) {
            return { ok: false, why: 'not dash-free alphanumeric' };
          }
          var m = /^([0-9]+)([A-Za-z0-9]*)$/.exec(payload);
          if (m) {
            return { ok: true, as: 'value ' + m[1] + (m[2] ? ' unit ' + m[2] : '') };
          }
          return { ok: true, absorbed: true, as: 'an opaque Target string "' + payload + '"' };
        }

        case 'lowercase-alphanumeric':
          return new RegExp(role.pattern || '^[a-z0-9]+$').test(payload)
            ? { ok: true, as: role.name }
            : { ok: false, why: 'not ' + (role.pattern || 'lowercase alphanumeric') };

        case 'opaque':
        case 'opaque-alphanumeric':
          if (!/^[A-Za-z0-9]+$/.test(payload)) {
            return { ok: false, why: 'not dash-free alphanumeric' };
          }
          if (role.minLength && payload.length < role.minLength) {
            return { ok: false, why: 'shorter than the ' + role.minLength + '-character minimum' };
          }
          return {
            ok: true,
            absorbed: Boolean(role.absorbing),
            as: role.absorbing ? 'an opaque ' + role.name + ' value' : role.name
          };

        default:
          /* A payload kind with no rule here is a gap in THIS file, not a
             bad block. Say which, rather than refusing the block and
             blaming the input. */
          return { ok: false, gap: true, why: 'a payload kind this explorer has no rule for: ' + role.payload };
      }
    }

    function resolveBlock(text) {
      var block = String(text == null ? '' : text).trim();

      if (!block) {
        return {
          state: 'unreal', head: 'Nothing to resolve.',
          lines: [['Empty', 'A block is a role letter followed by packed text.']]
        };
      }
      if (block.indexOf('-') >= 0) {
        return {
          state: 'unreal', head: 'Not one block.',
          lines: [['Delimiter', '`-` is the only delimiter and it separates blocks, so this ' +
                   'is ' + block.split('-').length + ' blocks. Resolve one at a time.']]
        };
      }
      if (!/^[A-Za-z0-9]+$/.test(block)) {
        return {
          state: 'unreal', head: 'Outside the alphabet.',
          lines: [['Rule 1', '`-` is the only non-alphanumeric character a pattern may ' +
                   'contain. No `=`, `_`, `.`, `%`, `:`, `+`, `/` or whitespace. An ' +
                   'arbitrary string gets in as hex of its UTF-8 instead.']]
        };
      }

      var label = longestLabel(block);
      if (label) {
        var shorter = (label.startsWith || []).map(function (p) {
          return p.token + ' (' + (STATUS_WORDS[p.status] || p.status) + ')';
        });
        var taken = takesFrom(label);
        var matchLine = 'Read as ' + label.label + ', the longest label this block starts ' +
          'with — not ' + shorter.join(' or ') + '.' +
          (taken.length
            ? ' So no ' + taken.map(function (p) { return p.token; }).join(' or ') +
              ' payload can begin with ' + taken.map(function (p) {
                return '"' + label.label.slice(p.token.length) + '"';
              }).join(' or ') + ': that text now opens ' + label.label + ' instead.'
            : ' That letter could not resolve a payload of its own, so this label takes ' +
              'nothing away from a live role.');
        return resolveRole(label, label.label, block.slice(label.label.length),
                           [['Longest match', matchLine]]);
      }

      var letter = block.charAt(0);
      var payload = block.slice(1);

      if (!/^[A-Z]$/.test(letter)) {
        return {
          state: 'unreal', head: 'No role.',
          lines: [['Position', '"' + letter + '" is not a role letter, so this block has no ' +
                   'position in the tuple and nothing can interpret it.']]
        };
      }

      if (invalid[letter]) {
        return {
          state: 'unreal', head: 'Refused by name — reserved invalid.',
          lines: [['Position ' + letter, invalid[letter]],
                  ['Imaginary', 'S(' + letter + ', position, O) is undefined and deliberately ' +
                   'stays that way. The refusal names the reason, which is the point.']]
        };
      }
      if (tooling[letter]) {
        return {
          state: 'unreal', head: 'Refused by name — reserved for tooling.',
          lines: [['Position ' + letter, tooling[letter]],
                  ['Why not left free', 'A letter already known to be a collision trap is ' +
                   'parked rather than left where it could be registered without anyone ' +
                   're-checking the hazard.']]
        };
      }
      if (free[letter]) {
        /* A free letter has no GLOBAL shape — but it may have one per
         * manifest type, and this is the one place the grammar is
         * observer-relative in the strong sense. Saying "rejected" here
         * would be wrong: `J` is the chain position on a LEDGERENTRY and
         * something else again on a POOL. */
        var scoped = (ALG.typeScoped ? ALG.typeScoped.entries : [])
          .filter(function (e) { return e.letter === letter; });

        if (!scoped.length) {
          return {
            state: 'unreal', head: 'Unresolvable — the letter has no shape, globally or by type.',
            lines: [['Position ' + letter, 'Free: registered to nothing, and no manifest type ' +
                     'declares a shape for it. Only a registered or type-scoped letter may ' +
                     'resolve.'],
                    ['To make it real', ALG.roles.freeNote]]
          };
        }

        var shapes = [];
        scoped.forEach(function (e) {
          var head = String(e.shape).split(/[ (,]/)[0];
          if (shapes.indexOf(head) < 0) shapes.push(head);
        });

        return {
          state: 'relative',
          head: 'Depends on the observer — this letter has no global meaning.',
          lines: [
            ['Position ' + letter, 'Free at the top level: no single shape readable without ' +
             'knowing what the record is about. ' + scoped.length + ' manifest types declare ' +
             'one for it, in ' + shapes.length + ' different shapes (' + shapes.join(', ') + ').'],
            ['S(' + letter + ', i, O)', 'This is the algebra\'s observer term, built. ' +
             scoped.map(function (e) { return e.type + ' → ' + e.shape; }).join(' · ')],
            ['How peers still agree', 'The type letter Y is always global, so every peer reads ' +
             'WHICH observer applies before interpreting anything observer-relative. Pick the ' +
             'type first and this block resolves one way and only one way.'],
            ['Where it is undefined', 'A type that declares no shape for ' + letter +
             ' carries no meaning for it — exactly as unresolved as an unregistered letter. ' +
             'That is S returning undefined, per type rather than globally.']
          ]
        };
      }

      var role = byLetter[letter];
      if (!role) {
        return {
          state: 'unreal', head: 'Unaccounted letter.',
          lines: [['Position ' + letter, 'Not in the registry at all. That is a registry bug, ' +
                   'not a user error — the namespace collides quietly, so every letter has to ' +
                   'be accounted for.']]
        };
      }
      return resolveRole(role, letter, payload, []);
    }

    /* One role (a letter or a longer label) and its payload, judged by
       the role's payload rule. Shared by both paths so a label is held to
       exactly the rules a letter is. */
    function resolveRole(role, letter, payload, preface) {
      var lines = preface.concat([[
        'Position ' + letter,
        role.name + ' · ' + role.group + ' group · payload ' + role.payload +
          (role.profile ? ' · ' + role.profile + ' profile' : '')
      ]]);

      var shape = checkPayload(role, payload);

      if (!shape.ok) {
        lines.push(['Refused', '"' + payload + '" is ' + shape.why + '.']);
        if (shape.gap) {
          return { state: 'unreal', head: 'This explorer cannot judge it.', lines: lines };
        }
        lines.push(['Imaginary', 'S resolves to undefined, so this block is unresolved — not a ' +
                    'weaker block, and not a slow one. It cannot be made real until the ' +
                    'observer admits this dimension.']);
        return {
          state: 'unreal',
          head: shape.unregisteredVerb ? 'Inexpressible — the verb is not registered.'
                                       : 'Structurally refused.',
          lines: lines
        };
      }

      if (shape.absorbed) {
        lines.push(['Resolved', 'as ' + shape.as + '.']);
        lines.push(['Hazard', role.name + ' absorbs: it accepts any dash-free alphanumeric ' +
                    'text, so this SUCCEEDED and may still be wrong. If you meant a different ' +
                    'role, nothing here will ever tell you — the block cannot report that it ' +
                    'received the wrong thing.']);
        lines.push(['Why it matters', 'This is the silent collision the closed position list ' +
                    'exists to prevent. A refusal names what it needs; a collision signs ' +
                    'something nobody meant.']);
        return { state: 'hazard', head: 'Resolved — and this is the dangerous case.', lines: lines };
      }

      lines.push(['Resolved', 'as ' + shape.as + '.']);
      if (role.repeatable) {
        lines.push(['Repeatable', 'Dense encoding has no nesting, so a list is repeated blocks ' +
                    'of this letter.']);
      }
      lines.push(['Real', 'The dimension exists and the shape holds. This is shape only — no ' +
                  'signature has been checked here. A record carrying this block can be ' +
                  'signed, and then anyone with the same registry can audit the resolution.']);
      return { state: 'real', head: 'Resolves.', lines: lines };
    }

    function scopedLetters() {
      var seen = [];
      (ALG.typeScoped ? ALG.typeScoped.entries : []).forEach(function (e) {
        if (seen.indexOf(e.letter) < 0) seen.push(e.letter);
      });
      return seen;
    }

    /* The layer census the page tabulates. Derived from the registry so it
       cannot drift from it. */
    function layers() {
      var roles = ALG.roles;
      var registered = roles.registered.length;
      var namespace = registered + roles.reservedInvalid.length +
                      roles.reservedTooling.length + roles.free.length;
      var absorbing = roles.registered
        .filter(function (r) { return r.absorbing; })
        .map(function (r) { return r.letter; });
      var longer = roles.labels || [];
      var taking = longer.filter(function (l) { return takesFrom(l).length; });

      return [
        {
          dim: 'Positions — the role label that opens a block',
          kind: 'closed',
          count: registered + ' registered of ' + namespace + ' letters' +
                 (longer.length ? ' · ' + longer.length + ' longer label' +
                   (longer.length === 1 ? '' : 's') : ''),
          why: 'Every letter of the namespace is accounted for as registered, ' +
               'reserved-invalid, reserved-tooling or free. An unaccounted letter is a ' +
               'latent silent-collision bug, because ' + absorbing.join(' and ') +
               ' absorb anything alphanumeric placed after them. ' +
               roles.free.length + ' letter remains free: ' + roles.free.join(', ') + '.' +
               (longer.length
                 ? ' Beside the letters sit longer labels (' +
                   longer.map(function (l) { return l.label; }).join(', ') + '); a block ' +
                   'takes the longest label it starts with. ' +
                   (taking.length
                     ? taking.map(function (l) { return l.label; }).join(' and ') +
                       ' open with a registered letter and take payloads from it — ' +
                       'the same collision audit, just over longer prefixes.'
                     : 'Each opens with a letter that could not resolve on its own.')
                 : '')
        },
        {
          dim: 'Verbs — what the Action role can say',
          kind: 'closed',
          count: String(ALG.verbs.all.length),
          why: (ALG.verbs.unregisteredThrows
                  ? 'An unregistered verb throws rather than resolving to a default. '
                  : 'An unregistered verb is accepted. ') +
               'The list must also stay prefix-free, or a future SENDER misparses as SEND ' +
               'plus garbage. Groups: ' + Object.keys(ALG.verbs.groups).join(', ') + '.'
        },
        {
          dim: 'Manifest types — what a record can be about',
          kind: ALG.manifestTypes.openSet ? 'open' : 'closed',
          count: ALG.manifestTypes.count + ' catalogued',
          why: ALG.manifestTypes.openSet
                 ? 'A catalog, not a gate. Nothing refuses a type outside it; a product with ' +
                   'a domain the core has never heard of registers its own at runtime. That ' +
                   'is what keeps the list from freezing at whatever was known the day the ' +
                   'file was written.'
                 : 'A closed set — a type outside it is refused.'
        },
        {
          dim: 'Meaning per observer — a letter whose shape depends on the record\'s type',
          kind: 'relative',
          count: (ALG.typeScoped ? ALG.typeScoped.entries.length : 0) + ' declared',
          why: 'The one strongly observer-relative dimension, and deliberately tiny: a ' +
               'letter with no single global shape may be given one per manifest type. ' +
               'Letters involved: ' + scopedLetters().join(', ') + '. Peers still agree ' +
               'because the type letter Y is always global — a reader establishes which ' +
               'observer applies before interpreting anything observer-relative.'
        },
        {
          dim: 'Payloads — the content of a block',
          kind: 'unbounded',
          count: 'alphabet ' + ALPHABET_SIZE,
          why: 'Any UTF-8 string enters as hex of its bytes, so the wire alphabet stays at ' +
               ALPHABET_SIZE + ' characters while the symbol space has no bound. A symbol is ' +
               'an address, not a parameter: 244 symbols embedded against 594,371 addressed, ' +
               'measured.'
        }
      ];
    }

    /* One row per type that gives a letter its own shape — the built form
       of S(s, i, O), small enough to print in full. */
    function observerTable() {
      return (ALG.typeScoped ? ALG.typeScoped.entries : []).map(function (e) {
        return { letter: e.letter, type: e.type, code: e.code, shape: e.shape, definedIn: e.definedIn };
      });
    }

    return {
      resolveBlock: resolveBlock,
      layers: layers,
      observerTable: observerTable,
      scopedLetters: scopedLetters,
      alphabetSize: ALPHABET_SIZE
    };
  }

  /* Take definitions AWAY and see what stops being sayable.
   *
   * This is the page's central claim made operable rather than asserted:
   * the result is the sum of what you defined, so removing a definition
   * must remove a capability. It returns a census with parts missing, and
   * the caller builds a real engine from it — so the same resolver that
   * says AFOLLOW resolves also says it does not, once the verb group that
   * made it sayable is gone. Nothing is simulated.
   *
   * `off` names what to withhold: { verbGroups: [...], typeScoped: true,
   * letters: [...] }. `letters` takes longer labels too (e.g. 'NAME'):
   * withholding one sends its blocks back to the single letter they open
   * with, which is how a reader sees what longest-match was holding up. */
  function restrict(ALG, off) {
    off = off || {};
    var dropGroups = off.verbGroups || [];
    var dropLetters = off.letters || [];

    var groups = {};
    var verbs = [];
    Object.keys(ALG.verbs.groups).forEach(function (name) {
      if (dropGroups.indexOf(name) >= 0) return;
      groups[name] = ALG.verbs.groups[name].slice();
      groups[name].forEach(function (v) { verbs.push(v); });
    });

    var labels = (ALG.roles.labels || [])
      .filter(function (l) { return dropLetters.indexOf(l.label) < 0; });

    var registered = ALG.roles.registered
      .filter(function (r) { return dropLetters.indexOf(r.letter) < 0; })
      .map(function (r) {
        if (!r.verbs) return r;
        var copy = {};
        Object.keys(r).forEach(function (k) { copy[k] = r[k]; });
        copy.verbs = verbs.slice();
        return copy;
      });

    return {
      specVersion: ALG.specVersion,
      source: ALG.source,
      roles: {
        registered: registered,
        labels: labels,
        reservedInvalid: ALG.roles.reservedInvalid,
        reservedTooling: ALG.roles.reservedTooling,
        free: ALG.roles.free,
        freeNote: ALG.roles.freeNote
      },
      verbs: { all: verbs, groups: groups, flags: ALG.verbs.flags, unregisteredThrows: ALG.verbs.unregisteredThrows },
      manifestTypes: ALG.manifestTypes,
      typeScoped: off.typeScoped
        ? { entries: [], note: ALG.typeScoped && ALG.typeScoped.note }
        : ALG.typeScoped
    };
  }

  var api = typeof window !== 'undefined' ? window : globalThis;
  if (api.ArkResolverAlgebra) {
    api.ArkResolverBlock = build(api.ArkResolverAlgebra);
    /* The builder and the restrictor, exported so a page can rebuild the
       engine with definitions withheld. That rebuild is the page's whole
       demonstration, so it has to be the same `build` — not a copy. */
    api.ArkResolverBlockBuild = build;
    api.ArkResolverRestrict = restrict;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { build: build, restrict: restrict, ALPHABET_SIZE: ALPHABET_SIZE };
  }
})();
