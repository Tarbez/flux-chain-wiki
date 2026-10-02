# CAP-004 source-model verification

Observed: 2026-09-30. This verifies the resolver's local deterministic model and publication boundaries, not public deployment or production capacity.

- Repository: `flux-resolver` at tracked revision `8f59718a953d`.
- Environment: macOS (`Darwin`), Node.js `v24.9.0`.
- Command from the resolver checkout: `node --test src/reproducibleResolvers.test.mjs src/resolverPublication.test.mjs`.
- Result: 9 tests passed, 0 failed. The checks cover byte-identical addressed execution, structured resource failure, computation-address changes, checker thresholds, conflict evidence, publication receipts, missing diversity closure, artifact substitution, and invalid receipts.
- Source paths: `src/reproducibleResolvers.mjs`, `src/reproducibleResolvers.test.mjs`, `src/resolverPublication.mjs`, and `src/resolverPublication.test.mjs`.

The local test result supports `Live` only for the source model described by CAP-004. It does not promote resolver deployment, provider admission, public repository availability, or production readiness. A repeatable CI artifact and independent-host run remain the next evidence steps.
