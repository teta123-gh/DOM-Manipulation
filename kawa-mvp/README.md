# Kawa Network — Formative 1 MVP

First runnable slice of the Kawa Network API: farmer/plot registration,
delivery recording with idempotent retries, an async risk-check flow against
an external registry, a station-facing paginated delivery feed, and the
price-schedule endpoint. See `ADR.md` for the architecture decision behind
the async flow and the pagination choice.

## Requirements

- Python 3.11+
- Redis (for the background risk-check queue)

## Local setup

```bash
git clone <your-repo-url>
cd advanced-python-programming-kawa-<your-username>
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Environment variables

Create a `.env` file (or export these directly):

| Variable | Purpose | Default |
|---|---|---|
| `REDIS_HOST` | Redis host for Django-RQ | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `RISK_REGISTRY_URL` | External risk registry endpoint | `https://example-risk-registry.test/api/check` |
| `RISK_REGISTRY_TIMEOUT_SECONDS` | Timeout before a check is logged as failed | `45` |

## Database

```bash
python manage.py migrate
python manage.py createsuperuser   # optional, for /admin
```

## Running the API

Two processes are required — the web server and the background worker.
This is the direct consequence of the async risk-check decision in
`ADR.md`: plot registration must not block on the registry, so a separate
worker process is what actually performs the check.

**Terminal 1 — web server:**
```bash
python manage.py runserver
```

**Terminal 2 — Redis (if not already running):**
```bash
redis-server
```

**Terminal 3 — RQ worker (processes risk checks):**
```bash
python manage.py rqworker default
```

Without Terminal 3 running, plots will stay `risk_status: pending`
indefinitely — that's expected, not a bug; it's what "async" means here.

## Example requests

**Register a farmer**
```bash
curl -X POST http://localhost:8000/api/v1/farmers \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Jean Bosco", "phone": "+250780000000", "cooperative": "<cooperative-uuid>"}'
```

**Register a plot** (triggers the async risk check)
```bash
curl -X POST http://localhost:8000/api/v1/farmers/<farmer-uuid>/plots \
  -H "Content-Type: application/json" \
  -d '{"sector": "Kibeho", "station": "<station-uuid>", "latitude": -2.598, "longitude": 29.508, "area_hectares": 0.5}'
```

**Record a delivery** (idempotent — retry-safe on 2G)
```bash
curl -X POST http://localhost:8000/api/v1/deliveries \
  -H "Content-Type: application/json" \
  -d '{
    "farmer": "<farmer-uuid>",
    "plot": "<plot-uuid>",
    "station": "<station-uuid>",
    "quantity_kg": 35.5,
    "idempotency_key": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }'
```
Retrying the exact same request (same `idempotency_key`) returns the
existing delivery with `200 OK` instead of creating a duplicate.

**Station delivery feed (paginated, cursor-based)**
```bash
curl http://localhost:8000/api/v1/stations/<station-uuid>/deliveries
```

**Price schedule**
```bash
curl http://localhost:8000/api/price-schedule/
```

**Export-lot traceability** (lot → deliveries → plots → farmers, no coordinates exposed)
```bash
curl http://localhost:8000/api/v1/export-lots/<lot-uuid>/traceability
```

## Design documents

- `ADR.md` — the architecture decision behind the async risk-check flow and
  the choice of cursor pagination over price-schedule caching as the
  assessed performance feature.
- `REST_API_DESIGN.md` (Week 1) — the original resource model, endpoint
  map, validation strategy, and location-precision decision this MVP
  implements.

## Known limitations (by design, not oversight)

- A plot stuck in `risk_status: pending` does not block deliveries from
  that plot — see ADR-001 for the reasoning.
- No retry/backoff scheduling on failed risk checks yet; `enqueue_retry_for_stale_pending()`
  in `deliveries/tasks.py` exists as a manual hook, not an automated job.
- Access control (who can see plot coordinates vs. sector-only) is scoped
  for Formative 2, not implemented here.

## Submission checklist (for this formative)

- [ ] Repo accepted via `gh classroom accept ALU-BSE advanced-python-programming kawa`
- [ ] Work done on `main`
- [ ] `ADR.md`, this `README.md`, the API implementation, and the schema/docs
      artifact are all present in the repo
- [ ] Implementation satisfies `docs/autograding/F1_CONTRACT.md`
- [ ] `git tag f1 && git push origin f1`
- [ ] Repository URL submitted in Canvas

## F1 contract notes
- `farmers`, `plots`, `shipments`, `pricing` apps implement the exact F1_CONTRACT.md field/response shapes with integer ids.
- `deliveries` app (UUID-based, richer domain model) is a separate, more advanced module built ahead for later formatives; untouched by F1 routing.
- Async: `plots/tasks.py` uses `shared_task` + `.delay()` for a deforestation-risk check queued on plot creation (Celery). Start the worker with:
  `celery -A kawa worker --loglevel=info` (requires Redis running locally).
- Performance: pagination (`PAGE_SIZE=10`, DRF `PageNumberPagination`) on farmer/plot/delivery lists is the assessed F1 performance feature.
- `/api/price-schedule/` is served by the existing `deliveries` app.