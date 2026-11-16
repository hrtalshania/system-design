---
id: part-1-m01-intro
title: "Module 1 · What is system design?"
summary: "The choices you make when building a system: what exists, how it talks, what it stores, and what it gives up."
kind: intro
minutes: 3
tags: [foundations, mental-model]
---

## Why this module exists

Most people meet system design as a list of tools: load balancers, caches, queues, shards. That list is the end of the conversation, not the start. Before you can choose a tool, you need to see the problem it solves.

This module builds that lens. You will take one ordinary sentence — “patients should be able to book appointments online” — and watch it turn into requirements, requests, data, failure modes and tradeoffs. No distributed systems yet. Just the habit of asking what a design must survive.

The clinic is deliberately small. Dr. Rao has one location, a handful of staff and about 200 appointments a week. At that size, most of the “scalable” architecture you read about online would be waste. The point is to learn when complexity earns its place, not to collect it.

## What you'll be able to do

- Explain what system design actually decides, beyond boxes and arrows.
- Turn a vague feature request into functional and non-functional requirements.
- Trace a user journey down to the requests, reads and writes behind it.
- Name what a design gives up, not only what it gains.
- Write a one-page design for the clinic that another engineer could build.

## Before you start

No distributed-systems knowledge is assumed. You should be comfortable reading code and thinking in terms of functions, databases and HTTP, but you do not need to have operated a production system.

Keep something to write with. The exercises ask you to produce small artifacts — a requirements list, a request map, a tradeoff record. Reading them is not the same as writing them.

## How this module runs

Five units. The first four build the method; the fifth is a lab where you apply all of it to the clinic. Each unit ends with a short quiz and an exercise. The lab ends with a rubric you can use to review your own design.

The next module takes the clinic from that first sketch to a working API, a real data model and a load test. If a unit here feels abstract, keep going: the clinic returns in every module, and the abstractions get concrete fast.
