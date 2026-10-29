/** Amounts with decimals: the one helper every page and tool uses to read and print a chain's coin
 *  (docs/FXN-DECIMALS-DESIGN.md). The Rust twin is `src/decimals.rs`; both read
 *  `web/test/fixtures/amount-vectors.tsv`, so they print and read the same text.
 *
 *  Rules, stated once:
 *  - Every amount on the wire and in records is an integer count of BASE units. Here it is a BigInt, never a Number
 *    (a Number loses exactness above 2^53, which is 0.009 FXN at 9 decimals) and never a float.
 *  - A chain declares its decimals once, in the record that creates it. Ask the node with `DECIMALS <chain>`
 *    (`parseDecimalsReply`); never guess them.
 *  - Decimals only scale what people see and type. */

/** The most decimals any chain may declare (`decimals::MAX_DECIMALS`). */
export const MAX_DECIMALS = 24;
/** FXN's decimals (recommended 9; the base chain's genesis mint declares them). */
export const FXN_DECIMALS = 9;
/** The largest balance a ledger holds: i128::MAX base units. */
export const MAX_AMOUNT = (1n << 127n) - 1n;

const refuse = (failure, missing, remedy) => Object.assign(new Error(`${failure}; missing: ${missing}; remedy: ${remedy}`), { failure, missing, remedy });

function checkDecimals(decimals) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
    throw refuse(`${decimals} decimals is out of range`, `decimals from 0 to ${MAX_DECIMALS}`, "ask the node for the chain's decimals (DECIMALS <chain>)");
  }
}

/** 10^decimals as a BigInt. */
export function pow10(decimals) {
  checkDecimals(decimals);
  return 10n ** BigInt(decimals);
}

/** Base units (BigInt, or a decimal string from the wire) as text at `decimals` places: 1500000000n at 9 is "1.5".
 *  No trailing zeros, no separators, no exponent. */
export function formatAmount(base, decimals) {
  const value = typeof base === "bigint" ? base : BigInt(base);
  if (value < 0n) throw refuse(`${value} is negative`, "a count of base units, 0 or more", "read the amount from the wire as it was sent");
  if (decimals === 0) return value.toString();
  const unit = pow10(decimals);
  const int = value / unit;
  const frac = value % unit;
  if (frac === 0n) return int.toString();
  return `${int}.${frac.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

/** A typed amount ("12", "12.5", "0.000000001") at `decimals` places, as base units (BigInt). Refused by name: an
 *  empty text, a sign, an exponent, a separator, more fraction digits than the coin has, a value above MAX_AMOUNT.
 *  Never rounds: rounding a typed amount would silently move value. */
export function parseAmount(text, decimals) {
  checkDecimals(decimals);
  const again = "type the amount again as digits, with at most one '.'";
  if (typeof text !== "string" || !/^[0-9]+(\.[0-9]+)?$/.test(text)) {
    throw refuse(`${JSON.stringify(text)} is not a plain decimal amount`, "digits, optionally one '.' and more digits", again);
  }
  const [int, frac = ""] = text.split(".");
  if (frac.length > decimals) {
    throw refuse(`${text} has ${frac.length} decimal places, and this coin has ${decimals}`, `at most ${decimals} digits after the '.'`, again);
  }
  const value = BigInt(int) * pow10(decimals) + (frac ? BigInt(frac) * pow10(decimals - frac.length) : 0n);
  if (value > MAX_AMOUNT) throw refuse(`${text} is more than the largest balance`, `at most ${formatAmount(MAX_AMOUNT, decimals)}`, "send a smaller amount");
  return value;
}

/** `a × b ÷ c` rounded up to the next base unit (a charge: the payer never pays less than the price). */
export function mulDivCeil(a, b, c) {
  const [x, y, z] = [BigInt(a), BigInt(b), BigInt(c)];
  if (z === 0n) return null;
  return (x * y + z - 1n) / z;
}

/** A fee of `bps` basis points on `amount` base units, rounded down: a fee never takes more than its rate. */
export function feeOf(amount, bps) {
  return (BigInt(amount) * BigInt(bps)) / 10_000n;
}

/** Read `DECIMALS<TAB><chain><TAB><decimals><TAB><genesis|launch|bridge>` or
 *  `DECIMALS_NONE<TAB><failure><TAB><missing><TAB><remedy>`. */
export function parseDecimalsReply(line) {
  const f = String(line).replace(/\n$/, "").split("\t");
  if (f[0] === "DECIMALS" && f.length >= 4 && /^[0-9]+$/.test(f[2])) {
    const decimals = Number(f[2]);
    checkDecimals(decimals);
    return { chain: f[1], decimals, source: f[3] };
  }
  if (f[0] === "DECIMALS_NONE") return { refused: { failure: f[1] ?? "", missing: f[2] ?? "", remedy: f[3] ?? "" } };
  throw refuse(`${JSON.stringify(line)} is not a DECIMALS reply`, "a line starting DECIMALS or DECIMALS_NONE", "ask a node that serves DECIMALS");
}
