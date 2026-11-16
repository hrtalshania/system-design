---
id: part-1-m04-intro
title: "Module 4 · When one server isn't enough"
summary: "One box has a ceiling and a single point of failure. Add machines, move state out, and find the shared limit underneath."
kind: intro
minutes: 3
tags: [scaling, load-balancing, stateless, infrastructure]
---

## Why this module exists

Module 2 ended with a working clinic system and a load test. One API process, one PostgreSQL, one reverse proxy. The index moved the knee from about 100 to about 400 requests per second, which felt like a victory until the clinic grew to six locations.

At 8:55 on a Monday, the chain now takes 900 requests per second. The reception screens take four seconds to paint. Dr. Rao asks the question every owner asks: can we just buy a bigger server?

For a while, yes. That is where this module starts. A bigger machine is the cheapest engineering change you can make, and it is often the right first move. But it has a price curve that bends the wrong way, a reboot in the middle, and a single point of failure at the end. When the next growth spurt arrives, the answer has to change.

The change is not just "more servers." The moment a second server exists, everything that lived inside the first one becomes a problem. A login that was a variable in memory now has to be found on whichever machine answers the next request. A photo on local disk is now on one machine out of three. An in-process cache is now three copies that disagree. A connection pool that was fine at 20 connections becomes 120 connections aimed at a database that accepts 100.

This module is about that transition: from one server that is easy to reason about, to several servers that are not. It is the module where "it works on my machine" becomes an architectural constraint.

## What you'll be able to do

- Decide between scaling up and scaling out, and say what each one costs in money, downtime and failure domains.
- Put several API servers behind a load balancer, choose an algorithm, and explain what happens when one server dies.
- Move sessions, uploads, caches and background work out of the server so any server can serve any request.
- Size connection pools across many servers so the database is not exhausted by arithmetic.
- Store photos in object storage and serve them from a CDN without turning the API into a file server.
- Prove the change with a load test, and separate what doubled from what quietly became the new bottleneck.

## Before you start

Finish Modules 1–3. This module assumes you can read the Module 2 load-test table, explain why the index moved the knee, and describe the difference between an in-process cache and a shared one. The capacity numbers here are built on that baseline: 2 vCPU, 4 GB, p99 of 65 ms at 200 requests per second after the index.

You should also be comfortable with the idea that a server is a process with memory, a network address and a disk. That sounds obvious until the same user's next request lands on a different process and finds none of the three.

## How this module runs

Nine units. Units 4.1–4.5 cover the move from one machine to many: vertical scaling, horizontal scaling, the load balancer, stateless servers and connection pools. Units 4.6–4.7 move bytes out of the request path entirely, into object storage and a CDN. Unit 4.8 reruns the Module 2 load test against two servers and reports what actually changed. Unit 4.9 is a lab where you decide whether a clinic with a $50 monthly budget should buy a second server at all.

Every unit has a widget you can manipulate. The numbers are reference runs, not guarantees. Move the sliders and watch where the curve bends.
