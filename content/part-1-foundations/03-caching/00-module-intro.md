---
id: part-1-m03-intro
title: "Module 3 · Caching"
summary: "Keep a cheap copy of the data you read most — and make sure the copy never gets the final word on something that matters."
kind: intro
minutes: 3
tags: [caching, performance, invalidation]
---

## Why this module exists

Module 2 ended with a working clinic system: one API, one Postgres, one reverse proxy, and a load test that found the first wall. Adding the index moved the wall back. It did not remove it. At a few hundred requests per second the database still does real work for every read, and most of that work returns the same answer.

This module is about the next cheapest lever after an index: stop asking. Keep a copy of the answer somewhere faster, serve the copy while it is still good, and go back to the database when it is not.

That sounds simple, and the first version is. The hard part is everything after the first version. A cache is a second copy of the truth. Every copy can drift, every drift needs a rule, and every rule has a failure mode. The module spends most of its time on those rules, because that is where production incidents live.

The clinic makes the tradeoff concrete. The doctor list can be a few minutes old and nobody is harmed. The free-slot list cannot be old at all, because Meera and another patient may both see the same slot and both press “Book.” Same system, same cache server, opposite answers.

## What you'll be able to do

- Decide which reads deserve a cache, using read frequency, change rate and staleness tolerance.
- Choose where the copy lives: process memory, a shared cache server, a CDN, or the browser.
- Pick a read/write pattern — cache-aside, read-through, write-through, write-behind — and name what each one gives up.
- Design an invalidation path that survives deletes, updates and concurrent writes.
- Choose an eviction policy and predict what it does to the hit rate.
- Recognise the classic cache failures: stampede, hot key, penetration, avalanche, and the cold start after a deploy.
- Prove the gain with a load test, and prove the risk with the same test after flushing the cache.

## Before you start

Finish Modules 1 and 2. This module assumes you can read a query plan, explain why an index helped, and describe what p99 measures. If those ideas are fuzzy, the caching numbers will look like magic instead of arithmetic.

You should also be comfortable with the clinic’s schema: `doctors`, `slots`, `appointments`, `patients`. The cache keys in this module are built from those tables, and the invalidation rules follow the same foreign keys.

## How this module runs

Eight units. Units 3.1–3.6 build the idea from first principles: what to cache, where it lives, how reads and writes flow, how copies are invalidated, what happens when memory fills, and how caches fail at scale. Unit 3.7 is a controlled load test with and without a cache, including the day every key expires at once. Unit 3.8 is a lab where you decide what the clinic may cache and defend the list.

Every unit has a widget you can manipulate. Move the numbers. The point is to feel where the curve bends, not to memorise a formula.
