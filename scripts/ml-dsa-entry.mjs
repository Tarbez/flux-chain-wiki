// The ML-DSA-87 bundle's entry (js/ark/ml-dsa.js, built by scripts/build-ml-dsa.cjs). Same argument order as
// fxn-auth/src/cryptoAgility.mjs, so callers can read that file as the reference.
import { ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";
function keygen(seed) { return ml_dsa87.keygen(seed); }
function sign(message, secretKey) { return ml_dsa87.sign(message, secretKey); }
function verify(signature, message, publicKey) { return ml_dsa87.verify(signature, message, publicKey); }
window.ArkMlDsa = { keygen, sign, verify };
