---
id: part-1-m03-l06
title: When caching makes things worse
summary: "Keys that expire together, a hot key that expires, lookups for data that doesn't exist — and the fix for each."
kind: lesson
minutes: 15
tags: [caching, stampede, hot-key, penetration, avalanche]
---

:::mental-model
**A cache protects the database until something makes many requests miss at once. Every failure in this lesson is a miss storm, and every fix either reduces the number of misses or the number of requests that reach the database.**
:::

## The 9:10 a.m. outage

The clinic’s cache is healthy: 96% hit rate, database at 20% CPU. At 09:00 a deploy restarts the cache. Every key is refilled over the next few minutes, all with the same ten-minute TTL.

At 09:10, every one of those keys expires in the same second. Ten thousand requests miss at once. Each miss runs the same three queries, and the connection pool has twenty connections. Requests queue behind the pool, the queue grows, p99 crosses three seconds, and the load balancer starts returning 503s.

Nothing was wrong with the cache. The cache was working exactly as configured. The problem was that all of it stopped working at the same instant.

## Failure 1: the stampede

A **cache stampede** (also called the thundering herd) happens when a popular key expires and many concurrent requests miss together. Each request decides to rebuild the value, so the database receives N identical queries for one answer.

The cost is not just N queries. It is that the queries arrive at the same time, on the same rows, and hold connections while they run. A database that handles 400 queries per second comfortably can be pinned by 2,000 identical queries in one second.

```mermaid
flowchart LR
  E["Popular key expires"] --> M["2,000 requests miss"]
  M --> Q["2,000 identical queries"]
  Q --> P["Connection pool fills"]
  P --> L["Queue grows, p99 climbs"]
  L --> X["Timeouts and 503s"]
```

**Fixes, in order of preference:**

1. **Request coalescing (single-flight).** The first request to miss takes a lock for that key and rebuilds. The others wait for the result or read the old value. One query instead of 2,000. In Go this is `golang.org/x/sync/singleflight`; in Redis it is `SET lock:key 1 NX EX 10`.
2. **Serve stale while refreshing.** Keep the old value for a short grace period after expiry and refresh it in the background. Readers get slightly stale data instead of a queue.
3. **Probabilistic early refresh.** Refresh a key before it expires with a probability that rises as expiry approaches, so one request refreshes early instead of all requests hitting at once.
4. **A longer TTL** reduces how often the key expires, but it does not remove the cliff. It only makes it rarer.

Request coalescing is the highest-value fix. It turns a fan-out of identical work into one piece of work.

## Failure 2: the hot key

A **hot key** is one key that receives a disproportionate share of traffic. A celebrity profile, a flash-sale product, the clinic’s homepage configuration during the Monday rush.

The problem is physical. A Redis cluster shards keys across nodes. One key lives on one node, and one node has finite CPU. If the key receives 80,000 reads per second and the node can serve 100,000 simple operations per second, the key consumes most of that node while the other nodes idle.

Adding replicas helps reads only if clients read from replicas; adding shards does not help, because the hot key cannot be split by the hash function.

**Fixes:**

- **A short in-process cache in front of Redis.** The hottest key is served from application memory for 1–5 seconds, absorbing the burst. This is the same placement tradeoff from 3.2: a little staleness for a lot of capacity.
- **Key replication.** Write the value under `key:0`, `key:1`, … `key:9` and have readers pick one at random. This spreads the key across shards, at the cost of nine extra writes and a fan-out on invalidation.
- **Read replicas** for the cache tier, with clients aware that replication is asynchronous.
- **Request coalescing**, which reduces duplicate reads but not the read volume if every request is distinct.

Hot keys are a capacity problem, not a correctness problem, but they look like an outage because one shard saturates while the cluster appears healthy.

## Failure 3: penetration

**Cache penetration** is repeated lookup of keys that do not exist. An attacker requests `/doctors/999999`, `/doctors/999998`, and so on. Every request misses, because there is nothing to cache, and every request reaches the database.

The database is now doing work for data that will never exist. A few thousand requests per second are enough to matter.

**Fixes:**

1. **Negative caching.** Cache the “not found” result for a short TTL — 30 to 60 seconds. The first request pays; the rest hit the negative entry. Keep the TTL short so a newly created row becomes visible quickly.
2. **Input validation.** Reject IDs that cannot exist — wrong format, out of range, deleted tenant — before touching the cache or database.
3. **A Bloom filter.** Keep a probabilistic set of existing IDs in memory. A negative answer is definitive; a positive answer still checks the cache and database. This avoids caching every nonexistent key an attacker invents.

Negative caching is the usual first fix because it is one line of code. The Bloom filter is worth it when the key space is huge and the attack is sustained.

## Failure 4: the avalanche

An **avalanche** is many keys expiring at the same moment. The common cause is a batch job or deploy that writes thousands of keys with the same TTL: everything set at 09:00 expires at 09:10.

The stampede is one key; the avalanche is the whole cache. The database sees the combined load of every expired key, which can be far beyond its capacity.

**Fixes:**

- **Jitter the TTL.** Instead of `EX 600`, use `EX 600 ± 10%`. Ten thousand keys then expire across a 60-second window instead of one second.
- **Tiered TTLs.** Give different key families different lifetimes, so they do not align.
- **Warm the cache gradually** after a deploy, rather than all at once.
- **Keep the cache across deploys.** Restarting the cache with the application is a self-inflicted avalanche.

Jitter is a one-line change with a large effect. It should be the default for any bulk cache fill.

## Failure 5: the cold start

A cold cache is empty. Every request misses until the working set is rebuilt. If the database was sized for the 4% miss traffic of a warm cache, it cannot absorb 100%.

This happens after:

- a cache restart or failover,
- a deploy that changes key names or serialization,
- a new region with no local cache,
- a mass eviction after a memory limit is reached.

**Fixes:**

- **Warm the cache before sending traffic.** Run the top queries against the database and fill the keys, then shift traffic.
- **Roll out gradually.** Send 1%, then 5%, then 25% of traffic to the new cache, watching database CPU.
- **Protect the database with a circuit breaker.** When the miss rate crosses a threshold, serve stale data or a degraded page instead of queueing every request.
- **Use consistent hashing** so a single cache node failure only loses its share of keys, not the whole cache.

The cold start is the moment when the cache is least useful and the database is most exposed. Plan for it explicitly.

:::reality-check
The most dangerous cache is a very effective one. At a 99% hit rate, the database may be sized for 1% of traffic. That is fine until the cache is empty, and then the database meets 100% of it with no warning.
:::

## A worked numbers comparison

The clinic’s homepage key gets 2,000 requests per second. The database query behind it takes 40 ms, and the pool holds 20 connections.

**Without coalescing, on expiry:**

- 2,000 concurrent misses, each waiting for a 40 ms query.
- With 20 connections, throughput is at most `20 / 0.040 = 500` queries per second.
- The queue drains at 500/s while 2,000/s arrive. It grows by 1,500 requests every second.
- After two seconds, p99 is measured in seconds and errors begin.

**With single-flight:**

- One query runs for 40 ms; 1,999 requests wait on its result or read the stale copy.
- The key is warm again in ~45 ms.
- The database sees one query instead of thousands.

The difference is not tuning. It is the difference between doing the work once and doing it 2,000 times.

For the avalanche, the arithmetic is similar in shape:

```text
10,000 keys, TTL 600 s, all written at 09:00
→ all expire at 09:10 → 10,000 misses in ~1 s

With ±10% jitter, TTLs spread over 540–660 s
→ expiries spread over 120 s → ~83 misses/s
```

Same keys, same TTL on average, one-fifth of the peak load.

## What to monitor

Miss storms are visible before users complain if you watch the right signals:

- **Miss rate per key family**, not just the global hit rate. A single hot key can fail while the aggregate looks fine.
- **Database queries per second by query shape.** A spike in one identical query is a stampede signature.
- **Connection pool wait time.** The first sign that the database is saturated.
- **Cache evictions and expirations per second.** A spike at a round minute suggests aligned TTLs.
- **Negative lookup rate.** A rise in “not found” responses may be an attack.

Alert on the *rate of change*, not only the absolute value. A miss rate that triples in ten seconds is more informative than one that is 4% all day.

:::widget cache-failure
:::

## The fixes and what they cost

| Failure | Cheapest fix | What it gives up |
|---|---|---|
| Stampede | Single-flight per key | Waiting requests hold a connection; a failed rebuild must release the lock |
| Hot key | 1–5 s in-process cache | Slight staleness; memory per server |
| Penetration | Negative caching with a short TTL | A newly created row can stay invisible for the TTL |
| Avalanche | TTL jitter | Nothing meaningful; it is almost free |
| Cold start | Warm-up and gradual rollout | Deploy time and operational discipline |
| Cache down | Fallback to database with a circuit breaker | The database must survive the miss traffic, or the page must degrade |

None of these is exotic. They are the standard defences, and they are cheap compared with the outage they prevent.

## Check yourself

:::quiz
[
  {
    "question": "A popular key expires and 2,000 requests miss in the same second. Which fix most directly reduces the database work?",
    "options": [
      "Increase the TTL so the key expires less often",
      "Coalesce the misses so one request rebuilds the value and the rest wait",
      "Add more cache memory",
      "Cache the key in the browser"
    ],
    "answer": 1,
    "explanation": "Coalescing turns 2,000 identical rebuilds into one. A longer TTL makes the event rarer but still leaves a cliff when it happens. Memory does not help because the key is missing, not evicted."
  },
  {
    "question": "An attacker requests thousands of doctor IDs that do not exist. Every request reaches the database. What is the standard first fix?",
    "options": [
      "Cache the not-found result for a short TTL",
      "Increase the cache size",
      "Switch from LRU to FIFO",
      "Disable the cache"
    ],
    "answer": 0,
    "explanation": "Negative caching stores the absence, so repeated lookups of the same missing key hit the cache. A Bloom filter or input validation can complement it for large key spaces."
  },
  {
    "question": "After a deploy, all 10,000 cached keys expire in the same second. What is the simplest effective fix?",
    "options": [
      "Add a second cache layer",
      "Jitter each TTL by a few percent so expiries spread out",
      "Remove TTLs entirely",
      "Cache only the database primary keys"
    ],
    "answer": 1,
    "explanation": "Aligned TTLs cause an avalanche. Jitter spreads expiry across a window, reducing the peak miss rate without changing the average TTL. Removing TTLs creates permanent staleness."
  },
  {
    "question": "Why is a 99% hit rate cache dangerous during a cold start?",
    "options": [
      "The cache uses more memory when cold",
      "The database may be sized for 1% of traffic and suddenly receives 100%",
      "The hit rate becomes negative",
      "Cold starts only affect write traffic"
    ],
    "answer": 1,
    "explanation": "A very effective cache lets the database run well below capacity. An empty cache removes that protection instantly, so the database must absorb the full read load. Warm-up and gradual rollout reduce the risk."
  }
]
:::

## Exercise: design the miss-storm plan

For a system you know, write a one-page plan with four sections:

1. The three hottest cache keys, and what happens when each expires.
2. Your stampede defence: coalescing, stale-while-revalidate, or both.
3. Your avalanche defence: TTL jitter range and which key families are exempt.
4. Your cold-start plan: how the cache is warmed and how traffic is shifted.

Then add the alert you would create for each failure, with a concrete threshold.

:::discussion
- Is serving stale data during a miss storm always better than waiting for a fresh value?
- How would you find a hot key before it saturates a shard?
- Should a cache ever be sized so the database can survive a full cold start? What does that cost?
:::

## Key takeaways

- A miss storm, not a slow cache, is the usual caching outage.
- Stampedes are identical rebuilds; coalesce them so the database does the work once.
- Hot keys saturate one shard; absorb them with a short local cache or replicate the key.
- Penetration is repeated lookup of missing keys; negative caching and validation stop it.
- Avalanches are aligned expiries; jitter the TTL and stagger the fills.
- A cold cache exposes the database to the load the cache was hiding; warm up and roll out gradually.
- Monitor miss rate per key family and database query shapes, not only the global hit rate.

## Free references

- [Redis: cache stampede and hot key mitigation](https://redis.io/docs/latest/develop/reference/client-side-caching/) — leases, tracking and invalidation.
- [Google SRE Book: handling overload](https://sre.google/sre-book/handling-overload/) — why queues collapse and how to shed load.
- [AWS: caching best practices](https://aws.amazon.com/caching/best-practices/) — TTL jitter, negative caching and warm-up.
- [Cloudflare: what is a cache stampede?](https://www.cloudflare.com/learning/cdn/what-is-a-cache-stampede/) — a short explanation with CDN examples.
