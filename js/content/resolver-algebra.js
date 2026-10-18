/* GENERATED — do not edit by hand.
   Run: node scripts/gen-resolver-algebra.cjs --write

   Source: flux-spec/registry · role-letters.json, action-verbs.json, manifest-types.json
   Spec version: 0.4.3

   This is the boundary /resolver-math argues about: which dimensions of
   the grammar are CLOSED (a position; adding one risks a silent
   collision) and which are OPEN (a payload; a name of a thing is an
   address, never a parameter). Every count on that page is read from
   here, so the page cannot drift from the registry without this file
   drifting first — which tests/resolver-algebra.cjs fails on. */
(function () {
  'use strict';
  var DATA = {
    "specVersion": "0.4.3",
    "source": "flux-spec/registry · role-letters.json, action-verbs.json, manifest-types.json",
    "roles": {
      "registered": [
        {
          "letter": "I",
          "name": "Primary",
          "group": "pattern",
          "payload": "coded-fields",
          "profile": "core",
          "example": "I302E2A1"
        },
        {
          "letter": "B",
          "name": "Complementary",
          "group": "pattern",
          "payload": "coded-fields",
          "profile": "core",
          "example": "B10P5S1"
        },
        {
          "letter": "A",
          "name": "Action",
          "group": "pattern",
          "payload": "verb-and-flags",
          "profile": "core",
          "verbs": [
            "SEND",
            "NOTIFY",
            "FOLLOW",
            "ENDORSE",
            "SUPPORT",
            "CITE",
            "COLLABORATE",
            "DELEGATE",
            "REGISTER",
            "UPDATE",
            "QUERY",
            "DELETE",
            "MINT",
            "BUY",
            "SELL",
            "LIQUIDITYADD",
            "LIQUIDITYREMOVE",
            "SETTLE"
          ],
          "flags": [
            "X"
          ],
          "example": "ASENDX"
        },
        {
          "letter": "T",
          "name": "Target",
          "group": "pattern",
          "payload": "numeric-unit-or-opaque",
          "profile": "core",
          "absorbing": true,
          "example": "T75C"
        },
        {
          "letter": "R",
          "name": "Referential",
          "group": "pattern",
          "payload": "opaque",
          "profile": "core",
          "absorbing": true,
          "example": "RABC123"
        },
        {
          "letter": "G",
          "name": "Ghost identity key",
          "group": "manifest-core",
          "payload": "opaque-alphanumeric",
          "profile": "core",
          "minLength": 32,
          "example": "Ga1b2c3d4e5f60718293a4b5c6d7e8f90"
        },
        {
          "letter": "Y",
          "name": "Manifest type",
          "group": "manifest-core",
          "payload": "uppercase",
          "profile": "core",
          "pattern": "^[A-Z][A-Z0-9]*$",
          "example": "YGHOST"
        },
        {
          "letter": "S",
          "name": "Signature",
          "group": "manifest-core",
          "payload": "opaque-alphanumeric",
          "profile": "core",
          "minLength": 64,
          "repeatable": true,
          "example": "Sfe90ab1122334455667788990011223344556677889900112233445566778899"
        },
        {
          "letter": "C",
          "name": "Content address",
          "group": "manifest-core",
          "payload": "opaque-alphanumeric",
          "profile": "core",
          "minLength": 16,
          "example": "Cbafybeigdyrzt5fw3a"
        },
        {
          "letter": "M",
          "name": "Moment",
          "group": "manifest-core",
          "payload": "digits",
          "profile": "core",
          "example": "M1760000000"
        },
        {
          "letter": "V",
          "name": "Version",
          "group": "manifest-core",
          "payload": "digits",
          "profile": "core",
          "example": "V3"
        },
        {
          "letter": "H",
          "name": "Holder",
          "group": "authorization",
          "payload": "lowercase-hex",
          "profile": "core",
          "evenLength": true,
          "example": "H6d792d617070"
        },
        {
          "letter": "P",
          "name": "Permission",
          "group": "authorization",
          "payload": "effect-digit-then-hex",
          "profile": "core",
          "pattern": "^([01])((?:[0-9a-f]{2})+)$",
          "repeatable": true,
          "example": "P1776f726b73706163653a72656164"
        },
        {
          "letter": "D",
          "name": "Deadline",
          "group": "authorization",
          "payload": "digits",
          "profile": "core",
          "example": "D1760003600"
        },
        {
          "letter": "Q",
          "name": "Subject",
          "group": "claim",
          "payload": "lowercase-hex",
          "profile": "claim",
          "evenLength": true,
          "example": "Q636f6e63657074"
        },
        {
          "letter": "O",
          "name": "Observation",
          "group": "claim",
          "payload": "lowercase-hex",
          "profile": "claim",
          "evenLength": true,
          "repeatable": true,
          "example": "O6f6273"
        },
        {
          "letter": "L",
          "name": "Lattice",
          "group": "claim",
          "payload": "lattice-scalar",
          "profile": "claim",
          "repeatable": true,
          "example": "L418400"
        },
        {
          "letter": "W",
          "name": "Wrapped",
          "group": "claim",
          "payload": "lowercase-hex",
          "profile": "claim",
          "evenLength": true,
          "example": "W9a1bff"
        },
        {
          "letter": "U",
          "name": "Status",
          "group": "claim",
          "payload": "closed-set",
          "profile": "claim",
          "values": [
            "PENDING",
            "APPROVED",
            "EXECUTED",
            "REJECTED"
          ],
          "example": "UPENDING"
        },
        {
          "letter": "E",
          "name": "History",
          "group": "claim",
          "payload": "lowercase-hex",
          "profile": "claim",
          "evenLength": true,
          "repeatable": true,
          "example": "E6576"
        }
      ],
      "labels": [
        {
          "label": "NAME",
          "name": "Lookup name",
          "group": "manifest-core",
          "payload": "opaque-alphanumeric",
          "profile": "dense-wire",
          "minLength": 1,
          "example": "NAMEalice",
          "startsWith": [
            {
              "token": "N",
              "status": "reservedTooling"
            }
          ]
        },
        {
          "label": "TITLE",
          "name": "Title",
          "group": "manifest-core",
          "payload": "lowercase-hex",
          "profile": "dense-wire",
          "evenLength": true,
          "example": "TITLE68656c6c6f",
          "startsWith": [
            {
              "token": "T",
              "status": "registered"
            }
          ]
        },
        {
          "label": "KK",
          "name": "Kind marker (shipped form)",
          "group": "dense-wire",
          "payload": "opaque-alphanumeric",
          "profile": "dense-wire",
          "minLength": 1,
          "example": "KKDAO1",
          "startsWith": [
            {
              "token": "K",
              "status": "reservedInvalid"
            }
          ]
        },
        {
          "label": "KIND",
          "name": "Kind marker (new form)",
          "group": "dense-wire",
          "payload": "opaque-alphanumeric",
          "profile": "dense-wire",
          "minLength": 1,
          "example": "KINDDAO1",
          "startsWith": [
            {
              "token": "K",
              "status": "reservedInvalid"
            }
          ]
        },
        {
          "label": "CHAIN",
          "name": "Chain scope (new form)",
          "group": "dense-wire",
          "payload": "lowercase-alphanumeric",
          "profile": "dense-wire",
          "pattern": "^[a-z0-9]{3,32}$",
          "example": "CHAINmychain1",
          "startsWith": [
            {
              "token": "C",
              "status": "registered"
            }
          ]
        }
      ],
      "reservedInvalid": [
        {
          "letter": "K",
          "reason": "Canonical example of the superseded wordy grammar (`KBOB`). Registering it would make that grammar parse again."
        },
        {
          "letter": "X",
          "reason": "Canonical example of the superseded wordy grammar (`XENCRYPTED`, `XALERT`). Also live as an Action flag, where it means Encrypted."
        },
        {
          "letter": "F",
          "reason": "Asserted invalid by the reference test suite (bare `F`)."
        },
        {
          "letter": "Z",
          "reason": "Asserted invalid by the reference test suite (`ZFOO`)."
        }
      ],
      "reservedTooling": [
        {
          "letter": "N",
          "reason": "freeNote already documented N as a live collision trap (a deny role would resolve NOTIFY to {Denied:\"OTIFY\"}); reserved for tooling instead of left free so it cannot be registered into runtime without re-litigating that hazard."
        }
      ],
      "free": [
        "J"
      ],
      "freeNote": "Before registering any of these, check that no existing letter can silently absorb the new tokens."
    },
    "verbs": {
      "all": [
        "SEND",
        "NOTIFY",
        "FOLLOW",
        "ENDORSE",
        "SUPPORT",
        "CITE",
        "COLLABORATE",
        "DELEGATE",
        "REGISTER",
        "UPDATE",
        "QUERY",
        "DELETE",
        "MINT",
        "BUY",
        "SELL",
        "LIQUIDITYADD",
        "LIQUIDITYREMOVE",
        "SETTLE"
      ],
      "groups": {
        "messaging": [
          "SEND",
          "NOTIFY"
        ],
        "social": [
          "FOLLOW",
          "ENDORSE",
          "SUPPORT",
          "CITE",
          "COLLABORATE",
          "DELEGATE"
        ],
        "registry": [
          "REGISTER",
          "UPDATE",
          "QUERY",
          "DELETE"
        ],
        "chain": [
          "MINT"
        ],
        "amm": [
          "BUY",
          "SELL",
          "LIQUIDITYADD",
          "LIQUIDITYREMOVE",
          "SETTLE"
        ]
      },
      "flags": [
        "X"
      ],
      "unregisteredThrows": true
    },
    "manifestTypes": {
      "count": 95,
      "openSet": true,
      "openSetNote": "This is a catalog, not a gate. Nothing refuses a type outside it; products with domains the core has never heard of register their own at runtime. That is what keeps the list from freezing at whatever was known the day the file was written."
    },
    "typeScoped": {
      "entries": [
        {
          "letter": "A",
          "type": "TRANSACTION",
          "code": "3",
          "shape": "coded-fields (verb-and-flags, mirrors the core A role's own shape)",
          "definedIn": "chain-manifest-v1.md §3.1"
        },
        {
          "letter": "J",
          "type": "TRANSACTION",
          "code": "3",
          "shape": "opaque-alphanumeric (mirrors C's shape)",
          "definedIn": "chain-manifest-v1.md §3.1"
        },
        {
          "letter": "J",
          "type": "BLOCK",
          "code": "R",
          "shape": "opaque-alphanumeric",
          "definedIn": "chain-manifest-v1.md §6 (second content-address slot)"
        },
        {
          "letter": "J",
          "type": "VOTE",
          "code": "S",
          "shape": "opaque-alphanumeric",
          "definedIn": "chain-manifest-v1.md §6 (second content-address slot)"
        },
        {
          "letter": "J",
          "type": "PROOF",
          "code": "T",
          "shape": "opaque-alphanumeric, repeatable",
          "definedIn": "chain-manifest-v1.md §3.3"
        },
        {
          "letter": "J",
          "type": "POOL",
          "code": "W",
          "shape": "coded-fields",
          "definedIn": "spec/amm-manifest-v1.md §2.1"
        },
        {
          "letter": "J",
          "type": "POSITION",
          "code": "X",
          "shape": "coded-fields",
          "definedIn": "spec/amm-manifest-v1.md §2.2"
        },
        {
          "letter": "J",
          "type": "SWAP",
          "code": "Y",
          "shape": "coded-fields",
          "definedIn": "spec/amm-manifest-v1.md §2.3"
        },
        {
          "letter": "O",
          "type": "AIPCLAIM",
          "code": "0E",
          "shape": "coded-fields (tagged claim-stack entries, mirrors dense_v3::Role::Observation/claim_stack::ClaimStack's own O usage)",
          "definedIn": "chain-manifest-v1.md's AIP/AIPCLAIM section (chain_v1.rs module docs)"
        },
        {
          "letter": "J",
          "type": "LEDGERENTRY",
          "code": "1A",
          "shape": "coded-fields",
          "definedIn": "defxn/docs/finance-ledger-design.md §5.1"
        },
        {
          "letter": "N",
          "type": "LEDGERENTRY",
          "code": "1A",
          "shape": "lowercase-alphanumeric, 3-32 characters",
          "definedIn": "dense-wire/src/chain.rs::is_chain_id_shape (Phase B.1, chain-of-chains design)"
        },
        {
          "letter": "K",
          "type": "LEDGERENTRY",
          "code": "1A",
          "shape": "opaque-alphanumeric",
          "definedIn": "dense-wire/src/chain.rs (23 sub-kind constants: DAO_KIND_FOUND, TREASURY_KIND_SPEND, STAKE_KIND_LOCK, SLASH_KIND_PROVIDER, ...)"
        }
      ],
      "note": "Most registered letters (`registry/role-letters.json`) have exactly one shape, decodable without knowing a manifest's `Y` type -- that is the fixed skeleton (G Y S C M V H P D, I B A T R, and the claim-profile letters) and this does not apply to it. Letters with no single global shape (currently only `J`, the sole free letter) may instead have their shape defined per `Y` type, recorded on that type's own entry below as a `letterExtensions` object keyed by letter. A type that does not declare an extension for a letter carries no defined meaning for it -- exactly as unregistered as a bare unregistered top-level letter is today. `Y` itself is always core/global, which is what makes reading it first, before interpreting a type-scoped letter, safe on every peer regardless of resolver access."
    }
  };
  var api = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  api.ArkResolverAlgebra = Object.freeze(DATA);
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})();
