# Stats live data contract

Written for: the engineer on the devnet fleet who adds the streams and the scheduled runs.
Status: 2026-10-24. The pages read this contract today and show "No reading" for every field marked absent.

## What the pages need

The stats section (`/stats/now`, `/stats/ceiling`, `/stats/capabilities`, `/stats/resolver`, `/stats/week-<n>`) draws five kinds of reading. This file names the fields, the units, how each is measured and what "no reading" means. The pages read one client, `js/ark/pulse-client.js` (`ArkPulse.get()`), which fetches `/api/fleet-pulse`. Do not add a second client. Add fields to the pulse, or add an endpoint the same client reads, and extend its `validate()` in the same change.

## No reading

A field the fleet does not send is absent. Absent is not 0.

- A field is absent when its key is missing or its value is `null`.
- A reading of 0 means the fleet measured and counted nothing. Send 0 only then.
- A page shows "No reading" and the reason for every absent field. It never shows 0, a dash or an invented number.
- A fleet that cannot measure a field for one node sends that node's field as `null` and the node's `error` as text.
- A stream that has stopped is stale after `2 x interval_ms`. The page then says "No reading" and "stale", and shows the last `measured_at_ms`.
- No page carries a "Live" tag unless a reading less than `2 x interval_ms` old is on screen.

## What the pulse has today

`GET /api/fleet-pulse` (proxied by `scripts/lib/fleet-pulse-proxy.mjs`). Validated by `ArkPulse.validate`.

| Field | Unit | How it is measured | Used by |
| --- | --- | --- | --- |
| `measured_at_ms` | ms since epoch | When the self-bench finished | Now (age of the reading) |
| `aggregate_qps` | ops/s | Sum of every node's `qps` in the self-bench | Now |
| `total_entries` | count | Entries the self-bench submitted (synthetic) | not shown |
| `longest_ms` | ms | The slowest node's `elapsed_ms` | not shown |
| `errors` | count | Failed submissions in the self-bench | not shown |
| `nodes[].name`, `nodes[].addr` | text | The configured roster | Now (columns) |
| `nodes[].ok`, `nodes[].total` | count | Accepted and submitted entries on that node | Now |
| `nodes[].elapsed_ms`, `nodes[].qps` | ms, ops/s | Wall time and rate of that node's self-bench | Now (one cube per 1,000 ops/s) |
| `nodes[].error` | text or null | Why that node has no reading | Now |
| `operations` (optional) | see `ArkPulse.validate` | Swaps, transfers and stores per second per node, hourly | not shown yet |

The pulse is an hourly self-bench of synthetic entries. It is not live traffic. The Now page says "Fleet self-check" and shows its age.

## What is missing

Everything below is absent today. The page for each says why.

### 1. Latest interactions stream

Page: Now (the line in front of the canyon). Reason shown today: "The fleet does not stream interactions yet."

`GET /api/fleet-interactions?limit=100` returns the latest `limit` interactions, newest last.

| Field | Unit | Meaning |
| --- | --- | --- |
| `measured_at_ms` | ms since epoch | When the list was read |
| `interval_ms` | ms | How often the fleet refreshes the list |
| `interactions[].at_ms` | ms since epoch | When the interaction finished |
| `interactions[].capability` | capability id | One of `DEFXN_CAPABILITIES.capabilities[].id`, or `null` when the interaction used none |
| `interactions[].resolver` | resolver id | One of `DEFXN_RESOLVERS.resolvers[].id` |
| `interactions[].latency_ms` | ms | Client send to signed result received, measured at the node that resolved it. Not network time to the visitor |
| `interactions[].node` | text | `nodes[].name` |
| `interactions[].ok` | boolean | The result was signed and stored |

At most 100 rows. The page draws one bead for each row. A row with a missing `latency_ms` is not drawn, and the page counts it as unread.

### 2. Per-capability throughput and latency

Page: Now (table), Capabilities (latency and headroom cells). Reason shown today: "No capability reports traffic or errors yet", "No capability has a timing run yet."

`GET /api/fleet-capabilities` returns one object for each capability id.

| Field | Unit | Meaning |
| --- | --- | --- |
| `window_ms` | ms | Length of the window every figure below covers |
| `measured_at_ms` | ms since epoch | End of the window |
| `capabilities[id].requests` | count | Interactions that used the capability in the window |
| `capabilities[id].errors` | count | Interactions that failed in the window |
| `capabilities[id].per_second` | requests/s | `requests / (window_ms / 1000)` |
| `capabilities[id].p50_ms`, `p95_ms` | ms | Percentiles of `interactions[].latency_ms` in the window. `null` below 20 requests |
| `capabilities[id].headroom_pct` | percent | `100 x (1 - per_second / tested_ceiling_per_second)`. `null` until `tested_ceiling_per_second` exists |
| `capabilities[id].tested_ceiling_per_second` | requests/s | The highest rate a ceiling run reached for that capability (section 4) |

### 3. Resolver load

Page: Now (row), Resolver (fact). Reason shown today: "No node reports resolver load yet."

`GET /api/fleet-resolvers` returns one object for each resolver id.

| Field | Unit | Meaning |
| --- | --- | --- |
| `window_ms`, `measured_at_ms` | ms | As in section 2 |
| `resolvers[id].batches` | count | Batches resolved in the window |
| `resolvers[id].swaps` | count | Intents resolved in the window |
| `resolvers[id].batch_ms_mean` | ms | Mean time from batch start to signed result, as BENCH-012 reports "Average batch latency" |
| `resolvers[id].send_ms_mean` | ms | Mean time to reach the replicas, as BENCH-012 reports "Broadcast" |
| `resolvers[id].busy_pct` | percent | Share of the window the shard spent resolving. `null` when the shard cannot tell |

### 4. Weekly runs and ceiling results

Pages: every `/stats/week-<n>`, Ceiling, and the canyon ridges. Reason shown today: the runs come from `js/content/stats-highlights.js` and are filed by hand; "No benchmark run is scheduled yet."

`GET /api/fleet-runs` returns every run the fleet has filed, oldest first.

| Field | Unit | Meaning |
| --- | --- | --- |
| `runs[].id` | text | `BENCH-<nnn>` or `INFRA-<nnn>`, the evidence record's id |
| `runs[].started_at_ms`, `finished_at_ms` | ms since epoch | The run's wall clock. The page puts the run in the ISO week of `started_at_ms` (UTC) |
| `runs[].kind` | `weekly`, `stress`, `ceiling`, `audit` | Why it ran |
| `runs[].device` | text | Hardware and OS of every machine that took part. The page shows it verbatim |
| `runs[].conditions` | text | Topology, build, replicas, network in or out of the timed window |
| `runs[].source` | path | The evidence record, under `docs/evidence/` |
| `runs[].figures[]` | `{ name, value, unit }` | Each figure in its own unit. The page never adds or ranks figures of different runs |
| `runs[].p95_ms` | ms | p95 of `interactions[].latency_ms` during the run, or `null` |
| `runs[].ceiling[]` | `{ connections, per_second }` | The sweep a ceiling run made. `per_second` is requests a second, accepted |
| `next_run_at_ms` | ms since epoch | The next scheduled run, or `null` when none is scheduled |
| `interval_ms` | ms | The schedule's period, or `null` |

A week page exists for each ISO week that holds a run. Today the weeks come from `STATS_RUNS` in `js/content/site-pages.js`. When this endpoint exists, derive the list from `runs[].started_at_ms` and keep `STATS_RUNS` as the offline copy.

### 5. Latest stress test

Page: Ceiling. It is the newest run with `kind` `stress` or `ceiling`. Reason shown today: it shows BENCH-015 (2026-10-15) as the latest run that pushed connections. No stress test is scheduled.

## How a page decides what to show

1. Fetch. If the request fails, show "No reading" with the reason (HTTP code, timeout, wrong shape, not reachable).
2. Validate. A field of the wrong type fails the whole answer, as `ArkPulse.validate` does. Do not show part of a malformed answer.
3. Check age. A reading older than `2 x interval_ms` is stale.
4. Draw. Only fields that passed.

## Tests that hold this

`tests/world-stats.cjs` fails when a number on a stats page has no source in a data file, when a live row shows 0 where the pulse failed, and when a week route has no dated run.
