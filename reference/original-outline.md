Complete System Design Path
Part 1 · Foundations

01


What is system design?
2 free lessons
The choices you make when building a system.
1.1
What system design meansFree
The choices you make when building a system.
Read
3m
1.2
The design processFree
How one sentence in a meeting becomes a line of code.
Read
8m
1.3
Functional vs non-functional requirements
Nobody hands you a list of requirements. Here's how to find them.
Read
8m
1.4
Everything is a tradeoff
Every choice gives something up. Here's how to choose.
Read
10m
1.5
Lab: Design system for a clinic
A doctor wants online booking. Find out what she actually needs.
Lab
30m
02


Start with a simple system
Rest coming Oct 2026
One client, one server, one database. Design its API and its data before anything else.
2.1
From requirements to requests
Three requirements, more than a dozen requests. Here's how to find them.
Read
9m
2.2
Data modeling
Code gets rewritten. Data stays. Here's how to shape it.
Read
12m
2.3
Indexes
Your API tells you which lookups run most. Index those, check the plan with EXPLAIN - and see what every index costs your writes.
Read
15m
2.4
Designing the API
A few basic rules that make an API easy to use and easy to change.
Read
12m
2.5
Choosing a database
What each kind of database gives up, and how to pick one for your app.
Read
14m
2.6
Reverse proxy
What a reverse proxy is, and why we put one in front of our API server.
Read
11m
2.7
How do you know it's working?
Turn "fast" and "always up" into numbers you can measure: p99 instead of the average, error rate, and how close each part is to its limit.
Read
8m
2.8
Proof: load testing one server
We built it in Go and load-tested it from another machine. Where one server breaks - before and after the index.
Read
8m
2.9
Lab: Design the clinic's API and data
Turn the clinic's requests into an API, then into tables and indexes.
Lab
25m
03


Caching
Coming Nov 2026
Cache the data you read often, so the database isn't queried every time - and keep the cache from serving stale data.
3.1
Why cache, and what
Hits, misses and TTL. Cache only when you must, and pick data by how often it changes.
Read
12m
3.2
Where the cache lives
In-process or a cache server like Redis - and why one server needs nothing more than the first.
Read
10m
3.3
Reading and writing with a cache
Cache-aside, read-through, write-through and refresh-ahead - and why the database is written first.
Read
15m
3.4
Cache invalidation
TTLs and invalidating on write. Cache data to show it, but check the database before you act on it.
Read
12m
3.5
When the cache is full
LRU, LFU and the rest. Watch the hit rate and the eviction rate to see if your cache is working.
Read
12m
3.6
When caching makes things worse
Keys that expire together, a hot key that expires, lookups for data that doesn't exist - and the fix for each.
Read
15m
3.7
Proof: the menu page with a cache
The same load test with and without the cache: requests per second, p99, database CPU and hit rate. Then every key expires at once.
Read
8m
3.8
Lab: What can the clinic cache?
Cache the doctor list. Never the free slots - a stale slot is a double booking.
Lab
25m
04


When one server isn't enough
Coming Nov 2026
Dinner traffic outgrows one server. Scale vertically, then horizontally, and fix what breaks on server two.
4.1
Vertical scaling
Our load test found where one server breaks. The first fix is a bigger machine - and it has a ceiling.
Read
12m
4.2
Horizontal scaling
More machines instead of a bigger one: no ceiling, and no single server to lose - but now there are two.
Read
12m
4.3
Load balancers
A reverse proxy with more than one server behind it: how it picks a server, what happens when one dies - and why the balancer can't be a single point of failure.
Read
12m
4.4
Stateless servers
Why a login breaks on server two, and where sessions, cache and photos go instead.
Read
15m
4.5
Connection pooling
Every server opens its own database connections. Add servers and you hit the database's limit while it's barely busy - pools and database proxies.
Read
10m
4.6
Object storage: where the photos go
Dish photos don't belong on a server's disk or in the database. A bucket holds them, and the app uploads straight to it.
Read
10m
4.7
CDN: a cache near the user
Serve menu photos from close to the customer, not from your servers.
Read
10m
4.8
Proof: two servers behind a load balancer
The load test that broke one server, run again against two. What doubled, and what didn't.
Read
8m
4.9
Lab: Does the clinic need a second server?
The Monday 9am rush, a $50 budget, and the numbers that decide.
Lab
25m
05


When one database isn't enough
Coming Nov 2026
The servers scale out, but every query still goes to one database. Add read replicas, then deal with what copies bring: lag, failover, backups and recovery.
5.1
Read replicas
Our load test's next limit is the database. Keep writes on one primary, copy it, and send reads to the copies.
Read
12m
5.2
Replication lag
Copies fall behind the primary. Why a customer can't find the order they just placed, and how to read your own writes.
Read
12m
5.3
When the primary dies
Promote a replica: automatic or manual, the writes you can lose, and what “three nines” really allows.
Read
12m
5.4
Backups and recovery
A replica copies your mistakes too. Backups, point-in-time restore, and testing that a restore works.
Read
10m
5.5
Proof: one primary, two replicas
The load test that maxed out one database, run again with two replicas. Then we kill the primary and time the failover.
Read
8m
5.6
Lab: Add read replicas to the clinic
The database is the bottleneck. Add replicas, handle replication lag, and plan failover and backups.
Lab
25m
06


Live updates
Coming Dec 2026
Some news can't wait for the app to ask. Choose between asking often and keeping a connection open - and make it work across many servers.
6.1
Polling, SSE, WebSockets, push
Ask every few seconds, or keep a connection open. Four ways to get news to the restaurant and the customer, what each costs the server, and why polling is often enough.
Read
12m
6.2
Live updates across many servers
The restaurant's tablet is connected to server 1, but the new order lands on server 2. Redis pub/sub joins them. And when the tablet's Wi-Fi drops, it fetches what it missed from the database - the push is fast, the database is the truth.
Read
12m
6.3
Proof: 10,000 order screens
Load-test 10,000 open order screens asking every 5 seconds, then holding one connection each. Then send a new order through two servers, and cut a tablet's connection mid-rush.
Read
8m
6.4
Lab: Add live updates to the clinic
Tell patients in the waiting room the moment Dr. Rao is running late - from any server, without them refreshing.
Lab
25m
07


Background jobs
Coming Dec 2026
Not everything has to happen before the response. Move slow work to a queue and workers - and make sure a job that runs twice does no harm.
7.1
Why the user shouldn't wait
The order is slow because of an SMS the customer didn't need yet. Which work must happen before the response, and which can happen after.
Read
10m
7.2
A queue in the database you have
A jobs table and a worker that polls it. Why two workers grab the same job, and how row locks and SKIP LOCKED stop it. Often all you need.
Read
12m
7.3
Queues and workers
Our database is already the busiest part, so jobs move to a dedicated queue. Producers, workers, and a queue that absorbs the dinner spike.
Read
15m
7.4
When a job fails
A slow SMS provider now holds up workers instead of customers, and the queue piles up. Timeouts, retries with backoff, acknowledgements, and idempotent workers - because a job can run twice. And a dead-letter queue for jobs that never succeed.
Read
14m
7.5
Proof: take the SMS out of the order
Load-test orders with a slow SMS provider, then with a queue. Then kill a worker mid-refund and count the refunds, with and without an idempotency key.
Read
8m
7.6
Lab: Add a queue to the clinic
Send the day-before appointment reminders through a queue and workers - every one on time, and none twice.
Lab
25m
08


Rate limiting
Coming Dec 2026
Not every request deserves a reply. Decide how much each client may ask for, and keep that limit across many servers.
8.1
Why limit requests
Bots, buggy apps and one greedy client. Who to limit (user, IP, API key), what to send back (429 and Retry-After), and where the limit lives.
Read
10m
8.2
Counting requests
Fixed window and the burst at its edge, sliding window, and token bucket - which lets a real user burst a little.
Read
14m
8.3
One limit across many servers
Three servers counting alone allow three times the limit. One counter in Redis, updated in one step so two servers can't both slip through.
Read
12m
8.4
Proof: stop the OTP flood
Flood the login from another machine and count the SMS sent: no limit, a limit on each server, then one limit in Redis.
Read
8m
8.5
Lab: Add rate limits to the clinic
Stop bots grabbing every Monday slot, without blocking patients who book honestly.
Lab
25m
09


Growing big
Coming Dec 2026
Years of data, many cities, many teams. The cheap steps first - archive and partition - then the two hardest ones, put off as long as you can.
9.1
Old data you rarely read
Almost every query asks about this week. Move old orders to cheap storage, and keep what the law says you must keep.
Read
10m
9.2
Partitioning a table
Split the orders table by month inside one database. Removing a month becomes instant instead of one huge DELETE - and why it barely speeds up a query that already has an index.
Read
12m
9.3
Sharding
When one machine can't hold it: split the data by city across databases. What a shard key is, what you lose (a query across all cities), and why it comes last. The deep dive is in Part 2.
Read
15m
9.4
Splitting into services
Microservices solve a people problem. Here's how to tell when you have it, and what it costs - like following one slow order across five services.
Read
12m
9.5
Proof: clear out an old month
Every month the oldest orders move to the archive. Remove one month from 30 million orders twice - row by row, then by dropping its partition - while new orders keep coming in. Compare the time, the new orders' speed, and the disk freed.
Read
8m
9.6
Lab: Ten years of clinic bookings
400 clinics and ten years of appointments. Archive the old ones and split the rest by month - then decide whether it needs shards. (It doesn't.)
Lab
25m
10


Putting it together
Coming Dec 2026
Design a whole system from a blank page, and explain your choices out loud.
10.1
The design interview
It's the design process from Module 1, done in 45 minutes.
Read
12m
10.2
Back-of-the-envelope estimation
Turn users into requests per second, storage and bandwidth - fast enough to do in an interview.
Read
12m
10.3
Drawing it and talking tradeoffs
Never say “the best”. Say what you chose, what you gave up, and why.
Read
10m
10.4
Capstone: Design the whole app
The food delivery app, from requirements to fifty cities, on your own.
Lab
45m
Part 2 · Distributed systems

11


Microservices
Coming Jan 2027
Splitting the app into services: where to draw the boundaries, how services call each other, and how to trace a request across them.
11.1
Service boundaries
Split by business capability, not by table. Each service owns its data, and other services don't read its database.
Read
12m
11.2
Synchronous vs asynchronous calls
Use a direct call when you need the answer before replying, and a queue when you don't. Payment needs an answer; sending an SMS doesn't.
Read
12m
11.3
REST vs gRPC
REST and JSON for public APIs, gRPC with a shared schema between services, and the tradeoffs of each.
Read
12m
11.4
API gateway and service discovery
A single entry point for the apps, and how services find each other when instances are added and removed.
Read
10m
11.5
Backend for frontend
The customer app, the restaurant tablet and the rider app need different data. A separate backend for each client, and when one gateway is enough.
Read
10m
11.6
Aggregating data from several services
The order page needs data from the order, restaurant and rider services. Call them in parallel, combine the results, and decide what to return when one of them fails.
Read
10m
11.7
Authentication across services
The auth service signs a JWT with its private key (RS256), and every other service checks it with the public key from a JWKS endpoint - no call to the auth service per request. Key rotation, and how services authenticate each other.
Read
12m
11.8
Distributed tracing
Pass one request ID through every call, and use traces to find which service made an order slow.
Read
10m
11.9
Proof: one process vs five services
Place an order in one process, then across five services. Compare latency and find the slow call in the trace.
Read
8m
11.10
Lab: Split the order flow
Design the services for ordering, payment and dispatch, and choose how each pair communicates.
Lab
30m
12


Problems in distributed systems
Coming Feb 2027
Things that work on one machine and fail across many: timeouts, retries, clocks, counters and locks. Each lesson covers the basic fix and points to the module with the full solution.
12.1
Partial failure and timeouts
You can't tell a slow machine from a crashed one. After a timeout, you don't know whether the payment went through.
Read
12m
12.2
Retry storms and cascading failures
When the payment service slows down, every caller retries, and retries multiply at each layer. Backoff, jitter and retry budgets.
Read
12m
12.3
Circuit breakers and load shedding
Stop calling a failing service and return a fallback. Under overload, reject some requests so the rest still succeed.
Read
12m
12.4
Tail latency
A page that calls ten services hits at least one service's p99 on most requests. How fan-out makes tail latency matter.
Read
10m
12.5
Clocks and ordering
Clocks on different machines drift. Last-write-wins can lose updates, and timestamps can't reliably order events.
Read
12m
12.6
Duplicate and out-of-order messages
“Order cancelled” can arrive before “order placed”, and “order paid” can arrive twice. Why this happens, and why handlers must be idempotent.
Read
10m
12.7
Inconsistent data
The order is saved but the “paid” event is never sent. A customer updates their address and the next page shows the old one. Two writes in two places, with no shared transaction.
Read
12m
12.8
Counters and limits across machines
Stock counts that oversell, per-server rate limits that allow too much traffic, and auto-increment IDs that collide.
Read
12m
12.9
Locks and leaders
A lock in one process doesn't protect anything on another machine. A lease can expire during a pause, leaving two machines that both think they're the leader.
Read
10m
12.10
Proof: one slow service
Slow down the payment service under load and measure what retries do to the app. Then add backoff, a circuit breaker and load shedding, and measure again.
Read
8m
12.11
Lab: Inject failures into the clinic
Add latency, stop a machine, skew a clock and split the network. Predict the effect on bookings, then test it.
Lab
30m
13


Replication in depth
Coming Mar 2027
Keeping copies of data on several machines: replication modes, leader election, consistency, and resolving conflicts.
13.1
Sync, async and failover
What happens when the leader fails: lost writes, split brain and fencing.
Read
15m
13.2
Leader election and Raft
How nodes agree on a leader and a log, and why you use etcd or ZooKeeper instead of implementing it.
Read
18m
13.3
Consistency models
Read-your-writes, monotonic reads, linearizability and eventual consistency, with examples from the app.
Read
15m
13.4
Leaderless and quorums
Dynamo-style replication: R + W > N, and what it does and doesn't guarantee.
Read
15m
13.5
Conflict resolution
Last-write-wins, version vectors and CRDTs.
Read
12m
13.6
CAP and PACELC
What CAP says and doesn't say, and the latency vs consistency tradeoff you make every day.
Read
10m
13.7
Lab: Choose consistency levels
Menu, cart, payment, rider location: choose a consistency level for each and justify it.
Lab
30m
14


Partitioning in depth
Coming Mar 2027
Splitting data across machines while avoiding hot spots, expensive queries and costly rebalancing.
14.1
Range vs hash partitioning
How each method splits the data, and what it does to your queries.
Read
12m
14.2
Consistent hashing
Add a machine and move only a small part of the data.
Read
15m
14.3
Hot keys
When one key gets most of the traffic, like a very popular restaurant.
Read
12m
14.4
Queries across shards
Secondary indexes, scatter-gather and request routing.
Read
12m
14.5
IDs without a central counter
Snowflake IDs, UUIDs, and why order sometimes matters.
Read
10m
14.6
Lab: Reshard without downtime
Add shards under live traffic without losing orders.
Lab
30m
15


Messaging: Kafka and pub/sub
Coming Apr 2027
Services publish events instead of calling each other in a chain: pub/sub, Kafka, fan-out and delivery guarantees.
15.1
Pub/sub
The order service publishes “order placed” without knowing which services consume it.
Read
10m
15.2
How Kafka works
Topics, partitions and offsets, and why reading a message doesn't delete it.
Read
15m
15.3
Kafka as a queue
Consumer groups split the work, the partition count limits how many consumers you can run, and slow consumers build up lag.
Read
12m
15.4
Fan-out and fan-in
Sending one event to many services, and combining several events into one result, such as waiting for payment and restaurant confirmation before assigning a rider.
Read
10m
15.5
Message ordering
Kafka keeps order only within a partition. Choose the key so all events for one order go to the same partition.
Read
10m
15.6
At most, at least, exactly once
What a message system can guarantee, and why exactly-once in practice means idempotent consumers.
Read
10m
15.7
Lab: Event-driven order flow
Connect order, payment and rider services with events, then take one down.
Lab
30m
16


Transactions across services
Coming Apr 2027
Placing an order writes to three services. How to keep them consistent when any of them can fail partway through.
16.1
Isolation levels
Lost updates and write skew within one database, before adding more.
Read
15m
16.2
Outbox and change data capture
Save to the database and publish an event reliably, without losing either.
Read
12m
16.3
Two-phase commit
Commit across two databases, why it can get stuck, and why services rarely use it.
Read
12m
16.4
Sagas
A sequence of local transactions with compensating steps: refund the payment if no restaurant accepts the order.
Read
15m
16.5
Locks, leases and fencing tokens
Distributed locks with etcd or ZooKeeper, and fencing tokens to make them safe.
Read
12m
16.6
Lab: Order saga
Run an order across payment, restaurant and rider services, crash each one in turn, and make sure no customer is charged for an order that won't be delivered.
Lab
30m
17


Events and streams
Coming May 2027
Event sourcing, CQRS, stream processing and batch processing.
17.1
Event sourcing and CQRS
Store every change as an event instead of only the current state, and when not to.
Read
12m
17.2
Stream processing
Windows, late events and aggregating data as it arrives.
Read
15m
17.3
Batch and analytics
OLTP vs OLAP, data warehouses, and running reports without slowing down orders.
Read
10m
17.4
Lab: Live orders per city
Count orders per city as they arrive, handling late and duplicate events, and compare the result with the nightly batch.
Lab
30m
18


Availability and going global
Coming May 2027
Setting an uptime target, what each extra nine costs, and running in multiple regions.
18.1
Availability and the nines
99.9% allows about nine hours of downtime a year, 99.99% under one. How components in series lower availability, and how redundancy raises it.
Read
12m
18.2
Multi-region
Active-passive vs active-active, and where writes go.
Read
15m
18.3
Geo-routing
How DNS, anycast and edge locations route each user to the nearest region.
Read
10m
18.4
Disaster recovery
RPO, RTO, cross-region backups and chaos testing.
Read
12m
18.5
Lab: Region failover
Fail over a whole region and measure the data lost.
Lab
30m
Part 3 · Under the hood

19


Classic algorithms in action
Coming Jun 2027
The algorithms under every big system, as simulations: run them, break them, and see why they work.
19.1
Consistent hashing
Add a server to the ring and watch which keys move - then add virtual nodes.
Simulate
10m
19.2
Bloom filter
“Definitely not” or “maybe”: tune its size and count the false positives.
Simulate
10m
19.3
HyperLogLog
Count millions of unique visitors in 12 KB of memory.
Simulate
10m
19.4
Count-min sketch and top-K
Find tonight's trending dishes without counting every one exactly.
Simulate
10m
19.5
Geohash and quadtree
Find the nearest rider without checking every rider in the city.
Simulate
10m
19.6
Trie
Autocomplete: suggestions after every letter typed.
Simulate
10m
19.7
Inverted index
How search finds every menu with “paneer” in it.
Simulate
10m
19.8
B-tree vs LSM tree
Two ways to store data on disk: fast reads or fast writes.
Simulate
10m
19.9
Write-ahead log
Crash the database mid-write, then watch it recover.
Simulate
10m
19.10
Merkle tree
Find what differs between two replicas without comparing everything.
Simulate
10m
19.11
Snowflake IDs
Unique, sortable IDs from many machines - until a clock jumps back.
Simulate
10m
19.12
Lamport and vector clocks
Put events in order when no clock can be trusted.
Simulate
10m
19.13
Gossip and failure detection
How a cluster spreads news and notices a dead machine.
Simulate
10m
19.14
Quorum reads and writes
Change N, R and W, kill a node, and see what readers get.
Simulate
10m
19.15
Raft
Elect a leader, replicate a log, then cut the network.
Simulate
10m
19.16
Leases and fencing tokens
A paused lock holder wakes up and tries to write.
Simulate
10m
19.17
CRDTs
Two offline phones edit the same cart. Merge them without losing anything.
Simulate
10m
19.18
Fan-out on write vs read
Post as a celebrity with 10 million followers, and watch the feed build.
Simulate
10m
19.19
Sharded counters
Count a million likes a second without one hot row.
Simulate
10m



Design the apps you use every day.
Pick an app, start from what it needs to do, and build its design on a canvas, one step at a time. Then put it under load and fix whatever breaks.

Free
→
Design your own Bitly
URL shortener

Billions of redirects, a few writes, and IDs that never collide.

easy
13 steps · ~45 min
Free
→
Design a Udemy-like database
Data modeling

Courses, lessons, enrolments and progress: a database from its requirements.

easy
14 steps · ~75 min
Soon
Design your own YouTube
Video platform

Upload, transcode, and stream at every quality.

medium
Soon
Design your own Instagram
Photo feed

Fan-out on write or on read - and the celebrity who breaks both.

medium
Soon
Design your own WhatsApp
Chat app

Messages delivered in order, with ticks, to phones that are often offline.

medium
Soon
Design your own Spotify
Music streaming

Stream any song instantly, to millions, on any network.

medium
Soon
Design your own Google Maps
Route ETA

Routes and arrival times that follow live traffic.

hard
Soon
Design your own Gmail
Email service

Send, receive, search and never lose a message.

medium
Soon
Design your own Google Docs
Collaborative editor

Many people typing in the same document, and nobody's edit lost.

hard
Soon
Design your own Reddit
Ranked feed

Votes pouring in, and a ranking that stays fresh and fair.

medium
Soon
Design your own Discord
Online status

Who's online right now, for a hundred million users.

medium
Soon
Design your own Dropbox
File sync

Keep every device's files in sync, and send only what changed.

medium
Soon
Design your own Swiggy
Delivery dispatch

Pick the right rider for every order, as riders and orders move.

hard
Soon
Design your own BookMyShow
Ticket booking

Hold a seat, take the payment, never sell it twice.

medium
Soon
Design your own Razorpay
Payment system

Money moves exactly once, even when every network call fails.

hard
Soon
Design your own DynamoDB
Key-value store

A Dynamo-style store that stays up when machines die.

hard
Each system is modelled on a well-known product. Names and logos belong to their owners; sys0 isn’t affiliated with any of them.


-> this is site as : https://sys0.in/path 

and the 

08


Rate limiting
Coming Dec 2026
Not every request deserves a reply. Decide how much each client may ask for, and keep that limit across many servers.
8.1
Why limit requests
Bots, buggy apps and one greedy client. Who to limit (user, IP, API key), what to send back (429 and Retry-After), and where the limit lives.
Read
10m
8.2
Counting requests
Fixed window and the burst at its edge, sliding window, and token bucket - which lets a real user burst a little.
Read
14m
8.3
One limit across many servers
Three servers counting alone allow three times the limit. One counter in Redis, updated in one step so two servers can't both slip through.
Read
12m
8.4
Proof: stop the OTP flood
Flood the login from another machine and count the SMS sent: no limit, a limit on each server, then one limit in Redis.
Read
8m
8.5
Lab: Add rate limits to the clinic
Stop bots grabbing every Monday slot, without blocking patients who book honestly.
Lab
25m