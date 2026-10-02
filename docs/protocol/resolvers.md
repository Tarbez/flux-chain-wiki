# Resolvers

A resolver is addressed, deterministic logic that accepts defined input and produces a claim. Its address lets participants refer to the exact logic under evaluation.

## Related terms

- A **pattern** defines a recognizable type of request or statement.
- An **object** is the addressed data being evaluated.
- A **capability** states what a provider can perform.
- A **checker** evaluates a claim against defined rules or evidence.

## Publication and deployment

Publishing a resolver makes its definition addressable. It does not prove that execution capacity exists. A resolver is deployed only when an admitted active provider reports fresh capacity for it.

## Trust boundary

A signed resolver output identifies the signer and protects the artifact from unnoticed alteration. It does not make the output true. Semantic acceptance comes from the applicable checker, authority cell, agreement, and governance rules.

## Operator path

Use [verification](../operators/verification.md) to prove deployment. Consult [current status](../status.md) before presenting a resolver as available to the public.

