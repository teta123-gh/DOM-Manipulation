# ADR-001: Asynchronous Risk Checks via Background Task Queue

## Status
Accepted — Formative 1 MVP

## Context

When a plot is registered, Kawa must check it against an external deforestation
risk registry before the plot can be treated as export-eligible. That registry:

- takes between 2 and 40 seconds to respond, and
- is unavailable for hours at a time.

Emmanuel registers plots and records deliveries from a phone on a 2G connection,
often with a queue of farmers waiting at the scale. A request that blocks on the
registry is not a slow request — for practical purposes, it is a broken one.

At the same time, Patrick and Solange need the risk-check result eventually, and
the system needs an honest answer to what happens to a plot whose check never
comes back before a shipping window closes.

## Decision

The risk check runs as a background job, queued at the moment a plot is created,
using **Django-RQ backed by Redis**.

`POST /api/v1/farmers/{id}/plots` does three things and returns immediately:
1. validates and persists the plot with `risk_status = "pending"`,
2. enqueues a `check_plot_risk(plot_id)` job,
3. returns `201 Created` with the plot object, including `risk_status`.

The worker process (`python manage.py rqworker default`, run separately from the
web process) picks the job up, calls the registry, and updates the plot's
`risk_status` to `clear` or `flagged`, recording the attempt (timestamp, outcome,
raw response or error) in a `RiskCheckAttempt` log row regardless of outcome.

**Position on unresolved checks:** a plot whose `risk_status` is still `pending`
does **not** block deliveries. Emmanuel can record a delivery from any plot that
is not explicitly `flagged`. This is a deliberate choice: Jeanne's same-day-pay
requirement and Emmanuel's must-not-block-at-the-scale requirement both outrank
an unresolved third-party check. A plot that stays `pending` past a configurable
threshold (default: 4 hours) is surfaced through a `GET /api/v1/plots/?risk_status=pending&stale=true`
filter so Solange can see it and chase it manually — the system degrades to
"flag it for a human" rather than "block the farmer."

A `flagged` plot **does** block new deliveries (`409 Conflict`) and blocks the
plot's deliveries from being attached to an export lot, regardless of how the
deliveries themselves were recorded.

Why Django-RQ over Celery: Celery is the more capable long-term choice (retries,
scheduling, routing, multiple queues), but it also brings more infrastructure and
conceptual overhead than a three-week MVP needs. Django-RQ is a thin, easy-to-run
wrapper over Redis — one dependency, one worker command — which keeps the
"another developer can run this independently" requirement realistic this early.
Celery is a reasonable thing to migrate to for the Summative if retry/backoff
semantics become a real requirement.

## Consequences

**What it improves**
- Plot registration stays fast and non-blocking regardless of registry latency.
- The system has an explicit, defensible answer to "what if the check never
  finishes" instead of an implicit deadlock.
- Every attempt is logged, so a stuck or repeatedly-failing check is visible and
  debuggable rather than silent.

**What it makes harder**
- There are now two processes to run (web + worker), which the README has to
  document clearly or the "runs independently" requirement fails.
- Because deliveries are allowed from `pending` plots, it's possible for cherry
  to be bought and even (in later formatives) shipped from a plot that turns out
  `flagged` after the fact. This is a real compliance exposure, not a
  hypothetical one — it's the direct cost of not blocking Emmanuel.
- Eventual consistency: `risk_status` is not guaranteed to be current at the
  instant of a read; consumers of the API (Patrick's export-lot logic in
  particular) have to check it explicitly rather than assume a plot is safe just
  because it exists.

**Who benefits most**
Emmanuel and Jeanne — the request path that runs hundreds of times a day at
harvest peak never waits on a third party. Patrick and Solange inherit the
downside: they carry the risk of building on data that was allowed to be
optimistic by design.

**Non-functional requirement it helps / stresses**
Helps: latency and availability of the write path under harvest-peak load.
Stresses: consistency — the system explicitly trades strong consistency of
compliance state for availability of the delivery-recording path. This is a
CAP-style tradeoff made on purpose, not by accident, and it's the kind of
decision this ADR exists to make explicit.

## Alternatives considered

- **Synchronous call with a short timeout, fallback to `pending` on timeout.**
  Rejected: even a "short" timeout of a few seconds, multiplied over a queue of
  farmers at peak, is unacceptable on 2G, and the registry can be down for hours,
  not seconds — a timeout doesn't fix an outage.
- **Block plot creation until the check resolves, with a spinner on the client.**
  Rejected outright: this is the exact failure mode the scenario describes
  ("Emmanuel cannot hold a farmer at the weighing scale while it runs").
- **Celery + RabbitMQ/Redis from the start.** Deferred, not rejected — right call
  for a system with real retry/scheduling needs, but more than this MVP's scope
  justifies. Documented here so the Summative can revisit it deliberately.

## F1: dual delivery models
F1 requires integer-like ids on create responses. The existing `deliveries` domain model uses UUIDs for reasons documented in ADR-001. Rather than changing primary key types under time pressure, F1's contract is satisfied by separate minimal apps (`farmers`, `plots`, `shipments`, `pricing`) with integer ids, kept independent from the UUID-based domain model. This avoids destabilizing the more advanced work already built for later formatives.