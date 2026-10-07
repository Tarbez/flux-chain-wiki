/* Loaded only when this article is requested. */
LearningContent.load("how-we-got-fast-and-what-we-got-wrong", {
  "core": "A value transfer on the first version of this protocol ran at under 7 a second. The same idea, written in the registered grammar and sent over a plain socket, now runs at about 25,000 a second across ten machines. Most of the trail between those two numbers is mistakes, and this note lists them.",
  "relevance": "Read this before quoting any DEFXN speed. It says which number describes which protocol, how each was measured, and which earlier explanations turned out to be wrong.",
  "reviewed": "2026-10-07",
  "evidenceLabel": "BENCH-003: the full investigation log, sections 1 to 15",
  "evidenceHref": "docs/evidence/bench-003-rust-fleet-ceiling.md",
  "relatedPage": "stats",
  "actionLabel": "Watch the fleet right now",
  "actionPage": "monitor",
  "questions": [
    "Where did it start?",
    "What did Rust change?",
    "Is durable the same as accepted?",
    "When did a good idea lose?",
    "Did the GPU help?",
    "What cost hours?",
    "What did not work?",
    "Where did the time actually go?",
    "What changed with the grammar?",
    "What did batch verification add?",
    "What does it still not prove?"
  ],
  "sections": [
    [
      "Where it started",
      "The first measurement of value transfers on the real fleet was 6.82 a second, with each transfer taking almost three seconds. The miner process was doing everything at once: relay, storage, registries, pinning. Pulling the transfer path out into its own small daemon, on the same machines and the same network, gave 137.25 a second. That is 20 times, from deleting work that had nothing to do with the transfer.",
      "The lesson was the cheapest one in this note, and it came first: before tuning anything, find out what else the process is doing."
    ],
    [
      "What Rust changed, and the first surprise",
      "The Rust rebuild started out three times slower than Node: 46.88 a second, because it forced the disk to flush after every single write. Batching the flushes of concurrent requests together (group commit) gave 182.70. Then came the useful question: why flush at all when three validators already hold a copy? Dropping that redundant flush gave 354.54 a second for the durable path.",
      "The accepted path, which stops at a signed certificate and writes nothing, reached about 3,250 a second per quorum. Four independent quorums run side by side summed to 5,711 to 6,041 a second. That was the record before the grammar work, and it is still the record for the certified fabric."
    ],
    [
      "Accepted is not durable",
      "Accepted means the quorum has signed. Durable means every validator has committed it and the successor is registered. They are different promises, and the second one was slow: one quorum measured 131 to 184 a second, flat from 50 to 2,400 concurrent requests, which is what a real ceiling looks like.",
      "Three separate problems were hiding in it. A routing bug: a node that joined the quorum broke durable finality for any client that had not heard of it. The redundant flush from the last section. And thread starvation: the server defaulted its thread count to the number of CPU cores, which was 2, while its requests spent most of their time waiting. Setting 256 threads took the same quorum to 676 to 827 a second.",
      "The same starvation was in the single-node server too: 7 threads gave about 90 a second with the CPU 97 percent idle, and 256 gave around 820. Idle CPU with flat throughput is a symptom, not a finding."
    ],
    [
      "A good idea that lost, then won",
      "Durable finality took four round trips. Collapsing them into one, with the first server doing the rest, should have been faster. On the quorum measured it was slower: 579 a second against 763, because its two machines are under a millisecond apart and the redesign only added serial work. On a rented box about 71 milliseconds away it was twice as fast: 253 against 127.",
      "The idea was right and the map was wrong. Fewer round trips only help when a round trip costs something."
    ],
    [
      "The GPU that changed nothing, and the conclusion we got wrong",
      "A rented GPU box joined the fleet to see whether more compute would raise the total. A laptop and the GPU box, each running the same standalone quorum, landed within 2.5 percent of each other: 2,298 and 2,356 a second. The GPU was never used, which is correct, because nothing here runs on a GPU.",
      "But the conclusion written down that night, that the protocol is not compute-bound, was wrong. The CPUs looked idle because the servers were starved of threads. Once that was fixed, the same servers ran at 90 to 95 percent CPU and the signature checks turned out to be the largest cost. A flat result can be the right answer to the wrong question."
    ],
    [
      "The mistakes that cost hours, none of them in the protocol",
      "A single missing firewall rule on one machine looked like an architectural ceiling for hours. A kill command scoped too broadly once took the production quorum down for 19 minutes. A test client placed 80 milliseconds from the validators understated one quorum by about 7.9 times. A file-descriptor limit of 1,024 made a server quietly stop accepting connections at around 600 concurrent requests, with nothing in the log. A binary built on a Mac was copied to Linux machines.",
      "Each one produced a believable number that was wrong. The fix every time was the same: write down what was held constant, and check the machine before blaming the design."
    ],
    [
      "What did not work",
      "Pipelining the replica confirmation was expected to make durable writes nearly as fast as accepted ones. Measured against a control on the same box it did nothing: 841 to 911 a second against 877 to 954. The hypothesis was refuted, and the server was left with the option off. Two earlier attempts at compressing messages made throughput worse and were reverted. A larger connection pool was worse than the smaller one.",
      "A result that goes the wrong way is still a result. These stayed in the log with their numbers."
    ],
    [
      "Where the time actually went",
      "A profile of the HTTP server under load, with call stacks, put 40 percent of its CPU in the HTTP layer and the kernel network calls beneath it, 21 percent in signature checks, 15 percent in building and sorting JSON values, and 11 percent in storage. Removing JSON completely could not have given more than about 1.2 times.",
      "Then came the wrong turn that mattered most. The first test of the idea that dense patterns beat JSON used the vocabulary codec in the learning library, which turns words into table references. It cannot encode a transfer at all. The grammar that was meant is the registered one in the core library, and it had not been tested. The owner caught it."
    ],
    [
      "The grammar, on a socket",
      "Rebuilt on the real grammar, a transfer is five signed records with six signatures, sent as lines of text over a raw TCP socket, with no HTTP and no JSON. On the same four cores, the server went from about 1,900 transfers a second to about 4,800, and about 5,100 when a whole transfer travels in one write. The grammar layer itself, splitting on dashes and running each block's resolver, was 2 percent of the server's CPU.",
      "Across the whole fleet, running together for 20 seconds, it reached 21,199 a second with no failures. An earlier fleet run with a simpler private frame format had shown 35,499, but that frame carried three records and three signatures, not the real five and six. It was a stand-in, so it is not the number.",
      "The fleet run itself failed first. Two clients lost their connections because several hundred connected in the same instant and overflowed a listen queue of 128, which the kernel counters showed directly. A stale server survived one attempt because a process-kill command silently ignores names longer than 15 characters. And an early reading of the CPU as half idle came from averaging in seconds when nothing was running."
    ],
    [
      "Batch verification, and a result that was smaller than hoped",
      "Signature checking was 55 percent of the server, so checking many signatures in one batch was the obvious lever. Measured, batching is slower for a single signature, 1.5 times faster for the six in one transfer, and about twice as fast from a dozen up. On one box the gain was 17 to 22 percent, not the 2 times the micro-benchmark suggested, because it can only shrink a part of the cost. One verification thread made things worse; two helped. The fleet went from 21,199 to 24,908 a second.",
      "There is a catch that travels with the number. Batch verification can accept a signature that checking one at a time would reject, if the signer builds it that way. For one notebook that only hurts its author. Where several parties must agree on what is valid, they all have to use the same mode, or the gap has to be closed first."
    ],
    [
      "What none of this proves",
      "This is accepted finality only: nothing is replicated or flushed, so a crash loses it. There is no threshold certificate, so no Byzantine tolerance; the certified fabric does more per transfer, and comparing the two is real but not like for like. The clients were fleet machines, not the public. It is a prototype that is not deployed as a service, and a replica-confirmed path over the wire does not exist yet.",
      "The next gains are in the cryptography, not the parser: standing intents and offers that remove two of the six signatures, and a holder field that is not the hex of a hex key. The honest summary is one sentence long. The grammar is cheap, the signatures are the cost, and every number here says which protocol it describes."
    ]
  ],
  "numbers": false
});
