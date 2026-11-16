---
id: part-1-m02-intro
title: "Module 2 · Start with a simple system"
summary: "One client, one server, one database. Design its API and its data before anything else."
kind: intro
minutes: 3
tags: [foundations, api, data-modeling]
---

## Why this module exists

A first design often jumps straight to scale: multiple servers, a cache, a queue, a shard. That is backwards. You cannot know what to scale until you know what the system does, what it stores, and which request is the one that must never be wrong.

This module builds the smallest honest version of the clinic. One API server. One PostgreSQL database. One reverse proxy. A handful of endpoints. Then it measures that version until it breaks, so the next module has a real reason to exist.

The constraints matter as much as the design. The clinic has one part-time developer, no operations team and a $50 monthly budget. A design that needs a platform team is not a good design here, even if it is impressive on a diagram.

## What you'll be able to do

- Turn a user journey into a request map with methods, paths and failure cases.
- Model data so the important rules live in keys and constraints, not in scattered `if` statements.
- Choose indexes from real query shapes and read the plan with `EXPLAIN`.
- Design an API with honest status codes, idempotent writes and bounded pagination.
- Pick a database family by access pattern, consistency need and operational cost.
- Put a reverse proxy in front of the app and explain what belongs there.
- Define SLIs and SLOs, and load-test the system to find its first bottleneck.

## Before you start

Finish Module 1 first. This module assumes you can already separate functional from non-functional requirements, trace a user action into requests, and name a tradeoff.

Bring the clinic’s cast with you: Dr. Rao, Meera and Arjun. The data model and API here are used again in the caching, scaling and queue modules. If you change a decision, write down why.

## How this module runs

Nine units. Units 2.1–2.7 build the design one layer at a time. Unit 2.8 is a controlled load test with reference results. Unit 2.9 is a lab where you produce the full first-pass design and defend it.

The load test is the hinge. Until you have seen a sequential scan pin the database at 99% CPU, “add an index” is a slogan. After it, the numbers do the arguing.
