// The witness nodes of each network: the second nodes every signing page asks for a key's head before it signs
// (flx-signing-guard.mjs, chainPosition and agreedRead). One list, here, for every page: genesis, dao, deploy, the
// defxn.com holdings and treasury vendor this file with the guard (js/dense-wire, byte-identical, pinned by each site's
// vendored test), so no page names its own witnesses and no page can serve another list.
//
// Why (round 14 scorecard scan, row 5): the guard's list was empty (`WITNESS_NODES = {}` in flx-signing-guard.mjs), no
// page set `wire.witnesses`, and chainPosition refuses an empty list (WITNESS_MISSING). So on round 14 no signing page
// could sign, and the founding could not run. The refusal stays: a network with no seats here signs nothing.
//
// The list is derived, and the seats exist once: fxn-network.mjs, the app-config lane's network file (defxn
// gateway/fxn-network.mjs on devnet-config 867c09a), copied here byte for byte (test: the copy is that commit's file). For
// each network it names the host every page connects to and the start seats, each with a name and an address. A
// witness must be ONE machine, and the host (wss://devnet.defxn.com/ws) answers from either seat, so each seat serves a
// name of its own under the host: its machine name without the fleet's `flx-` prefix, wss://<seat>.<host>/ws. The guard
// asks every seat, so whichever machine answered the page's /ws, the other seat is among the witnesses.
//
// fxn-devnet's start seats are flx-big1 (162.35.11.130) and flx-lax24 (162.35.19.107). Until each seat's name is
// served, a page refuses (WITNESS_UNREADABLE) and signs nothing, the safe side. What the owner adds:
//   DNS:   big1.devnet.defxn.com   A  162.35.11.130
//          lax24.devnet.defxn.com  A  162.35.19.107
//   Caddy, on flx-big1 only (and the same block with lax24 on flx-lax24 only), the chain WebSocket on 127.0.0.1:19801:
//          big1.devnet.defxn.com {
//              encode gzip zstd
//              @ws path /ws
//              handle @ws {
//                  reverse_proxy 127.0.0.1:19801
//              }
//              handle {
//                  respond "fxn devnet seat big1: pages witness at wss://big1.devnet.defxn.com/ws" 200
//              }
//          }
//   The chain checks each page's Origin (CHAIN_SERVER_WS_ORIGINS, which must admit the signing sites), and the
//   signing sites' CSP admits the seat names (connect-src wss://*.devnet.defxn.com; each site's deploy script adds it).

import { NETWORKS } from "./fxn-network.mjs";

/** A seat's witness label: its machine name without the fleet's `flx-` prefix (flx-big1 -> big1). */
export const seatLabel = (name) => String(name).replace(/^flx-/, "");

/** Each network's seats (labels) and the domain they are served under, derived from fxn-network.mjs's NETWORKS. */
export function seatsOf(networks = NETWORKS) {
  return Object.freeze(Object.fromEntries(Object.entries(networks).map(([network, entry]) => [network, Object.freeze({ domain: entry.host, seats: Object.freeze(entry.seats.map((seat) => seatLabel(seat.name))) })])));
}

/** Each network's seats and the domain they are served under. */
export const NETWORK_SEATS = seatsOf();

/** A seat's own witness URL. */
export const seatWitnessUrl = (domain, seat) => `wss://${seat}.${domain}/ws`;

/** The witness URLs of every network, derived from its seats. */
export function witnessNodesOf(seats = NETWORK_SEATS) {
  return Object.freeze(Object.fromEntries(Object.entries(seats).map(([network, { domain, seats: names }]) => [network, Object.freeze(names.map((seat) => seatWitnessUrl(domain, seat)))])));
}

/** The witness URLs by network id (BUILD_INFO's fifth field). */
export const WITNESS_NODES = witnessNodesOf();

/** Why the seat list cannot serve as witnesses, or null: every network needs at least one seat, each a DNS label, none
 *  twice, under a domain of DNS labels. A release's test asks it of NETWORK_SEATS. */
export function seatListRefusal(seats = NETWORK_SEATS) {
  const label = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  for (const [network, entry] of Object.entries(seats)) {
    if (!/^fxn-[a-z0-9-]+$/.test(network)) return `${JSON.stringify(network)} is not a network id (fxn- then lowercase letters, digits and -)`;
    const { domain, seats: names } = entry ?? {};
    if (typeof domain !== "string" || !domain.split(".").every((part) => label.test(part)) || !domain.includes(".")) return `${network}: ${JSON.stringify(domain)} is not a domain`;
    if (!Array.isArray(names) || names.length === 0) return `${network} names no seat`;
    if (new Set(names).size !== names.length) return `${network} names one seat twice`;
    const bad = names.find((seat) => typeof seat !== "string" || !label.test(seat));
    if (bad !== undefined) return `${network}: ${JSON.stringify(bad)} is not a seat name (one DNS label)`;
  }
  return null;
}
