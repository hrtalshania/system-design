# Course map

> 19 modules · 137 path units · 18 labs · 19 simulations · 16 system labs

## Part 1 · Foundations

### 01 · What is system design?

> The choices you make when building a system.

- [x] **1.1** What system design means · 3m
- [x] **1.2** The design process · 8m
- [x] **1.3** Functional vs non-functional requirements · 8m
- [x] **1.4** Everything is a tradeoff · 10m
- [x] **1.5** Lab: Design system for a clinic · Lab · 30m

### 02 · Start with a simple system

> One client, one server, one database. Design its API and its data before anything else.

- [x] **2.1** From requirements to requests · 9m
- [x] **2.2** Data modeling · 12m
- [x] **2.3** Indexes · 15m
- [x] **2.4** Designing the API · 12m
- [x] **2.5** Choosing a database · 14m
- [x] **2.6** Reverse proxy · 11m
- [x] **2.7** How do you know it's working? · 8m
- [x] **2.8** Proof: load testing one server · 8m
- [x] **2.9** Lab: Design the clinic's API and data · Lab · 25m

### 03 · Caching

> Cache the data you read often, so the database isn't queried every time - and keep the cache from serving stale data.

- [x] **3.1** Why cache, and what · 12m
- [x] **3.2** Where the cache lives · 10m
- [x] **3.3** Reading and writing with a cache · 15m
- [x] **3.4** Cache invalidation · 12m
- [x] **3.5** When the cache is full · 12m
- [x] **3.6** When caching makes things worse · 15m
- [x] **3.7** Proof: the menu page with a cache · 8m
- [x] **3.8** Lab: What can the clinic cache? · Lab · 25m

### 04 · When one server isn't enough

> Dinner traffic outgrows one server. Scale vertically, then horizontally, and fix what breaks on server two.

- [x] **4.1** Vertical scaling · 12m
- [x] **4.2** Horizontal scaling · 12m
- [x] **4.3** Load balancers · 12m
- [x] **4.4** Stateless servers · 15m
- [x] **4.5** Connection pooling · 10m
- [x] **4.6** Object storage: where the photos go · 10m
- [x] **4.7** CDN: a cache near the user · 10m
- [x] **4.8** Proof: two servers behind a load balancer · 8m
- [x] **4.9** Lab: Does the clinic need a second server? · Lab · 25m

### 05 · When one database isn't enough

> The servers scale out, but every query still goes to one database. Add read replicas, then deal with what copies bring: lag, failover, backups and recovery.

- [x] **5.1** Read replicas · 12m
- [x] **5.2** Replication lag · 12m
- [x] **5.3** When the primary dies · 12m
- [x] **5.4** Backups and recovery · 10m
- [x] **5.5** Proof: one primary, two replicas · 8m
- [x] **5.6** Lab: Add read replicas to the clinic · Lab · 25m

### 06 · Live updates

> Some news can't wait for the app to ask. Choose between asking often and keeping a connection open - and make it work across many servers.

- [ ] **6.1** Polling, SSE, WebSockets, push · 12m
- [ ] **6.2** Live updates across many servers · 12m
- [ ] **6.3** Proof: 10,000 order screens · 8m
- [ ] **6.4** Lab: Add live updates to the clinic · Lab · 25m

### 07 · Background jobs

> Not everything has to happen before the response. Move slow work to a queue and workers - and make sure a job that runs twice does no harm.

- [ ] **7.1** Why the user shouldn't wait · 10m
- [ ] **7.2** A queue in the database you have · 12m
- [ ] **7.3** Queues and workers · 15m
- [ ] **7.4** When a job fails · 14m
- [ ] **7.5** Proof: take the SMS out of the order · 8m
- [ ] **7.6** Lab: Add a queue to the clinic · Lab · 25m

### 08 · Rate limiting

> Not every request deserves a reply. Decide how much each client may ask for, and keep that limit across many servers.

- [ ] **8.1** Why limit requests · 10m
- [ ] **8.2** Counting requests · 14m
- [ ] **8.3** One limit across many servers · 12m
- [ ] **8.4** Proof: stop the OTP flood · 8m
- [ ] **8.5** Lab: Add rate limits to the clinic · Lab · 25m

### 09 · Growing big

> Years of data, many cities, many teams. The cheap steps first - archive and partition - then the two hardest ones, put off as long as you can.

- [ ] **9.1** Old data you rarely read · 10m
- [ ] **9.2** Partitioning a table · 12m
- [ ] **9.3** Sharding · 15m
- [ ] **9.4** Splitting into services · 12m
- [ ] **9.5** Proof: clear out an old month · 8m
- [ ] **9.6** Lab: Ten years of clinic bookings · Lab · 25m

### 10 · Putting it together

> Design a whole system from a blank page, and explain your choices out loud.

- [ ] **10.1** The design interview · 12m
- [ ] **10.2** Back-of-the-envelope estimation · 12m
- [ ] **10.3** Drawing it and talking tradeoffs · 10m
- [ ] **10.4** Capstone: Design the whole app · Lab · 45m

## Part 2 · Distributed systems

### 11 · Microservices

> Splitting the app into services: where to draw the boundaries, how services call each other, and how to trace a request across them.

- [ ] **11.1** Service boundaries · 12m
- [ ] **11.2** Synchronous vs asynchronous calls · 12m
- [ ] **11.3** REST vs gRPC · 12m
- [ ] **11.4** API gateway and service discovery · 10m
- [ ] **11.5** Backend for frontend · 10m
- [ ] **11.6** Aggregating data from several services · 10m
- [ ] **11.7** Authentication across services · 12m
- [ ] **11.8** Distributed tracing · 10m
- [ ] **11.9** Proof: one process vs five services · 8m
- [ ] **11.10** Lab: Split the order flow · Lab · 30m

### 12 · Problems in distributed systems

> Things that work on one machine and fail across many: timeouts, retries, clocks, counters and locks. Each lesson covers the basic fix and points to the module with the full solution.

- [ ] **12.1** Partial failure and timeouts · 12m
- [ ] **12.2** Retry storms and cascading failures · 12m
- [ ] **12.3** Circuit breakers and load shedding · 12m
- [ ] **12.4** Tail latency · 10m
- [ ] **12.5** Clocks and ordering · 12m
- [ ] **12.6** Duplicate and out-of-order messages · 10m
- [ ] **12.7** Inconsistent data · 12m
- [ ] **12.8** Counters and limits across machines · 12m
- [ ] **12.9** Locks and leaders · 10m
- [ ] **12.10** Proof: one slow service · 8m
- [ ] **12.11** Lab: Inject failures into the clinic · Lab · 30m

### 13 · Replication in depth

> Keeping copies of data on several machines: replication modes, leader election, consistency, and resolving conflicts.

- [ ] **13.1** Sync, async and failover · 15m
- [ ] **13.2** Leader election and Raft · 18m
- [ ] **13.3** Consistency models · 15m
- [ ] **13.4** Leaderless and quorums · 15m
- [ ] **13.5** Conflict resolution · 12m
- [ ] **13.6** CAP and PACELC · 10m
- [ ] **13.7** Lab: Choose consistency levels · Lab · 30m

### 14 · Partitioning in depth

> Splitting data across machines while avoiding hot spots, expensive queries and costly rebalancing.

- [ ] **14.1** Range vs hash partitioning · 12m
- [ ] **14.2** Consistent hashing · 15m
- [ ] **14.3** Hot keys · 12m
- [ ] **14.4** Queries across shards · 12m
- [ ] **14.5** IDs without a central counter · 10m
- [ ] **14.6** Lab: Reshard without downtime · Lab · 30m

### 15 · Messaging: Kafka and pub/sub

> Services publish events instead of calling each other in a chain: pub/sub, Kafka, fan-out and delivery guarantees.

- [ ] **15.1** Pub/sub · 10m
- [ ] **15.2** How Kafka works · 15m
- [ ] **15.3** Kafka as a queue · 12m
- [ ] **15.4** Fan-out and fan-in · 10m
- [ ] **15.5** Message ordering · 10m
- [ ] **15.6** At most, at least, exactly once · 10m
- [ ] **15.7** Lab: Event-driven order flow · Lab · 30m

### 16 · Transactions across services

> Placing an order writes to three services. How to keep them consistent when any of them can fail partway through.

- [ ] **16.1** Isolation levels · 15m
- [ ] **16.2** Outbox and change data capture · 12m
- [ ] **16.3** Two-phase commit · 12m
- [ ] **16.4** Sagas · 15m
- [ ] **16.5** Locks, leases and fencing tokens · 12m
- [ ] **16.6** Lab: Order saga · Lab · 30m

### 17 · Events and streams

> Event sourcing, CQRS, stream processing and batch processing.

- [ ] **17.1** Event sourcing and CQRS · 12m
- [ ] **17.2** Stream processing · 15m
- [ ] **17.3** Batch and analytics · 10m
- [ ] **17.4** Lab: Live orders per city · Lab · 30m

### 18 · Availability and going global

> Setting an uptime target, what each extra nine costs, and running in multiple regions.

- [ ] **18.1** Availability and the nines · 12m
- [ ] **18.2** Multi-region · 15m
- [ ] **18.3** Geo-routing · 10m
- [ ] **18.4** Disaster recovery · 12m
- [ ] **18.5** Lab: Region failover · Lab · 30m

## Part 3 · Under the hood

### 19 · Classic algorithms in action

> The algorithms under every big system, as simulations: run them, break them, and see why they work.

- [ ] **19.1** Consistent hashing · Simulation · 10m
- [ ] **19.2** Bloom filter · Simulation · 10m
- [ ] **19.3** HyperLogLog · Simulation · 10m
- [ ] **19.4** Count-min sketch and top-K · Simulation · 10m
- [ ] **19.5** Geohash and quadtree · Simulation · 10m
- [ ] **19.6** Trie · Simulation · 10m
- [ ] **19.7** Inverted index · Simulation · 10m
- [ ] **19.8** B-tree vs LSM tree · Simulation · 10m
- [ ] **19.9** Write-ahead log · Simulation · 10m
- [ ] **19.10** Merkle tree · Simulation · 10m
- [ ] **19.11** Snowflake IDs · Simulation · 10m
- [ ] **19.12** Lamport and vector clocks · Simulation · 10m
- [ ] **19.13** Gossip and failure detection · Simulation · 10m
- [ ] **19.14** Quorum reads and writes · Simulation · 10m
- [ ] **19.15** Raft · Simulation · 10m
- [ ] **19.16** Leases and fencing tokens · Simulation · 10m
- [ ] **19.17** CRDTs · Simulation · 10m
- [ ] **19.18** Fan-out on write vs read · Simulation · 10m
- [ ] **19.19** Sharded counters · Simulation · 10m

## System labs

- [ ] **Design your own Bitly** · URL shortener · easy · 13 steps · ~45 min
- [ ] **Design a Udemy-like database** · Data modeling · easy · 14 steps · ~75 min
- [ ] **Design your own YouTube** · Video platform · medium
- [ ] **Design your own Instagram** · Photo feed · medium
- [ ] **Design your own WhatsApp** · Chat app · medium
- [ ] **Design your own Spotify** · Music streaming · medium
- [ ] **Design your own Google Maps** · Route ETA · hard
- [ ] **Design your own Gmail** · Email service · medium
- [ ] **Design your own Google Docs** · Collaborative editor · hard
- [ ] **Design your own Reddit** · Ranked feed · medium
- [ ] **Design your own Discord** · Online status · medium
- [ ] **Design your own Dropbox** · File sync · medium
- [ ] **Design your own Swiggy** · Delivery dispatch · hard
- [ ] **Design your own BookMyShow** · Ticket booking · medium
- [ ] **Design your own Razorpay** · Payment system · hard
- [ ] **Design your own DynamoDB** · Key-value store · hard

