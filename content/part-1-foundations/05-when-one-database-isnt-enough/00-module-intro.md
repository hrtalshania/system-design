---
id: part-1-m05-intro
title: "Module 5 — When one database isn't enough"
summary: "The servers scale out, but every query still goes to one database. Add read replicas, then deal with what copies bring: lag, failover, backups and recovery."
kind: intro
minutes: 3
tags: [databases, replication, availability, backups]
---

## Why this module exists

Module 4 ended with a useful defeat. Two API servers moved the knee from about 480 to about 930 requests per second, and p99 at 900 fell from 1,800 ms to 260 ms. Then the database pinned at 99% and a third API server added connections, not throughput.

The clinic now runs six locations. At 09:05 on Monday it takes 900 requests per second, the API fleet is at 40% CPU, and PostgreSQL is at 94%. Every slot search, every appointment list and every booking still goes through one primary. The API tier is no longer the wall. The database is.

The obvious next move is to copy the database. A **read replica** is a second database server with the same data, kept up to date by the primary, that can answer read queries. At an 80/20 read/write mix, reads are most of the work, so one copy can take a large share of the load. That is the promise.

The bill arrives in four parts. The copy is not perfectly current, so a patient may not see the appointment she just booked. The primary can still die, so someone has to decide when to promote a copy. A replica copies mistakes as faithfully as it copies successes, so it is not a backup. And every new database node needs monitoring, credentials, capacity and a recovery plan.

This module is about turning one database into a small, honest cluster — and about the limits that remain. Replicas scale reads and buy redundancy. They do not make writes faster. Knowing which one you are buying is the whole skill.

## What you'll be able to do

- Explain what a read replica copies, how it stays current, and why it is read-only.
- Classify queries as read-only or write, and route them without breaking a transaction.
- Handle replication lag with read-your-writes rules instead of hoping the copy is current.
- Plan a failover: detection, promotion, redirection, and the writes that may be lost.
- Calculate RTO and RPO, and compare them with a monthly availability budget.
- Design backups with point-in-time recovery, then prove a restore actually works.
- Run a replica load test and state plainly what scaled and what did not.

## Before you start

Finish Modules 1–4. You need the Module 4 baseline: an 80/20 read/write mix, a primary that saturates near 1,100 requests per second, and API servers that are no longer the constraint. You should also be comfortable with the idea that a database commit is durable before the client sees a success.

One warning before the first lesson: a replica is not a spare primary sitting idle. It is a running copy with its own CPU, disk, connections and failure modes. Treat it as a production system from the moment it exists.

## How this module runs

Six units. Units 5.1–5.4 are the mechanisms: read replicas, replication lag, failover, and backups. Unit 5.5 reruns the load test with one primary and two replicas, then kills the primary and times the recovery. Unit 5.6 is a lab: a second clinic group is acquired with its own database, no replicas, and a fixed budget, and must add capacity and a recovery plan.

The recurring question is not "can we add a replica?" It is "which problem does this replica solve, and what new problem does it create?" Keep that question in front of you for every diagram and every number.
