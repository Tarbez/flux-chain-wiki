# Treasury and deposit design previews

`#/treasury` and `#/deposits` are interaction and content prototypes, not financial features. Every amount, movement, and state is fictional. The UI makes no wallet connection, signs nothing, sends no transaction, and reads no balance or ledger.

The treasury surface shows one sample asset at a time. `FXN / Tier 1` is the native token; `Credits` is the universal term for an identity-bound, non-transferable unit, separate from FXN. The sample movement list and evidence detail are inner layers, and the detail explicitly says there is no proof because it is a design mock.

The deposit surface accepts an example FXN amount and purpose only to render a local preview. It has no submit/sign action. Credits cannot be deposited, transferred, or converted in this preview.

Before any production implementation, the product owner must define custody and authority, recipient selection, approval states, transaction signing, receipts, verification semantics, error/recovery paths, and independently verified live data. Those decisions are deliberately not implied by this design.
